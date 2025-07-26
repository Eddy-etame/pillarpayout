-- Migration to fix rounds table schema
-- Drop existing rounds table and recreate with correct schema

DROP TABLE IF EXISTS rounds CASCADE;

CREATE TABLE rounds (
  id SERIAL PRIMARY KEY,
  crash_point NUMERIC(5, 2) NOT NULL,
  server_seed VARCHAR(64) NOT NULL,
  client_seed VARCHAR(64) NOT NULL,
  nonce INTEGER NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP
); 