import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
async function init() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        wallet_address VARCHAR(42) UNIQUE NOT NULL,
        role VARCHAR(10) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS balances (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        chain VARCHAR(20) NOT NULL,
        token VARCHAR(20) NOT NULL,
        amount NUMERIC(28,18) DEFAULT 0,
        UNIQUE(user_id, chain, token)
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        type VARCHAR(20) NOT NULL,
        chain VARCHAR(20),
        token VARCHAR(20),
        amount NUMERIC(28,18),
        tx_hash VARCHAR(66),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS bets (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        game VARCHAR(20) NOT NULL,
        amount NUMERIC(28,18) NOT NULL,
        token VARCHAR(20),
        chain VARCHAR(20),
        server_seed_hash VARCHAR(64),
        client_seed VARCHAR(64),
        nonce INT,
        result JSONB,
        payout NUMERIC(28,18) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_seeds (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        server_seed VARCHAR(64) NOT NULL,
        server_seed_hash VARCHAR(64) NOT NULL,
        client_seed VARCHAR(64) DEFAULT 'default',
        nonce INT DEFAULT 0,
        active BOOLEAN DEFAULT true,
        revealed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        game VARCHAR(20) NOT NULL,
        state JSONB NOT NULL,
        bet_amount NUMERIC(28,18) NOT NULL,
        token VARCHAR(20) NOT NULL,
        chain VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    // VIP tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS vip_progress (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) UNIQUE,
        total_wagered NUMERIC(28,18) DEFAULT 0,
        tier VARCHAR(20) DEFAULT 'bronze',
        last_claim TIMESTAMP,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    // Referral
    await client.query(`
      CREATE TABLE IF NOT EXISTS referrals (
        id SERIAL PRIMARY KEY,
        referrer_id INT REFERENCES users(id),
        referred_id INT REFERENCES users(id),
        code VARCHAR(20) NOT NULL,
        commission_earned NUMERIC(28,18) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        type VARCHAR(20) NOT NULL,
        title VARCHAR(100) NOT NULL,
        message TEXT,
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(10) DEFAULT 'user';
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_game_sessions_user_active ON game_sessions(user_id, game, status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_bets_user ON bets(user_id, created_at DESC);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at DESC);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_vip_user ON vip_progress(user_id);`);
    await client.query('COMMIT');
    console.log('✅ Database');
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' ORDER BY table_name;
    `);
    console.log('📋 Tables');
    tables.rows.forEach(r => console.log('   •', r.table_name));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}
init();