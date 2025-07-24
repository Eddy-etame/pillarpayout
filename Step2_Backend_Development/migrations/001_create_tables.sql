-- Migration script to create initial tables for PillarPayout

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  salt VARCHAR(255),
  balance NUMERIC(15, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rounds (
  id SERIAL PRIMARY KEY,
  server_seed VARCHAR(64) NOT NULL,
  client_seed_hash VARCHAR(64) NOT NULL,
  final_multiplier NUMERIC(10, 2),
  crash_point_nonce INTEGER NOT NULL,
  started_at TIMESTAMP,
  ended_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  round_id INTEGER REFERENCES rounds(id),
  bet_amount NUMERIC(15, 2) NOT NULL,
  cash_out_multiplier NUMERIC(10, 2),
  winnings NUMERIC(15, 2),
  status VARCHAR(20) NOT NULL,
  placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  status VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_goals (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  target_height INTEGER NOT NULL,
  current_height INTEGER DEFAULT 0,
  reward_amount NUMERIC(15, 2),
  status VARCHAR(20),
  start_date DATE,
  end_date DATE
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  round_id INTEGER REFERENCES rounds(id),
  message TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_logs (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER,
  action TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  details TEXT
);
