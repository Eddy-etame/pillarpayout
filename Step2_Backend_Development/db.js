const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Check if we're in a testing environment
const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';

let pool;

// For testing, use mock database
if (isTestEnvironment) {
  const mockDb = {
    query: jest.fn ? jest.fn().mockResolvedValue({ rows: [] }) : (() => {
      throw new Error('Database not configured for testing');
    }),
    pool: {
      connect: jest.fn ? jest.fn().mockResolvedValue({
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn()
      }) : (() => {
        throw new Error('Database pool not configured for testing');
      })
    }
  };

  pool = mockDb.pool;
} else {
  // For production/development, create real pool
  try {
    // Use existing .env values with fallbacks
    const dbConfig = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || '', // Allow empty password for local development
      database: process.env.POSTGRES_DB || 'pillar_payout',
    };

    // Only throw error if we can't connect at all
    pool = new Pool(dbConfig);

    pool.on('connect', () => {
      console.log('Connected to the PostgreSQL database');
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      // Don't exit process in development, just log the error
      if (process.env.NODE_ENV === 'production') {
        process.exit(-1);
      }
    });

  } catch (error) {
    console.error('Failed to create database pool:', error);
    // Create a mock pool for development if connection fails
    pool = {
      query: () => Promise.reject(new Error('Database connection failed')),
      connect: () => Promise.reject(new Error('Database connection failed')),
      on: () => {},
      totalCount: 0
    };
  }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  run: async (sql) => pool.query(sql),
  isConnected: () => pool && pool.totalCount > 0
};
