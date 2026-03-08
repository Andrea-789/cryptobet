import { Router } from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import db from '../src/config/db.js';

const router = Router();

// ─── CONFIG ────────────────────────────────────────────────────────────────

const CHAINS = {
  ethereum:  { name: 'Ethereum',  tradable: false },
  polygon:   { name: 'Polygon',   tradable: false },
  bsc:       { name: 'BSC',       tradable: false },
  'sepolia':        { name: 'Sepolia (testnet)',        tradable: true },
  'polygon-amoy':   { name: 'Polygon Amoy (testnet)',   tradable: true },
  'bsc-testnet':    { name: 'BSC Testnet',              tradable: true },
  'arbitrum-sepolia':{ name: 'Arbitrum Sepolia',        tradable: true },
  'base-sepolia':   { name: 'Base Sepolia',             tradable: true },
};

const PAIRS_BY_CHAIN = {
  ethereum:        [{ symbol:'BTC/USDT',base:'BTC',quote:'USDT'},{ symbol:'ETH/USDT',base:'ETH',quote:'USDT'},{ symbol:'BNB/USDT',base:'BNB',quote:'USDT'}],
  polygon:         [{ symbol:'BTC/USDT',base:'BTC',quote:'USDT'},{ symbol:'ETH/USDT',base:'ETH',quote:'USDT'},{ symbol:'MATIC/USDT',base:'MATIC',quote:'USDT'}],
  bsc:             [{ symbol:'BTC/USDT',base:'BTC',quote:'USDT'},{ symbol:'ETH/USDT',base:'ETH',quote:'USDT'},{ symbol:'BNB/USDT',base:'BNB',quote:'USDT'}],
  'sepolia':        [{ symbol:'BTC/USDT',base:'BTC',quote:'USDT'},{ symbol:'ETH/USDT',base:'ETH',quote:'USDT'}],
  'polygon-amoy':   [{ symbol:'BTC/USDT',base:'BTC',quote:'USDT'},{ symbol:'MATIC/USDT',base:'MATIC',quote:'USDT'}],
  'bsc-testnet':    [{ symbol:'BTC/USDT',base:'BTC',quote:'USDT'},{ symbol:'BNB/USDT',base:'BNB',quote:'USDT'}],
  'arbitrum-sepolia':[{ symbol:'BTC/USDT',base:'BTC',quote:'USDT'},{ symbol:'ETH/USDT',base:'ETH',quote:'USDT'}],
  'base-sepolia':   [{ symbol:'BTC/USDT',base:'BTC',quote:'USDT'},{ symbol:'ETH/USDT',base:'ETH',quote:'USDT'}],
};


const SYMBOL_MAP = {
  'BTC/USDT': 'BTCUSDT', 'ETH/USDT': 'ETHUSDT',
  'BNB/USDT': 'BNBUSDT', 'MATIC/USDT': 'MATICUSDT',
  'SOL/USDT': 'SOLUSDT', 'ARB/USDT':  'ARBUSDT',
};

function toBinanceSymbol(pair) {
  return SYMBOL_MAP[pair] || pair.replace('/', '');
}

const INTERVAL_MAP = {
  '1m':'1m','5m':'5m','15m':'15m','1h':'1h','4h':'4h','1d':'1d'
};

// ─── ROUTES ────────────────────────────────────────────────────────────────

// GET /trading/chains
router.get('/chains', (req, res) => {
  res.json({ chains: CHAINS });
});

// GET /trading/pairs?chain=ethereum
router.get('/pairs', (req, res) => {
  const chain = req.query.chain || 'ethereum';
  const pairs = PAIRS_BY_CHAIN[chain] || PAIRS_BY_CHAIN['ethereum'];
  res.json({ pairs });
});

// GET /trading/ticker?pair=BTC/USDT&chain=ethereum
router.get('/ticker', async (req, res) => {
  const { pair } = req.query;
  const sym = toBinanceSymbol(pair || 'BTC/USDT');
  try {
    const r = await fetch(`https://data-api.binance.vision/api/v3/ticker/24hr?symbol=${sym}`);
    const d = await r.json();
    res.json({
      pair,
      price:     parseFloat(d.lastPrice),
      change24h: parseFloat(d.priceChangePercent),
      high24h:   parseFloat(d.highPrice),
      low24h:    parseFloat(d.lowPrice),
      volume24h: parseFloat(d.volume),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /trading/candles?pair=BTC/USDT&chain=ethereum&interval=1h&limit=200
router.get('/candles', async (req, res) => {
  const { pair, interval, limit } = req.query;
  const sym = toBinanceSymbol(pair || 'BTC/USDT');
  const iv  = INTERVAL_MAP[interval] || '1h';
  const lim = Math.min(parseInt(limit) || 100, 500);
  try {
    const r = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${sym}&interval=${iv}&limit=${lim}`);
    const raw = await r.json();
    const candles = raw.map(k => ({
      time:   k[0],            // ms timestamp
      open:   parseFloat(k[1]),
      high:   parseFloat(k[2]),
      low:    parseFloat(k[3]),
      close:  parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
    res.json(candles);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /trading/orderbook?pair=BTC/USDT&chain=ethereum
router.get('/orderbook', async (req, res) => {
  const { pair } = req.query;
  const sym = toBinanceSymbol(pair || 'BTC/USDT');
  try {
    const r = await fetch(`https://data-api.binance.vision/api/v3/depth?symbol=${sym}&limit=20`);
    const d = await r.json();
    res.json({
      bids: d.bids.map(b => [parseFloat(b[0]), parseFloat(b[1])]),
      asks: d.asks.map(a => [parseFloat(a[0]), parseFloat(a[1])]),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// POST /trading/order
router.post('/order', verifyToken, async (req, res) => {
  const userId = req.user.userId;
  const { pair, chain, side, type, amount, price } = req.body;
  if (!CHAINS[chain]?.tradable) return res.status(403).json({ error: 'Trading not available on this chain' });
  if (!['buy','sell'].includes(side)) return res.status(400).json({ error: 'Invalid side' });
  if (!['market','limit'].includes(type)) return res.status(400).json({ error: 'Invalid type' });
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  try {
    let execPrice = price;
    if (type === 'market') {
      const sym = toBinanceSymbol(pair);
      const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${sym}`);
      const d = await r.json();
      execPrice = parseFloat(d.price);
    }
    const pairInfo = (PAIRS_BY_CHAIN[chain] || []).find(p => p.symbol === pair);
    if (!pairInfo) return res.status(400).json({ error: 'Pair not available on this chain' });
    const base = pairInfo.base, quote = pairInfo.quote;
    const total = amount * execPrice;
    const fee   = total * 0.005;

    if (side === 'buy') {
      const bal = (await db.query(
        'SELECT amount FROM balances WHERE user_id=$1 AND chain=$2 AND token=$3',
        [userId, chain, quote]
      )).rows[0];
      if (!bal || parseFloat(bal.amount) < total + fee)
        return res.status(400).json({ error: `Insufficient ${quote} balance` });
      await db.query('UPDATE balances SET amount=amount-$1 WHERE user_id=$2 AND chain=$3 AND token=$4', [total + fee, userId, chain, quote]);
      await db.query(
        `INSERT INTO balances(user_id,chain,token,amount) VALUES($1,$2,$3,$4)
         ON CONFLICT(user_id,chain,token) DO UPDATE SET amount=balances.amount+$4`,
        [userId, chain, base, amount]
      );
    } else {
      const bal = (await db.query(
        'SELECT amount FROM balances WHERE user_id=$1 AND chain=$2 AND token=$3',
        [userId, chain, base]
      )).rows[0];
      if (!bal || parseFloat(bal.amount) < amount)
        return res.status(400).json({ error: `Insufficient ${base} balance` });
      await db.query('UPDATE balances SET amount=amount-$1 WHERE user_id=$2 AND chain=$3 AND token=$4', [amount, userId, chain, base]);
      await db.query(
        `INSERT INTO balances(user_id,chain,token,amount) VALUES($1,$2,$3,$4)
         ON CONFLICT(user_id,chain,token) DO UPDATE SET amount=balances.amount+$4`,
        [userId, chain, quote, total - fee]
      );
    }

    const status = type === 'market' ? 'filled' : 'open';
    const order = (await db.query(
      `INSERT INTO trading_orders(user_id,pair,chain,side,type,amount,price,filled_price,status)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [userId, pair, chain, side, type, amount, price || execPrice, type === 'market' ? execPrice : null, status]
    )).rows[0];

    res.json({ ok: true, order, rate: execPrice });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /trading/orders?status=open&limit=50
router.get('/orders', verifyToken, async (req, res) => {
  const userId = req.user.userId;
  const { status, limit } = req.query;
  try {
    const lim = Math.min(parseInt(limit) || 50, 200);
    let q = 'SELECT * FROM trading_orders WHERE user_id=$1';
    const params = [userId];
    if (status) { q += ' AND status=$2'; params.push(status); }
    q += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(lim);
    const orders = (await db.query(q, params)).rows;
    res.json({ orders });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /trading/order/:id/cancel
router.post('/order/:id/cancel', verifyToken, async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;
  try {
    const order = (await db.query(
      "SELECT * FROM trading_orders WHERE id=$1 AND user_id=$2 AND status='open'",
      [id, userId]
    )).rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const pairInfo = (PAIRS_BY_CHAIN[order.chain] || []).find(p => p.symbol === order.pair);
    if (pairInfo) {
      if (order.side === 'buy') {
        const refund = parseFloat(order.amount) * parseFloat(order.price) * 1.005;
        await db.query('UPDATE balances SET amount=amount+$1 WHERE user_id=$2 AND chain=$3 AND token=$4',
          [refund, userId, order.chain, pairInfo.quote]);
      } else {
        await db.query('UPDATE balances SET amount=amount+$1 WHERE user_id=$2 AND chain=$3 AND token=$4',
          [order.amount, userId, order.chain, pairInfo.base]);
      }
    }
    await db.query("UPDATE trading_orders SET status='cancelled' WHERE id=$1", [id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;