-- Create tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
    id SERIAL PRIMARY KEY,
    tournament_id VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    entry_fee DECIMAL(10,2) NOT NULL,
    duration INTEGER NOT NULL, -- in milliseconds
    max_players INTEGER NOT NULL,
    prize_pool DECIMAL(5,4) NOT NULL, -- percentage of entry fees
    min_bets INTEGER NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    actual_start_time TIMESTAMP,
    actual_end_time TIMESTAMP,
    status VARCHAR(20) DEFAULT 'registration' CHECK (status IN ('registration', 'active', 'completed', 'cancelled')),
    total_entry_fees DECIMAL(10,2) DEFAULT 0,
    total_prize_pool DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create tournament participants table
CREATE TABLE IF NOT EXISTS tournament_participants (
    id SERIAL PRIMARY KEY,
    tournament_id VARCHAR(100) NOT NULL REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    joined_at TIMESTAMP DEFAULT NOW(),
    total_bets INTEGER DEFAULT 0,
    total_wagered DECIMAL(10,2) DEFAULT 0,
    total_won DECIMAL(10,2) DEFAULT 0,
    biggest_win DECIMAL(10,2) DEFAULT 0,
    highest_multiplier DECIMAL(10,2) DEFAULT 0,
    score DECIMAL(10,2) DEFAULT 0,
    UNIQUE(tournament_id, user_id)
);

-- Create tournament prizes table
CREATE TABLE IF NOT EXISTS tournament_prizes (
    id SERIAL PRIMARY KEY,
    tournament_id VARCHAR(100) NOT NULL REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    prize_amount DECIMAL(10,2) NOT NULL,
    distributed_at TIMESTAMP DEFAULT NOW()
);

-- Create tournament results table
CREATE TABLE IF NOT EXISTS tournament_results (
    id SERIAL PRIMARY KEY,
    tournament_id VARCHAR(100) NOT NULL REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    score DECIMAL(10,2) NOT NULL,
    total_bets INTEGER NOT NULL,
    total_wagered DECIMAL(10,2) NOT NULL,
    total_won DECIMAL(10,2) NOT NULL,
    biggest_win DECIMAL(10,2) NOT NULL,
    highest_multiplier DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_start_time ON tournaments(start_time);
CREATE INDEX IF NOT EXISTS idx_tournaments_type ON tournaments(type);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament_id ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user_id ON tournament_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_prizes_tournament_id ON tournament_prizes(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_prizes_user_id ON tournament_prizes(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_results_tournament_id ON tournament_results(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_results_user_id ON tournament_results(user_id);

-- Create view for tournament statistics
CREATE OR REPLACE VIEW tournament_statistics AS
SELECT 
    COUNT(*) as total_tournaments,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tournaments,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_tournaments,
    COUNT(CASE WHEN status = 'registration' THEN 1 END) as registration_tournaments,
    SUM(total_entry_fees) as total_entry_fees_collected,
    SUM(total_prize_pool) as total_prizes_distributed,
    AVG(total_entry_fees) as average_entry_fees,
    AVG(total_prize_pool) as average_prize_pool,
    (SUM(total_entry_fees) - SUM(total_prize_pool)) as house_profit
FROM tournaments; 