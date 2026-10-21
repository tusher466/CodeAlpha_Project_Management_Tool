import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

export default function createCommentsRouter(socketService) {
  const router = express.Router();

  // GET comments for a task
  router.get('/tasks/:taskId/comments', authenticateToken, (req, res) => {
    try {
      const { taskId } = req.params;

      const comments = db.prepare(`
        SELECT c.*, u.name as user_name, u.email as user_email, u.avatar_color, u.role as user_role
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.task_id = ?
        ORDER BY c.created_at ASC
      `).all(taskId);

      res.json({ comments });
    } catch (err) {
      console.error('Get comments error:', err);
      res.status(500).json({ error: 'Failed to get comments' });
    }
  });

  // POST create comment on a task
  router.post('/tasks/:taskId/comments', authenticateToken, (req, res) => {
    try {
      const { taskId } = req.params;
      const { content } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Comment content cannot be empty' });
      }

      const task = db.prepare(`
        SELECT t.id, t.title, t.project_id, t.created_by
        FROM tasks t
        WHERE t.id = ?
      `).get(taskId);

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const commentId = uuidv4();
      db.prepare(`
        INSERT INTO comments (id, task_id, user_id, content)
        VALUES (?, ?, ?, ?)
      `).run(commentId, taskId, req.user.id, content.trim());

      const fullComment = db.prepare(`
        SELECT c.*, u.name as user_name, u.email as user_email, u.avatar_color, u.role as user_role
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
      `).get(commentId);

      // Check for mentions: @name or @username
      const allUsers = db.prepare('SELECT id, name, email FROM users').all();
      const mentionedUserIds = new Set();

      for (const u of allUsers) {
        const firstName = u.name.split(' ')[0].toLowerCase();
        const full = u.name.toLowerCase().replace(/\s+/g, '');
        const pattern = new RegExp(`@(${firstName}|${full})\\b`, 'i');
        if (pattern.test(content) && u.id !== req.user.id) {
          mentionedUserIds.add(u.id);
        }
      }

      // Notify mentioned users
      for (const mId of mentionedUserIds) {
        const notifId = uuidv4();
        db.prepare(`
          INSERT INTO notifications (id, user_id, type, title, message, data)
          VALUES (?, ?, 'mention', ?, ?, ?)
        `).run(
          notifId,
          mId,
          'Mentioned in Task',
          `${req.user.name} mentioned you in "${task.title}": "${content.slice(0, 80)}..."`,
          JSON.stringify({ projectId: task.project_id, taskId, commentId })
        );

        socketService.emitToUser(mId, 'notification_new', {
          id: notifId,
          type: 'mention',
          title: 'Mentioned in Task',
          message: `${req.user.name} mentioned you in "${task.title}": "${content.slice(0, 80)}..."`,
          data: JSON.stringify({ projectId: task.project_id, taskId, commentId }),
          read: 0,
          created_at: new Date().toISOString()
        });
      }

      // Notify task assignees and task creator if not the commenter and not already mentioned
      const assignees = db.prepare('SELECT user_id FROM task_assignees WHERE task_id = ?').all(taskId);
      const recipientIds = new Set(assignees.map(a => a.user_id));
      if (task.created_by) recipientIds.add(task.created_by);

      for (const rId of recipientIds) {
        if (rId !== req.user.id && !mentionedUserIds.has(rId)) {
          const notifId = uuidv4();
          db.prepare(`
            INSERT INTO notifications (id, user_id, type, title, message, data)
            VALUES (?, ?, 'comment_added', ?, ?, ?)
          `).run(
            notifId,
            rId,
            'New Comment',
            `${req.user.name} commented on "${task.title}"`,
            JSON.stringify({ projectId: task.project_id, taskId, commentId })
          );

          socketService.emitToUser(rId, 'notification_new', {
            id: notifId,
            type: 'comment_added',
            title: 'New Comment',
            message: `${req.user.name} commented on "${task.title}"`,
            data: JSON.stringify({ projectId: task.project_id, taskId, commentId }),
            read: 0,
            created_at: new Date().toISOString()
          });
        }
      }

      // Log activity
      db.prepare(`
        INSERT INTO activities (id, project_id, user_id, action, details)
        VALUES (?, ?, ?, 'added_comment', ?)
      `).run(uuidv4(), task.project_id, req.user.id, JSON.stringify({ taskId, taskTitle: task.title }));

      // Broadcast comment via WebSocket to task viewers and project board
      socketService.emitToTask(taskId, 'comment_created', fullComment);
      socketService.emitToProject(task.project_id, 'task_comment_count_updated', {
        taskId,
        delta: 1
      });

      res.status(201).json({ comment: fullComment });
    } catch (err) {
      console.error('Create comment error:', err);
      res.status(500).json({ error: 'Failed to post comment' });
    }
  });

  // DELETE comment
  router.delete('/comments/:commentId', authenticateToken, (req, res) => {
    try {
      const { commentId } = req.params;

      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId);
      if (!comment) return res.status(404).json({ error: 'Comment not found' });

      if (comment.user_id !== req.user.id) {
        return res.status(403).json({ error: 'You can only delete your own comments' });
      }

      const task = db.prepare('SELECT project_id FROM tasks WHERE id = ?').get(comment.task_id);

      db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);

      socketService.emitToTask(comment.task_id, 'comment_deleted', { commentId, taskId: comment.task_id });
      if (task) {
        socketService.emitToProject(task.project_id, 'task_comment_count_updated', {
          taskId: comment.task_id,
          delta: -1
        });
      }

      res.json({ success: true, message: 'Comment deleted' });
    } catch (err) {
      console.error('Delete comment error:', err);
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  });

  return router;
}
