const db = require('../db');
const logger = require('../utils/logger');
const crypto = require('crypto');

class PaymentService {
  constructor() {
    // Payment gateway configurations
    this.gateways = {
      stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
      },
      mtn: {
        apiKey: process.env.MTN_MOBILE_MONEY_API_KEY,
        merchantId: process.env.MTN_MERCHANT_ID,
        environment: process.env.MTN_ENVIRONMENT || 'sandbox'
      },
      orange: {
        apiKey: process.env.ORANGE_MONEY_API_KEY,
        merchantId: process.env.ORANGE_MERCHANT_ID,
        environment: process.env.ORANGE_ENVIRONMENT || 'sandbox'
      },
      bank: {
        apiKey: process.env.BANK_API_KEY,
        bankCode: process.env.BANK_CODE,
        environment: process.env.BANK_ENVIRONMENT || 'sandbox'
      }
    };

    // WebSocket instance for real-time updates
    this.io = null;

    // Transaction statuses
    this.statuses = {
      PENDING: 'pending',
      PROCESSING: 'processing',
      COMPLETED: 'completed',
      FAILED: 'failed',
      CANCELLED: 'cancelled'
    };

    // Payment methods
    this.paymentMethods = {
      CREDIT_CARD: 'credit_card',
      DEBIT_CARD: 'debit_card',
      MTN_MOBILE_MONEY: 'mtn_mobile_money',
      ORANGE_MONEY: 'orange_money',
      BANK_TRANSFER: 'bank_transfer',
      DIGITAL_WALLET: 'digital_wallet'
    };
  }

  /**
   * Set WebSocket instance for real-time updates
   */
  setIo(io) {
    this.io = io;
  }

  /**
   * Initialize payment gateway connections
   */
  async initializeGateways() {
    try {
      // Initialize Stripe if configured
      if (this.gateways.stripe.secretKey) {
        try {
          const stripe = require('stripe')(this.gateways.stripe.secretKey);
          this.stripe = stripe;
          logger.info('Stripe payment gateway initialized');
        } catch (stripeError) {
          logger.warn('Stripe initialization failed:', stripeError.message);
        }
      } else {
        logger.info('Stripe not configured - skipping initialization');
      }

      // Initialize MTN Mobile Money if configured
      if (this.gateways.mtn.apiKey) {
        try {
          this.mtnClient = this.createMTNClient();
          logger.info('MTN Mobile Money gateway initialized');
        } catch (mtnError) {
          logger.warn('MTN initialization failed:', mtnError.message);
        }
      } else {
        logger.info('MTN Mobile Money not configured - skipping initialization');
      }

      // Initialize Orange Money if configured
      if (this.gateways.orange.apiKey) {
        try {
          this.orangeClient = this.createOrangeClient();
          logger.info('Orange Money gateway initialized');
        } catch (orangeError) {
          logger.warn('Orange Money initialization failed:', orangeError.message);
        }
      } else {
        logger.info('Orange Money not configured - skipping initialization');
      }

      // Initialize Bank API if configured
      if (this.gateways.bank.apiKey) {
        try {
          this.bankClient = this.createBankClient();
          logger.info('Bank API gateway initialized');
        } catch (bankError) {
          logger.warn('Bank API initialization failed:', bankError.message);
        }
      } else {
        logger.info('Bank API not configured - skipping initialization');
      }

      logger.info('Payment gateways initialization completed');
    } catch (error) {
      logger.error('Error initializing payment gateways:', error);
      // Don't throw error - allow service to continue without payment gateways
      logger.info('Payment service will continue with simulated payments');
    }
  }

  /**
   * Create MTN Mobile Money client
   */
  createMTNClient() {
    // This would be replaced with actual MTN Mobile Money SDK
    return {
      requestPayment: async (amount, phoneNumber, reference) => {
        // Simulate MTN API call
        logger.info(`MTN payment request: ${amount} FCFA to ${phoneNumber}, ref: ${reference}`);
        
        // In production, this would make actual API calls to MTN
        return {
          success: true,
          transactionId: `MTN_${Date.now()}`,
          status: 'pending',
          message: 'Payment request sent to phone'
        };
      },
      
      checkStatus: async (transactionId) => {
        // Simulate status check
        return {
          status: 'completed',
          transactionId
        };
      }
    };
  }

  /**
   * Create Orange Money client
   */
  createOrangeClient() {
    // This would be replaced with actual Orange Money SDK
    return {
      requestPayment: async (amount, phoneNumber, reference) => {
        // Simulate Orange API call
        logger.info(`Orange payment request: ${amount} FCFA to ${phoneNumber}, ref: ${reference}`);
        
        // In production, this would make actual API calls to Orange
        return {
          success: true,
          transactionId: `ORANGE_${Date.now()}`,
          status: 'pending',
          message: 'Payment request sent to phone'
        };
      },
      
      checkStatus: async (transactionId) => {
        // Simulate status check
        return {
          status: 'completed',
          transactionId
        };
      }
    };
  }

  /**
   * Create Bank API client
   */
  createBankClient() {
    // This would be replaced with actual bank API SDK
    return {
      initiateTransfer: async (amount, accountNumber, reference) => {
        // Simulate bank API call
        logger.info(`Bank transfer request: ${amount} FCFA to ${accountNumber}, ref: ${reference}`);
        
        // In production, this would make actual API calls to the bank
        return {
          success: true,
          transactionId: `BANK_${Date.now()}`,
          status: 'pending',
          message: 'Transfer initiated'
        };
      },
      
      checkStatus: async (transactionId) => {
        // Simulate status check
        return {
          status: 'completed',
          transactionId
        };
      }
    };
  }

  /**
   * Process card payment (credit/debit)
   */
  async processCardPayment(amount, cardToken, userId, description) {
    try {
      logger.info(`Processing card payment: ${amount} FCFA, description: ${description}`);

      if (!this.stripe) {
        // Simulate payment if Stripe not available
        logger.info('Stripe not available - simulating card payment');
        return await this.simulateCardPayment(amount, cardToken, userId, description);
      }

      // Process with actual Stripe if available
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'xaf', // FCFA
        description: description,
        metadata: {
          userId: userId.toString(),
          type: 'recharge'
        }
      });

      if (paymentIntent.status === 'succeeded') {
        const transaction = await this.createTransactionRecord({
          userId,
          amount,
          paymentMethod: 'credit_card',
          gateway: 'stripe',
          gatewayTransactionId: paymentIntent.id,
          status: this.statuses.COMPLETED,
          metadata: {
            cardToken,
            description,
            paymentIntent
          }
        });

        // Update user balance immediately for successful card payments
        await this.handleSuccessfulPayment(userId, amount, paymentIntent.id, 'stripe');

        return transaction;
      } else {
        throw new Error(`Payment intent status: ${paymentIntent.status}`);
      }
    } catch (error) {
      logger.error('Error processing card payment:', error);
      throw error;
    }
  }

  /**
   * Simulate card payment when Stripe is not available
   */
  async simulateCardPayment(amount, cardToken, userId, description) {
    try {
      console.log(`Starting card payment simulation: User ${userId}, Amount ${amount} FCFA`);
      logger.info('Simulating card payment for development');
      
      // Create a simulated transaction
      const transaction = await this.createTransactionRecord({
        userId,
        amount,
        paymentMethod: 'credit_card',
        gateway: 'stripe',
        gatewayTransactionId: `sim_stripe_${Date.now()}`,
        status: this.statuses.PENDING,
        metadata: {
          cardToken,
          description,
          simulated: true,
          message: 'This is a simulated card payment for development purposes'
        }
      });

      console.log('Transaction created:', transaction.id);

      // Simulate payment completion immediately for development
      console.log('Updating transaction status to completed');
      await this.updateTransactionStatus(transaction.id, this.statuses.COMPLETED);
      
      console.log('Handling successful payment');
      await this.handleSuccessfulPayment(userId, amount, transaction.id, 'stripe');

      console.log('Card payment simulation completed successfully');
      return transaction;
    } catch (error) {
      console.error('Error simulating card payment:', error);
      logger.error('Error simulating card payment:', error);
      throw error;
    }
  }

  /**
   * Process mobile money payment
   */
  async processMobileMoneyPayment(amount, phoneNumber, provider, userId) {
    try {
      logger.info(`Processing ${provider} mobile money payment: ${amount} FCFA to ${phoneNumber}, userId: ${userId}`);

      let client;
      if (provider === 'mtn' && this.mtnClient) {
        client = this.mtnClient;
      } else if (provider === 'orange' && this.orangeClient) {
        client = this.orangeClient;
      } else {
        // Simulate payment if client not available
        logger.info(`Simulating ${provider} mobile money payment`);
        return await this.simulateMobileMoneyPayment(amount, phoneNumber, provider, userId);
      }

      // Process with actual client if available
      const paymentResult = await client.requestPayment(amount, phoneNumber, `Recharge-${Date.now()}`);
      
      if (paymentResult.success) {
        const transaction = await this.createTransactionRecord({
          userId,
          amount,
          paymentMethod: provider === 'mtn' ? 'mtn_mobile_money' : 'orange_money',
          gateway: provider,
          gatewayTransactionId: paymentResult.transactionId || `sim_${Date.now()}`,
          status: this.statuses.PENDING,
          metadata: {
            phoneNumber,
            provider,
            paymentResult
          }
        });

        // Simulate payment completion immediately for development
        // Update balance FIRST, then mark transaction as completed
        await this.handleSuccessfulPayment(userId, amount, transaction.id, provider);
        await this.updateTransactionStatus(transaction.id, this.statuses.COMPLETED);

        return transaction;
      } else {
        throw new Error(`Payment failed: ${paymentResult.message || 'Unknown error'}`);
      }
    } catch (error) {
      logger.error(`Error processing ${provider} mobile money payment:`, error);
      throw error;
    }
  }

  /**
   * Simulate mobile money payment when gateway is not available
   */
  async simulateMobileMoneyPayment(amount, phoneNumber, provider, userId) {
    try {
      logger.info(`Simulating ${provider} mobile money payment for development`);
      
      // Create a simulated transaction
      const transaction = await this.createTransactionRecord({
        userId,
        amount,
        paymentMethod: provider === 'mtn' ? 'mtn_mobile_money' : 'orange_money',
        gateway: provider,
        gatewayTransactionId: `sim_${provider}_${Date.now()}`,
        status: this.statuses.PENDING,
        metadata: {
          phoneNumber,
          provider,
          simulated: true,
          message: 'This is a simulated payment for development purposes'
        }
      });

      // Simulate payment completion immediately for development
      // Update balance FIRST, then mark transaction as completed
      await this.handleSuccessfulPayment(userId, amount, transaction.id, provider);
      await this.updateTransactionStatus(transaction.id, this.statuses.COMPLETED);

      return transaction;
    } catch (error) {
      logger.error('Error simulating mobile money payment:', error);
      throw error;
    }
  }

  /**
   * Process bank transfer payment
   */
  async processBankTransfer(amount, accountNumber, bankCode, userId) {
    try {
      logger.info(`Processing bank transfer: ${amount} FCFA to account ${accountNumber}, bank ${bankCode}`);

      if (!this.bankClient) {
        // Simulate payment if bank client not available
        logger.info('Bank client not available - simulating bank transfer');
        return await this.simulateBankTransfer(amount, accountNumber, bankCode, userId);
      }

      // Process with actual bank client if available
      const transferResult = await this.bankClient.initiateTransfer(amount, accountNumber, bankCode, `Recharge-${Date.now()}`);
      
      if (transferResult.success) {
        const transaction = await this.createTransactionRecord({
          userId,
          amount,
          paymentMethod: 'bank_transfer',
          gateway: 'bank',
          gatewayTransactionId: transferResult.transferId || `sim_bank_${Date.now()}`,
          status: this.statuses.PENDING,
          metadata: {
            accountNumber,
            bankCode,
            transferResult
          }
        });

        // Simulate transfer completion immediately for development
        await this.updateTransactionStatus(transaction.id, this.statuses.COMPLETED);
        await this.handleSuccessfulPayment(userId, amount, transaction.id, 'bank');

        return transaction;
      } else {
        throw new Error(`Bank transfer failed: ${transferResult.message || 'Unknown error'}`);
      }
    } catch (error) {
      logger.error('Error processing bank transfer:', error);
      throw error;
    }
  }

  /**
   * Simulate bank transfer when bank client is not available
   */
  async simulateBankTransfer(amount, accountNumber, bankCode, userId) {
    try {
      logger.info('Simulating bank transfer for development');
      
      // Create a simulated transaction
      const transaction = await this.createTransactionRecord({
        userId,
        amount,
        paymentMethod: 'bank_transfer',
        gateway: 'bank',
        gatewayTransactionId: `sim_bank_${Date.now()}`,
        status: this.statuses.PENDING,
        metadata: {
          accountNumber,
          bankCode,
          simulated: true,
          message: 'This is a simulated bank transfer for development purposes'
        }
      });

      // Simulate transfer completion immediately for development
      await this.updateTransactionStatus(transaction.id, this.statuses.COMPLETED);
      await this.handleSuccessfulPayment(userId, amount, transaction.id, 'bank');

      return transaction;
    } catch (error) {
      logger.error('Error simulating bank transfer:', error);
      throw error;
    }
  }

  /**
   * Create transaction record in database
   */
  async createTransactionRecord(transactionData) {
    try {
      logger.info(`Creating transaction record: userId=${transactionData.userId}, amount=${transactionData.amount}, method=${transactionData.paymentMethod}`);
      
      const result = await db.query(`
        INSERT INTO payment_transactions (
          user_id, amount, payment_method, gateway, gateway_transaction_id,
          status, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `, [
        transactionData.userId,
        transactionData.amount,
        transactionData.paymentMethod,
        transactionData.gateway,
        transactionData.gatewayTransactionId,
        transactionData.status,
        JSON.stringify(transactionData.metadata)
      ]);

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating transaction record:', error);
      throw error;
    }
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(transactionId, status, metadata = {}) {
    try {
      const result = await db.query(`
        UPDATE payment_transactions 
        SET status = $1, metadata = metadata || $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `, [status, JSON.stringify(metadata), transactionId]);

      if (result.rows.length === 0) {
        throw new Error(`Transaction not found: ${transactionId}`);
      }

      logger.info(`Transaction status updated: ${transactionId} -> ${status}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating transaction status:', error);
      throw error;
    }
  }

  /**
   * Process webhook from payment gateway
   */
  async processWebhook(webhookData, gateway) {
    try {
      let transaction;
      let signature;

      switch (gateway) {
        case 'stripe':
          // Verify Stripe webhook signature
          if (this.gateways.stripe.webhookSecret) {
            signature = webhookData.headers['stripe-signature'];
            const event = this.stripe.webhooks.constructEvent(
              webhookData.body,
              signature,
              this.gateways.stripe.webhookSecret
            );
            
            if (event.type === 'payment_intent.succeeded') {
              transaction = await this.handleSuccessfulPayment(
                event.data.object.metadata.userId,
                event.data.object.amount / 100, // Convert from cents
                event.data.object.id,
                'stripe'
              );
            }
          }
          break;

        case 'mtn':
        case 'orange':
          // Handle mobile money webhook
          if (webhookData.status === 'completed') {
            transaction = await this.handleSuccessfulPayment(
              webhookData.userId,
              webhookData.amount,
              webhookData.transactionId,
              gateway
            );
          }
          break;

        case 'bank':
          // Handle bank transfer webhook
          if (webhookData.status === 'completed') {
            transaction = await this.handleSuccessfulPayment(
              webhookData.userId,
              webhookData.amount,
              webhookData.transactionId,
              'bank'
            );
          }
          break;

        default:
          throw new Error(`Unsupported gateway: ${gateway}`);
      }

      return transaction;
    } catch (error) {
      logger.error('Error processing webhook:', error);
      throw error;
    }
  }

  /**
   * Handle successful payment
   */
  async handleSuccessfulPayment(userId, amount, transactionId, gateway) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      
      console.log(`Processing successful payment: User ${userId}, Amount ${amount}, Transaction ${transactionId}, Gateway ${gateway}`);
      
      // Find transaction by transaction ID (since we're passing transaction.id)
      console.log(`Looking for transaction with ID: ${transactionId}`);
      const result = await client.query(`
        SELECT * FROM payment_transactions 
        WHERE id = $1
      `, [transactionId]);

      console.log(`Found ${result.rows.length} transactions with ID ${transactionId}`);
      if (result.rows.length > 0) {
        console.log('Transaction details:', result.rows[0]);
      }

      if (result.rows.length === 0) {
        throw new Error(`Transaction not found: ${transactionId}`);
      }

      const transaction = result.rows[0];
      console.log('Found transaction:', transaction);

      // Check if transaction is already completed
      if (transaction.status === 'completed') {
        console.log('Transaction already completed, skipping balance update');
        return transaction;
      }

      // Get current user balance with row lock to prevent race conditions
      const userResult = await client.query(`
        SELECT balance FROM users WHERE id = $1 FOR UPDATE
      `, [userId]);

      if (userResult.rows.length === 0) {
        throw new Error(`User not found: ${userId}`);
      }

      const currentBalance = parseFloat(userResult.rows[0].balance || 0);
      console.log('Current user balance:', currentBalance);

        // Update transaction status
        await client.query(`
          UPDATE payment_transactions 
          SET status = $1, updated_at = NOW()
          WHERE id = $2
        `, [this.statuses.COMPLETED, transaction.id]);

      // Update user balance and get new balance
      console.log(`Updating balance: adding ${amount} to user ${userId}`);
      const balanceResult = await client.query(`
        UPDATE users SET balance = COALESCE(balance, 0) + $1 WHERE id = $2 RETURNING balance
      `, [amount, userId]);

      console.log('Balance update result:', balanceResult.rows[0]);
      const newBalance = parseFloat(balanceResult.rows[0].balance);
      console.log('New user balance:', newBalance);
      
      // Verify the balance was actually updated
      const verifyResult = await client.query(`
        SELECT balance FROM users WHERE id = $1
      `, [userId]);
      console.log('Balance verification:', verifyResult.rows[0]);

      // Commit the transaction
      await client.query('COMMIT');
      console.log('Transaction committed successfully');

      // Emit balance update via WebSocket if io is available
      if (this.io) {
        this.io.to('game').emit('balance_update', {
          userId: userId,
          newBalance: newBalance,
          amountAdded: amount,
          transactionId: transactionId
        });
        console.log('Balance update emitted via WebSocket');
      }

      // Log successful recharge
      logger.info(`Recharge completed: User ${userId}, Amount ${amount} FCFA, Transaction ${transactionId}, Gateway ${gateway}, New Balance: ${newBalance} FCFA`);

      return transaction;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error handling successful payment:', error);
      logger.error('Error handling successful payment:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get transaction history for user
   */
  async getUserTransactions(userId, limit = 20, offset = 0) {
    try {
      const result = await db.query(`
        SELECT * FROM payment_transactions 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting user transactions:', error);
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(transactionId) {
    try {
      const result = await db.query(`
        SELECT * FROM payment_transactions WHERE id = $1
      `, [transactionId]);

      if (result.rows.length === 0) {
        throw new Error(`Transaction not found: ${transactionId}`);
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting transaction by ID:', error);
      throw error;
    }
  }

  /**
   * Refund transaction
   */
  async refundTransaction(transactionId, reason) {
    try {
      const transaction = await this.getTransactionById(transactionId);

      if (transaction.status !== this.statuses.COMPLETED) {
        throw new Error('Only completed transactions can be refunded');
      }

      // Process refund based on gateway
      let refundResult;
      switch (transaction.gateway) {
        case 'stripe':
          if (this.stripe) {
            const refund = await this.stripe.refunds.create({
              payment_intent: transaction.gateway_transaction_id,
              reason: 'requested_by_customer'
            });
            refundResult = { success: true, refundId: refund.id };
          }
          break;

        case 'mtn':
        case 'orange':
          // Mobile money refunds would be processed manually or via API
          refundResult = { success: true, message: 'Refund request submitted' };
          break;

        case 'bank':
          // Bank refunds would be processed manually
          refundResult = { success: true, message: 'Refund request submitted' };
          break;

        default:
          throw new Error(`Unsupported gateway for refund: ${transaction.gateway}`);
      }

      if (refundResult.success) {
        // Update transaction status
        await this.updateTransactionStatus(transactionId, this.statuses.CANCELLED, {
          refundedAt: new Date().toISOString(),
          refundReason: reason,
          refundResult
        });

        // Deduct from user balance
        await db.query(`
          UPDATE users SET balance = balance - $1 WHERE id = $2
        `, [transaction.amount, transaction.user_id]);

        logger.info(`Transaction refunded: ${transactionId}, amount: ${transaction.amount} FCFA`);
        return { success: true, refundResult };
      }

      throw new Error('Refund processing failed');
    } catch (error) {
      logger.error('Error refunding transaction:', error);
      throw error;
    }
  }
}

module.exports = new PaymentService();
