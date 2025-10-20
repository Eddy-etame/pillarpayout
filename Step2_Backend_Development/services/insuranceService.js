const db = require('../db');
const logger = require('../utils/logger');

class InsuranceService {
  constructor() {
    this.insuranceRates = {
      // Insurance premium rates (percentage of bet amount) - PROFITABLE RATES
      basic: 0.20,    // 20% premium for basic insurance (was 15%)
      premium: 0.30,  // 30% premium for premium insurance (was 25%)
      elite: 0.40     // 40% premium for elite insurance (was 35%)
    };
    
    this.coverageRates = {
      // Coverage percentages (what % of bet is returned if lost) - PROFITABLE RATES
      basic: 0.40,    // 40% of bet returned (was 50%)
      premium: 0.60,  // 60% of bet returned (was 75%)
      elite: 0.80     // 80% of bet returned (was 90%)
    };
    
    this.minBetForInsurance = 100.00; // Minimum bet to qualify for insurance (matches game minimum)
    this.maxInsuranceAmount = 100000.00; // Maximum insurance coverage (matches game maximum)
    this.insuranceCache = new Map(); // Cache for insurance calculations
  }

  // Calculate insurance premium
  calculateInsurancePremium(betAmount, insuranceType) {
    if (!this.insuranceRates[insuranceType]) {
      throw new Error(`Invalid insurance type: ${insuranceType}`);
    }

    const premiumRate = this.insuranceRates[insuranceType];
    const premium = betAmount * premiumRate;
    
    return {
      betAmount,
      insuranceType,
      premiumRate,
      premium: parseFloat(premium.toFixed(2)),
      coverageRate: this.coverageRates[insuranceType],
      coverageAmount: parseFloat((betAmount * this.coverageRates[insuranceType]).toFixed(2)),
      totalCost: parseFloat((betAmount + premium).toFixed(2))
    };
  }

  // Purchase insurance for a bet
  async purchaseInsurance(userId, betId, insuranceType, betAmount) {
    try {
      // Validate insurance purchase
      if (betAmount < this.minBetForInsurance) {
        throw new Error(`Minimum bet amount for insurance is $${this.minBetForInsurance}`);
      }

      if (betAmount > this.maxInsuranceAmount) {
        throw new Error(`Maximum insurance coverage is $${this.maxInsuranceAmount}`);
      }

      // Calculate insurance details
      const insuranceDetails = this.calculateInsurancePremium(betAmount, insuranceType);
      
      // Check if user has sufficient balance for insurance premium
      const userResult = await db.query(
        'SELECT balance FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const userBalance = parseFloat(userResult.rows[0].balance);
      if (userBalance < insuranceDetails.premium) {
        throw new Error('Insufficient balance for insurance premium');
      }

      // Deduct insurance premium from user balance
      await db.query(
        'UPDATE users SET balance = balance - $1 WHERE id = $2',
        [insuranceDetails.premium, userId]
      );

      // Create insurance record
      const insuranceResult = await db.query(`
        INSERT INTO bet_insurance (
          user_id, bet_id, insurance_type, bet_amount, premium_amount, 
          coverage_rate, coverage_amount, status, purchased_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING id
      `, [
        userId, betId, insuranceType, betAmount, insuranceDetails.premium,
        insuranceDetails.coverageRate, insuranceDetails.coverageAmount, 'active'
      ]);

      const insuranceId = insuranceResult.rows[0].id;

      logger.info(`Insurance purchased: User ${userId}, Bet ${betId}, Type ${insuranceType}, Premium $${insuranceDetails.premium}`);

      return {
        success: true,
        insuranceId,
        insuranceDetails,
        newBalance: userBalance - insuranceDetails.premium
      };
    } catch (error) {
      logger.error('Error purchasing insurance:', error);
      throw error;
    }
  }

  // Process insurance claim when bet loses
  async processInsuranceClaim(betId) {
    try {
      // Get insurance details for the bet
      const insuranceResult = await db.query(`
        SELECT 
          bi.*,
          u.balance as user_balance
        FROM bet_insurance bi
        JOIN users u ON bi.user_id = u.id
        WHERE bi.bet_id = $1 AND bi.status = 'active'
      `, [betId]);

      if (insuranceResult.rows.length === 0) {
        return { success: false, message: 'No active insurance found for this bet' };
      }

      const insurance = insuranceResult.rows[0];
      
      // Calculate payout
      const payout = insurance.coverage_amount;
      
      // Update user balance
      await db.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2',
        [payout, insurance.user_id]
      );

      // Mark insurance as claimed
      await db.query(
        'UPDATE bet_insurance SET status = $1, claimed_at = NOW() WHERE id = $2',
        ['claimed', insurance.id]
      );

      logger.info(`Insurance claim processed: User ${insurance.user_id}, Payout $${payout}`);

      return {
        success: true,
        insuranceId: insurance.id,
        payout,
        newBalance: parseFloat(insurance.user_balance) + payout
      };
    } catch (error) {
      logger.error('Error processing insurance claim:', error);
      throw error;
    }
  }

  // Get user's insurance history
  async getUserInsuranceHistory(userId, limit = 50, offset = 0) {
    try {
      const result = await db.query(`
        SELECT 
          bi.*,
          b.amount as original_bet_amount,
          b.cashout_multiplier,
          r.crash_point
        FROM bet_insurance bi
        JOIN bets b ON bi.bet_id = b.id
        JOIN rounds r ON b.round_id = r.id
        WHERE bi.user_id = $1
        ORDER BY bi.purchased_at DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      return result.rows.map(row => ({
        id: row.id,
        betId: row.bet_id,
        insuranceType: row.insurance_type,
        betAmount: parseFloat(row.bet_amount),
        premiumAmount: parseFloat(row.premium_amount),
        coverageRate: parseFloat(row.coverage_rate),
        coverageAmount: parseFloat(row.coverage_amount),
        status: row.status,
        purchasedAt: row.purchased_at,
        claimedAt: row.claimed_at,
        originalBetAmount: parseFloat(row.original_bet_amount),
        cashoutMultiplier: row.cashout_multiplier,
        crashPoint: parseFloat(row.crash_point),
        wasWinningBet: row.cashout_multiplier !== null,
        payout: row.status === 'claimed' ? parseFloat(row.coverage_amount) : 0
      }));
    } catch (error) {
      logger.error('Error getting user insurance history:', error);
      throw error;
    }
  }

  // Get insurance statistics
  async getInsuranceStats() {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_insurance_purchases,
          SUM(premium_amount) as total_premiums_collected,
          COUNT(CASE WHEN status = 'claimed' THEN 1 END) as total_claims,
          SUM(CASE WHEN status = 'claimed' THEN coverage_amount ELSE 0 END) as total_payouts,
          AVG(premium_amount) as average_premium,
          AVG(CASE WHEN status = 'claimed' THEN coverage_amount ELSE 0 END) as average_payout
        FROM bet_insurance
      `);

      const stats = result.rows[0];
      
      return {
        totalPurchases: parseInt(stats.total_insurance_purchases || 0),
        totalPremiumsCollected: parseFloat(stats.total_premiums_collected || 0),
        totalClaims: parseInt(stats.total_claims || 0),
        totalPayouts: parseFloat(stats.total_payouts || 0),
        averagePremium: parseFloat(stats.average_premium || 0),
        averagePayout: parseFloat(stats.average_payout || 0),
        profitMargin: parseFloat((stats.total_premiums_collected - stats.total_payouts).toFixed(2)),
        claimRate: stats.total_insurance_purchases > 0 ? 
          parseFloat(((stats.total_claims / stats.total_insurance_purchases) * 100).toFixed(2)) : 0
      };
    } catch (error) {
      logger.error('Error getting insurance stats:', error);
      throw error;
    }
  }

  // Get insurance options for a bet amount
  getInsuranceOptions(betAmount) {
    if (betAmount < this.minBetForInsurance) {
      return {
        available: false,
        reason: `Minimum bet amount for insurance is $${this.minBetForInsurance}`,
        options: []
      };
    }

    if (betAmount > this.maxInsuranceAmount) {
      return {
        available: false,
        reason: `Maximum insurance coverage is $${this.maxInsuranceAmount}`,
        options: []
      };
    }

    const options = Object.keys(this.insuranceRates).map(type => {
      const details = this.calculateInsurancePremium(betAmount, type);
      return {
        type,
        premium: details.premium,
        premiumRate: details.premiumRate,
        coverageRate: details.coverageRate,
        coverageAmount: details.coverageAmount,
        totalCost: details.totalCost,
        valueForMoney: parseFloat((details.coverageAmount / details.premium).toFixed(2))
      };
    });

    return {
      available: true,
      betAmount,
      options
    };
  }

  // Calculate profitability metrics
  calculateProfitabilityMetrics() {
    const metrics = {
      basic: {
        premiumRate: this.insuranceRates.basic,
        coverageRate: this.coverageRates.basic,
        houseEdge: parseFloat(((this.insuranceRates.basic - this.coverageRates.basic) * 100).toFixed(2))
      },
      premium: {
        premiumRate: this.insuranceRates.premium,
        coverageRate: this.coverageRates.premium,
        houseEdge: parseFloat(((this.insuranceRates.premium - this.coverageRates.premium) * 100).toFixed(2))
      },
      elite: {
        premiumRate: this.insuranceRates.elite,
        coverageRate: this.coverageRates.elite,
        houseEdge: parseFloat(((this.insuranceRates.elite - this.coverageRates.elite) * 100).toFixed(2))
      }
    };

    // Overall profitability
    const overallHouseEdge = Object.values(metrics).reduce((sum, metric) => sum + metric.houseEdge, 0) / 3;
    
    return {
      ...metrics,
      overallHouseEdge: parseFloat(overallHouseEdge.toFixed(2)),
      minBetForInsurance: this.minBetForInsurance,
      maxInsuranceAmount: this.maxInsuranceAmount
    };
  }

  // Clear cache
  clearCache() {
    this.insuranceCache.clear();
    logger.info('Insurance cache cleared');
  }

  // Get cache statistics
  getCacheStats() {
    return {
      cacheSize: this.insuranceCache.size
    };
  }
}

module.exports = new InsuranceService(); 