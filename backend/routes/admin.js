
import { Router } from 'express';
import db from '../src/config/db.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';
const router = Router();
const mw = [verifyToken, isAdmin];
// ── Dashboard Stats ──
router.get('/stats', mw, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const [revToday, usersTotal, usersToday, betsToday, totalDep, totalWth, pendingWth, weekRev] = await Promise.all([
      db.query("SELECT COALESCE(SUM(amount-payout),0) as rev FROM bets WHERE created_at>=$1", [today]),
      db.query("SELECT COUNT(*) as c FROM users"),
      db.query("SELECT COUNT(*) as c FROM users WHERE created_at>=$1", [today]),
      db.query("SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as vol FROM bets WHERE created_at>=$1", [today]),
      db.query("SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE type='deposit' AND status='confirmed'"),
      db.query("SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE type='withdrawal' AND status='confirmed'"),
      db.query("SELECT COUNT(*) as c FROM transactions WHERE type='withdrawal' AND status='pending'"),
      db.query(`SELECT DATE(created_at) as d, COALESCE(SUM(amount-payout),0) as rev FROM bets WHERE created_at>=NOW()-INTERVAL '7 days' GROUP BY DATE(created_at) ORDER BY d`),
    ]);
    const gamePerf = (await db.query(
      "SELECT game, COUNT(*) as c, COALESCE(SUM(amount),0) as vol FROM bets WHERE created_at>=$1 GROUP BY game ORDER BY vol DESC", [today]
    )).rows;
    const totalBetsVol = gamePerf.reduce((s,g)=>s+parseFloat(g.vol),0)||1;
    res.json({
      revenueToday: parseFloat(revToday.rows[0].rev),
      totalUsers: parseInt(usersTotal.rows[0].c),
      newUsersToday: parseInt(usersToday.rows[0].c),
      betsToday: parseInt(betsToday.rows[0].c),
      betsVolume: parseFloat(betsToday.rows[0].vol),
      totalDeposits: parseFloat(totalDep.rows[0].t),
      totalWithdrawals: parseFloat(totalWth.rows[0].t),
      pendingWithdrawals: parseInt(pendingWth.rows[0].c),
      weekRevenue: weekRev.rows.map(r=>({date:r.d, revenue:parseFloat(r.rev)})),
      gamePerformance: gamePerf.map(g=>({name:g.game, bets:parseInt(g.c), volume:parseFloat(g.vol), pct:Math.round(parseFloat(g.vol)/totalBetsVol*100)})),
    });
  } catch(err){ res.status(500).json({error:err.message}); }
});
// ── Users ──
router.get('/users', mw, async (req, res) => {
  try {
    const { filter, search, limit, offset } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (filter === 'banned') { where += " AND u.role='banned'"; }
    else if (filter === 'admin') { where += " AND u.role='admin'"; }
    else if (filter === 'today') { where += " AND u.created_at>=CURRENT_DATE"; }
    if (search) { params.push(`%${search}%`); where += ` AND u.wallet_address ILIKE $${params.length}`; }
    const lim = Math.min(parseInt(limit)||50, 100);
    const off = parseInt(offset)||0;
    params.push(lim, off);
    const users = (await db.query(`
      SELECT u.id, u.wallet_address, u.role, u.created_at,
        COALESCE((SELECT SUM(amount) FROM balances WHERE user_id=u.id),0) as total_balance,
        COALESCE((SELECT COUNT(*) FROM bets WHERE user_id=u.id),0) as total_bets,
        COALESCE((SELECT SUM(amount) FROM bets WHERE user_id=u.id),0) as total_wagered
      FROM users u ${where} ORDER BY u.created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}
    `, params)).rows;
    const total = (await db.query(`SELECT COUNT(*) as c FROM users u ${where}`, params.slice(0,-2))).rows[0].c;
    res.json({ users, total: parseInt(total) });
  } catch(err){ res.status(500).json({error:err.message}); }
});
// ── Ban/Unban ──
router.post('/users/:id/ban', mw, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'ban' or 'unban'
    const role = action === 'ban' ? 'banned' : 'user';
    await db.query('UPDATE users SET role=$1 WHERE id=$2', [role, id]);
    res.json({ success: true, userId: id, role });
  } catch(err){ res.status(500).json({error:err.message}); }
});
// ── Transactions ──
router.get('/transactions', mw, async (req, res) => {
  try {
    const { filter, limit, offset } = req.query;
    let where = 'WHERE 1=1';
    if (filter === 'deposits') where += " AND t.type='deposit'";
    else if (filter === 'withdrawals') where += " AND t.type='withdrawal'";
    else if (filter === 'pending') where += " AND t.status='pending'";
    const lim = Math.min(parseInt(limit)||30, 100);
    const off = parseInt(offset)||0;
    const txs = (await db.query(`
      SELECT t.*, u.wallet_address FROM transactions t
      JOIN users u ON u.id=t.user_id ${where}
      ORDER BY t.created_at DESC LIMIT $1 OFFSET $2
    `, [lim, off])).rows;
    res.json({ transactions: txs });
  } catch(err){ res.status(500).json({error:err.message}); }
});
// ── Approve/Reject Withdrawal ──
router.post('/withdrawals/:id/approve', mw, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve' or 'reject'
    if (action === 'reject') {
      const tx = (await db.query("SELECT * FROM transactions WHERE id=$1 AND type='withdrawal' AND status='pending'", [id])).rows[0];
      if (!tx) return res.status(400).json({ error: 'Not found' });
      await db.query("UPDATE transactions SET status='rejected' WHERE id=$1", [id]);
      await db.query('UPDATE balances SET amount=amount+$1 WHERE user_id=$2 AND chain=$3 AND token=$4', [tx.amount, tx.user_id, tx.chain, tx.token]);
      return res.json({ success: true, action: 'rejected' });
    }
    await db.query("UPDATE transactions SET status='approved' WHERE id=$1", [id]);
    res.json({ success: true, action: 'approved' });
  } catch(err){ res.status(500).json({error:err.message}); }
});
// ── Big Wins ──
router.get('/big-wins', mw, async (req, res) => {
  try {
    const wins = (await db.query(`
      SELECT b.*, u.wallet_address FROM bets b JOIN users u ON u.id=b.user_id
      WHERE b.payout>0 ORDER BY b.payout DESC LIMIT 20
    `)).rows;
    res.json({ wins });
  } catch(err){ res.status(500).json({error:err.message}); }
});
export default router;