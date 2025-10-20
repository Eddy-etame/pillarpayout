-- Add multi-game insurance support to bet_insurance table
-- This migration adds columns to track how many games the insurance covers

ALTER TABLE bet_insurance 
ADD COLUMN IF NOT EXISTS games_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS games_remaining INTEGER DEFAULT 1;

-- Add index for efficient querying of active multi-game insurance
CREATE INDEX IF NOT EXISTS idx_bet_insurance_games_remaining 
ON bet_insurance (user_id, games_remaining) 
WHERE status = 'active' AND games_remaining > 0;

-- Add comment to explain the new columns
COMMENT ON COLUMN bet_insurance.games_count IS 'Total number of games this insurance covers';
COMMENT ON COLUMN bet_insurance.games_remaining IS 'Number of games remaining for this insurance policy';
