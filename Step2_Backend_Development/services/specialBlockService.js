const db = require('../db');
const logger = require('../utils/logger');

class SpecialBlockService {
  constructor() {
    this.blockTypes = {
      boost: {
        name: 'Boost Block',
        description: 'Increases multiplier growth rate by 50%',
        effect: 'multiplier_boost',
        duration: 10000, // 10 seconds
        probability: 0.05, // 5% chance
        profitImpact: 'positive' // Increases house edge
      },
      stability: {
        name: 'Stability Block',
        description: 'Slows down integrity loss by 75%',
        effect: 'integrity_stability',
        duration: 15000, // 15 seconds
        probability: 0.03, // 3% chance
        profitImpact: 'positive' // Keeps players in longer
      },
      bonus: {
        name: 'Bonus Block',
        description: 'Doubles winnings for next cashout',
        effect: 'bonus_multiplier',
        duration: 20000, // 20 seconds
        probability: 0.02, // 2% chance
        profitImpact: 'neutral' // Attracts players but costs more
      },
      crash: {
        name: 'Crash Block',
        description: 'Forces immediate crash',
        effect: 'force_crash',
        duration: 0, // Immediate
        probability: 0.01, // 1% chance
        profitImpact: 'very_positive' // Guaranteed profit
      },
      safety: {
        name: 'Safety Block',
        description: 'Prevents crash for 5 seconds',
        effect: 'crash_protection',
        duration: 5000, // 5 seconds
        probability: 0.04, // 4% chance
        profitImpact: 'negative' // Reduces house edge temporarily
      }
    };

    this.activeEffects = new Map(); // roundId -> effects array
    this.effectHistory = new Map(); // roundId -> history
  }

  // Generate special block based on probability
  generateSpecialBlock(roundId, currentMultiplier, currentIntegrity) {
    const random = Math.random();
    let cumulativeProbability = 0;
    
    for (const [type, block] of Object.entries(this.blockTypes)) {
      cumulativeProbability += block.probability;
      
      if (random <= cumulativeProbability) {
        const effect = this.createEffect(roundId, type, block, currentMultiplier, currentIntegrity);
        
        // Store active effect
        if (!this.activeEffects.has(roundId)) {
          this.activeEffects.set(roundId, []);
        }
        this.activeEffects.get(roundId).push(effect);
        
        // Log effect
        logger.info(`Special block generated: ${block.name} for round ${roundId} at ${currentMultiplier}x`);
        
        return effect;
      }
    }
    
    return null; // No special block generated
  }

  // Create effect object
  createEffect(roundId, type, block, currentMultiplier, currentIntegrity) {
    return {
      id: `${roundId}_${type}_${Date.now()}`,
      type,
      name: block.name,
      description: block.description,
      effect: block.effect,
      startTime: Date.now(),
      endTime: Date.now() + block.duration,
      duration: block.duration,
      currentMultiplier,
      currentIntegrity,
      profitImpact: block.profitImpact,
      active: true
    };
  }

  // Apply special block effects
  applyEffects(roundId, gameState) {
    const effects = this.activeEffects.get(roundId) || [];
    const activeEffects = effects.filter(effect => effect.active && Date.now() < effect.endTime);
    
    let modifiedState = { ...gameState };
    
    for (const effect of activeEffects) {
      switch (effect.effect) {
        case 'multiplier_boost':
          // Increase multiplier growth rate by 50%
          modifiedState.multiplierGrowthRate = (modifiedState.multiplierGrowthRate || 0.05) * 1.5;
          break;
          
        case 'integrity_stability':
          // Slow down integrity loss by 75%
          modifiedState.integrityLossRate = (modifiedState.integrityLossRate || 2) * 0.25;
          break;
          
        case 'bonus_multiplier':
          // Mark for bonus multiplier on cashout
          modifiedState.bonusMultiplier = true;
          break;
          
        case 'force_crash':
          // Force immediate crash
          modifiedState.forceCrash = true;
          break;
          
        case 'crash_protection':
          // Prevent crash for duration
          modifiedState.crashProtected = true;
          break;
      }
    }
    
    return modifiedState;
  }

  // Process cashout with special effects
  async processCashoutWithEffects(userId, roundId, betAmount, cashoutMultiplier) {
    const effects = this.activeEffects.get(roundId) || [];
    const bonusEffects = effects.filter(effect => 
      effect.active && 
      effect.effect === 'bonus_multiplier' && 
      Date.now() < effect.endTime
    );
    
    let finalMultiplier = cashoutMultiplier;
    let bonusApplied = false;
    
    if (bonusEffects.length > 0) {
      finalMultiplier = cashoutMultiplier * 2; // Double winnings
      bonusApplied = true;
      
      // Deactivate bonus effect
      bonusEffects.forEach(effect => {
        effect.active = false;
      });
      
      logger.info(`Bonus multiplier applied: User ${userId}, Original: ${cashoutMultiplier}x, Final: ${finalMultiplier}x`);
    }
    
    // Record effect usage
    await this.recordEffectUsage(roundId, userId, 'cashout', {
      originalMultiplier: cashoutMultiplier,
      finalMultiplier,
      bonusApplied,
      betAmount
    });
    
    return {
      originalMultiplier: cashoutMultiplier,
      finalMultiplier,
      bonusApplied,
      winnings: betAmount * finalMultiplier
    };
  }

  // Record effect usage in database
  async recordEffectUsage(roundId, userId, action, data) {
    try {
      await db.query(`
        INSERT INTO special_block_usage (
          round_id, user_id, action, effect_data, timestamp
        ) VALUES ($1, $2, $3, $4, NOW())
      `, [roundId, userId, action, JSON.stringify(data)]);
    } catch (error) {
      logger.error('Error recording effect usage:', error);
    }
  }

  // Get active effects for a round
  getActiveEffects(roundId) {
    const effects = this.activeEffects.get(roundId) || [];
    return effects.filter(effect => effect.active && Date.now() < effect.endTime);
  }

  // Get effect statistics
  async getEffectStats() {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_effects,
          COUNT(CASE WHEN effect_data->>'bonusApplied' = 'true' THEN 1 END) as bonus_applications,
          AVG(CAST(effect_data->>'finalMultiplier' AS DECIMAL)) as avg_final_multiplier,
          SUM(CAST(effect_data->>'winnings' AS DECIMAL)) as total_bonus_winnings
        FROM special_block_usage
        WHERE action = 'cashout'
      `);

      const stats = result.rows[0];
      
      return {
        totalEffects: parseInt(stats.total_effects || 0),
        bonusApplications: parseInt(stats.bonus_applications || 0),
        averageFinalMultiplier: parseFloat(stats.avg_final_multiplier || 0),
        totalBonusWinnings: parseFloat(stats.total_bonus_winnings || 0),
        bonusApplicationRate: stats.total_effects > 0 ? 
          parseFloat(((stats.bonus_applications / stats.total_effects) * 100).toFixed(2)) : 0
      };
    } catch (error) {
      logger.error('Error getting effect stats:', error);
      throw error;
    }
  }

  // Calculate profitability impact
  calculateProfitabilityImpact() {
    const impact = {
      boost: {
        probability: this.blockTypes.boost.probability,
        profitImpact: 'positive',
        description: 'Increases house edge by making crashes more likely'
      },
      stability: {
        probability: this.blockTypes.stability.probability,
        profitImpact: 'positive',
        description: 'Keeps players betting longer'
      },
      bonus: {
        probability: this.blockTypes.bonus.probability,
        profitImpact: 'neutral',
        description: 'Attracts players but costs more on wins'
      },
      crash: {
        probability: this.blockTypes.crash.probability,
        profitImpact: 'very_positive',
        description: 'Guaranteed profit from all active bets'
      },
      safety: {
        probability: this.blockTypes.safety.probability,
        profitImpact: 'negative',
        description: 'Reduces house edge temporarily'
      }
    };

    // Calculate overall profitability
    let positiveImpact = 0;
    let negativeImpact = 0;

    Object.values(impact).forEach(effect => {
      if (effect.profitImpact === 'very_positive') {
        positiveImpact += effect.probability * 2; // Double weight
      } else if (effect.profitImpact === 'positive') {
        positiveImpact += effect.probability;
      } else if (effect.profitImpact === 'negative') {
        negativeImpact += effect.probability;
      }
    });

    const netImpact = positiveImpact - negativeImpact;
    
    return {
      ...impact,
      positiveImpact: parseFloat(positiveImpact.toFixed(4)),
      negativeImpact: parseFloat(negativeImpact.toFixed(4)),
      netImpact: parseFloat(netImpact.toFixed(4)),
      overallProfitability: netImpact > 0 ? 'profitable' : 'costly'
    };
  }

  // Clear effects for a round
  clearRoundEffects(roundId) {
    this.activeEffects.delete(roundId);
    logger.info(`Cleared effects for round ${roundId}`);
  }

  // Get all block types
  getBlockTypes() {
    return this.blockTypes;
  }

  // Clear cache
  clearCache() {
    this.activeEffects.clear();
    this.effectHistory.clear();
    logger.info('Special block cache cleared');
  }

  // Get cache statistics
  getCacheStats() {
    return {
      activeEffects: this.activeEffects.size,
      effectHistory: this.effectHistory.size
    };
  }
}

module.exports = new SpecialBlockService(); 