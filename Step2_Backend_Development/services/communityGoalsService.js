const db = require('../db');
const logger = require('../utils/logger');

class CommunityGoalsService {
  constructor() {
    this.activeGoals = new Map(); // goalId -> goal object
    this.goalCache = new Map(); // goalId -> { goal, timestamp }
    this.cacheTimeout = 300000; // 5 minutes
  }

  // Create a new community goal
  async createGoal(goalData) {
    try {
      const {
        title,
        description,
        targetAmount,
        rewardType, // 'bonus_multiplier', 'free_bet', 'cash_reward', 'special_feature'
        rewardValue,
        duration, // in hours
        minBetAmount = 0,
        maxBetAmount = null,
        requiredParticipants = 1
      } = goalData;

      // Validate goal data
      if (!title || !description || !targetAmount || !rewardType || !rewardValue || !duration) {
        throw new Error('Invalid goal parameters');
      }

      if (targetAmount <= 0 || rewardValue <= 0 || duration <= 0) {
        throw new Error('Invalid goal parameters');
      }

      // Create goal in database
      const result = await db.query(`
        INSERT INTO community_goals (
          name, description, target_blocks, current_blocks, reward, status, start_date, end_date, min_bet_amount, max_bet_amount
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW() + ($7 || ' hours')::INTERVAL, $8, $9)
        RETURNING id
      `, [
        title, description, Math.ceil(targetAmount), 0, `${rewardType}:${rewardValue}`, 'active', duration, minBetAmount, maxBetAmount
      ]);

      const goalId = result.rows[0].id;

      // Get the created goal
      const goal = await this.getGoalById(goalId);
      
      // Add to active goals
      this.activeGoals.set(goalId, goal);
      
      // Clear cache
      this.goalCache.delete(goalId);

      logger.info(`Community goal created: ${title} (ID: ${goalId})`);

      return goal;
    } catch (error) {
      logger.error('Error creating community goal:', error);
      throw error;
    }
  }

  // Get goal by ID
  async getGoalById(goalId) {
    try {
      const result = await db.query(`
        SELECT 
          cg.*,
          COUNT(DISTINCT cgp.user_id) as participant_count,
          COUNT(DISTINCT cgc.id) as contribution_count
        FROM community_goals cg
        LEFT JOIN community_goal_participants cgp ON cg.id = cgp.goal_id
        LEFT JOIN community_goal_contributions cgc ON cg.id = cgc.goal_id
        WHERE cg.id = $1
        GROUP BY cg.id
      `, [goalId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.formatGoal(result.rows[0]);
    } catch (error) {
      // If the query fails due to missing tables, try simpler query
      if (error.message.includes('relation "community_goal_participants" does not exist')) {
        const result = await db.query(`
          SELECT * FROM community_goals WHERE id = $1
        `, [goalId]);

        if (result.rows.length === 0) {
          return null;
        }

        return this.formatGoal(result.rows[0]);
      }
      logger.error('Error getting goal by ID:', error);
      throw error;
    }
  }

  // Get all active goals
  async getActiveGoals() {
    try {
      const result = await db.query(`
        SELECT 
          cg.*,
          COUNT(DISTINCT cgp.user_id) as participant_count,
          COUNT(DISTINCT cgc.id) as contribution_count
        FROM community_goals cg
        LEFT JOIN community_goal_participants cgp ON cg.id = cgp.goal_id
        LEFT JOIN community_goal_contributions cgc ON cg.id = cgc.goal_id
        WHERE cg.status = 'active' AND cg.end_date > NOW()
        GROUP BY cg.id
        ORDER BY cg.start_date DESC
      `);

      return result.rows.map(row => this.formatGoal(row));
    } catch (error) {
      // If the query fails due to missing tables, return empty array
      if (error.message.includes('relation "community_goal_participants" does not exist')) {
        const result = await db.query(`
          SELECT * FROM community_goals 
          WHERE status = 'active' AND end_date > NOW()
          ORDER BY start_date DESC
        `);
        return result.rows.map(row => this.formatGoal(row));
      }
      logger.error('Error getting active goals:', error);
      throw error;
    }
  }

  // Get completed goals
  async getCompletedGoals(limit = 10) {
    try {
      const result = await db.query(`
        SELECT 
          cg.*,
          COUNT(DISTINCT cgp.user_id) as participant_count,
          COUNT(DISTINCT cgc.id) as contribution_count
        FROM community_goals cg
        LEFT JOIN community_goal_participants cgp ON cg.id = cgp.goal_id
        LEFT JOIN community_goal_contributions cgc ON cg.id = cgc.goal_id
        WHERE cg.status = 'completed'
        GROUP BY cg.id
        ORDER BY cg.end_date DESC
        LIMIT $1
      `, [limit]);

      return result.rows.map(row => this.formatGoal(row));
    } catch (error) {
      logger.error('Error getting completed goals:', error);
      throw error;
    }
  }

  // Contribute to a goal
  async contributeToGoal(goalId, userId, betAmount, betResult) {
    try {
      // Get goal
      const goal = await this.getGoalById(goalId);
      if (!goal) {
        throw new Error('Goal not found');
      }

      if (goal.status !== 'active') {
        throw new Error('Goal is not active');
      }

      if (new Date() > goal.endTime) {
        throw new Error('Goal has expired');
      }

      // Check bet amount constraints
      if (goal.minBetAmount > 0 && betAmount < goal.minBetAmount) {
        throw new Error(`Minimum bet amount is $${goal.minBetAmount}`);
      }

      if (goal.maxBetAmount && betAmount > goal.maxBetAmount) {
        throw new Error(`Maximum bet amount is $${goal.maxBetAmount}`);
      }

      // Calculate contribution amount (only count wins)
      let contributionAmount = 0;
      if (betResult && betResult.cashoutMultiplier) {
        contributionAmount = betAmount * (betResult.cashoutMultiplier - 1); // Only profit
      }

      // Add participant if not already participating
      await this.addParticipant(goalId, userId);

      // Record contribution
      await db.query(`
        INSERT INTO community_goal_contributions (
          goal_id, user_id, bet_amount, contribution_amount, bet_result, timestamp
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `, [goalId, userId, betAmount, contributionAmount, JSON.stringify(betResult)]);

      // Update goal progress
      await this.updateGoalProgress(goalId);

      logger.info(`User ${userId} contributed $${contributionAmount} to goal ${goalId}`);

      return {
        success: true,
        contributionAmount,
        goalProgress: await this.getGoalProgress(goalId)
      };
    } catch (error) {
      logger.error('Error contributing to goal:', error);
      throw error;
    }
  }

  // Add participant to goal
  async addParticipant(goalId, userId) {
    try {
      // Check if already participating
      const existing = await db.query(
        'SELECT id FROM community_goal_participants WHERE goal_id = $1 AND user_id = $2',
        [goalId, userId]
      );

      if (existing.rows.length === 0) {
        await db.query(
          'INSERT INTO community_goal_participants (goal_id, user_id, joined_at) VALUES ($1, $2, NOW())',
          [goalId, userId]
        );
      }
    } catch (error) {
      logger.error('Error adding participant:', error);
      throw error;
    }
  }

  // Update goal progress
  async updateGoalProgress(goalId) {
    try {
      // Calculate total contributions
      const result = await db.query(`
        SELECT SUM(contribution_amount) as total_contributions
        FROM community_goal_contributions
        WHERE goal_id = $1
      `, [goalId]);

      const totalContributions = parseFloat(result.rows[0].total_contributions || 0);

      // Update goal current amount
      await db.query(
        'UPDATE community_goals SET current_amount = $1 WHERE id = $2',
        [totalContributions, goalId]
      );

      // Check if goal is completed
      const goal = await this.getGoalById(goalId);
      if (goal && totalContributions >= goal.targetAmount) {
        await this.completeGoal(goalId);
      }

      // Clear cache
      this.goalCache.delete(goalId);
    } catch (error) {
      logger.error('Error updating goal progress:', error);
      throw error;
    }
  }

  // Complete a goal
  async completeGoal(goalId) {
    try {
      const goal = await this.getGoalById(goalId);
      if (!goal) {
        throw new Error('Goal not found');
      }

      // Update goal status
      await db.query(
        'UPDATE community_goals SET status = $1, completed_at = NOW() WHERE id = $2',
        ['completed', goalId]
      );

      // Distribute rewards to participants
      await this.distributeRewards(goalId);

      // Remove from active goals
      this.activeGoals.delete(goalId);
      this.goalCache.delete(goalId);

      logger.info(`Community goal completed: ${goal.title} (ID: ${goalId})`);

      return goal;
    } catch (error) {
      logger.error('Error completing goal:', error);
      throw error;
    }
  }

  // Distribute rewards to participants
  async distributeRewards(goalId) {
    try {
      const goal = await this.getGoalById(goalId);
      const participants = await this.getGoalParticipants(goalId);

      for (const participant of participants) {
        try {
          await this.grantReward(participant.userId, goal.rewardType, goal.rewardValue);
          
          // Record reward distribution
          await db.query(`
            INSERT INTO community_goal_rewards (
              goal_id, user_id, reward_type, reward_value, distributed_at
            ) VALUES ($1, $2, $3, $4, NOW())
          `, [goalId, participant.userId, goal.rewardType, goal.rewardValue]);

          logger.info(`Reward distributed to user ${participant.userId} for goal ${goalId}`);
        } catch (error) {
          logger.error(`Error distributing reward to user ${participant.userId}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error distributing rewards:', error);
      throw error;
    }
  }

  // Grant reward to user
  async grantReward(userId, rewardType, rewardValue) {
    try {
      switch (rewardType) {
        case 'bonus_multiplier':
          // Store bonus multiplier for next bet
          await db.query(
            'UPDATE users SET bonus_multiplier = $1 WHERE id = $2',
            [rewardValue, userId]
          );
          break;

        case 'free_bet':
          // Add free bet credit
          await db.query(
            'UPDATE users SET free_bet_credits = free_bet_credits + $1 WHERE id = $2',
            [rewardValue, userId]
          );
          break;

        case 'cash_reward':
          // Add cash to balance
          await db.query(
            'UPDATE users SET balance = balance + $1 WHERE id = $2',
            [rewardValue, userId]
          );
          break;

        case 'special_feature':
          // Unlock special feature
          await db.query(
            'INSERT INTO user_features (user_id, feature_name, unlocked_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING',
            [userId, rewardValue]
          );
          break;

        default:
          throw new Error(`Unknown reward type: ${rewardType}`);
      }
    } catch (error) {
      logger.error('Error granting reward:', error);
      throw error;
    }
  }

  // Get goal participants
  async getGoalParticipants(goalId) {
    try {
      const result = await db.query(`
        SELECT 
          cgp.user_id,
          u.username,
          cgp.joined_at,
          SUM(cgc.contribution_amount) as total_contribution
        FROM community_goal_participants cgp
        JOIN users u ON cgp.user_id = u.id
        LEFT JOIN community_goal_contributions cgc ON cgp.goal_id = cgc.goal_id AND cgp.user_id = cgc.user_id
        WHERE cgp.goal_id = $1
        GROUP BY cgp.user_id, u.username, cgp.joined_at
        ORDER BY total_contribution DESC
      `, [goalId]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting goal participants:', error);
      throw error;
    }
  }

  // Get goal progress
  async getGoalProgress(goalId) {
    try {
      const goal = await this.getGoalById(goalId);
      if (!goal) {
        return null;
      }

      const progress = (goal.currentAmount / goal.targetAmount) * 100;
      const timeRemaining = new Date(goal.endTime) - new Date();
      const timeRemainingHours = Math.max(0, timeRemaining / (1000 * 60 * 60));

      return {
        goalId,
        currentAmount: goal.currentAmount,
        targetAmount: goal.targetAmount,
        progress: Math.min(100, progress),
        timeRemaining: timeRemainingHours,
        participantCount: goal.participantCount,
        contributionCount: goal.contributionCount
      };
    } catch (error) {
      logger.error('Error getting goal progress:', error);
      throw error;
    }
  }

  // Get user's active goals
  async getUserGoals(userId) {
    try {
      const result = await db.query(`
        SELECT 
          cg.*,
          cgp.joined_at,
          SUM(cgc.contribution_amount) as user_contribution
        FROM community_goals cg
        JOIN community_goal_participants cgp ON cg.id = cgp.goal_id
        LEFT JOIN community_goal_contributions cgc ON cg.id = cgc.goal_id AND cgc.user_id = $1
        WHERE cgp.user_id = $1 AND cg.status = 'active'
        GROUP BY cg.id, cgp.joined_at
        ORDER BY cg.start_date DESC
      `, [userId]);

      return result.rows.map(row => ({
        ...this.formatGoal(row),
        userContribution: parseFloat(row.user_contribution || 0)
      }));
    } catch (error) {
      logger.error('Error getting user goals:', error);
      throw error;
    }
  }

  // Format goal object
  formatGoal(row) {
    // Parse reward string (format: "type:value")
    const rewardParts = (row.reward || '').split(':');
    const rewardType = rewardParts[0] || 'bonus';
    const rewardValue = parseFloat(rewardParts[1] || 0);
    
    return {
      id: row.id,
      title: row.name || row.title,
      description: row.description || '',
      targetAmount: parseFloat(row.target_blocks || row.target_amount || 0),
      currentAmount: parseFloat(row.current_blocks || row.current_amount || 0),
      rewardType: rewardType,
      rewardValue: rewardValue,
      duration: row.duration || 24, // Default 24 hours
      minBetAmount: parseFloat(row.min_bet_amount || 0),
      maxBetAmount: row.max_bet_amount ? parseFloat(row.max_bet_amount) : null,
      requiredParticipants: row.required_participants || 1,
      startTime: row.start_date || row.start_time,
      endTime: row.end_date || row.end_time,
      status: row.status,
      completedAt: row.completed_at,
      participantCount: parseInt(row.participant_count || 0),
      contributionCount: parseInt(row.contribution_count || 0)
    };
  }

  // Clear cache
  clearCache() {
    this.goalCache.clear();
    logger.info('Community goals cache cleared');
  }

  // Get cache statistics
  getCacheStats() {
    return {
      activeGoals: this.activeGoals.size,
      cacheSize: this.goalCache.size,
      cacheTimeout: this.cacheTimeout
    };
  }
}

module.exports = new CommunityGoalsService(); 