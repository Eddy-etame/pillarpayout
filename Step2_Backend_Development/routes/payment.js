const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const authMiddleware = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/payment/recharge:
 *   post:
 *     summary: Recharge user account
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - paymentMethod
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount in FCFA
 *               paymentMethod:
 *                 type: string
 *                 enum: [credit_card, debit_card, mtn_mobile_money, orange_money, bank_transfer, digital_wallet]
 *               cardToken:
 *                 type: string
 *                 description: Stripe card token (required for card payments)
 *               phoneNumber:
 *                 type: string
 *                 description: Mobile number (required for mobile money)
 *               accountNumber:
 *                 type: string
 *                 description: Bank account number (required for bank transfer)
 *               bankCode:
 *                 type: string
 *                 description: Bank code (required for bank transfer)
 *               walletAddress:
 *                 type: string
 *                 description: Digital wallet address (required for digital wallet)
 *     responses:
 *       200:
 *         description: Recharge initiated successfully
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/recharge', authMiddleware, async (req, res) => {
  try {
    const { amount, paymentMethod, cardToken, phoneNumber, accountNumber, bankCode, walletAddress } = req.body;
    const userId = req.user.id;

    // Validate required parameters
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (!paymentMethod) {
      return res.status(400).json({ error: 'Payment method is required' });
    }

    let transaction;

    try {
      switch (paymentMethod) {
        case 'credit_card':
        case 'debit_card':
          if (!cardToken) {
            return res.status(400).json({ error: 'Card token is required for card payments' });
          }
          transaction = await paymentService.processCardPayment(
            amount,
            cardToken,
            userId,
            `Account recharge - ${amount} FCFA`
          );
          break;

        case 'mtn_mobile_money':
        case 'orange_money':
          if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number is required for mobile money payments' });
          }
          const provider = paymentMethod === 'mtn_mobile_money' ? 'mtn' : 'orange';
          transaction = await paymentService.processMobileMoneyPayment(
            amount,
            phoneNumber,
            provider,
            userId
          );
          break;

        case 'bank_transfer':
          if (!accountNumber || !bankCode) {
            return res.status(400).json({ error: 'Account number and bank code are required for bank transfers' });
          }
          transaction = await paymentService.processBankTransfer(
            amount,
            accountNumber,
            bankCode,
            userId
          );
          break;

        case 'digital_wallet':
          if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address is required for digital wallet payments' });
          }
          // Digital wallet implementation would go here
          return res.status(501).json({ error: 'Digital wallet payments not yet implemented' });

        default:
          return res.status(400).json({ error: 'Unsupported payment method' });
      }

      logger.info(`Recharge initiated: User ${userId}, Amount ${amount} FCFA, Method ${paymentMethod}`);

      res.json({
        success: true,
        message: 'Recharge initiated successfully',
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
          status: transaction.status,
          paymentMethod: transaction.payment_method,
          gateway: transaction.gateway,
          createdAt: transaction.created_at
        }
      });

    } catch (paymentError) {
      logger.error('Payment processing error:', paymentError);
      res.status(500).json({
        error: 'Payment processing failed',
        details: paymentError.message
      });
    }

  } catch (error) {
    logger.error('Recharge route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/payment/transactions:
 *   get:
 *     summary: Get user transaction history
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of transactions to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of transactions to skip
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const transactions = await paymentService.getUserTransactions(userId, limit, offset);

    res.json({
      success: true,
      transactions: transactions.map(t => ({
        id: t.id,
        amount: t.amount,
        paymentMethod: t.payment_method,
        gateway: t.gateway,
        status: t.status,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        metadata: t.metadata
      }))
    });

  } catch (error) {
    logger.error('Get transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/payment/transaction/{id}:
 *   get:
 *     summary: Get transaction details by ID
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction details retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Internal server error
 */
router.get('/transaction/:id', authMiddleware, async (req, res) => {
  try {
    const transactionId = req.params.id;
    const userId = req.user.id;

    const transaction = await paymentService.getTransactionById(transactionId);

    // Ensure user can only access their own transactions
    if (transaction.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        paymentMethod: transaction.payment_method,
        gateway: transaction.gateway,
        status: transaction.status,
        createdAt: transaction.created_at,
        updatedAt: transaction.updated_at,
        metadata: transaction.metadata
      }
    });

  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    logger.error('Get transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/payment/refund/{id}:
 *   post:
 *     summary: Request refund for a transaction
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for refund request
 *     responses:
 *       200:
 *         description: Refund request processed successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Internal server error
 */
router.post('/refund/:id', authMiddleware, async (req, res) => {
  try {
    const transactionId = req.params.id;
    const { reason } = req.body;
    const userId = req.user.id;

    if (!reason) {
      return res.status(400).json({ error: 'Refund reason is required' });
    }

    const transaction = await paymentService.getTransactionById(transactionId);

    // Ensure user can only refund their own transactions
    if (transaction.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const refundResult = await paymentService.refundTransaction(transactionId, reason);

    res.json({
      success: true,
      message: 'Refund processed successfully',
      refund: refundResult
    });

  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    if (error.message.includes('Only completed transactions can be refunded')) {
      return res.status(400).json({ error: error.message });
    }
    logger.error('Refund error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/payment/webhook/{gateway}:
 *   post:
 *     summary: Webhook endpoint for payment gateways
 *     tags: [Payment]
 *     parameters:
 *       - in: path
 *         name: gateway
 *         required: true
 *         schema:
 *           type: string
 *           enum: [stripe, mtn, orange, bank]
 *         description: Payment gateway name
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook data
 *       500:
 *         description: Internal server error
 */
router.post('/webhook/:gateway', async (req, res) => {
  try {
    const gateway = req.params.gateway;
    const webhookData = {
      body: req.body,
      headers: req.headers
    };

    // Process webhook based on gateway
    const transaction = await paymentService.processWebhook(webhookData, gateway);

    if (transaction) {
      logger.info(`Webhook processed successfully: Gateway ${gateway}, Transaction ${transaction.id}`);
      res.json({ success: true, message: 'Webhook processed' });
    } else {
      res.json({ success: true, message: 'Webhook received but no action taken' });
    }

  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

/**
 * @swagger
 * /api/payment/status:
 *   get:
 *     summary: Get payment service status
 *     tags: [Payment]
 *     responses:
 *       200:
 *         description: Payment service status
 */
router.get('/status', async (req, res) => {
  try {
    const status = {
      service: 'Payment Service',
      status: 'operational',
      gateways: {
        stripe: !!paymentService.gateways.stripe.secretKey,
        mtn: !!paymentService.gateways.mtn.apiKey,
        orange: !!paymentService.gateways.orange.apiKey,
        bank: !!paymentService.gateways.bank.apiKey
      },
      timestamp: new Date().toISOString()
    };

    res.json(status);
  } catch (error) {
    logger.error('Status check error:', error);
    res.status(500).json({ error: 'Service status check failed' });
  }
});

module.exports = router;
