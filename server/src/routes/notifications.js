import express from 'express';
import db from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

export default function createNotificationsRouter() {
  const router = express.Router();

  // GET notifications for current user
  router.get('/', authenticateToken, (req, res) => {
    try {
      const notifications = db.prepare(`
        SELECT * FROM notifications 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 50
      `).all(req.user.id);

      const unreadCount = db.prepare(`
        SELECT COUNT(*) as count 
        FROM notifications 
        WHERE user_id = ? AND read = 0
      `).get(req.user.id).count;

      res.json({ notifications, unreadCount });
    } catch (err) {
      console.error('Get notifications error:', err);
      res.status(500).json({ error: 'Failed to get notifications' });
    }
  });

  // PUT mark single notification as read
  router.put('/:id/read', authenticateToken, (req, res) => {
    try {
      const { id } = req.params;
      db.prepare(`
        UPDATE notifications 
        SET read = 1 
        WHERE id = ? AND user_id = ?
      `).run(id, req.user.id);

      res.json({ success: true });
    } catch (err) {
      console.error('Mark read error:', err);
      res.status(500).json({ error: 'Failed to update notification' });
    }
  });

  // PUT mark all as read
  router.put('/mark-all-read', authenticateToken, (req, res) => {
    try {
      db.prepare(`
        UPDATE notifications 
        SET read = 1 
        WHERE user_id = ?
      `).run(req.user.id);

      res.json({ success: true });
    } catch (err) {
      console.error('Mark all read error:', err);
      res.status(500).json({ error: 'Failed to update notifications' });
    }
  });

  // DELETE notification
  router.delete('/:id', authenticateToken, (req, res) => {
    try {
      const { id } = req.params;
      db.prepare(`
        DELETE FROM notifications 
        WHERE id = ? AND user_id = ?
      `).run(id, req.user.id);

      res.json({ success: true });
    } catch (err) {
      console.error('Delete notification error:', err);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  });

  return router;
}
