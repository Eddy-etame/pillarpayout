-- Create special blocks table
CREATE TABLE IF NOT EXISTS special_blocks (
    id SERIAL PRIMARY KEY,
    round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    block_type VARCHAR(50) NOT NULL,
    block_name VARCHAR(100) NOT NULL,
    description TEXT,
    effect_type VARCHAR(50) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    duration INTEGER NOT NULL, -- in milliseconds
    current_multiplier DECIMAL(10,2) NOT NULL,
    current_integrity DECIMAL(10,2) NOT NULL,
    profit_impact VARCHAR(20) NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create special block usage table
CREATE TABLE IF NOT EXISTS special_block_usage (
    id SERIAL PRIMARY KEY,
    round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'cashout', 'crash', 'effect_applied'
    effect_data JSONB NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_special_blocks_round_id ON special_blocks(round_id);
CREATE INDEX IF NOT EXISTS idx_special_blocks_block_type ON special_blocks(block_type);
CREATE INDEX IF NOT EXISTS idx_special_blocks_active ON special_blocks(active);
CREATE INDEX IF NOT EXISTS idx_special_blocks_start_time ON special_blocks(start_time);
CREATE INDEX IF NOT EXISTS idx_special_block_usage_round_id ON special_block_usage(round_id);
CREATE INDEX IF NOT EXISTS idx_special_block_usage_user_id ON special_block_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_special_block_usage_action ON special_block_usage(action);

-- Create view for special block statistics
CREATE OR REPLACE VIEW special_block_statistics AS
SELECT 
    COUNT(*) as total_blocks_generated,
    COUNT(CASE WHEN block_type = 'boost' THEN 1 END) as boost_blocks,
    COUNT(CASE WHEN block_type = 'stability' THEN 1 END) as stability_blocks,
    COUNT(CASE WHEN block_type = 'bonus' THEN 1 END) as bonus_blocks,
    COUNT(CASE WHEN block_type = 'crash' THEN 1 END) as crash_blocks,
    COUNT(CASE WHEN block_type = 'safety' THEN 1 END) as safety_blocks,
    COUNT(CASE WHEN profit_impact = 'positive' OR profit_impact = 'very_positive' THEN 1 END) as profitable_blocks,
    COUNT(CASE WHEN profit_impact = 'negative' THEN 1 END) as costly_blocks,
    AVG(current_multiplier) as average_multiplier_at_generation,
    AVG(current_integrity) as average_integrity_at_generation
FROM special_blocks; 