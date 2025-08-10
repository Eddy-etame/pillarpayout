-- Migration to fix community_goals table schema
-- Drop the old table and recreate with correct columns

DROP TABLE IF EXISTS community_goals CASCADE;

CREATE TABLE community_goals (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  target_amount NUMERIC(15, 2) NOT NULL,
  current_amount NUMERIC(15, 2) DEFAULT 0,
  reward_type VARCHAR(50) NOT NULL,
  reward_value NUMERIC(15, 2) NOT NULL,
  duration INTEGER NOT NULL, -- in hours
  min_bet_amount NUMERIC(15, 2) DEFAULT 0,
  max_bet_amount NUMERIC(15, 2),
  required_participants INTEGER DEFAULT 1,
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create community_goal_participants table
CREATE TABLE IF NOT EXISTS community_goal_participants (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER REFERENCES community_goals(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_contributed NUMERIC(15, 2) DEFAULT 0,
  UNIQUE(goal_id, user_id)
);

-- Create community_goal_contributions table
CREATE TABLE IF NOT EXISTS community_goal_contributions (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER REFERENCES community_goals(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  bet_amount NUMERIC(15, 2) NOT NULL,
  bet_result VARCHAR(20) NOT NULL, -- 'win', 'loss', 'cashout'
  contribution_amount NUMERIC(15, 2) NOT NULL,
  round_id INTEGER REFERENCES rounds(id),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_community_goals_status ON community_goals(status);
CREATE INDEX idx_community_goals_end_time ON community_goals(end_time);
CREATE INDEX idx_community_goal_participants_goal_id ON community_goal_participants(goal_id);
CREATE INDEX idx_community_goal_contributions_goal_id ON community_goal_contributions(goal_id);
CREATE INDEX idx_community_goal_contributions_user_id ON community_goal_contributions(user_id); 