-- Migration to fix nonce column type
-- Change nonce from INTEGER to BIGINT to handle large timestamp values
 
ALTER TABLE rounds ALTER COLUMN nonce TYPE BIGINT; 