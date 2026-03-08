
import { Router } from 'express';
import db from '../src/config/db.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import crypto from 'crypto';
const router = Router();
// ── Profile Stats ──
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const uid = req.user.userId;
    const [bets, wins, streak] = await Promise.all([
      db.query("SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as wagered FROM bets WHERE user_id=$1", [uid]),
      db.query("SELECT COUNT(*) as c FROM bets WHERE user_id=$1 AND payout>0", [uid]),
      db.query("SELECT payout FROM bets WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50", [uid]),
    ]);
    const totalBets = parseInt(bets.rows[0].c);
    const totalWins = parseInt(wins.rows[0].c);
    let maxStreak = 0, cur = 0;
    for (const b of streak.rows) { if (parseFloat(b.payout) > 0) { cur++; maxStreak = Math.max(maxStreak, cur); } else cur = 0; }
    res.json({
      totalBets, totalWins, winRate: totalBets > 0 ? ((totalWins/totalBets)*100).toFixed(1) : '0',
      totalWagered: parseFloat(bets.rows[0].wagered), maxStreak,
    });
  } catch(err){ res.status(500).json({error:err.message}); }
});
// ── Full History (bets + transactions) ──
router.get('/history', verifyToken, async (req, res) => {
  try {
    const uid = req.user.userId;
    const { limit, offset } = req.query;
    const lim = Math.min(parseInt(limit)||30, 100);
    const off = parseInt(offset)||0;
    const bets = (await db.query(
      "SELECT 'bet' as source, game as title, amount, payout, result, created_at FROM bets WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [uid, lim, off]
    )).rows;
    const txs = (await db.query(
      "SELECT 'tx' as source, type as title, amount, token, chain, status, created_at FROM transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [uid, lim, off]
    )).rows;
    const all = [...bets, ...txs].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0, lim);
    res.json({ history: all });
  } catch(err){ res.status(500).json({error:err.message}); }
});
// ── Referral ──
router.get('/referral', verifyToken, async (req, res) => {
  try {
    const uid = req.user.userId;
    let ref = (await db.query("SELECT * FROM referrals WHERE referrer_id=$1 LIMIT 1", [uid])).rows[0];
    if (!ref) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      ref = (await db.query(
        "INSERT INTO referrals(referrer_id, referred_id, code) VALUES($1,$1,$2) RETURNING *", [uid, code]
      )).rows[0];
    }
    const stats = (await db.query(
      "SELECT COUNT(*) as refs, COALESCE(SUM(commission_earned),0) as earned FROM referrals WHERE referrer_id=$1 AND referred_id!=$1", [uid]
    )).rows[0];
    res.json({ code: ref.code, referrals: parseInt(stats.refs), earned: parseFloat(stats.earned) });
  } catch(err){ res.status(500).json({error:err.message}); }
});
// ── Top Referrers ──
router.get('/referral/top', verifyToken, async (req, res) => {
  try {
    const top = (await db.query(`
      SELECT r.referrer_id, u.wallet_address, COUNT(*) as refs, COALESCE(SUM(r.commission_earned),0) as earned
      FROM referrals r JOIN users u ON u.id=r.referrer_id
      WHERE r.referred_id!=r.referrer_id
      GROUP BY r.referrer_id, u.wallet_address ORDER BY earned DESC LIMIT 10
    `)).rows;
    res.json({ top });
  } catch(err){ res.status(500).json({error:err.message}); }
});
export default router;