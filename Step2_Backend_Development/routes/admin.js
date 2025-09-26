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
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminMiddleware = require('../middleware/adminMiddleware');
const authMiddleware = require('../middleware/authMiddleware');

// Apply regular auth middleware first to set req.user
router.use(authMiddleware);

// Apply admin middleware to all routes
router.use(adminMiddleware.adminAuthMiddleware);
router.use(adminMiddleware.adminRateLimit);
router.use(adminMiddleware.adminSecurityHeaders);

// Debug middleware - log all admin route requests
router.use((req, res, next) => {
  console.log('Admin route hit:', req.method, req.path);
  next();
});

// TEST ENDPOINT - Simple test to see if admin routes work
router.get('/test', (req, res) => {
  console.log('Admin test endpoint hit');
  res.json({ message: 'Admin routes are working!', user: req.user });
});

// PROFITABILITY ENDPOINTS
router.get('/profitability', async (req, res) => {
  try {
    const data = await adminController.getProfitabilityMetrics(req, res);
    if (!res.headersSent) res.json(data);
  } catch (error) {
    console.error('Profitability error:', error);
    res.status(500).json({ error: 'Error fetching profitability data', details: error.message });
  }
});

router.get('/profitability/time-range', async (req, res) => {
  try {
    const data = await adminController.getProfitabilityByTimeRange(req, res);
    if (!res.headersSent) res.json(data);
  } catch (error) {
    console.error('Time-based revenue error:', error);
    res.status(500).json({ error: 'Error fetching time-based revenue', details: error.message });
  }
});

// GAME CONTROL ENDPOINTS
router.get('/game/status', async (req, res) => {
  try {
    const data = await adminController.getGameStatus(req, res);
    if (!res.headersSent) res.json(data);
  } catch (error) {
    console.error('Game status error:', error);
    res.status(500).json({ error: 'Error fetching game status', details: error.message });
  }
});

router.post('/game/pause', async (req, res) => {
  try {
    const data = await adminController.pauseGame(req, res);
    if (!res.headersSent) res.json(data);
  } catch (error) {
    console.error('Pause game error:', error);
    res.status(500).json({ error: 'Error pausing game', details: error.message });
  }
});

router.post('/game/resume', async (req, res) => {
  try {
    const data = await adminController.resumeGame(req, res);
    if (!res.headersSent) res.json(data);
  } catch (error) {
    console.error('Resume game error:', error);
    res.status(500).json({ error: 'Error resuming game', details: error.message });
  }
});

router.post('/game/emergency-stop', async (req, res) => {
  try {
    const data = await adminController.emergencyStop(req, res);
    if (!res.headersSent) res.json(data);
  } catch (error) {
    console.error('Emergency stop error:', error);
    res.status(500).json({ error: 'Error stopping game', details: error.message });
  }
});

router.post('/game/set-crash-point', async (req, res) => {
  try {
    const data = await adminController.setCrashPoint(req, res);
    if (!res.headersSent) res.json(data);
  } catch (error) {
    console.error('Set crash point error:', error);
    res.status(500).json({ error: 'Error setting crash point', details: error.message });
  }
});

// SECURITY ENDPOINTS
router.get('/security/overview', async (req, res) => {
  try {
    const data = await adminController.getSecurityOverview(req, res);
    if (!res.headersSent) res.json(data);
  } catch (error) {
    console.error('Security overview error:', error);
    res.status(500).json({ error: 'Error fetching security overview', details: error.message });
  }
});

router.post('/security/scan', async (req, res) => {
  try {
    const data = await adminController.runSecurityScan(req, res);
    if (!res.headersSent) res.json(data);
  } catch (error) {
    console.error('Security scan error:', error);
    res.status(500).json({ error: 'Error running security scan', details: error.message });
  }
});

router.post('/security/block-ip', async (req, res) => {
  try {
    const data = await adminController.blockIP(req, res);
    if (!res.headersSent) res.json(data);
  } catch (error) {
    console.error('Block IP error:', error);
    res.status(500).json({ error: 'Error blocking IP', details: error.message });
  }
});

router.post('/security/unblock-ip', async (req, res) => {
  try {
    const data = await adminController.unblockIP(req, res);
    if (!res.headersSent) res.json(data);
  } catch (error) {
    console.error('Unblock IP error:', error);
    res.status(500).json({ error: 'Error unblocking IP', details: error.message });
  }
});

// USER MANAGEMENT ENDPOINTS
router.get('/users/overview', async (req, res) => {
  try {
    const data = await adminController.getUserOverview(req, res);
    if (!res.headersSent) res.json(data);
  } catch (error) {
    console.error('Users overview error:', error);
    res.status(500).json({ error: 'Error fetching users overview', details: error.message });
  }
});
router.post('/users/block', async (req, res) => {
  try {
    const data = await adminController.blockUser(req, res);
    if (!res.headersSent) res.json(data);
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: 'Error blocking user', details: error.message });
  }
});

router.post('/users/unblock', async (req, res) => {
  try {
    const data = await adminController.unblockUser(req, res);
    if (!res.headersSent) res.json(data);
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ error: 'Error unblocking user', details: error.message });
  }
});

// SYSTEM MONITORING ENDPOINTS
router.get('/system/health', async (req, res) => {
  try {
    const data = await adminController.getSystemHealth(req, res);
    if (!res.headersSent) res.json(data);
  } catch (error) {
    console.error('System health error:', error);
    res.status(500).json({ error: 'Error fetching system health', details: error.message });
  }
});

// DASHBOARD OVERVIEW
router.get('/dashboard/overview', async (req, res) => {
  try {
    const data = await adminController.getDashboardOverview(req, res);
    if (!res.headersSent) res.json(data);
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ error: 'Error fetching dashboard overview', details: error.message });
  }
});

// ADMIN LOGS
router.get('/logs', async (req, res) => {
  try {
    const data = await adminController.getAdminLogs(req, res);
    if (!res.headersSent) res.json(data);
  } catch (error) {
    console.error('Admin logs error:', error);
    res.status(500).json({ error: 'Error fetching admin logs', details: error.message });
  }
});

// ANALYTICS ENDPOINTS
router.get('/analytics/betting', async (req, res) => {
  try {
    const data = await adminController.getBettingAnalytics(req, res);
    if (!res.headersSent) res.json(data);
  } catch (error) {
    console.error('Betting analytics error:', error);
    res.status(500).json({ error: 'Error fetching betting analytics', details: error.message });
  }
});

router.get('/analytics/crash-points', async (req, res) => {
  try {
    const data = await adminController.getCrashPointAnalytics(req, res);
    if (!res.headersSent) res.json(data);
  } catch (error) {
    console.error('Crash point analytics error:', error);
    res.status(500).json({ error: 'Error fetching crash point analytics', details: error.message });
  }
});

router.get('/analytics/user-activity', async (req, res) => {
  try {
    const data = await adminController.getUserActivityAnalytics(req, res);
    if (!res.headersSent) res.json(data);
  } catch (error) {
    console.error('User activity analytics error:', error);
    res.status(500).json({ error: 'Error fetching user activity analytics', details: error.message });
  }
});

module.exports = router; 