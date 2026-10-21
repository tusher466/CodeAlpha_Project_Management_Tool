import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

export default function createColumnsRouter(socketService) {
  const router = express.Router();

  // Create new column
  router.post('/:projectId/columns', authenticateToken, (req, res) => {
    try {
      const { projectId } = req.params;
      const { name, color = '#64748b' } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Column name is required' });
      }

      // Calculate next position
      const maxPosRow = db.prepare('SELECT MAX(position) as maxPos FROM columns WHERE project_id = ?').get(projectId);
      const nextPos = (maxPosRow && maxPosRow.maxPos !== null) ? maxPosRow.maxPos + 1 : 0;

      const columnId = uuidv4();
      db.prepare(`
        INSERT INTO columns (id, project_id, name, position, color)
        VALUES (?, ?, ?, ?, ?)
      `).run(columnId, projectId, name.trim(), nextPos, color);

      const column = db.prepare('SELECT * FROM columns WHERE id = ?').get(columnId);

      socketService.emitToProject(projectId, 'column_created', column);

      res.status(201).json({ column });
    } catch (err) {
      console.error('Create column error:', err);
      res.status(500).json({ error: 'Failed to create column' });
    }
  });

  // Update column (name, color)
  router.put('/columns/:columnId', authenticateToken, (req, res) => {
    try {
      const { columnId } = req.params;
      const { name, color } = req.body;

      const column = db.prepare('SELECT * FROM columns WHERE id = ?').get(columnId);
      if (!column) return res.status(404).json({ error: 'Column not found' });

      db.prepare(`
        UPDATE columns
        SET name = coalesce(?, name),
            color = coalesce(?, color)
        WHERE id = ?
      `).run(name ?? null, color ?? null, columnId);

      const updated = db.prepare('SELECT * FROM columns WHERE id = ?').get(columnId);

      socketService.emitToProject(column.project_id, 'column_updated', updated);

      res.json({ column: updated });
    } catch (err) {
      console.error('Update column error:', err);
      res.status(500).json({ error: 'Failed to update column' });
    }
  });

  // Reorder columns
  router.put('/:projectId/columns/reorder', authenticateToken, (req, res) => {
    try {
      const { projectId } = req.params;
      const { columnIds } = req.body; // array of column ids in order

      if (!Array.isArray(columnIds)) {
        return res.status(400).json({ error: 'columnIds array required' });
      }

      const updateStmt = db.prepare('UPDATE columns SET position = ? WHERE id = ? AND project_id = ?');

      columnIds.forEach((colId, index) => {
        updateStmt.run(index, colId, projectId);
      });

      const columns = db.prepare('SELECT * FROM columns WHERE project_id = ? ORDER BY position ASC').all(projectId);

      socketService.emitToProject(projectId, 'columns_reordered', columns);

      res.json({ columns });
    } catch (err) {
      console.error('Reorder columns error:', err);
      res.status(500).json({ error: 'Failed to reorder columns' });
    }
  });

  // Delete column
  router.delete('/columns/:columnId', authenticateToken, (req, res) => {
    try {
      const { columnId } = req.params;

      const column = db.prepare('SELECT * FROM columns WHERE id = ?').get(columnId);
      if (!column) return res.status(404).json({ error: 'Column not found' });

      // Count tasks in column
      const tasksInCol = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE column_id = ?').get(columnId).count;
      if (tasksInCol > 0) {
        return res.status(400).json({ error: 'Cannot delete column with tasks. Please move or delete the tasks first.' });
      }

      db.prepare('DELETE FROM columns WHERE id = ?').run(columnId);

      socketService.emitToProject(column.project_id, 'column_deleted', { columnId });

      res.json({ success: true });
    } catch (err) {
      console.error('Delete column error:', err);
      res.status(500).json({ error: 'Failed to delete column' });
    }
  });

  return router;
}
