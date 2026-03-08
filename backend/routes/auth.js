import { Router } from 'express';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../src/config/db.js';
import { verifyToken } from '../middleware/authMiddleware.js';
const router = Router();
const nonces = new Map();
const isHotWallet = (addr) => addr.toLowerCase() === process.env.HOT_WALLET_ADDRESS?.toLowerCase();
router.post('/nonce', (req, res) => {
  const { walletAddress } = req.body;
  if (!walletAddress) return res.status(400).json({ error: 'walletAddress required' });
  const addr = walletAddress.toLowerCase();
  if (isHotWallet(addr)) return res.status(403).json({ error: 'System reserved wallet' });
  const nonce = crypto.randomBytes(16).toString('hex');
  nonces.set(addr, { nonce, createdAt: Date.now() });
  for (const [key, val] of nonces) {
    if (Date.now() - val.createdAt > 300000) nonces.delete(key);
  }
  res.json({ nonce, message: `Sign in to CryptoCasino: ${nonce}` });
});
router.post('/verify', async (req, res) => {
  const { walletAddress, signature, referralCode } = req.body;
  if (!walletAddress || !signature) return res.status(400).json({ error: 'walletAddress and signature required' });
  const addr = walletAddress.toLowerCase();
  if (isHotWallet(addr)) return res.status(403).json({ error: 'System reserved wallet' });
  const stored = nonces.get(addr);
  if (!stored) return res.status(400).json({ error: 'Nonce not found, request /nonce first' });
  try {
    const message = `Sign in to CryptoCasino: ${stored.nonce}`;
    const recovered = ethers.verifyMessage(message, signature).toLowerCase();
    if (recovered !== addr) return res.status(401).json({ error: 'Invalid signature' });
    nonces.delete(addr);
    let user = (await db.query('SELECT * FROM users WHERE wallet_address=$1', [addr])).rows[0];
    let isNew = false;
    if (!user) {
      user = (await db.query('INSERT INTO users(wallet_address) VALUES($1) RETURNING *', [addr])).rows[0];
      isNew = true;
      if (referralCode) {
        const referrer = (await db.query(
          'SELECT referrer_id FROM referrals WHERE code=$1 LIMIT 1', [referralCode.toUpperCase()]
        )).rows[0];
        if (referrer && referrer.referrer_id !== user.id) {
          await db.query(
            'INSERT INTO referrals(referrer_id,referred_id,code) VALUES($1,$2,$3)',
            [referrer.referrer_id, user.id, referralCode.toUpperCase()]
          );
        }
      }
    }
    const token = jwt.sign(
      { userId: user.id, wallet: addr, role: user.role || 'user' },
      process.env.JWT_SECRET, { expiresIn: '24h' }
    );
    res.json({ token, user: { id: user.id, wallet: addr, role: user.role || 'user' }, isNew });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = (await db.query('SELECT * FROM users WHERE id=$1', [req.user.userId])).rows[0];
    const balances = (await db.query('SELECT chain,token,amount FROM balances WHERE user_id=$1', [req.user.userId])).rows;
    res.json({ user: { id: user.id, wallet: user.wallet_address, role: user.role, createdAt: user.created_at }, balances });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
export default router;