import { Router } from 'express';
import { ethers } from 'ethers';
import db from '../src/config/db.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { notify } from './notifications.js';
const router = Router();
const AK = process.env.ALCHEMY_API_KEY;
const CHAINS = {
  'polygon-amoy':     { rpc: `https://polygon-amoy.g.alchemy.com/v2/${AK}`, chainId: 80002,    minWithdraw: 0.01,  nativeDecimals: 18 },
  'base-sepolia':     { rpc: `https://base-sepolia.g.alchemy.com/v2/${AK}`, chainId: 84532,    minWithdraw: 0.001, nativeDecimals: 18 },
  'arbitrum-sepolia': { rpc: `https://arb-sepolia.g.alchemy.com/v2/${AK}`,  chainId: 421614,   minWithdraw: 0.001, nativeDecimals: 18 },
  'sepolia':          { rpc: `https://eth-sepolia.g.alchemy.com/v2/${AK}`,  chainId: 11155111, minWithdraw: 0.001, nativeDecimals: 18 },
  'bsc-testnet':      { rpc: 'https://data-seed-prebsc-1-s1.binance.org:8545', chainId: 97,    minWithdraw: 0.01,  nativeDecimals: 18 },
  'avalanche-fuji':   { rpc: 'https://api.avax-test.network/ext/bc/C/rpc',  chainId: 43113,    minWithdraw: 0.01,  nativeDecimals: 18 },
  'optimism-sepolia': { rpc: `https://opt-sepolia.g.alchemy.com/v2/${AK}`,  chainId: 11155420, minWithdraw: 0.001, nativeDecimals: 18 },
  'fantom-testnet':   { rpc: 'https://rpc.testnet.fantom.network',          chainId: 4002,     minWithdraw: 0.1,   nativeDecimals: 18 },
  'scroll-sepolia':   { rpc: 'https://sepolia-rpc.scroll.io',               chainId: 534351,   minWithdraw: 0.001, nativeDecimals: 18 },
  'mantle-sepolia':   { rpc: 'https://rpc.sepolia.mantle.xyz',              chainId: 5003,     minWithdraw: 0.01,  nativeDecimals: 18 },
};
function socketNotify(app, userId, event, data) {
  const io = app.get('io');
  const socketId = app.get('userSockets').get(userId);
  if (socketId) io.to(socketId).emit(event, data);
}
async function refundWithdrawal(txId, userId, amount, chain) {
  await db.query("UPDATE transactions SET status='failed' WHERE id=$1", [txId]);
  await db.query(
    "UPDATE balances SET amount=amount+$1 WHERE user_id=$2 AND chain=$3 AND token='NATIVE'",
    [amount, userId, chain]
  );
}
async function processWithdrawal(txId, toAddress, amount, chain, userId, app) {
  const config = CHAINS[chain];
  const io = app.get('io');
  const userSockets = app.get('userSockets');
  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(process.env.HOT_WALLET_PRIVATE_KEY, provider);
    const txResponse = await wallet.sendTransaction({ to: toAddress, value: ethers.parseEther(amount.toString()) });
    await db.query("UPDATE transactions SET tx_hash=$1,status='processing' WHERE id=$2", [txResponse.hash, txId]);
    socketNotify(app, userId, 'withdrawal:processing', { id: txId, txHash: txResponse.hash, chain });
    notify(userId, 'withdrawal', 'Withdrawal Sent', `TX submitted: ${txResponse.hash.slice(0,12)}... (${chain})`, io, userSockets);
    const receipt = await txResponse.wait(1);
    if (receipt.status === 1) {
      await db.query("UPDATE transactions SET status='confirmed' WHERE id=$1", [txId]);
      socketNotify(app, userId, 'withdrawal:confirmed', { id: txId, txHash: txResponse.hash, amount, chain });
      notify(userId, 'withdrawal', 'Withdrawal Confirmed', `${amount} withdrawn on ${chain} — TX: ${txResponse.hash.slice(0,12)}...`, io, userSockets);
    } else {
      await refundWithdrawal(txId, userId, amount, chain);
      socketNotify(app, userId, 'withdrawal:failed', { id: txId, reason: 'Transazione fallita' });
      notify(userId, 'system', 'Withdrawal Failed', `${amount} on ${chain} — funds refunded to balance`, io, userSockets);
    }
  } catch (err) {
    console.error(`Withdrawal  ${txId} failed:`, err.message);
    await refundWithdrawal(txId, userId, amount, chain);
    socketNotify(app, userId, 'withdrawal:failed', { id: txId, reason: err.message });
    notify(userId, 'system', 'Withdrawal Failed', `${amount} on ${chain} — ${err.message}. Funds refunded.`, io, userSockets);
  }
}
router.post('/request', verifyToken, async (req, res) => {
  const { amount, token, chain, toAddress } = req.body;
  const userId = req.user.userId;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  if (!token || !chain) return res.status(400).json({ error: 'Token and chain required' });
  if (!toAddress || !ethers.isAddress(toAddress)) return res.status(400).json({ error: 'Invalid address' });
  if (!CHAINS[chain]) return res.status(400).json({ error: 'Unsupported chain' });
  if (amount < CHAINS[chain].minWithdraw) return res.status(400).json({ error: `Minimum: ${CHAINS[chain].minWithdraw}` });
  try {
    const bal = (await db.query(
      'SELECT amount FROM balances WHERE user_id=$1 AND chain=$2 AND token=$3', [userId, chain, token]
    )).rows[0];
    if (!bal || parseFloat(bal.amount) < amount) return res.status(400).json({ error: 'Insufficient balance' });
    const pending = (await db.query(
      "SELECT id FROM transactions WHERE user_id=$1 AND type='withdrawal' AND status='pending'", [userId]
    )).rows;
    if (pending.length > 0) return res.status(400).json({ error: 'You already have a pending withdrawal' });
    await db.query('UPDATE balances SET amount=amount-$1 WHERE user_id=$2 AND chain=$3 AND token=$4', [amount, userId, chain, token]);
    const tx = (await db.query(
      "INSERT INTO transactions(user_id,type,chain,token,amount,status) VALUES($1,'withdrawal',$2,$3,$4,'pending') RETURNING *",
      [userId, chain, token, amount]
    )).rows[0];
    processWithdrawal(tx.id, toAddress, amount, chain, userId, req.app);
    res.json({ id: tx.id, status: 'pending', message: 'Withdrawal processing' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/history', verifyToken, async (req, res) => {
  try {
    const txs = (await db.query(
      "SELECT * FROM transactions WHERE user_id=$1 AND type='withdrawal' ORDER BY created_at DESC LIMIT 20", [req.user.userId]
    )).rows;
    res.json({ withdrawals: txs });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
export default router;