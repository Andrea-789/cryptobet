import { Router } from 'express';
import db from '../src/config/db.js';
import { verifyToken } from '../middleware/authMiddleware.js';
const router = Router();
function periodFilter(period) {
  if (period === 'today') return "AND b.created_at >= NOW() - INTERVAL '1 day'";
  if (period === 'weekly') return "AND b.created_at >= NOW() - INTERVAL '7 days'";
  if (period === 'monthly') return "AND b.created_at >= NOW() - INTERVAL '30 days'";
  return '';
}
function gameFilter(game) {
  if (!game || game === 'all') return '';
  const allowed = ['crash','slots','mines','roulette','blackjack','dice','hilo','plinko'];
  if (!allowed.includes(game)) return '';
  return `AND b.game = '${game}'`;
}
function orderCol(tab) {
  if (tab === 'profit') return 'profit';
  if (tab === 'wins') return 'wins';
  if (tab === 'streak') return 'wagered'; // streak needs special handling, fallback to wagered
  if (tab === 'multiplier') return 'best_multi';
  return 'wagered';
}
router.get('/', verifyToken, async (req, res) => {
  try {
    const { tab = 'wagered', period = 'weekly', game = 'all' } = req.query;
    const uid = req.user.userId;
    const pf = periodFilter(period);
    const gf = gameFilter(game);
    // Main leaderboard query
    const lbQuery = `
      SELECT
        u.id,
        u.wallet_address AS wallet,
        COUNT(b.id) AS bets,
        COALESCE(SUM(b.amount),0) AS wagered,
        COUNT(CASE WHEN b.payout > 0 THEN 1 END) AS wins,
        COALESCE(SUM(b.payout - b.amount),0) AS profit,
        CASE WHEN MAX(b.amount) > 0
          THEN COALESCE(MAX(b.payout / NULLIF(b.amount,0)),0)
          ELSE 0
        END AS best_multi
      FROM bets b
      JOIN users u ON u.id = b.user_id
      WHERE 1=1 ${pf} ${gf}
      GROUP BY u.id, u.wallet_address
      HAVING COUNT(b.id) > 0
      ORDER BY ${orderCol(tab)} DESC
      LIMIT 50
    `;
    const lbResult = await db.query(lbQuery);
    const leaderboard = lbResult.rows.map(r => ({
      wallet: r.wallet,
      bets: parseInt(r.bets),
      wagered: parseFloat(r.wagered),
      wins: parseInt(r.wins),
      profit: parseFloat(r.profit),
      bestMulti: parseFloat(r.best_multi),
    }));
    // Totals
    const totalsQuery = `
      SELECT
        COUNT(DISTINCT b.user_id) AS total_players,
        COUNT(b.id) AS total_bets,
        COALESCE(SUM(b.amount),0) AS total_wagered
      FROM bets b
      WHERE 1=1 ${pf} ${gf}
    `;
    const totals = (await db.query(totalsQuery)).rows[0];
    // My rank
    let myRank = null;
    const col = orderCol(tab);
    const myQuery = `
      SELECT ranked.rank, ranked.bets, ranked.wagered, ranked.profit FROM (
        SELECT
          u.id,
          COUNT(b.id) AS bets,
          COALESCE(SUM(b.amount),0) AS wagered,
          COALESCE(SUM(b.payout - b.amount),0) AS profit,
          CASE WHEN MAX(b.amount) > 0
            THEN COALESCE(MAX(b.payout / NULLIF(b.amount,0)),0)
            ELSE 0
          END AS best_multi,
          RANK() OVER (ORDER BY ${col === 'best_multi'
            ? 'CASE WHEN MAX(b.amount)>0 THEN COALESCE(MAX(b.payout/NULLIF(b.amount,0)),0) ELSE 0 END'
            : col === 'wins'
              ? 'COUNT(CASE WHEN b.payout>0 THEN 1 END)'
              : col === 'profit'
                ? 'COALESCE(SUM(b.payout-b.amount),0)'
                : 'COALESCE(SUM(b.amount),0)'
          } DESC) AS rank
        FROM bets b
        JOIN users u ON u.id = b.user_id
        WHERE 1=1 ${pf} ${gf}
        GROUP BY u.id
      ) ranked
      WHERE ranked.id = $1
    `;
    const myResult = await db.query(myQuery, [uid]);
    if (myResult.rows.length) {
      const m = myResult.rows[0];
      myRank = { rank: parseInt(m.rank), bets: parseInt(m.bets), wagered: parseFloat(m.wagered), profit: parseFloat(m.profit) };
    }
    res.json({
      leaderboard,
      myRank,
      totalPlayers: parseInt(totals.total_players),
      totalBets: parseInt(totals.total_bets),
      totalWagered: parseFloat(totals.total_wagered),
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: err.message });
  }
});
export default router;