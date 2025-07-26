-- Create system metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
    id SERIAL PRIMARY KEY,
    cpu_usage DECIMAL(5,2) NOT NULL,
    memory_usage DECIMAL(5,2) NOT NULL,
    uptime DECIMAL(10,2) NOT NULL,
    active_connections INTEGER DEFAULT 0,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Create game metrics table
CREATE TABLE IF NOT EXISTS game_metrics (
    id SERIAL PRIMARY KEY,
    active_players INTEGER DEFAULT 0,
    total_bets INTEGER DEFAULT 0,
    total_wagered DECIMAL(15,2) DEFAULT 0,
    total_won DECIMAL(15,2) DEFAULT 0,
    average_bet_size DECIMAL(10,2) DEFAULT 0,
    crash_rate DECIMAL(5,4) DEFAULT 0,
    house_edge DECIMAL(5,4) DEFAULT 0,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Create business metrics table
CREATE TABLE IF NOT EXISTS business_metrics (
    id SERIAL PRIMARY KEY,
    daily_revenue DECIMAL(15,2) DEFAULT 0,
    daily_profit DECIMAL(15,2) DEFAULT 0,
    monthly_revenue DECIMAL(15,2) DEFAULT 0,
    monthly_profit DECIMAL(15,2) DEFAULT 0,
    player_retention DECIMAL(5,4) DEFAULT 0,
    average_session_time INTEGER DEFAULT 0,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Create performance records table
CREATE TABLE IF NOT EXISTS performance_records (
    id SERIAL PRIMARY KEY,
    operation VARCHAR(100) NOT NULL,
    duration INTEGER NOT NULL, -- in milliseconds
    success BOOLEAN DEFAULT true,
    server_id VARCHAR(50) DEFAULT 'main',
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS system_alerts (
    id SERIAL PRIMARY KEY,
    alert_id VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    acknowledged BOOLEAN DEFAULT false,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_game_metrics_timestamp ON game_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_business_metrics_timestamp ON business_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_records_timestamp ON performance_records(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_records_operation ON performance_records(operation);
CREATE INDEX IF NOT EXISTS idx_system_alerts_timestamp ON system_alerts(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_acknowledged ON system_alerts(acknowledged);

-- Create views for analytics
CREATE OR REPLACE VIEW system_performance_summary AS
SELECT 
    DATE(timestamp) as date,
    AVG(cpu_usage) as avg_cpu_usage,
    AVG(memory_usage) as avg_memory_usage,
    MAX(active_connections) as max_connections,
    COUNT(*) as metric_count
FROM system_metrics
GROUP BY DATE(timestamp)
ORDER BY date DESC;

CREATE OR REPLACE VIEW game_performance_summary AS
SELECT 
    DATE(timestamp) as date,
    AVG(active_players) as avg_active_players,
    SUM(total_bets) as total_bets,
    SUM(total_wagered) as total_wagered,
    SUM(total_won) as total_won,
    AVG(average_bet_size) as avg_bet_size,
    AVG(crash_rate) as avg_crash_rate,
    AVG(house_edge) as avg_house_edge
FROM game_metrics
GROUP BY DATE(timestamp)
ORDER BY date DESC;

CREATE OR REPLACE VIEW business_performance_summary AS
SELECT 
    DATE(timestamp) as date,
    AVG(daily_revenue) as avg_daily_revenue,
    AVG(daily_profit) as avg_daily_profit,
    AVG(monthly_revenue) as avg_monthly_revenue,
    AVG(monthly_profit) as avg_monthly_profit,
    AVG(player_retention) as avg_player_retention,
    AVG(average_session_time) as avg_session_time
FROM business_metrics
GROUP BY DATE(timestamp)
ORDER BY date DESC;

CREATE OR REPLACE VIEW performance_analytics AS
SELECT 
    operation,
    COUNT(*) as total_operations,
    AVG(duration) as avg_duration,
    MIN(duration) as min_duration,
    MAX(duration) as max_duration,
    COUNT(CASE WHEN success = true THEN 1 END) as successful_operations,
    COUNT(CASE WHEN success = false THEN 1 END) as failed_operations,
    ROUND((COUNT(CASE WHEN success = true THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2) as success_rate
FROM performance_records
GROUP BY operation
ORDER BY avg_duration DESC; 