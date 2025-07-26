-- Create bet insurance table
CREATE TABLE IF NOT EXISTS bet_insurance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bet_id INTEGER NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
    insurance_type VARCHAR(20) NOT NULL CHECK (insurance_type IN ('basic', 'premium', 'elite')),
    bet_amount DECIMAL(10,2) NOT NULL,
    premium_amount DECIMAL(10,2) NOT NULL,
    coverage_rate DECIMAL(5,4) NOT NULL,
    coverage_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'claimed', 'expired')),
    purchased_at TIMESTAMP DEFAULT NOW(),
    claimed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create insurance claims table for tracking
CREATE TABLE IF NOT EXISTS insurance_claims (
    id SERIAL PRIMARY KEY,
    insurance_id INTEGER NOT NULL REFERENCES bet_insurance(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bet_id INTEGER NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
    claim_amount DECIMAL(10,2) NOT NULL,
    claim_reason VARCHAR(100) NOT NULL,
    processed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bet_insurance_user_id ON bet_insurance(user_id);
CREATE INDEX IF NOT EXISTS idx_bet_insurance_bet_id ON bet_insurance(bet_id);
CREATE INDEX IF NOT EXISTS idx_bet_insurance_status ON bet_insurance(status);
CREATE INDEX IF NOT EXISTS idx_bet_insurance_purchased_at ON bet_insurance(purchased_at);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_insurance_id ON insurance_claims(insurance_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_user_id ON insurance_claims(user_id);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_bet_insurance_updated_at 
    BEFORE UPDATE ON bet_insurance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add insurance-related columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_insurance_premiums DECIMAL(10,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_insurance_payouts DECIMAL(10,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS insurance_claims_count INTEGER DEFAULT 0;

-- Create view for insurance statistics
CREATE OR REPLACE VIEW insurance_statistics AS
SELECT 
    COUNT(*) as total_insurance_purchases,
    SUM(premium_amount) as total_premiums_collected,
    COUNT(CASE WHEN status = 'claimed' THEN 1 END) as total_claims,
    SUM(CASE WHEN status = 'claimed' THEN coverage_amount ELSE 0 END) as total_payouts,
    AVG(premium_amount) as average_premium,
    AVG(CASE WHEN status = 'claimed' THEN coverage_amount ELSE 0 END) as average_payout,
    (SUM(premium_amount) - SUM(CASE WHEN status = 'claimed' THEN coverage_amount ELSE 0 END)) as net_profit,
    CASE 
        WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(CASE WHEN status = 'claimed' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
        ELSE 0 
    END as claim_rate_percentage
FROM bet_insurance; 