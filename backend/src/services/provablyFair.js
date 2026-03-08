import crypto from 'crypto';
import db from '../config/db.js';
export const generateServerSeed = () => crypto.randomBytes(32).toString('hex');
export const hashSeed = (seed) => crypto.createHash('sha256').update(seed).digest('hex');
export const getResult = (serverSeed, clientSeed, nonce) => {
  const hmac = crypto.createHmac('sha256', serverSeed);
  hmac.update(`${clientSeed}:${nonce}`);
  return hmac.digest('hex');
};
export const hashToFloat = (hash) => parseInt(hash.slice(0, 8), 16) / 0xffffffff;
export const coinFlip = (hash) => hashToFloat(hash) < 0.5 ? 'heads' : 'tails';
export const createSeedForUser = async (userId) => {
  await db.query('UPDATE user_seeds SET active = false WHERE user_id = $1 AND active = true', [userId]);
  const serverSeed = generateServerSeed();
  const serverSeedHash = hashSeed(serverSeed);
  const seed = (await db.query(
    `INSERT INTO user_seeds (user_id, server_seed, server_seed_hash, client_seed, nonce, active)
     VALUES ($1, $2, $3, 'default', 0, true) RETURNING *`, [userId, serverSeed, serverSeedHash]
  )).rows[0];
  return { serverSeedHash: seed.server_seed_hash, clientSeed: seed.client_seed, nonce: seed.nonce };
};
export const getActiveSeed = async (userId) => {
  const seed = (await db.query('SELECT * FROM user_seeds WHERE user_id = $1 AND active = true', [userId])).rows[0];
  if (!seed) return createSeedForUser(userId);
  return seed;
};
export const play = async (userId) => {
  const seed = await getActiveSeed(userId);
  const hash = getResult(seed.server_seed, seed.client_seed, seed.nonce);
  const result = coinFlip(hash);
  await db.query('UPDATE user_seeds SET nonce = nonce + 1 WHERE id = $1', [seed.id]);
  return { result, hash, nonce: seed.nonce, serverSeedHash: seed.server_seed_hash, clientSeed: seed.client_seed };
};
export const rotateSeed = async (userId, newClientSeed) => {
  const oldSeed = (await db.query(
    `UPDATE user_seeds SET active = false, revealed_at = NOW()
     WHERE user_id = $1 AND active = true RETURNING *`, [userId]
  )).rows[0];
  const serverSeed = generateServerSeed();
  const serverSeedHash = hashSeed(serverSeed);
  const clientSeed = newClientSeed || 'default';
  await db.query(
    `INSERT INTO user_seeds (user_id, server_seed, server_seed_hash, client_seed, nonce, active)
     VALUES ($1, $2, $3, $4, 0, true)`, [userId, serverSeed, serverSeedHash, clientSeed]
  );
  return {
    previous: oldSeed ? { serverSeed: oldSeed.server_seed, serverSeedHash: oldSeed.server_seed_hash,
      clientSeed: oldSeed.client_seed, totalBets: oldSeed.nonce } : null,
    current: { serverSeedHash, clientSeed, nonce: 0 },
  };
};