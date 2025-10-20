-- Create weekly tournaments table
CREATE TABLE IF NOT EXISTS weekly_tournaments (
    id SERIAL PRIMARY KEY,
    tournament_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    actual_start_time TIMESTAMP,
    actual_end_time TIMESTAMP,
    status VARCHAR(20) DEFAULT 'registration' CHECK (status IN ('registration', 'active', 'completed', 'cancelled')),
    max_players INTEGER NOT NULL DEFAULT 1000,
    entry_fee DECIMAL(10,2) DEFAULT 0,
    prize_pool DECIMAL(10,2) DEFAULT 0,
    total_participants INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create weekly tournament participants table
CREATE TABLE IF NOT EXISTS weekly_tournament_participants (
    id SERIAL PRIMARY KEY,
    tournament_id VARCHAR(100) NOT NULL REFERENCES weekly_tournaments(tournament_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    group_id VARCHAR(50) NOT NULL,
    joined_at TIMESTAMP DEFAULT NOW(),
    total_bets INTEGER DEFAULT 0,
    total_wagered DECIMAL(10,2) DEFAULT 0,
    total_winnings DECIMAL(10,2) DEFAULT 0,
    biggest_win DECIMAL(10,2) DEFAULT 0,
    highest_multiplier DECIMAL(10,2) DEFAULT 0,
    score DECIMAL(10,2) DEFAULT 0,
    rank INTEGER DEFAULT 0,
    UNIQUE(tournament_id, user_id, group_id)
);

-- Create weekly tournament prizes table
CREATE TABLE IF NOT EXISTS weekly_tournament_prizes (
    id SERIAL PRIMARY KEY,
    tournament_id VARCHAR(100) NOT NULL REFERENCES weekly_tournaments(tournament_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    overall_rank INTEGER NOT NULL,
    prize_amount DECIMAL(10,2) NOT NULL,
    distributed_at TIMESTAMP DEFAULT NOW()
);

-- Create weekly tournament results table
CREATE TABLE IF NOT EXISTS weekly_tournament_results (
    id SERIAL PRIMARY KEY,
    tournament_id VARCHAR(100) NOT NULL REFERENCES weekly_tournaments(tournament_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    overall_rank INTEGER NOT NULL,
    score DECIMAL(10,2) NOT NULL,
    total_bets INTEGER NOT NULL,
    total_wagered DECIMAL(10,2) NOT NULL,
    total_winnings DECIMAL(10,2) NOT NULL,
    biggest_win DECIMAL(10,2) NOT NULL,
    highest_multiplier DECIMAL(10,2) NOT NULL,
    prize_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_weekly_tournaments_status ON weekly_tournaments(status);
CREATE INDEX IF NOT EXISTS idx_weekly_tournaments_start_date ON weekly_tournaments(start_date);
CREATE INDEX IF NOT EXISTS idx_weekly_tournament_participants_tournament_id ON weekly_tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_weekly_tournament_participants_user_id ON weekly_tournament_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_tournament_participants_group_id ON weekly_tournament_participants(group_id);
CREATE INDEX IF NOT EXISTS idx_weekly_tournament_prizes_tournament_id ON weekly_tournament_prizes(tournament_id);
CREATE INDEX IF NOT EXISTS idx_weekly_tournament_prizes_user_id ON weekly_tournament_prizes(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_tournament_results_tournament_id ON weekly_tournament_results(tournament_id);
CREATE INDEX IF NOT EXISTS idx_weekly_tournament_results_user_id ON weekly_tournament_results(user_id);

-- Create view for weekly tournament statistics
CREATE OR REPLACE VIEW weekly_tournament_statistics AS
SELECT 
    COUNT(*) as total_tournaments,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tournaments,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_tournaments,
    COUNT(CASE WHEN status = 'registration' THEN 1 END) as registration_tournaments,
    SUM(prize_pool) as total_prizes_distributed,
    AVG(total_participants) as average_participants,
    MAX(prize_pool) as highest_prize_pool
FROM weekly_tournaments;
