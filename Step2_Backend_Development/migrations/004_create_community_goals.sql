-- Create community goals table
CREATE TABLE IF NOT EXISTS community_goals (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    target_amount DECIMAL(10,2) NOT NULL,
    current_amount DECIMAL(10,2) DEFAULT 0,
    reward_type VARCHAR(50) NOT NULL CHECK (reward_type IN ('bonus_multiplier', 'free_bet', 'cash_reward', 'special_feature')),
    reward_value DECIMAL(10,2) NOT NULL,
    duration INTEGER NOT NULL, -- in hours
    min_bet_amount DECIMAL(10,2) DEFAULT 0,
    max_bet_amount DECIMAL(10,2),
    required_participants INTEGER DEFAULT 1,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create community goal participants table
CREATE TABLE IF NOT EXISTS community_goal_participants (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL REFERENCES community_goals(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(goal_id, user_id)
);

-- Create community goal contributions table
CREATE TABLE IF NOT EXISTS community_goal_contributions (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL REFERENCES community_goals(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bet_amount DECIMAL(10,2) NOT NULL,
    contribution_amount DECIMAL(10,2) NOT NULL,
    bet_result JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Create community goal rewards table
CREATE TABLE IF NOT EXISTS community_goal_rewards (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL REFERENCES community_goals(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reward_type VARCHAR(50) NOT NULL,
    reward_value DECIMAL(10,2) NOT NULL,
    distributed_at TIMESTAMP DEFAULT NOW()
);

-- Create user features table for special features
CREATE TABLE IF NOT EXISTS user_features (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature_name VARCHAR(100) NOT NULL,
    unlocked_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, feature_name)
);

-- Add new columns to users table for community goals
ALTER TABLE users ADD COLUMN IF NOT EXISTS bonus_multiplier DECIMAL(5,2) DEFAULT 1.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS free_bet_credits DECIMAL(10,2) DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_community_goals_status ON community_goals(status);
CREATE INDEX IF NOT EXISTS idx_community_goals_end_time ON community_goals(end_time);
CREATE INDEX IF NOT EXISTS idx_community_goal_participants_goal_id ON community_goal_participants(goal_id);
CREATE INDEX IF NOT EXISTS idx_community_goal_participants_user_id ON community_goal_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_community_goal_contributions_goal_id ON community_goal_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_community_goal_contributions_user_id ON community_goal_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_community_goal_contributions_timestamp ON community_goal_contributions(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_features_user_id ON user_features(user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_community_goals_updated_at 
    BEFORE UPDATE ON community_goals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 