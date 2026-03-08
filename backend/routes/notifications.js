import { Router } from 'express';
import db from '../src/config/db.js';
import { verifyToken } from '../middleware/authMiddleware.js';
const router = Router();
// ── GET /notifications ──
router.get('/', verifyToken, async (req, res) => {
  try {
    const uid = req.user.userId;
    const { limit, offset, filter } = req.query;
    const lim = Math.min(parseInt(limit) || 30, 100);
    const off = parseInt(offset) || 0;
    let where = 'WHERE user_id=$1';
    if (filter && filter !== 'all') {
      const allowed = ['win', 'deposit', 'withdrawal', 'system'];
      if (allowed.includes(filter)) where += ` AND type='${filter}'`;
    }
    const notifs = (await db.query(
      `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [uid, lim, off]
    )).rows;
    const unread = (await db.query(
      'SELECT COUNT(*) as c FROM notifications WHERE user_id=$1 AND read=false', [uid]
    )).rows[0].c;
    const total = (await db.query(
      `SELECT COUNT(*) as c FROM notifications ${where}`, [uid]
    )).rows[0].c;
    res.json({ notifications: notifs, unread: parseInt(unread), total: parseInt(total) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// ── POST /notifications/:id/read ──
router.post('/:id/read', verifyToken, async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET read=true WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.userId]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// ── POST /notifications/read-all ──
router.post('/read-all', verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE notifications SET read=true WHERE user_id=$1 AND read=false', [req.user.userId]
    );
    res.json({ success: true, updated: result.rowCount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// ── DELETE /notifications/:id ──
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await db.query('DELETE FROM notifications WHERE id=$1 AND user_id=$2', [req.params.id, req.user.userId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// ── DELETE /notifications (clear all) ──
router.delete('/', verifyToken, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM notifications WHERE user_id=$1', [req.user.userId]);
    res.json({ success: true, deleted: result.rowCount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// ── Helper: create notification + push via socket ──
export async function notify(userId, type, title, message, io, userSockets) {
  try {
    const row = (await db.query(
      'INSERT INTO notifications(user_id,type,title,message) VALUES($1,$2,$3,$4) RETURNING *',
      [userId, type, title, message]
    )).rows[0];
    if (io && userSockets) {
      const sid = userSockets.get(userId);
      if (sid) io.to(sid).emit('notification', { id: row.id, type, title, message, read: false, created_at: row.created_at });
    }
    // Keep max 100 notifications per user
    await db.query(
      `DELETE FROM notifications WHERE id IN (
        SELECT id FROM notifications WHERE user_id=$1 ORDER BY created_at DESC OFFSET 100
      )`, [userId]
    );
    return row;
  } catch (e) { console.error('notify error:', e.message); return null; }
}
export default router;