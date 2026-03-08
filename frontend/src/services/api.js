const API = import.meta.env.VITE_API_URL;
const getToken = () => localStorage.getItem('token');
const request = async (method, path, body = null) => {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  const token = getToken();
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API error');
  return data;
};
export default {
  abandonGame: (game) => request('POST', '/games/abandon', { game }),
  // Auth
  getNonce: (walletAddress) => request('POST', '/auth/nonce', { walletAddress }),
  verify: (walletAddress, signature, referralCode) => request('POST', '/auth/verify', { walletAddress, signature, referralCode }),
  getMe: () => request('GET', '/auth/me'),
  // Deposits
  getDepositAddress: () => request('GET', '/deposits/deposit-address'),
  // Games — generic
  playGame: (game, params) => request('POST', `/games/${game}`, params),
  // Games — single-round shortcuts
  dice: (target, direction, amount, token, chain) => request('POST', '/games/dice', { target, direction, amount, token, chain }),
  roulette: (betType, betValue, amount, token, chain) => request('POST', '/games/roulette', { betType, betValue, amount, token, chain }),
  slots: (amount, token, chain) => request('POST', '/games/slots', { amount, token, chain }),
  plinko: (amount, token, chain) => request('POST', '/games/plinko', { amount, token, chain }),
  wheel: (amount, token, chain) => request('POST', '/games/wheel', { amount, token, chain }),
  // Mines (multi-turno)
  minesStart: (params) => request('POST', '/games/mines/start', params),
  minesReveal: (sessionId, cell) => request('POST', '/games/mines/reveal', { sessionId, cell }),
  minesCashout: (sessionId) => request('POST', '/games/mines/cashout', { sessionId }),
  // HiLo (multi-turno)
  hiloStart: (params) => request('POST', '/games/hilo/start', params),
  hiloGuess: (sessionId, guess) => request('POST', '/games/hilo/guess', { sessionId, guess }),
  hiloCashout: (sessionId) => request('POST', '/games/hilo/cashout', { sessionId }),
  // Crash (multi-turno)
  crashStart: (params) => request('POST', '/games/crash/start', params),
  crashCashout: (sessionId, multiplier) => request('POST', '/games/crash/cashout', { sessionId, multiplier }),
  crashBust: (sessionId) => request('POST', '/games/crash/bust', { sessionId }),
  // Blackjack (multi-turno)
  blackjackStart: (params) => request('POST', '/games/blackjack/start', params),
  blackjackAction: (sessionId, action) => request('POST', '/games/blackjack/action', { sessionId, action }),
  // Seeds
  getSeeds: () => request('GET', '/games/seeds'),
  setClientSeed: (clientSeed) => request('POST', '/games/seeds/client', { clientSeed }),
  rotateSeeds: (newClientSeed) => request('POST', '/games/seeds/rotate', { newClientSeed }),
  getBetHistory: () => request('GET', '/games/history'),
  // Withdrawals
  requestWithdrawal: (amount, token, chain, toAddress) => request('POST', '/withdrawals/request', { amount, token, chain, toAddress }),
  getWithdrawalHistory: () => request('GET', '/withdrawals/history'),
  // Exchange
  getExchangeTokens: () => request('GET', '/exchange/tokens'),
  getQuote: (fromToken, toToken, amount, chain) => request('POST', '/exchange/quote', { fromToken, toToken, amount, chain }),
  executeSwap: (fromToken, toToken, amount, chain) => request('POST', '/exchange/swap', { fromToken, toToken, amount, chain }),
  getPrices: (chain) => request('GET', `/exchange/prices?chain=${chain}`),
  // Leaderboard
  getLeaderboard: (tab, period, game) => request('GET', `/leaderboard?tab=${tab}&period=${period}&game=${game}`),
  // Admin
  getAdminStats: () => request('GET', '/admin/stats'),
  getAdminUsers: (filter, search, limit, offset) => request('GET', `/admin/users?filter=${filter||''}&search=${search||''}&limit=${limit||50}&offset=${offset||0}`),
  banUser: (id, action) => request('POST', `/admin/users/${id}/ban`, { action }),
  getAdminTransactions: (filter, limit, offset) => request('GET', `/admin/transactions?filter=${filter||''}&limit=${limit||30}&offset=${offset||0}`),
  approveWithdrawal: (id, action) => request('POST', `/admin/withdrawals/${id}/approve`, { action }),
  getAdminBigWins: () => request('GET', '/admin/big-wins'),
  // User Panel
  getUserStats: () => request('GET', '/user/stats'),
  getUserHistory: (limit, offset) => request('GET', `/user/history?limit=${limit||30}&offset=${offset||0}`),
  getReferral: () => request('GET', '/user/referral'),
  getTopReferrers: () => request('GET', '/user/referral/top'),
  // VIP
  getVipStatus: () => request('GET', '/vip/status'),
  getVipRewards: () => request('GET', '/vip/rewards'),
  claimVipReward: (rewardId) => request('POST', '/vip/claim', { rewardId }),
  // Notifications
  getNotifications: (limit, offset) => request('GET', `/notifications?limit=${limit||30}&offset=${offset||0}`),
  markNotifRead: (id) => request('POST', `/notifications/${id}/read`),
  markAllNotifsRead: () => request('POST', '/notifications/read-all'),
  deleteNotification: (id) => request('DELETE', `/notifications/${id}`),
  clearNotifications: () => request('DELETE', '/notifications'),
// Trading
getTradingChains: () => request('GET', '/trading/chains'),
getTradingPairs: (chain) => request('GET', `/trading/pairs?chain=${chain}`),
getTradingPrices: () => request('GET', '/trading/prices'),
getOrderBook: (pair, chain) => request('GET', `/trading/orderbook?pair=${encodeURIComponent(pair)}&chain=${chain}`),
getCandles: (pair, chain, interval, limit) => request('GET', `/trading/candles?pair=${encodeURIComponent(pair)}&chain=${chain}&interval=${interval||'1h'}&limit=${limit||100}`),
getTicker: (pair, chain) => request('GET', `/trading/ticker?pair=${encodeURIComponent(pair)}&chain=${chain}`),
placeOrder: (pair, chain, side, type, amount, price) => request('POST', '/trading/order', { pair, chain, side, type, amount, price }),
cancelOrder: (id) => request('POST', `/trading/order/${id}/cancel`),
getOrders: (status, limit) => request('GET', `/trading/orders?status=${status||''}&limit=${limit||50}`),
};