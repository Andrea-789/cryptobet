import { Router } from 'express';
import db from '../src/config/db.js';
import { verifyToken } from '../middleware/authMiddleware.js';
const router = Router();
const TIERS = [
  { name:'bronze', threshold:0, rakeback:0.01, weeklyBonus:10 },
  { name:'silver', threshold:1000, rakeback:0.02, weeklyBonus:25 },
  { name:'gold', threshold:5000, rakeback:0.03, weeklyBonus:50 },
  { name:'diamond', threshold:20000, rakeback:0.05, weeklyBonus:100 },
  { name:'platinum', threshold:50000, rakeback:0.08, weeklyBonus:250 },
  { name:'obsidian', threshold:200000, rakeback:0.15, weeklyBonus:1000 },
];
function getTier(wagered) {
  let idx = 0;
  for (let i = TIERS.length - 1; i >= 0; i--) { if (wagered >= TIERS[i].threshold) { idx = i; break; } }
  return { idx, tier: TIERS[idx] };
}
// ── Ensure vip_progress row exists ──
async function ensureVip(userId) {
  let row = (await db.query('SELECT * FROM vip_progress WHERE user_id=$1', [userId])).rows[0];
  if (!row) {
    row = (await db.query(
      'INSERT INTO vip_progress(user_id,total_wagered,tier) VALUES($1,0,$2) ON CONFLICT(user_id) DO NOTHING RETURNING *',
      [userId, 'bronze']
    )).rows[0];
    if (!row) row = (await db.query('SELECT * FROM vip_progress WHERE user_id=$1', [userId])).rows[0];
  }
  return row;
}
// ── GET /vip/status ──
router.get('/status', verifyToken, async (req, res) => {
  try {
    const vip = await ensureVip(req.user.userId);
    const wagered = parseFloat(vip.total_wagered);
    const { idx, tier } = getTier(wagered);
    const next = TIERS[idx + 1] || null;
    const progress = next ? Math.min(100, ((wagered - tier.threshold) / (next.threshold - tier.threshold)) * 100) : 100;
    res.json({
      tier: tier.name,
      tierIdx: idx,
      totalTiers: TIERS.length,
      totalWagered: wagered,
      rakeback: tier.rakeback,
      weeklyBonus: tier.weeklyBonus,
      nextTier: next ? { name: next.name, threshold: next.threshold, remaining: next.threshold - wagered } : null,
      progress: parseFloat(progress.toFixed(2)),
      lastClaim: vip.last_claim,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// ── GET /vip/rewards ──
router.get('/rewards', verifyToken, async (req, res) => {
  try {
    const vip = await ensureVip(req.user.userId);
    const wagered = parseFloat(vip.total_wagered);
    const { idx, tier } = getTier(wagered);
    const now = new Date();
    const lastClaim = vip.last_claim ? new Date(vip.last_claim) : null;
    const daysSinceClaim = lastClaim ? (now - lastClaim) / 86400000 : 999;
    // Rakeback: claimable once per day, based on wagered since last claim
    const rakebackWager = (await db.query(
      "SELECT COALESCE(SUM(amount),0) as w FROM bets WHERE user_id=$1 AND created_at > COALESCE($2, '1970-01-01')",
      [req.user.userId, vip.last_claim]
    )).rows[0].w;
    const rakebackAmt = parseFloat((parseFloat(rakebackWager) * tier.rakeback).toFixed(6));
    // Weekly bonus: claimable if 7+ days since last claim
    const weeklyReady = daysSinceClaim >= 7;
    const rewards = [
      { id: 'rakeback', name: 'Rakeback', description: `${(tier.rakeback*100).toFixed(0)}% of wagered since last claim`, amount: rakebackAmt, claimable: rakebackAmt > 0 && daysSinceClaim >= 1, cooldown: daysSinceClaim < 1 ? Math.ceil((1 - daysSinceClaim) * 24) + 'h' : null },
      { id: 'weekly', name: 'Weekly Bonus', description: `$${tier.weeklyBonus} bonus for ${tier.name} tier`, amount: tier.weeklyBonus, claimable: weeklyReady, cooldown: !weeklyReady ? Math.ceil(7 - daysSinceClaim) + 'd' : null },
    ];
    res.json({ rewards, tier: tier.name, tierIdx: idx });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// ── POST /vip/claim ──
router.post('/claim', verifyToken, async (req, res) => {
  const { rewardId } = req.body;
  if (!['rakeback', 'weekly'].includes(rewardId)) return res.status(400).json({ error: 'Invalid reward' });
  try {
    const uid = req.user.userId;
    const vip = await ensureVip(uid);
    const wagered = parseFloat(vip.total_wagered);
    const { tier } = getTier(wagered);
    const now = new Date();
    const lastClaim = vip.last_claim ? new Date(vip.last_claim) : null;
    const daysSinceClaim = lastClaim ? (now - lastClaim) / 86400000 : 999;
    let payout = 0;
    if (rewardId === 'rakeback') {
      if (daysSinceClaim < 1) return res.status(400).json({ error: 'Rakeback already claimed today' });
      const rakebackWager = (await db.query(
        "SELECT COALESCE(SUM(amount),0) as w FROM bets WHERE user_id=$1 AND created_at > COALESCE($2, '1970-01-01')",
        [uid, vip.last_claim]
      )).rows[0].w;
      payout = parseFloat((parseFloat(rakebackWager) * tier.rakeback).toFixed(6));
      if (payout <= 0) return res.status(400).json({ error: 'Rakeback already claimed today' });
    } else if (rewardId === 'weekly') {
      if (daysSinceClaim < 7) return res.status(400).json({ error: 'Weekly bonus not yet available' });
      payout = tier.weeklyBonus;
    }
    // Credit to first available balance, or create one on polygon-amoy/ETH
    const bal = (await db.query('SELECT chain,token FROM balances WHERE user_id=$1 LIMIT 1', [uid])).rows[0];
    const chain = bal?.chain || 'polygon-amoy';
    const token = bal?.token || 'ETH';
    await db.query(
      'INSERT INTO balances(user_id,chain,token,amount) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,chain,token) DO UPDATE SET amount=balances.amount+$4',
      [uid, chain, token, payout]
    );
    await db.query('UPDATE vip_progress SET last_claim=NOW(),updated_at=NOW() WHERE user_id=$1', [uid]);
    // Log transaction
    await db.query(
      "INSERT INTO transactions(user_id,type,chain,token,amount,status) VALUES($1,'vip_reward',$2,$3,$4,'confirmed')",
      [uid, chain, token, payout]
    );
    // Notification
    await db.query(
      "INSERT INTO notifications(user_id,type,title,message) VALUES($1,'system',$2,$3)",
      [uid, 'VIP Reward Claimed', `${rewardId === 'rakeback' ? 'Rakeback' : 'Weekly Bonus'}: +${payout} ${token}`]
    );
    // Socket notify
    const io = req.app.get('io');
    const sockets = req.app.get('userSockets');
    const sid = sockets.get(uid);
    if (sid) io.to(sid).emit('vip:claimed', { rewardId, payout, token, chain });
    res.json({ success: true, rewardId, payout, token, chain });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// ── Helper: update wagered (chiamato da games.js) ──
export async function trackWager(userId, amount) {
  try {
    const vip = await ensureVip(userId);
    const newTotal = parseFloat(vip.total_wagered) + parseFloat(amount);
    const { tier } = getTier(newTotal);
    const oldTier = vip.tier;
    await db.query(
      'UPDATE vip_progress SET total_wagered=$1, tier=$2, updated_at=NOW() WHERE user_id=$3',
      [newTotal, tier.name, userId]
    );
    // Tier upgrade notification
    if (tier.name !== oldTier) {
      await db.query(
        "INSERT INTO notifications(user_id,type,title,message) VALUES($1,'system',$2,$3)",
        [userId, 'VIP Tier Upgrade!', `Congratulations! You reached ${tier.name.toUpperCase()} tier.`]
      );
    }
  } catch (e) { console.error('trackWager error:', e.message); }
}
export default router;