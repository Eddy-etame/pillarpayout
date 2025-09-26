-- Migration to create round_results table for storing win/loss information
-- This will allow the frontend to properly display round history with correct win/loss status

CREATE TABLE IF NOT EXISTS round_results (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  round_id INTEGER REFERENCES rounds(id) ON DELETE CASCADE,
  bet_amount NUMERIC(15, 2) NOT NULL,
  cashout_multiplier NUMERIC(10, 2),
  final_multiplier NUMERIC(10, 2) NOT NULL,
  result VARCHAR(10) NOT NULL CHECK (result IN ('win', 'loss')),
  winnings NUMERIC(15, 2) DEFAULT 0,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, round_id)
);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_round_results_user_id ON round_results(user_id);
CREATE INDEX IF NOT EXISTS idx_round_results_round_id ON round_results(round_id);
CREATE INDEX IF NOT EXISTS idx_round_results_timestamp ON round_results(timestamp);

-- Update the existing bets table to include result information
ALTER TABLE bets ADD COLUMN IF NOT EXISTS result VARCHAR(10) CHECK (result IN ('win', 'loss'));
ALTER TABLE bets ADD COLUMN IF NOT EXISTS final_multiplier NUMERIC(10, 2);
ALTER TABLE bets ADD COLUMN IF NOT EXISTS winnings NUMERIC(15, 2) DEFAULT 0;

-- Add index for bets table
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_round_id ON bets(round_id);
CREATE INDEX IF NOT EXISTS idx_bets_timestamp ON bets(timestamp);
