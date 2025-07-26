/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management and configuration
 */

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: List all users
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   userId:
 *                     type: integer
 *                   username:
 *                     type: string
 *                   balance:
 *                     type: number
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       403:
 *         description: Forbidden
 */

/**
 * @swagger
 * /api/v1/admin/transactions:
 *   get:
 *     summary: List all transactions
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   transactionId:
 *                     type: integer
 *                   userId:
 *                     type: integer
 *                   type:
 *                     type: string
 *                   amount:
 *                     type: number
 *                   status:
 *                     type: string
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *       403:
 *         description: Forbidden
 */

/**
 * @swagger
 * /api/v1/admin/adjust-balance:
 *   post:
 *     summary: Adjust a user's balance
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: integer
 *               amount:
 *                 type: number
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Balance adjusted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 newBalance:
 *                   type: number
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /api/v1/admin/game-parameters:
 *   patch:
 *     summary: Update game parameters
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               minBet:
 *                 type: number
 *               maxBet:
 *                 type: number
 *               rtpFactor:
 *                 type: number
 *               specialEventProbabilities:
 *                 type: object
 *               integrityMeterRate:
 *                 type: number
 *     responses:
 *       200:
 *         description: Game parameters updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Forbidden
 */

/**
 * @swagger
 * /api/v1/admin/create-community-goal:
 *   post:
 *     summary: Create a new community goal
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               targetHeight:
 *                 type: number
 *               rewardAmount:
 *                 type: number
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Community goal created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 goalId:
 *                   type: integer
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Forbidden
 */

/**
 * @swagger
 * /api/v1/admin/logs:
 *   get:
 *     summary: Retrieve server logs
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of log entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                   level:
 *                     type: string
 *                   message:
 *                     type: string
 *       403:
 *         description: Forbidden
 */
const express = require('express');
const adminController = require('../controllers/adminController');
const adminMiddleware = require('../middleware/adminMiddleware');
const router = express.Router();

router.get('/users', adminMiddleware, adminController.listUsers);
router.get('/transactions', adminMiddleware, adminController.listTransactions);
router.post('/adjust-balance', adminMiddleware, adminController.adjustBalance);
router.patch('/game-parameters', adminMiddleware, adminController.updateGameParameters);
router.post('/create-community-goal', adminMiddleware, adminController.createCommunityGoal);
router.get('/logs', adminMiddleware, adminController.getLogs);

module.exports = router; 