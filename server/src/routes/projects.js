import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

export default function createProjectsRouter(socketService) {
  const router = express.Router();

  // GET all projects accessible to current user
  router.get('/', authenticateToken, (req, res) => {
    try {
      const userId = req.user.id;

      // Select projects where user is owner or member
      const projects = db.prepare(`
        SELECT DISTINCT p.*, 
          u.name as owner_name, 
          u.email as owner_email,
          pm.role as current_user_role,
          (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
          (SELECT COUNT(*) FROM tasks t 
           JOIN columns c ON t.column_id = c.id 
           WHERE t.project_id = p.id AND LOWER(c.name) LIKE '%done%' OR LOWER(c.name) LIKE '%complete%') as completed_task_count,
          (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
        FROM projects p
        JOIN project_members pm ON p.id = pm.project_id
        JOIN users u ON p.owner_id = u.id
        WHERE pm.user_id = ?
        ORDER BY p.updated_at DESC
      `).all(userId);

      // Attach member avatars
      const memberQuery = db.prepare(`
        SELECT u.id, u.name, u.avatar_color, pm.role
        FROM project_members pm
        JOIN users u ON pm.user_id = u.id
        WHERE pm.project_id = ?
        LIMIT 5
      `);

      const enriched = projects.map(p => ({
        ...p,
        members_preview: memberQuery.all(p.id)
      }));

      res.json({ projects: enriched });
    } catch (err) {
      console.error('Fetch projects error:', err);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  });

  // POST create a group project
  router.post('/', authenticateToken, (req, res) => {
    try {
      const { name, description, color, memberIds = [] } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Project name is required' });
      }

      const projectId = uuidv4();
      const projectColor = color || '#6366f1';

      // Insert project
      db.prepare(`
        INSERT INTO projects (id, name, description, color, owner_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(projectId, name.trim(), description || '', projectColor, req.user.id);

      // Add creator as owner
      db.prepare(`
        INSERT INTO project_members (id, project_id, user_id, role)
        VALUES (?, ?, ?, 'owner')
      `).run(uuidv4(), projectId, req.user.id);

      // Add default columns for Kanban board
      const defaultCols = [
        { name: 'Backlog', pos: 0, color: '#64748b' },
        { name: 'To Do', pos: 1, color: '#3b82f6' },
        { name: 'In Progress', pos: 2, color: '#f59e0b' },
        { name: 'Review', pos: 3, color: '#8b5cf6' },
        { name: 'Done', pos: 4, color: '#10b981' }
      ];

      const insertCol = db.prepare(`
        INSERT INTO columns (id, project_id, name, position, color)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const col of defaultCols) {
        insertCol.run(uuidv4(), projectId, col.name, col.pos, col.color);
      }

      // Add invited members if provided
      const insertMember = db.prepare(`
        INSERT OR IGNORE INTO project_members (id, project_id, user_id, role)
        VALUES (?, ?, ?, 'member')
      `);

      for (const mId of memberIds) {
        if (mId && mId !== req.user.id) {
          insertMember.run(uuidv4(), projectId, mId);

          // Create notification for invited user
          const notifId = uuidv4();
          db.prepare(`
            INSERT INTO notifications (id, user_id, type, title, message, data)
            VALUES (?, ?, 'project_invite', ?, ?, ?)
          `).run(
            notifId,
            mId,
            'Project Invitation',
            `${req.user.name} invited you to project "${name.trim()}"`,
            JSON.stringify({ projectId })
          );

          socketService.emitToUser(mId, 'notification_new', {
            id: notifId,
            type: 'project_invite',
            title: 'Project Invitation',
            message: `${req.user.name} invited you to project "${name.trim()}"`,
            data: JSON.stringify({ projectId }),
            read: 0,
            created_at: new Date().toISOString()
          });
        }
      }

      // Log activity
      db.prepare(`
        INSERT INTO activities (id, project_id, user_id, action, details)
        VALUES (?, ?, ?, 'created_project', ?)
      `).run(uuidv4(), projectId, req.user.id, JSON.stringify({ name: name.trim() }));

      const createdProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
      res.status(201).json({ project: createdProject });
    } catch (err) {
      console.error('Create project error:', err);
      res.status(500).json({ error: 'Failed to create project' });
    }
  });

  // GET single project details with members and activity
  router.get('/:id', authenticateToken, (req, res) => {
    try {
      const { id } = req.params;

      const project = db.prepare(`
        SELECT p.*, u.name as owner_name, u.email as owner_email
        FROM projects p
        JOIN users u ON p.owner_id = u.id
        WHERE p.id = ?
      `).get(id);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if user is member
      const member = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(id, req.user.id);
      if (!member) {
        return res.status(403).json({ error: 'You are not a member of this project' });
      }

      // Members list
      const members = db.prepare(`
        SELECT u.id, u.name, u.email, u.avatar_color, u.role as title, pm.role as project_role, pm.joined_at
        FROM project_members pm
        JOIN users u ON pm.user_id = u.id
        WHERE pm.project_id = ?
        ORDER BY pm.joined_at ASC
      `).all(id);

      // Columns list
      const columns = db.prepare(`
        SELECT * FROM columns WHERE project_id = ? ORDER BY position ASC
      `).all(id);

      // Tasks for this project
      const tasks = db.prepare(`
        SELECT t.*, u.name as creator_name
        FROM tasks t
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.project_id = ?
        ORDER BY t.position ASC
      `).all(id);

      // Enrich tasks with assignees, labels, checklists, and comments count
      const assigneesStmt = db.prepare(`
        SELECT u.id, u.name, u.email, u.avatar_color
        FROM task_assignees ta
        JOIN users u ON ta.user_id = u.id
        WHERE ta.task_id = ?
      `);

      const labelsStmt = db.prepare(`
        SELECT id, name, color FROM task_labels WHERE task_id = ?
      `);

      const checklistsStmt = db.prepare(`
        SELECT id, title, completed, position FROM task_checklists WHERE task_id = ? ORDER BY position ASC
      `);

      const commentsCountStmt = db.prepare(`
        SELECT COUNT(*) as count FROM comments WHERE task_id = ?
      `);

      const enrichedTasks = tasks.map(t => ({
        ...t,
        assignees: assigneesStmt.all(t.id),
        labels: labelsStmt.all(t.id),
        checklists: checklistsStmt.all(t.id),
        comments_count: commentsCountStmt.get(t.id).count
      }));

      // Recent activities
      const activities = db.prepare(`
        SELECT a.*, u.name as user_name, u.avatar_color
        FROM activities a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.project_id = ?
        ORDER BY a.created_at DESC
        LIMIT 25
      `).all(id);

      res.json({
        project: {
          ...project,
          user_role: member.role
        },
        members,
        columns,
        tasks: enrichedTasks,
        activities
      });
    } catch (err) {
      console.error('Get project error:', err);
      res.status(500).json({ error: 'Failed to get project details' });
    }
  });

  // PUT update project
  router.put('/:id', authenticateToken, (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, color } = req.body;

      const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
      if (!project) return res.status(404).json({ error: 'Project not found' });

      // Verify member role is owner or admin
      const member = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(id, req.user.id);
      if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
        return res.status(403).json({ error: 'Only project owners and admins can update project settings' });
      }

      db.prepare(`
        UPDATE projects 
        SET name = coalesce(?, name), 
            description = coalesce(?, description), 
            color = coalesce(?, color),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(name ?? null, description ?? null, color ?? null, id);

      const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);

      socketService.emitToProject(id, 'project_updated', updated);

      res.json({ project: updated });
    } catch (err) {
      console.error('Update project error:', err);
      res.status(500).json({ error: 'Failed to update project' });
    }
  });

  // DELETE project
  router.delete('/:id', authenticateToken, (req, res) => {
    try {
      const { id } = req.params;

      const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
      if (!project) return res.status(404).json({ error: 'Project not found' });

      if (project.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'Only the project owner can delete this project' });
      }

      db.prepare('DELETE FROM projects WHERE id = ?').run(id);

      socketService.emitToProject(id, 'project_deleted', { projectId: id });

      res.json({ success: true, message: 'Project deleted' });
    } catch (err) {
      console.error('Delete project error:', err);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  });

  // Add Member to Project
  router.post('/:id/members', authenticateToken, (req, res) => {
    try {
      const { id } = req.params;
      const { userId, role = 'member' } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const existing = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(id, userId);
      if (existing) {
        return res.status(400).json({ error: 'User is already a member of this project' });
      }

      const memberId = uuidv4();
      db.prepare(`
        INSERT INTO project_members (id, project_id, user_id, role)
        VALUES (?, ?, ?, ?)
      `).run(memberId, id, userId, role);

      const user = db.prepare('SELECT id, name, email, avatar_color, role as title FROM users WHERE id = ?').get(userId);
      const project = db.prepare('SELECT name FROM projects WHERE id = ?').get(id);

      // Create notification for added user
      const notifId = uuidv4();
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message, data)
        VALUES (?, ?, 'project_invite', ?, ?, ?)
      `).run(
        notifId,
        userId,
        'Added to Project',
        `${req.user.name} added you to project "${project.name}"`,
        JSON.stringify({ projectId: id })
      );

      socketService.emitToUser(userId, 'notification_new', {
        id: notifId,
        type: 'project_invite',
        title: 'Added to Project',
        message: `${req.user.name} added you to project "${project.name}"`,
        data: JSON.stringify({ projectId: id }),
        read: 0,
        created_at: new Date().toISOString()
      });

      const memberData = {
        ...user,
        project_role: role,
        joined_at: new Date().toISOString()
      };

      // Notify project room
      socketService.emitToProject(id, 'member_added', memberData);

      // Log activity
      db.prepare(`
        INSERT INTO activities (id, project_id, user_id, action, details)
        VALUES (?, ?, ?, 'added_member', ?)
      `).run(uuidv4(), id, req.user.id, JSON.stringify({ memberName: user.name, role }));

      res.status(201).json({ member: memberData });
    } catch (err) {
      console.error('Add member error:', err);
      res.status(500).json({ error: 'Failed to add member' });
    }
  });

  // Remove Member from Project
  router.delete('/:id/members/:userId', authenticateToken, (req, res) => {
    try {
      const { id, userId } = req.params;

      const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(id);
      if (!project) return res.status(404).json({ error: 'Project not found' });

      if (userId === project.owner_id) {
        return res.status(400).json({ error: 'Cannot remove the project owner' });
      }

      // Check permission: either owner/admin or removing oneself
      if (req.user.id !== userId) {
        const callerRole = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(id, req.user.id)?.role;
        if (callerRole !== 'owner' && callerRole !== 'admin') {
          return res.status(403).json({ error: 'Unauthorized to remove members' });
        }
      }

      db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(id, userId);

      // Remove from any assigned tasks in this project
      db.prepare(`
        DELETE FROM task_assignees 
        WHERE user_id = ? AND task_id IN (SELECT id FROM tasks WHERE project_id = ?)
      `).run(userId, id);

      socketService.emitToProject(id, 'member_removed', { userId });

      res.json({ success: true });
    } catch (err) {
      console.error('Remove member error:', err);
      res.status(500).json({ error: 'Failed to remove member' });
    }
  });

  return router;
}
