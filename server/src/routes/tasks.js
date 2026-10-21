import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

export default function createTasksRouter(socketService) {
  const router = express.Router();

  // Helper to fetch full enriched task
  function getFullTask(taskId) {
    const task = db.prepare(`
      SELECT t.*, u.name as creator_name
      FROM tasks t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = ?
    `).get(taskId);

    if (!task) return null;

    task.assignees = db.prepare(`
      SELECT u.id, u.name, u.email, u.avatar_color
      FROM task_assignees ta
      JOIN users u ON ta.user_id = u.id
      WHERE ta.task_id = ?
    `).all(taskId);

    task.labels = db.prepare(`
      SELECT id, name, color FROM task_labels WHERE task_id = ?
    `).all(taskId);

    task.checklists = db.prepare(`
      SELECT id, title, completed, position FROM task_checklists WHERE task_id = ? ORDER BY position ASC
    `).all(taskId);

    task.comments_count = db.prepare(`
      SELECT COUNT(*) as count FROM comments WHERE task_id = ?
    `).get(taskId).count;

    return task;
  }

  // GET single task details
  router.get('/tasks/:taskId', authenticateToken, (req, res) => {
    try {
      const { taskId } = req.params;
      const task = getFullTask(taskId);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      res.json({ task });
    } catch (err) {
      console.error('Get task error:', err);
      res.status(500).json({ error: 'Failed to get task' });
    }
  });

  // POST create task
  router.post('/:projectId/tasks', authenticateToken, (req, res) => {
    try {
      const { projectId } = req.params;
      const {
        columnId,
        title,
        description = '',
        priority = 'medium',
        dueDate = null,
        assigneeIds = [],
        labels = [],
        checklists = []
      } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Task title is required' });
      }

      // If no columnId provided, default to first column
      let targetColumnId = columnId;
      if (!targetColumnId) {
        const firstCol = db.prepare('SELECT id FROM columns WHERE project_id = ? ORDER BY position ASC LIMIT 1').get(projectId);
        if (!firstCol) return res.status(400).json({ error: 'Project has no columns' });
        targetColumnId = firstCol.id;
      }

      // Position: end of the column
      const maxPos = db.prepare('SELECT MAX(position) as pos FROM tasks WHERE column_id = ?').get(targetColumnId)?.pos;
      const nextPos = (maxPos !== null && maxPos !== undefined) ? maxPos + 1 : 0;

      const taskId = uuidv4();
      db.prepare(`
        INSERT INTO tasks (id, project_id, column_id, title, description, priority, due_date, position, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(taskId, projectId, targetColumnId, title.trim(), description, priority, dueDate, nextPos, req.user.id);

      // Add assignees
      const insertAssignee = db.prepare('INSERT INTO task_assignees (id, task_id, user_id) VALUES (?, ?, ?)');
      for (const uId of assigneeIds) {
        insertAssignee.run(uuidv4(), taskId, uId);

        // Notify assignee if not the creator
        if (uId !== req.user.id) {
          const notifId = uuidv4();
          db.prepare(`
            INSERT INTO notifications (id, user_id, type, title, message, data)
            VALUES (?, ?, 'task_assigned', ?, ?, ?)
          `).run(
            notifId,
            uId,
            'Task Assigned',
            `${req.user.name} assigned you to "${title.trim()}"`,
            JSON.stringify({ projectId, taskId })
          );

          socketService.emitToUser(uId, 'notification_new', {
            id: notifId,
            type: 'task_assigned',
            title: 'Task Assigned',
            message: `${req.user.name} assigned you to "${title.trim()}"`,
            data: JSON.stringify({ projectId, taskId }),
            read: 0,
            created_at: new Date().toISOString()
          });
        }
      }

      // Add labels
      const insertLabel = db.prepare('INSERT INTO task_labels (id, task_id, name, color) VALUES (?, ?, ?, ?)');
      for (const l of labels) {
        if (l.name) {
          insertLabel.run(uuidv4(), taskId, l.name.trim(), l.color || '#3b82f6');
        }
      }

      // Add checklists
      const insertCheck = db.prepare('INSERT INTO task_checklists (id, task_id, title, completed, position) VALUES (?, ?, ?, ?, ?)');
      checklists.forEach((c, idx) => {
        if (c.title) {
          insertCheck.run(uuidv4(), taskId, c.title.trim(), c.completed ? 1 : 0, idx);
        }
      });

      // Log activity
      db.prepare(`
        INSERT INTO activities (id, project_id, user_id, action, details)
        VALUES (?, ?, ?, 'created_task', ?)
      `).run(uuidv4(), projectId, req.user.id, JSON.stringify({ taskId, taskTitle: title.trim() }));

      const fullTask = getFullTask(taskId);

      // Broadcast to project room
      socketService.emitToProject(projectId, 'task_created', fullTask);

      res.status(201).json({ task: fullTask });
    } catch (err) {
      console.error('Create task error:', err);
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  // PUT update task details (title, description, priority, due date, assignees, labels)
  router.put('/tasks/:taskId', authenticateToken, (req, res) => {
    try {
      const { taskId } = req.params;
      const {
        title,
        description,
        priority,
        dueDate,
        assigneeIds,
        labels
      } = req.body;

      const currentTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
      if (!currentTask) return res.status(404).json({ error: 'Task not found' });

      db.prepare(`
        UPDATE tasks
        SET title = coalesce(?, title),
            description = coalesce(?, description),
            priority = coalesce(?, priority),
            due_date = coalesce(?, due_date),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(title ?? null, description ?? null, priority ?? null, dueDate ?? null, taskId);

      // Handle assignees update if provided
      if (Array.isArray(assigneeIds)) {
        const existingAssignees = db.prepare('SELECT user_id FROM task_assignees WHERE task_id = ?').all(taskId).map(r => r.user_id);
        
        db.prepare('DELETE FROM task_assignees WHERE task_id = ?').run(taskId);
        const insertAssignee = db.prepare('INSERT INTO task_assignees (id, task_id, user_id) VALUES (?, ?, ?)');
        
        for (const uId of assigneeIds) {
          insertAssignee.run(uuidv4(), taskId, uId);

          // If newly assigned and not the current user
          if (!existingAssignees.includes(uId) && uId !== req.user.id) {
            const notifId = uuidv4();
            db.prepare(`
              INSERT INTO notifications (id, user_id, type, title, message, data)
              VALUES (?, ?, 'task_assigned', ?, ?, ?)
            `).run(
              notifId,
              uId,
              'Task Assigned',
              `${req.user.name} assigned you to "${currentTask.title}"`,
              JSON.stringify({ projectId: currentTask.project_id, taskId })
            );

            socketService.emitToUser(uId, 'notification_new', {
              id: notifId,
              type: 'task_assigned',
              title: 'Task Assigned',
              message: `${req.user.name} assigned you to "${currentTask.title}"`,
              data: JSON.stringify({ projectId: currentTask.project_id, taskId }),
              read: 0,
              created_at: new Date().toISOString()
            });
          }
        }
      }

      // Handle labels update if provided
      if (Array.isArray(labels)) {
        db.prepare('DELETE FROM task_labels WHERE task_id = ?').run(taskId);
        const insertLabel = db.prepare('INSERT INTO task_labels (id, task_id, name, color) VALUES (?, ?, ?, ?)');
        for (const l of labels) {
          if (l.name) insertLabel.run(uuidv4(), taskId, l.name.trim(), l.color || '#3b82f6');
        }
      }

      const updatedTask = getFullTask(taskId);

      // Broadcast update
      socketService.emitToProject(currentTask.project_id, 'task_updated', updatedTask);
      socketService.emitToTask(taskId, 'task_updated', updatedTask);

      res.json({ task: updatedTask });
    } catch (err) {
      console.error('Update task error:', err);
      res.status(500).json({ error: 'Failed to update task' });
    }
  });

  // PUT move / reorder task (drag and drop)
  router.put('/tasks/:taskId/move', authenticateToken, (req, res) => {
    try {
      const { taskId } = req.params;
      const { targetColumnId, newPosition, orderedTaskIdsInTarget } = req.body;

      const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
      if (!task) return res.status(404).json({ error: 'Task not found' });

      const prevColumn = db.prepare('SELECT name FROM columns WHERE id = ?').get(task.column_id);
      const targetColumn = db.prepare('SELECT name FROM columns WHERE id = ?').get(targetColumnId);

      // Update the moved task's column and position
      db.prepare(`
        UPDATE tasks
        SET column_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(targetColumnId, newPosition, taskId);

      // If orderedTaskIdsInTarget provided, reindex all tasks in target column
      if (Array.isArray(orderedTaskIdsInTarget)) {
        const updatePosStmt = db.prepare('UPDATE tasks SET position = ? WHERE id = ?');
        orderedTaskIdsInTarget.forEach((id, idx) => {
          updatePosStmt.run(idx, id);
        });
      }

      // If column changed, log activity and notify assignees
      if (task.column_id !== targetColumnId) {
        db.prepare(`
          INSERT INTO activities (id, project_id, user_id, action, details)
          VALUES (?, ?, ?, 'moved_task', ?)
        `).run(
          uuidv4(),
          task.project_id,
          req.user.id,
          JSON.stringify({
            taskTitle: task.title,
            fromColumn: prevColumn?.name || 'Previous',
            toColumn: targetColumn?.name || 'New'
          })
        );

        // Notify assignees of column move if not user who moved it
        const assignees = db.prepare('SELECT user_id FROM task_assignees WHERE task_id = ?').all(taskId);
        for (const a of assignees) {
          if (a.user_id !== req.user.id) {
            const notifId = uuidv4();
            db.prepare(`
              INSERT INTO notifications (id, user_id, type, title, message, data)
              VALUES (?, ?, 'task_moved', ?, ?, ?)
            `).run(
              notifId,
              a.user_id,
              'Task Moved',
              `"${task.title}" was moved to ${targetColumn?.name || 'another column'} by ${req.user.name}`,
              JSON.stringify({ projectId: task.project_id, taskId })
            );

            socketService.emitToUser(a.user_id, 'notification_new', {
              id: notifId,
              type: 'task_moved',
              title: 'Task Moved',
              message: `"${task.title}" was moved to ${targetColumn?.name || 'another column'} by ${req.user.name}`,
              data: JSON.stringify({ projectId: task.project_id, taskId }),
              read: 0,
              created_at: new Date().toISOString()
            });
          }
        }
      }

      const fullTask = getFullTask(taskId);

      // Broadcast move event with all column ordering data
      socketService.emitToProject(task.project_id, 'task_moved', {
        taskId,
        sourceColumnId: task.column_id,
        targetColumnId,
        newPosition,
        task: fullTask,
        userId: req.user.id
      });

      res.json({ success: true, task: fullTask });
    } catch (err) {
      console.error('Move task error:', err);
      res.status(500).json({ error: 'Failed to move task' });
    }
  });

  // DELETE task
  router.delete('/tasks/:taskId', authenticateToken, (req, res) => {
    try {
      const { taskId } = req.params;
      const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
      if (!task) return res.status(404).json({ error: 'Task not found' });

      db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);

      // Log activity
      db.prepare(`
        INSERT INTO activities (id, project_id, user_id, action, details)
        VALUES (?, ?, ?, 'deleted_task', ?)
      `).run(uuidv4(), task.project_id, req.user.id, JSON.stringify({ taskTitle: task.title }));

      socketService.emitToProject(task.project_id, 'task_deleted', {
        taskId,
        columnId: task.column_id,
        projectId: task.project_id
      });

      res.json({ success: true, message: 'Task deleted' });
    } catch (err) {
      console.error('Delete task error:', err);
      res.status(500).json({ error: 'Failed to delete task' });
    }
  });

  // Checklist: Add item
  router.post('/tasks/:taskId/checklist', authenticateToken, (req, res) => {
    try {
      const { taskId } = req.params;
      const { title } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Checklist item title is required' });
      }

      const task = db.prepare('SELECT project_id FROM tasks WHERE id = ?').get(taskId);
      if (!task) return res.status(404).json({ error: 'Task not found' });

      const maxPos = db.prepare('SELECT MAX(position) as pos FROM task_checklists WHERE task_id = ?').get(taskId)?.pos;
      const nextPos = (maxPos !== null && maxPos !== undefined) ? maxPos + 1 : 0;

      const itemId = uuidv4();
      db.prepare(`
        INSERT INTO task_checklists (id, task_id, title, completed, position)
        VALUES (?, ?, ?, 0, ?)
      `).run(itemId, taskId, title.trim(), nextPos);

      const item = db.prepare('SELECT * FROM task_checklists WHERE id = ?').get(itemId);
      const fullTask = getFullTask(taskId);

      socketService.emitToProject(task.project_id, 'task_updated', fullTask);
      socketService.emitToTask(taskId, 'task_updated', fullTask);

      res.status(201).json({ item, task: fullTask });
    } catch (err) {
      console.error('Add checklist error:', err);
      res.status(500).json({ error: 'Failed to add checklist item' });
    }
  });

  // Checklist: Toggle or update item
  router.put('/tasks/:taskId/checklist/:itemId', authenticateToken, (req, res) => {
    try {
      const { taskId, itemId } = req.params;
      const { completed, title } = req.body;

      const task = db.prepare('SELECT project_id FROM tasks WHERE id = ?').get(taskId);
      if (!task) return res.status(404).json({ error: 'Task not found' });

      db.prepare(`
        UPDATE task_checklists
        SET completed = coalesce(?, completed),
            title = coalesce(?, title)
        WHERE id = ? AND task_id = ?
      `).run(completed !== undefined ? (completed ? 1 : 0) : null, title ?? null, itemId, taskId);

      const fullTask = getFullTask(taskId);

      socketService.emitToProject(task.project_id, 'task_updated', fullTask);
      socketService.emitToTask(taskId, 'task_updated', fullTask);

      res.json({ task: fullTask });
    } catch (err) {
      console.error('Update checklist error:', err);
      res.status(500).json({ error: 'Failed to update checklist item' });
    }
  });

  // Checklist: Delete item
  router.delete('/tasks/:taskId/checklist/:itemId', authenticateToken, (req, res) => {
    try {
      const { taskId, itemId } = req.params;

      const task = db.prepare('SELECT project_id FROM tasks WHERE id = ?').get(taskId);
      if (!task) return res.status(404).json({ error: 'Task not found' });

      db.prepare('DELETE FROM task_checklists WHERE id = ? AND task_id = ?').run(itemId, taskId);

      const fullTask = getFullTask(taskId);

      socketService.emitToProject(task.project_id, 'task_updated', fullTask);
      socketService.emitToTask(taskId, 'task_updated', fullTask);

      res.json({ task: fullTask });
    } catch (err) {
      console.error('Delete checklist error:', err);
      res.status(500).json({ error: 'Failed to delete checklist item' });
    }
  });

  return router;
}
