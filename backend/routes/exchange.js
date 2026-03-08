import { Router } from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import * as exchange from '../src/services/exchange.js';
import db from '../src/config/db.js';
const router = Router();
router.get('/tokens', (req, res) => {
  res.json({ tokens: exchange.TOKENS });
});
router.post('/quote', verifyToken, async (req, res) => {
  const { fromToken, toToken, amount, chain } = req.body;
  if (!fromToken || !toToken || !amount || !chain) return res.status(400).json({ error: 'Missing parameters' });
  if (fromToken === toToken) return res.status(400).json({ error: 'Tokens must be different' });
  if (amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  try {
    const quote = await exchange.getQuote(fromToken, toToken, parseFloat(amount), chain);
    res.json(quote);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router.post('/swap', verifyToken, async (req, res) => {
  const { fromToken, toToken, amount, chain } = req.body;
  if (!fromToken || !toToken || !amount || !chain) return res.status(400).json({ error: 'Missing parameters' });
  if (fromToken === toToken) return res.status(400).json({ error: 'Tokens must be different' });
  if (amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  try {
    const result = await exchange.executeSwap(req.user.userId, fromToken, toToken, parseFloat(amount), chain);
    const balances = (await db.query('SELECT chain, token, amount FROM balances WHERE user_id = $1', [req.user.userId])).rows;
    const io = req.app.get('io');
    const userSockets = req.app.get('userSockets');
    const socketId = userSockets.get(req.user.userId);
    if (socketId) io.to(socketId).emit('swap:completed', { ...result, balances });
    res.json({ ...result, balances });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router.get('/prices', async (req, res) => {
  try {
    const prices = await exchange.getPrices(req.query.chain);
    res.json(prices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
export default router;