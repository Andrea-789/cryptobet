import db from '../config/db.js';
const PLATFORM_FEE = 0.005;
const MOCK_PRICES = {
  'NATIVE': {
    'polygon-amoy': 0.55,
    'base-sepolia': 2400,
    'arbitrum-sepolia': 2400,
    'sepolia': 2400,
    'bsc-testnet': 580,
    'avalanche-fuji': 35,
    'optimism-sepolia': 2400,
    'fantom-testnet': 0.42,
    'scroll-sepolia': 2400,
    'mantle-sepolia': 0.75,
  },
  'USDC': {
    'polygon-amoy': 1, 'base-sepolia': 1, 'arbitrum-sepolia': 1,
    'sepolia': 1, 'bsc-testnet': 1, 'avalanche-fuji': 1,
    'optimism-sepolia': 1, 'fantom-testnet': 1, 'scroll-sepolia': 1, 'mantle-sepolia': 1,
  },
  'USDT': {
    'polygon-amoy': 1, 'base-sepolia': 1, 'arbitrum-sepolia': 1,
    'sepolia': 1, 'bsc-testnet': 1, 'avalanche-fuji': 1,
    'optimism-sepolia': 1, 'fantom-testnet': 1, 'scroll-sepolia': 1, 'mantle-sepolia': 1,
  },
};
export const TOKENS = {
  'polygon-amoy':     ['NATIVE', 'USDC', 'USDT'],
  'base-sepolia':     ['NATIVE', 'USDC'],
  'arbitrum-sepolia':  ['NATIVE', 'USDC', 'USDT'],
  'sepolia':          ['NATIVE', 'USDC', 'USDT'],
  'bsc-testnet':      ['NATIVE', 'USDC', 'USDT'],
  'avalanche-fuji':   ['NATIVE', 'USDC'],
  'optimism-sepolia':  ['NATIVE', 'USDC'],
  'fantom-testnet':   ['NATIVE', 'USDC'],
  'scroll-sepolia':   ['NATIVE', 'USDC'],
  'mantle-sepolia':   ['NATIVE', 'USDC'],
};
export async function getQuote(fromToken, toToken, amount, chain) {
  if (process.env.USE_LIVE_EXCHANGE === 'true') return getLiveQuote(fromToken, toToken, amount, chain);
  return getMockQuote(fromToken, toToken, amount, chain);
}
function getMockQuote(fromToken, toToken, amount, chain) {
  const fromPrice = MOCK_PRICES[fromToken]?.[chain];
  const toPrice = MOCK_PRICES[toToken]?.[chain];
  if (!fromPrice || !toPrice) throw new Error('Token non supportato su questa chain');
  const fromValueUsd = amount * fromPrice;
  const fee = fromValueUsd * PLATFORM_FEE;
  const toAmount = (fromValueUsd - fee) / toPrice;
  return {
    fromToken, toToken, chain, fromAmount: amount, toAmount: parseFloat(toAmount.toFixed(8)),
    rate: parseFloat((toAmount / amount).toFixed(8)),
    fee: parseFloat(fee.toFixed(8)), feePct: PLATFORM_FEE * 100,
    priceImpact: 0.1, source: 'mock',
  };
}
async function getLiveQuote(fromToken, toToken, amount, chain) {
  const chainIds = {
    'polygon-amoy': 80002, 'base-sepolia': 84532, 'arbitrum-sepolia': 421614,
    'sepolia': 11155111, 'bsc-testnet': 97, 'avalanche-fuji': 43113,
    'optimism-sepolia': 11155420, 'fantom-testnet': 4002,
    'scroll-sepolia': 534351, 'mantle-sepolia': 5003,
  };
  const chainId = chainIds[chain];
  if (!chainId) throw new Error('Chain non supportata per live exchange');
  const params = new URLSearchParams({
    chainId: chainId.toString(), sellToken: fromToken, buyToken: toToken,
    sellAmount: amount.toString(), affiliateAddress: process.env.HOT_WALLET_ADDRESS,
    affiliateFee: PLATFORM_FEE.toString(),
  });
  const res = await fetch(`https://api.0x.org/swap/permit2/quote?${params}`, {
    headers: { '0x-api-key': process.env.ZEROX_API_KEY, '0x-version': 'v2' },
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.reason || 'error 0x API'); }
  const data = await res.json();
  return {
    fromToken, toToken, chain, fromAmount: amount,
    toAmount: parseFloat(data.buyAmount), rate: parseFloat(data.buyAmount) / amount,
    fee: amount * PLATFORM_FEE, feePct: PLATFORM_FEE * 100,
    priceImpact: parseFloat(data.estimatedPriceImpact || 0), source: '0x', txData: data,
  };
}
export async function executeSwap(userId, fromToken, toToken, amount, chain) {
  const quote = await getQuote(fromToken, toToken, amount, chain);
  const bal = (await db.query(
    'SELECT amount FROM balances WHERE user_id=$1 AND chain=$2 AND token=$3', [userId, chain, fromToken]
  )).rows[0];
  if (!bal || parseFloat(bal.amount) < amount) throw new Error('Saldo insufficiente');
  await db.query('UPDATE balances SET amount=amount-$1 WHERE user_id=$2 AND chain=$3 AND token=$4', [amount, userId, chain, fromToken]);
  await db.query(
    `INSERT INTO balances(user_id,chain,token,amount) VALUES($1,$2,$3,$4)
     ON CONFLICT(user_id,chain,token) DO UPDATE SET amount=balances.amount+$4`,
    [userId, chain, toToken, quote.toAmount]
  );
  await db.query(
    `INSERT INTO transactions(user_id,type,chain,token,amount,status) VALUES($1,'swap',$2,$3,$4,'confirmed')`,
    [userId, chain, `${fromToken}->${toToken}`, amount]
  );
  return quote;
}
export async function getPrices(chain) {
  if (process.env.USE_LIVE_EXCHANGE === 'true') {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,matic-network,usd-coin,tether,binancecoin,avalanche-2,fantom,mantle&vs_currencies=usd');
    return res.json();
  }
  return MOCK_PRICES;
}