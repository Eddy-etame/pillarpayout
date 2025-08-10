-- Migration: Create payment transactions table
-- Date: 2024-01-XX
-- Description: Add payment transactions table for handling recharge payments

CREATE TABLE IF NOT EXISTS payment_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) NOT NULL,
    gateway VARCHAR(50) NOT NULL,
    gateway_transaction_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway ON payment_transactions(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway_transaction_id ON payment_transactions(gateway_transaction_id);

-- Add comments
COMMENT ON TABLE payment_transactions IS 'Stores all payment transactions for user recharges';
COMMENT ON COLUMN payment_transactions.user_id IS 'Reference to the user making the payment';
COMMENT ON COLUMN payment_transactions.amount IS 'Payment amount in FCFA';
COMMENT ON COLUMN payment_transactions.payment_method IS 'Method used for payment (credit_card, mtn_mobile_money, etc.)';
COMMENT ON COLUMN payment_transactions.gateway IS 'Payment gateway used (stripe, mtn, orange, bank)';
COMMENT ON COLUMN payment_transactions.gateway_transaction_id IS 'Transaction ID from the payment gateway';
COMMENT ON COLUMN payment_transactions.status IS 'Current status of the transaction';
COMMENT ON COLUMN payment_transactions.metadata IS 'Additional payment-specific data stored as JSON';
COMMENT ON COLUMN payment_transactions.created_at IS 'When the transaction was created';
COMMENT ON COLUMN payment_transactions.updated_at IS 'When the transaction was last updated';
