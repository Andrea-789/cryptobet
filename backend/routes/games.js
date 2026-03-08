import { Router } from 'express';
import db from '../src/config/db.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import * as pf from '../src/services/provablyFair.js';
import { trackWager } from './vip.js';
import { notify } from './notifications.js';
const router = Router();
const MAX_BET = parseFloat(process.env.MAX_BET || '0.001');

async function playBet(req, res, game, validate, calcResult) {
  const userId = req.user.userId;
  const { amount, token, chain } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  if (amount > MAX_BET) return res.status(400).json({ error: `MAX Bet: ${MAX_BET}` });
  if (!token || !chain) return res.status(400).json({ error: 'Token and chain required' });
  const vErr = validate(req.body);
  if (vErr) return res.status(400).json({ error: vErr });
  try {
    const bal = (await db.query(
      'SELECT amount FROM balances WHERE user_id=$1 AND chain=$2 AND token=$3', [userId, chain, token]
    )).rows[0];
    if (!bal || parseFloat(bal.amount) < amount) return res.status(400).json({ error: 'Insufficient balance' });
    const pfData = await pf.play(userId);
    const { win, payout, resultData } = calcResult(req.body, pfData);
    const net = win ? payout - amount : -amount;
    await db.query(
      'UPDATE balances SET amount=amount+$1 WHERE user_id=$2 AND chain=$3 AND token=$4',
      [net, userId, chain, token]
    );
    await db.query(
      `INSERT INTO bets(user_id,game,amount,token,chain,server_seed_hash,client_seed,nonce,result,payout)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [userId, game, amount, token, chain, pfData.serverSeedHash, pfData.clientSeed, pfData.nonce,
       JSON.stringify(resultData), win ? payout : 0]
    );
    trackWager(userId, amount);
    const io = req.app.get('io');
    const sockets = req.app.get('userSockets');
    if (win && payout >= amount * 5) {
      notify(userId, 'win', 'Big Win!', `Won ${payout.toFixed(4)} ${token} on ${game} (${(payout/amount).toFixed(2)}x)`, io, sockets);
    }
    const newBal = (await db.query(
      'SELECT amount FROM balances WHERE user_id=$1 AND chain=$2 AND token=$3', [userId, chain, token]
    )).rows[0];
    const response = {
      win, payout: win ? payout : 0, amount, balance: parseFloat(newBal.amount), game,
      result: resultData,
      provably: { serverSeedHash: pfData.serverSeedHash, clientSeed: pfData.clientSeed, nonce: pfData.nonce, hash: pfData.hash }
    };
    const sid = sockets.get(userId);
    if (sid) io.to(sid).emit('bet:result', response);
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
// — DICE —
router.post('/dice', verifyToken, (req, res) => {
  playBet(req, res, 'dice',
    (body) => {
      const { target, direction } = body;
      if (!['over','under'].includes(direction)) return 'Choose over or under';
      if (target == null || target < 1 || target > 98) return 'Target must be 1-98';
      return null;
    },
    (body, pf) => {
      const hex = pf.hash.substring(0, 8);
      const roll = (parseInt(hex, 16) % 10000) / 100;
      const { target, direction, amount } = body;
      let win = false, chance = 0;
      if (direction === 'over') { win = roll > target; chance = 99 - target; }
      else { win = roll < target; chance = target; }
      const mult = parseFloat((99 / chance).toFixed(4));
      const payout = amount * mult;
      return { win, payout, resultData: { roll: parseFloat(roll.toFixed(2)), target, direction, multiplier: mult, hash: pf.hash } };
    }
  );
});
// — MINES (-) —
function minesPositions(hash, count) {
  const mines = []; let idx = 0;
  while (mines.length < count && idx < hash.length - 2) {
    const val = parseInt(hash.substring(idx, idx + 2), 16) % 25;
    if (!mines.includes(val)) mines.push(val);
    idx += 2;
  }
  return mines;
}
function minesMultiplier(revealed, totalMines) {
  const safe = 25 - totalMines;
  if (revealed <= 0 || safe <= 0) return 1;
  let m = 1;
  for (let k = 0; k < revealed; k++) m *= (25 - k) / (safe - k);
  return parseFloat((m * 0.97).toFixed(4));
}
router.post('/mines/start', verifyToken, async (req, res) => {
  const userId = req.user.userId;
  const { amount, token, chain, minesCount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  if (amount > MAX_BET) return res.status(400).json({ error: `MAX Bet: ${MAX_BET}` });
  if (!token || !chain) return res.status(400).json({ error: 'Token and chain required' });
  const mc = Math.max(1, Math.min(24, parseInt(minesCount) || 5));
  try {
    const active = (await db.query(
      "SELECT id FROM game_sessions WHERE user_id=$1 AND game='mines' AND status='active'", [userId]
    )).rows[0];
    if (active) {
      await db.query("UPDATE game_sessions SET status='lost',updated_at=NOW() WHERE id=$1", [active.id]);
    }
    const bal = (await db.query(
      'SELECT amount FROM balances WHERE user_id=$1 AND chain=$2 AND token=$3', [userId, chain, token]
    )).rows[0];
    if (!bal || parseFloat(bal.amount) < amount) return res.status(400).json({ error: 'Insufficient balance' });
    await db.query('UPDATE balances SET amount=amount-$1 WHERE user_id=$2 AND chain=$3 AND token=$4', [amount, userId, chain, token]);
    const pfData = await pf.play(userId);
    const mines = minesPositions(pfData.hash, mc);
    const state = { mines, minesCount: mc, revealed: [], hash: pfData.hash, serverSeedHash: pfData.serverSeedHash, clientSeed: pfData.clientSeed, nonce: pfData.nonce };
    const session = (await db.query(
      `INSERT INTO game_sessions(user_id,game,state,bet_amount,token,chain,status) VALUES($1,'mines',$2,$3,$4,$5,'active') RETURNING id`,
      [userId, JSON.stringify(state), amount, token, chain]
    )).rows[0];
    trackWager(userId, amount);
    res.json({ sessionId: session.id, minesCount: mc, serverSeedHash: pfData.serverSeedHash, multiplier: 1 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/mines/reveal', verifyToken, async (req, res) => {
  const userId = req.user.userId;
  const { sessionId, cell } = req.body;
  if (cell == null || cell < 0 || cell > 24) return res.status(400).json({ error: 'Invalid cell' });
  try {
    const session = (await db.query(
      "SELECT * FROM game_sessions WHERE id=$1 AND user_id=$2 AND game='mines' AND status='active'", [sessionId, userId]
    )).rows[0];
    if (!session) return res.status(400).json({ error: 'Session not found' });
    const state = session.state;
    if (state.revealed.includes(cell)) return res.status(400).json({ error: 'Cell already revealed' });
    const isBomb = state.mines.includes(cell);
    state.revealed.push(cell);
    if (isBomb) {
      await db.query("UPDATE game_sessions SET state=$1,status='lost',updated_at=NOW() WHERE id=$2", [JSON.stringify(state), sessionId]);
      await db.query(
        `INSERT INTO bets(user_id,game,amount,token,chain,server_seed_hash,client_seed,nonce,result,payout) VALUES($1,'mines',$2,$3,$4,$5,$6,$7,$8,0)`,
        [userId, session.bet_amount, session.token, session.chain, state.serverSeedHash, state.clientSeed, state.nonce, JSON.stringify({ mines: state.mines, revealed: state.revealed, minesCount: state.minesCount })]
      );
      res.json({ bomb: true, cell, mines: state.mines, multiplier: 0, payout: 0 });
    } else {
      const mult = minesMultiplier(state.revealed.filter(c => !state.mines.includes(c)).length, state.minesCount);
      await db.query("UPDATE game_sessions SET state=$1,updated_at=NOW() WHERE id=$2", [JSON.stringify(state), sessionId]);
      res.json({ bomb: false, cell, multiplier: mult, revealed: state.revealed.length, safeLeft: 25 - state.minesCount - state.revealed.filter(c => !state.mines.includes(c)).length });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/mines/cashout', verifyToken, async (req, res) => {
  const userId = req.user.userId;
  const { sessionId } = req.body;
  try {
    const session = (await db.query(
      "SELECT * FROM game_sessions WHERE id=$1 AND user_id=$2 AND game='mines' AND status='active'", [sessionId, userId]
    )).rows[0];
    if (!session) return res.status(400).json({ error: 'Session not found' });
    const state = session.state;
    const safeRevealed = state.revealed.filter(c => !state.mines.includes(c)).length;
    if (safeRevealed === 0) return res.status(400).json({ error: 'Reveal at least one cell' });
    const mult = minesMultiplier(safeRevealed, state.minesCount);
    const payout = parseFloat((parseFloat(session.bet_amount) * mult).toFixed(18));
    await db.query('UPDATE balances SET amount=amount+$1 WHERE user_id=$2 AND chain=$3 AND token=$4', [payout, userId, session.chain, session.token]);
    await db.query("UPDATE game_sessions SET state=$1,status='won',updated_at=NOW() WHERE id=$2", [JSON.stringify(state), sessionId]);
    await db.query(
      `INSERT INTO bets(user_id,game,amount,token,chain,server_seed_hash,client_seed,nonce,result,payout) VALUES($1,'mines',$2,$3,$4,$5,$6,$7,$8,$9)`,
      [userId, session.bet_amount, session.token, session.chain, state.serverSeedHash, state.clientSeed, state.nonce, JSON.stringify({ mines: state.mines, revealed: state.revealed, minesCount: state.minesCount }), payout]
    );
    const newBal = (await db.query('SELECT amount FROM balances WHERE user_id=$1 AND chain=$2 AND token=$3', [userId, session.chain, session.token])).rows[0];
    const io = req.app.get('io'), sockets = req.app.get('userSockets'), sid = sockets.get(userId);
    if (sid) io.to(sid).emit('bet:result', { game: 'mines', win: true, payout, multiplier: mult });
    if (payout >= parseFloat(session.bet_amount) * 5) notify(userId, 'win', 'Big Win!', `Won ${payout.toFixed(4)} ${session.token} on Mines (${mult}x)`, io, sockets);
    res.json({ win: true, payout, multiplier: mult, balance: parseFloat(newBal.amount), mines: state.mines });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// — ROULETTE (single-round) —
const ROULETTE_REDS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
router.post('/roulette', verifyToken, (req, res) => {
  playBet(req, res, 'roulette',
    (body) => {
      const { betType, betValue } = body;
      const valid = ['number','color','even_odd','half','dozen','column'];
      if (!valid.includes(betType)) return 'Invalid bet type';
      if (betType === 'number' && (betValue < 0 || betValue > 36)) return 'Number 0-36';
      if (betType === 'color' && !['red','black'].includes(betValue)) return 'red or black';
      if (betType === 'even_odd' && !['even','odd'].includes(betValue)) return 'even or odd';
      if (betType === 'half' && ![1,2].includes(betValue)) return '1 or 2';
      if (betType === 'dozen' && ![1,2,3].includes(betValue)) return '1, 2 or 3';
      if (betType === 'column' && ![1,2,3].includes(betValue)) return '1, 2 or 3';
      return null;
    },
    (body, pf) => {
      const num = parseInt(pf.hash.substring(0, 8), 16) % 37;
      const isRed = ROULETTE_REDS.includes(num);
      const color = num === 0 ? 'green' : isRed ? 'red' : 'black';
      const { betType, betValue, amount } = body;
      let win = false, mult = 0;
      if (betType === 'number') { win = num === betValue; mult = 36; }
      else if (betType === 'color') { win = color === betValue; mult = 2; }
      else if (betType === 'even_odd') { win = num > 0 && (betValue === 'even' ? num % 2 === 0 : num % 2 === 1); mult = 2; }
      else if (betType === 'half') { win = betValue === 1 ? (num >= 1 && num <= 18) : (num >= 19 && num <= 36); mult = 2; }
      else if (betType === 'dozen') { const d = Math.ceil(num / 12); win = num > 0 && d === betValue; mult = 3; }
      else if (betType === 'column') { win = num > 0 && num % 3 === (betValue === 3 ? 0 : betValue); mult = 3; }
      const payout = win ? amount * mult : 0;
      return { win, payout, resultData: { number: num, color, betType, betValue, multiplier: win ? mult : 0, hash: pf.hash } };
    }
  );
});
// — SLOTS (single-round) —
const SLOT_SYMS = ['🍒','🍋','🍊','💎','7️⃣','₿','⭐','🍀'];
const SLOT_WEIGHTS = [20,18,15,10,6,3,16,12];
const SLOT_MULT = {'🍒':5,'🍋':8,'🍊':10,'💎':15,'7️⃣':25,'₿':50,'⭐':3,'🍀':4};
function slotPick(hash, offset) {
  const totalW = SLOT_WEIGHTS.reduce((a, b) => a + b, 0);
  const roll = parseInt(hash.substring(offset, offset + 4), 16) % totalW;
  let cum = 0;
  for (let i = 0; i < SLOT_WEIGHTS.length; i++) { cum += SLOT_WEIGHTS[i]; if (roll < cum) return SLOT_SYMS[i]; }
  return SLOT_SYMS[0];
}
router.post('/slots', verifyToken, (req, res) => {
  playBet(req, res, 'slots',
    () => null,
    (body, pf) => {
      const r0 = slotPick(pf.hash, 0), r1 = slotPick(pf.hash, 4), r2 = slotPick(pf.hash, 8);
      let mult = 0, matchType = 'none';
      if (r0 === r1 && r1 === r2) { mult = SLOT_MULT[r0] || 3; matchType = 'triple'; }
      else if (r0 === r1 || r1 === r2 || r0 === r2) { mult = 1.5; matchType = 'double'; }
      const payout = body.amount * mult;
      return { win: mult > 0, payout, resultData: { reels: [r0, r1, r2], multiplier: mult, matchType, hash: pf.hash } };
    }
  );
});
// — BLACKJACK (-) —
const BJ_SUITS = ['♠','♥','♦','♣'];
const BJ_RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
function bjDeck(hash) {
  const deck = [];
  for (let s = 0; s < 4; s++) for (let r = 0; r < 13; r++) deck.push({ s: BJ_SUITS[s], r: BJ_RANKS[r] });
  for (let i = deck.length - 1; i > 0; i--) {
    const hIdx = (i * 2) % (hash.length - 2);
    const j = parseInt(hash.substring(hIdx, hIdx + 2), 16) % (i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
function bjVal(hand) {
  let t = 0, a = 0;
  for (const c of hand) {
    if (c.r === 'A') { a++; t += 11; }
    else if ('JQK'.includes(c.r)) t += 10;
    else t += parseInt(c.r);
  }
  while (t > 21 && a > 0) { t -= 10; a--; }
  return t;
}
router.post('/blackjack/start', verifyToken, async (req, res) => {
  const userId = req.user.userId;
  const { amount, token, chain } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  if (amount > MAX_BET) return res.status(400).json({ error: `Max bet: ${MAX_BET}` });
  if (!token || !chain) return res.status(400).json({ error: 'Token and chain required' });
  try {
    const active = (await db.query(
      "SELECT id FROM game_sessions WHERE user_id=$1 AND game='blackjack' AND status='active'", [userId]
    )).rows[0];
    if(active){await db.query("UPDATE game_sessions SET status='lost',updated_at=NOW() WHERE id=$1", [active.id]);}
    const bal = (await db.query(
      'SELECT amount FROM balances WHERE user_id=$1 AND chain=$2 AND token=$3', [userId, chain, token]
    )).rows[0];
    if (!bal || parseFloat(bal.amount) < amount) return res.status(400).json({ error: 'Insufficient balance' });
    await db.query('UPDATE balances SET amount=amount-$1 WHERE user_id=$2 AND chain=$3 AND token=$4', [amount, userId, chain, token]);
    const pfData = await pf.play(userId);
    const deck = bjDeck(pfData.hash);
    const player = [deck.pop(), deck.pop()];
    const dealer = [deck.pop(), deck.pop()];
    const state = { deck, player, dealer, bet: amount, doubled: false, done: false, hash: pfData.hash, serverSeedHash: pfData.serverSeedHash, clientSeed: pfData.clientSeed, nonce: pfData.nonce };
    const pv = bjVal(player);
    if (pv === 21) state.done = true;
    const session = (await db.query(
      `INSERT INTO game_sessions(user_id,game,state,bet_amount,token,chain,status) VALUES($1,'blackjack',$2,$3,$4,$5,'active') RETURNING id`,
      [userId, JSON.stringify(state), amount, token, chain]
    )).rows[0];
    trackWager(userId, amount);
    const resp = { sessionId: session.id, player, dealer: [dealer[0], { s: '?', r: '?' }], playerVal: pv, serverSeedHash: pfData.serverSeedHash };
    if (state.done) {
      const result = await bjResolve(session.id, userId, state, parseFloat(amount), token, chain, req);
      Object.assign(resp, result, { dealer: state.dealer });
    }
    res.json(resp);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
async function bjResolve(sessionId, userId, state, betAmount, token, chain, req) {
  while (bjVal(state.dealer) < 17) state.dealer.push(state.deck.pop());
  const pv = bjVal(state.player), dv = bjVal(state.dealer);
  const isNatural = state.player.length === 2 && pv === 21;
  const totalBet = state.doubled ? betAmount * 2 : betAmount;
  let result, mult;
  if (pv > 21) { result = 'bust'; mult = 0; }
  else if (dv > 21) { result = 'dealer_bust'; mult = 2; }
  else if (pv > dv) { result = isNatural ? 'blackjack' : 'win'; mult = isNatural ? 2.5 : 2; }
  else if (pv < dv) { result = 'lose'; mult = 0; }
  else { result = 'push'; mult = 1; }
  const payout = parseFloat((totalBet * mult).toFixed(18));
  if (payout > 0) await db.query('UPDATE balances SET amount=amount+$1 WHERE user_id=$2 AND chain=$3 AND token=$4', [payout, userId, chain, token]);
  state.done = true;
  await db.query("UPDATE game_sessions SET state=$1,status=$2,updated_at=NOW() WHERE id=$3",
    [JSON.stringify(state), mult > 0 ? 'won' : 'lost', sessionId]);
  await db.query(
    `INSERT INTO bets(user_id,game,amount,token,chain,server_seed_hash,client_seed,nonce,result,payout) VALUES($1,'blackjack',$2,$3,$4,$5,$6,$7,$8,$9)`,
    [userId, totalBet, token, chain, state.serverSeedHash, state.clientSeed, state.nonce, JSON.stringify({ player: state.player, dealer: state.dealer, result }), payout]
  );
  const newBal = (await db.query('SELECT amount FROM balances WHERE user_id=$1 AND chain=$2 AND token=$3', [userId, chain, token])).rows[0];
  if (req) {
    const io = req.app.get('io'), sockets = req.app.get('userSockets'), sid = sockets.get(userId);
    if (sid && mult >= 2) io.to(sid).emit('bet:result', { game: 'blackjack', win: true, payout, multiplier: mult });
    if (mult >= 2.5) notify(userId, 'win', 'Blackjack!', `Natural 21 — won ${payout.toFixed(4)} ${token}`, io, sockets);
  }
  return { result, payout, multiplier: mult, playerVal: pv, dealerVal: dv, balance: parseFloat(newBal.amount), dealer: state.dealer };
}
router.post('/blackjack/action', verifyToken, async (req, res) => {
  const userId = req.user.userId;
  const { sessionId, action } = req.body;
  if (!['hit','stand','double'].includes(action)) return res.status(400).json({ error: 'Invalid action' });
  try {
    const session = (await db.query(
      "SELECT * FROM game_sessions WHERE id=$1 AND user_id=$2 AND game='blackjack' AND status='active'", [sessionId, userId]
    )).rows[0];
    if (!session) return res.status(400).json({ error: 'Session not found' });
    const state = session.state;
    if (state.done) return res.status(400).json({ error: 'Hand already finished' });
    const betAmount = parseFloat(session.bet_amount);
    if (action === 'double') {
      const bal = (await db.query(
        'SELECT amount FROM balances WHERE user_id=$1 AND chain=$2 AND token=$3', [userId, session.chain, session.token]
      )).rows[0];
      if (!bal || parseFloat(bal.amount) < betAmount) return res.status(400).json({ error: 'Insufficient balance to double' });
      await db.query('UPDATE balances SET amount=amount-$1 WHERE user_id=$2 AND chain=$3 AND token=$4', [betAmount, userId, session.chain, session.token]);
      state.doubled = true;
      state.player.push(state.deck.pop());
      trackWager(userId, betAmount);
      const result = await bjResolve(sessionId, userId, state, betAmount, session.token, session.chain, req);
      return res.json({ ...result, player: state.player });
    }
    if (action === 'hit') {
      state.player.push(state.deck.pop());
      const pv = bjVal(state.player);
      if (pv >= 21) {
        const result = await bjResolve(sessionId, userId, state, betAmount, session.token, session.chain, req);
        return res.json({ ...result, player: state.player });
      }
      await db.query("UPDATE game_sessions SET state=$1,updated_at=NOW() WHERE id=$2", [JSON.stringify(state), sessionId]);
      return res.json({ player: state.player, playerVal: pv, done: false });
    }
    if (action === 'stand') {
      const result = await bjResolve(sessionId, userId, state, betAmount, session.token, session.chain, req);
      return res.json({ ...result, player: state.player });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// — SPIN WHEEL —
const WHEEL_SEGMENTS = [100,200,300,400,500,600,700,800];
const WHEEL_WEIGHTS = [38,28,16,9,5,2,1,1];
router.post('/wheel', verifyToken, (req, res) => {
  playBet(req, res, 'wheel',
    () => null,
    (body, pf) => {
      const totalW = WHEEL_WEIGHTS.reduce((a, b) => a + b, 0);
      const roll = parseInt(pf.hash.substring(0, 8), 16) % totalW;
      let cum = 0, idx = 0;
      for (let i = 0; i < WHEEL_WEIGHTS.length; i++) { cum += WHEEL_WEIGHTS[i]; if (roll < cum) { idx = i; break; } }
      const prize = WHEEL_SEGMENTS[idx];
      const mult = prize / 100;
      const payout = body.amount * mult;
      return { win: payout > 0, payout, resultData: { segment: idx, prize, multiplier: mult, hash: pf.hash } };
    }
  );
});
// — CRASH (single-player) —
router.post('/crash/start', verifyToken, async (req, res) => {
  const userId = req.user.userId;
  const { amount, token, chain } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  if (amount > MAX_BET) return res.status(400).json({ error: `MAX Bet: ${MAX_BET}` });
  if (!token || !chain) return res.status(400).json({ error: 'Token and chain required' });
  try {
    const active = (await db.query(
      "SELECT id FROM game_sessions WHERE user_id=$1 AND game='crash' AND status='active'", [userId]
    )).rows[0];
    if(active){await db.query("UPDATE game_sessions SET status='lost',updated_at=NOW() WHERE id=$1", [active.id]);}
    const bal = (await db.query(
      'SELECT amount FROM balances WHERE user_id=$1 AND chain=$2 AND token=$3', [userId, chain, token]
    )).rows[0];
    if (!bal || parseFloat(bal.amount) < amount) return res.status(400).json({ error: 'Insufficient balance' });
    await db.query('UPDATE balances SET amount=amount-$1 WHERE user_id=$2 AND chain=$3 AND token=$4', [amount, userId, chain, token]);
    const pfData = await pf.play(userId);
    const hashVal = parseInt(pfData.hash.substring(0, 8), 16) / 0xFFFFFFFF;
    let crashAt = Math.max(1.00, parseFloat((0.97 / (1 - hashVal)).toFixed(2)));
    if (crashAt > 100) crashAt = 100;
    const state = { crashAt, startedAt: Date.now(), hash: pfData.hash, serverSeedHash: pfData.serverSeedHash, clientSeed: pfData.clientSeed, nonce: pfData.nonce };
    const session = (await db.query(
      `INSERT INTO game_sessions(user_id,game,state,bet_amount,token,chain,status) VALUES($1,'crash',$2,$3,$4,$5,'active') RETURNING id`,
      [userId, JSON.stringify(state), amount, token, chain]
    )).rows[0];
    trackWager(userId, amount);
    const crashTimeMs = (Math.log(crashAt) / 0.08) * 1000 + 200;
    setTimeout(async () => {
      try {
        const sess = (await db.query("SELECT status FROM game_sessions WHERE id=$1", [session.id])).rows[0];
        if (!sess || sess.status !== 'active') return;
        await db.query("UPDATE game_sessions SET status='lost',updated_at=NOW() WHERE id=$1", [session.id]);
        await db.query(
          `INSERT INTO bets(user_id,game,amount,token,chain,server_seed_hash,client_seed,nonce,result,payout) VALUES($1,'crash',$2,$3,$4,$5,$6,$7,$8,0)`,
          [userId, amount, token, chain, state.serverSeedHash, state.clientSeed, state.nonce, JSON.stringify({ crashAt, cashedAt: null })]
        );
        const io = req.app.get('io'), sockets = req.app.get('userSockets'), sid = sockets.get(userId);
        if (sid) io.to(sid).emit('crash:bust', { sessionId: session.id, crashAt });
      } catch (e) { console.error('Crash auto-bust error:', e); }
    }, crashTimeMs);
    res.json({ sessionId: session.id, serverSeedHash: pfData.serverSeedHash });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/crash/cashout', verifyToken, async (req, res) => {
  const userId = req.user.userId;
  const { sessionId, multiplier } = req.body;
  if (!multiplier || multiplier < 1) return res.status(400).json({ error: 'Invalid multiplier' });
  try {
    const session = (await db.query(
      "SELECT * FROM game_sessions WHERE id=$1 AND user_id=$2 AND game='crash' AND status='active'", [sessionId, userId]
    )).rows[0];
    if (!session) return res.status(400).json({ error: 'Session not found' });
    const state = session.state;
    if (multiplier >= state.crashAt) {
      await db.query("UPDATE game_sessions SET status='lost',updated_at=NOW() WHERE id=$1", [sessionId]);
      await db.query(
        `INSERT INTO bets(user_id,game,amount,token,chain,server_seed_hash,client_seed,nonce,result,payout) VALUES($1,'crash',$2,$3,$4,$5,$6,$7,$8,0)`,
        [userId, session.bet_amount, session.token, session.chain, state.serverSeedHash, state.clientSeed, state.nonce, JSON.stringify({ crashAt: state.crashAt, cashedAt: null })]
      );
      return res.json({ win: false, crashAt: state.crashAt, payout: 0 });
    }
    const payout = parseFloat((parseFloat(session.bet_amount) * multiplier).toFixed(18));
    await db.query('UPDATE balances SET amount=amount+$1 WHERE user_id=$2 AND chain=$3 AND token=$4', [payout, userId, session.chain, session.token]);
    await db.query("UPDATE game_sessions SET status='won',updated_at=NOW() WHERE id=$1", [sessionId]);
    await db.query(
      `INSERT INTO bets(user_id,game,amount,token,chain,server_seed_hash,client_seed,nonce,result,payout) VALUES($1,'crash',$2,$3,$4,$5,$6,$7,$8,$9)`,
      [userId, session.bet_amount, session.token, session.chain, state.serverSeedHash, state.clientSeed, state.nonce, JSON.stringify({ crashAt: state.crashAt, cashedAt: multiplier }), payout]
    );
    const newBal = (await db.query('SELECT amount FROM balances WHERE user_id=$1 AND chain=$2 AND token=$3', [userId, session.chain, session.token])).rows[0];
    const io = req.app.get('io'), sockets = req.app.get('userSockets'), sid = sockets.get(userId);
    if (sid) io.to(sid).emit('bet:result', { game: 'crash', win: true, payout, multiplier });
    if (multiplier >= 5) notify(userId, 'win', 'Crash Win!', `Cashed out at ${multiplier}x — won ${payout.toFixed(4)} ${session.token}`, io, sockets);
    res.json({ win: true, payout, multiplier, crashAt: state.crashAt, balance: parseFloat(newBal.amount) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/crash/bust', verifyToken, async (req, res) => {
  const userId = req.user.userId;
  const { sessionId } = req.body;
  try {
    const session = (await db.query(
      "SELECT * FROM game_sessions WHERE id=$1 AND user_id=$2 AND game='crash' AND status='active'", [sessionId, userId]
    )).rows[0];
    if (!session) return res.status(400).json({ error: 'Session not found' });
    const state = session.state;
    await db.query("UPDATE game_sessions SET status='lost',updated_at=NOW() WHERE id=$1", [sessionId]);
    await db.query(
      `INSERT INTO bets(user_id,game,amount,token,chain,server_seed_hash,client_seed,nonce,result,payout) VALUES($1,'crash',$2,$3,$4,$5,$6,$7,$8,0)`,
      [userId, session.bet_amount, session.token, session.chain, state.serverSeedHash, state.clientSeed, state.nonce, JSON.stringify({ crashAt: state.crashAt, cashedAt: null })]
    );
    res.json({ crashAt: state.crashAt });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// — PLINKO —
const PLINKO_MULTS = [10,5,2,1,0.8,0.5,0.3,0.5,0.8,1,2,5,10];
const PLINKO_ROWS = 12;
router.post('/plinko', verifyToken, (req, res) => {
  playBet(req, res, 'plinko',
    () => null,
    (body, pf) => {
      const path = [];
      for (let i = 0; i < PLINKO_ROWS; i++) {
        const byte = parseInt(pf.hash.substring(i * 2, i * 2 + 2), 16);
        path.push(byte % 2 === 0 ? -1 : 1);
      }
      let pos = 0;
      for (let i = 0; i < PLINKO_ROWS; i++) pos += path[i];
      const normalized = (pos + PLINKO_ROWS) / (PLINKO_ROWS * 2);
      let slot = Math.round(normalized * (PLINKO_MULTS.length - 1));
      slot = Math.max(0, Math.min(PLINKO_MULTS.length - 1, slot));
      const mult = PLINKO_MULTS[slot];
      const payout = body.amount * mult;
      return { win: payout > 0, payout, resultData: { path, slot, multiplier: mult, hash: pf.hash } };
    }
  );
});
// — HILO (-) —
const SUITS = ['♠','♥','♦','♣'];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
function hiloCard(hash, idx) {
  const offset = idx * 4;
  const val = parseInt(hash.substring(offset, offset + 4), 16);
  const cardIdx = val % 52;
  return { s: SUITS[Math.floor(cardIdx / 13)], r: RANKS[cardIdx % 13], v: (cardIdx % 13) + 1 };
}
function hiloMultiplier(curVal, guess) {
  let winCards;
  if (guess === 'hi') winCards = 13 - curVal;
  else winCards = curVal - 1;
  winCards = Math.max(1, winCards + 1);
  const prob = winCards / 13;
  return parseFloat(Math.max(1.01, (0.97 / prob)).toFixed(4));
}
router.post('/hilo/start', verifyToken, async (req, res) => {
  const userId = req.user.userId;
  const { amount, token, chain } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  if (amount > MAX_BET) return res.status(400).json({ error: `MAX Bet: ${MAX_BET}` });
  if (!token || !chain) return res.status(400).json({ error: 'Token and chain required' });
  try {
    const active = (await db.query(
      "SELECT id FROM game_sessions WHERE user_id=$1 AND game='hilo' AND status='active'", [userId]
    )).rows[0];
    if(active){await db.query("UPDATE game_sessions SET status='lost',updated_at=NOW() WHERE id=$1", [active.id]);}
    const bal = (await db.query(
      'SELECT amount FROM balances WHERE user_id=$1 AND chain=$2 AND token=$3', [userId, chain, token]
    )).rows[0];
    if (!bal || parseFloat(bal.amount) < amount) return res.status(400).json({ error: 'Insufficient balance' });
    await db.query('UPDATE balances SET amount=amount-$1 WHERE user_id=$2 AND chain=$3 AND token=$4', [amount, userId, chain, token]);
    const pfData = await pf.play(userId);
    const firstCard = hiloCard(pfData.hash, 0);
    const state = { cards: [firstCard], cardIdx: 1, streak: 0, multiplier: 1, hash: pfData.hash, serverSeedHash: pfData.serverSeedHash, clientSeed: pfData.clientSeed, nonce: pfData.nonce };
    const session = (await db.query(
      `INSERT INTO game_sessions(user_id,game,state,bet_amount,token,chain,status) VALUES($1,'hilo',$2,$3,$4,$5,'active') RETURNING id`,
      [userId, JSON.stringify(state), amount, token, chain]
    )).rows[0];
    trackWager(userId, amount);
    res.json({ sessionId: session.id, card: firstCard, multiplier: 1, streak: 0, serverSeedHash: pfData.serverSeedHash });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/hilo/guess', verifyToken, async (req, res) => {
  const userId = req.user.userId;
  const { sessionId, guess } = req.body;
  if (!['hi','lo'].includes(guess)) return res.status(400).json({ error: 'Choose hi or lo' });
  try {
    const session = (await db.query(
      "SELECT * FROM game_sessions WHERE id=$1 AND user_id=$2 AND game='hilo' AND status='active'", [sessionId, userId]
    )).rows[0];
    if (!session) return res.status(400).json({ error: 'Session not found' });
    const state = session.state;
    const curCard = state.cards[state.cards.length - 1];
    const pfData = await pf.play(userId);
    const nextCard = hiloCard(pfData.hash, 0);
    state.cards.push(nextCard);
    const ok = (guess === 'hi' && nextCard.v >= curCard.v) || (guess === 'lo' && nextCard.v <= curCard.v);
    if (ok) {
      const stepMult = hiloMultiplier(curCard.v, guess);
      state.streak++;
      state.multiplier = parseFloat((state.multiplier * stepMult).toFixed(4));
      state.cardIdx++;
      await db.query("UPDATE game_sessions SET state=$1,updated_at=NOW() WHERE id=$2", [JSON.stringify(state), sessionId]);
      res.json({ correct: true, card: nextCard, multiplier: state.multiplier, streak: state.streak, stepMultiplier: stepMult });
    } else {
      await db.query("UPDATE game_sessions SET state=$1,status='lost',updated_at=NOW() WHERE id=$2", [JSON.stringify(state), sessionId]);
      await db.query(
        `INSERT INTO bets(user_id,game,amount,token,chain,server_seed_hash,client_seed,nonce,result,payout) VALUES($1,'hilo',$2,$3,$4,$5,$6,$7,$8,0)`,
        [userId, session.bet_amount, session.token, session.chain, state.serverSeedHash, state.clientSeed, state.nonce, JSON.stringify({ cards: state.cards, streak: state.streak })]
      );
      res.json({ correct: false, card: nextCard, multiplier: 0, streak: state.streak });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/hilo/cashout', verifyToken, async (req, res) => {
  const userId = req.user.userId;
  const { sessionId } = req.body;
  try {
    const session = (await db.query(
      "SELECT * FROM game_sessions WHERE id=$1 AND user_id=$2 AND game='hilo' AND status='active'", [sessionId, userId]
    )).rows[0];
    if (!session) return res.status(400).json({ error: 'Session not found' });
    const state = session.state;
    if (state.streak === 0) return res.status(400).json({ error: 'Guess at least one card' });
    const payout = parseFloat((parseFloat(session.bet_amount) * state.multiplier).toFixed(18));
    await db.query('UPDATE balances SET amount=amount+$1 WHERE user_id=$2 AND chain=$3 AND token=$4', [payout, userId, session.chain, session.token]);
    await db.query("UPDATE game_sessions SET status='won',updated_at=NOW() WHERE id=$1", [sessionId]);
    await db.query(
      `INSERT INTO bets(user_id,game,amount,token,chain,server_seed_hash,client_seed,nonce,result,payout) VALUES($1,'hilo',$2,$3,$4,$5,$6,$7,$8,$9)`,
      [userId, session.bet_amount, session.token, session.chain, state.serverSeedHash, state.clientSeed, state.nonce, JSON.stringify({ cards: state.cards, streak: state.streak }), payout]
    );
    const newBal = (await db.query('SELECT amount FROM balances WHERE user_id=$1 AND chain=$2 AND token=$3', [userId, session.chain, session.token])).rows[0];
    const io = req.app.get('io'), sockets = req.app.get('userSockets'), sid = sockets.get(userId);
    if (sid) io.to(sid).emit('bet:result', { game: 'hilo', win: true, payout, multiplier: state.multiplier });
    if (state.multiplier >= 5) notify(userId, 'win', 'HiLo Streak!', `${state.streak} streak — won ${payout.toFixed(4)} ${session.token} (${state.multiplier}x)`, io, sockets);
    res.json({ win: true, payout, multiplier: state.multiplier, balance: parseFloat(newBal.amount) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/abandon', verifyToken, async (req, res) => {
   const userId = req.user.userId;
   const { game } = req.body;
   const tables = { hilo:'hilo', mines:'mines', blackjack:'blackjack', crash:'crash' };
   if (!tables[game]) return res.status(400).json({ error: 'Unknown game' });
   try {
     await db.query(
       "UPDATE game_sessions SET status='lost',updated_at=NOW() WHERE user_id=$1 AND game=$2 AND status='active'",
       [userId, tables[game]]
     );
     res.json({ ok: true });
   } catch(e) { res.status(500).json({ error: e.message }); }
 });
// — SEEDS —
router.get('/seeds', verifyToken, async (req, res) => {
  try {
    const seed = await pf.getActiveSeed(req.user.userId);
    res.json({ serverSeedHash: seed.server_seed_hash || seed.serverSeedHash,
      clientSeed: seed.client_seed || seed.clientSeed, nonce: seed.nonce });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/seeds/client', verifyToken, async (req, res) => {
  const { clientSeed } = req.body;
  if (!clientSeed || clientSeed.length > 64) return res.status(400).json({ error: 'Invalid client seed (max 64 chars)' });
  try {
    await db.query('UPDATE user_seeds SET client_seed=$1 WHERE user_id=$2 AND active=true', [clientSeed, req.user.userId]);
    res.json({ clientSeed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/seeds/rotate', verifyToken, async (req, res) => {
  try {
    const data = await pf.rotateSeed(req.user.userId, req.body.newClientSeed);
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.get('/history', verifyToken, async (req, res) => {
  try {
    const bets = (await db.query(
      'SELECT * FROM bets WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20', [req.user.userId]
    )).rows;
    res.json({ bets });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
export default router;