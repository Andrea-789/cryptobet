import { Router } from 'express';
import crypto from 'crypto';
import db from '../src/config/db.js';
import { notify } from './notifications.js';
const router = Router();
const SUPPORTED_TOKENS = {
  'polygon-amoy': {
    native: { symbol: 'POL', decimals: 18 },
  },
  'base-sepolia': {
    native: { symbol: 'ETH', decimals: 18 },
  },
  'arbitrum-sepolia': {
    native: { symbol: 'ETH', decimals: 18 },
  },
  'sepolia': {
    native: { symbol: 'ETH', decimals: 18 },
  },
  'bsc-testnet': {
    native: { symbol: 'tBNB', decimals: 18 },
  },
  'avalanche-fuji': {
    native: { symbol: 'AVAX', decimals: 18 },
  },
  'optimism-sepolia': {
    native: { symbol: 'ETH', decimals: 18 },
  },
  'fantom-testnet': {
    native: { symbol: 'FTM', decimals: 18 },
  },
  'scroll-sepolia': {
    native: { symbol: 'ETH', decimals: 18 },
  },
  'mantle-sepolia': {
    native: { symbol: 'MNT', decimals: 18 },
  },
};
const ALCHEMY_NETWORK_MAP = {
  'MATIC_AMOY': 'polygon-amoy',
  'MATIC_MUMBAI': 'polygon-amoy', 
  'BASE_SEPOLIA': 'base-sepolia',
  'ARB_SEPOLIA': 'arbitrum-sepolia',
  'ETH_SEPOLIA': 'sepolia',
  'BNB_TESTNET': 'bsc-testnet',
  'AVAX_FUJI': 'avalanche-fuji',
  'OPT_SEPOLIA': 'optimism-sepolia',
  'FANTOM_TESTNET': 'fantom-testnet',
  'SCROLL_SEPOLIA': 'scroll-sepolia',
  'MANTLE_SEPOLIA': 'mantle-sepolia',
};
const verifyAlchemySignature = (body, signature) => {
  const hmac = crypto.createHmac('sha256', process.env.ALCHEMY_WEBHOOK_SIGNING_KEY);
  hmac.update(JSON.stringify(body));
  return signature === hmac.digest('hex');
};
router.post('/webhook/alchemy', async (req, res) => {
  const sig = req.headers['x-alchemy-signature'];
  if (!verifyAlchemySignature(req.body, sig)) return res.status(401).json({ error: 'Invalid signature' });
  res.status(200).json({ ok: true });
  try {
    const { event } = req.body;
    if (!event?.activity) return;
    const hotWallet = process.env.HOT_WALLET_ADDRESS.toLowerCase();
    const io = req.app.get('io');
    const userSockets = req.app.get('userSockets');
    for (const tx of event.activity) {
      if (tx.toAddress?.toLowerCase() !== hotWallet) continue;
      const fromAddr = tx.fromAddress.toLowerCase();
      if (fromAddr === hotWallet) continue;
      const txHash = tx.hash;
      const exists = (await db.query('SELECT id FROM transactions WHERE tx_hash=$1', [txHash])).rows[0];
      if (exists) continue;
      let token, amount;
      if (tx.category === 'external') { token = 'NATIVE'; amount = tx.value.toString(); }
      else if (tx.category === 'erc20') { token = tx.asset || tx.rawContract?.address || 'UNKNOWN'; amount = tx.value.toString(); }
      else continue;
      const user = (await db.query('SELECT id FROM users WHERE wallet_address=$1', [fromAddr])).rows[0];
      if (!user) { console.log(`Deposit from unknown wallet: ${fromAddr}`); continue; }
      const chain = ALCHEMY_NETWORK_MAP[event?.network] || event?.network || 'unknown';
      if (!SUPPORTED_TOKENS[chain]) { console.log(`Unsupported chain from webhook: ${chain}`); continue; }
      await db.query(
        "INSERT INTO transactions(user_id,type,chain,token,amount,tx_hash,status) VALUES($1,'deposit',$2,$3,$4,$5,'confirmed')",
        [user.id, chain, token, amount, txHash]
      );
      await db.query(
        'INSERT INTO balances(user_id,chain,token,amount) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,chain,token) DO UPDATE SET amount=balances.amount+$4',
        [user.id, chain, token, amount]
      );
      console.log(`Deposit: ${amount} ${token} da ${fromAddr} su ${chain} (tx: ${txHash})`);
      const socketId = userSockets.get(user.id);
      if (socketId) {
        const newBalance = (await db.query('SELECT chain,token,amount FROM balances WHERE user_id=$1', [user.id])).rows;
        io.to(socketId).emit('deposit:confirmed', { chain, token, amount, txHash, balances: newBalance });
      }
      notify(user.id, 'deposit', 'Deposit Confirmed', `+${amount} ${token} on ${chain} (tx: ${txHash.slice(0,12)}...)`, io, userSockets);
    }
  } catch (err) {
    console.error('Webhook error:', err);
  }
});
router.get('/deposit-address', (req, res) => {
  res.json({ address: process.env.HOT_WALLET_ADDRESS, chains: Object.keys(SUPPORTED_TOKENS) });
});
export default router;