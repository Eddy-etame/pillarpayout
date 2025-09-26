const db = require('../db');
const logger = require('../utils/logger');

class TournamentService {
  constructor() {
    this.tournamentTypes = {
      mini: {
        name: 'Mini Tournament',
        entryFee: 1.00,
        duration: 3600000, // 1 hour
        maxPlayers: 100,
        prizePool: 0.70, // 70% of total entry fees
        minBets: 10,
        description: 'Quick 1-hour tournament for small stakes'
      },
      regular: {
        name: 'Regular Tournament',
        entryFee: 2.00,
        duration: 7200000, // 2 hours
        maxPlayers: 200,
        prizePool: 0.70,
        minBets: 25,
        description: 'Standard 2-hour tournament'
      },
      major: {
        name: 'Major Tournament',
        entryFee: 5.00,
        duration: 14400000, // 4 hours
        maxPlayers: 500,
        prizePool: 0.70,
        minBets: 50,
        description: 'Major 4-hour tournament with big prizes'
      },
      daily: {
        name: 'Daily Championship',
        entryFee: 10.00,
        duration: 86400000, // 24 hours
        maxPlayers: 1000,
        prizePool: 0.75, // 75% for daily
        minBets: 100,
        description: '24-hour championship tournament'
      }
    };

    this.activeTournaments = new Map(); // tournamentId -> tournament object
    this.tournamentParticipants = new Map(); // tournamentId -> participants array
    this.tournamentScores = new Map(); // tournamentId -> scores map
  }

  // Create a new tournament
  async createTournament(type, startTime = null) {
    const tournamentType = this.tournamentTypes[type];
    if (!tournamentType) {
      throw new Error(`Invalid tournament type: ${type}`);
    }

    const tournamentId = `tournament_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const actualStartTime = startTime || new Date();
    const endTime = new Date(actualStartTime.getTime() + tournamentType.duration);

    const tournament = {
      id: tournamentId,
      type,
      name: tournamentType.name,
      entryFee: tournamentType.entryFee,
      duration: tournamentType.duration,
      maxPlayers: tournamentType.maxPlayers,
      prizePool: tournamentType.prizePool,
      minBets: tournamentType.minBets,
      description: tournamentType.description,
      startTime: actualStartTime,
      endTime,
      status: 'registration', // registration, active, completed, cancelled
      totalEntryFees: 0,
      totalPrizePool: 0,
      participants: [],
      leaderboard: [],
      createdAt: new Date()
    };

    // Store in memory
    this.activeTournaments.set(tournamentId, tournament);
    this.tournamentParticipants.set(tournamentId, []);
    this.tournamentScores.set(tournamentId, new Map());

    // Store in database
    await this.saveTournamentToDatabase(tournament);

    logger.info(`Tournament created: ${tournament.name} (${tournamentId})`);
    return tournament;
  }

  // Save tournament to database
  async saveTournamentToDatabase(tournament) {
    try {
      await db.query(`
        INSERT INTO tournaments (
          tournament_id, type, name, entry_fee, duration, max_players,
          prize_pool, min_bets, description, start_time, end_time,
          status, total_entry_fees, total_prize_pool, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
        tournament.id, tournament.type, tournament.name, tournament.entryFee,
        tournament.duration, tournament.maxPlayers, tournament.prizePool,
        tournament.minBets, tournament.description, tournament.startTime,
        tournament.endTime, tournament.status, tournament.totalEntryFees,
        tournament.totalPrizePool, tournament.createdAt
      ]);
    } catch (error) {
      logger.error('Error saving tournament to database:', error);
      throw error;
    }
  }

  // Join tournament
  async joinTournament(tournamentId, userId, username) {
    const tournament = this.activeTournaments.get(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== 'registration') {
      throw new Error('Tournament registration is closed');
    }

    const participants = this.tournamentParticipants.get(tournamentId) || [];
    if (participants.length >= tournament.maxPlayers) {
      throw new Error('Tournament is full');
    }

    // Check if user already joined
    if (participants.some(p => p.userId === userId)) {
      throw new Error('User already joined this tournament');
    }

    // Deduct entry fee from user balance
    try {
      const result = await db.query('SELECT balance FROM users WHERE id = $1', [userId]);
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const currentBalance = parseFloat(result.rows[0].balance);
      if (currentBalance < tournament.entryFee) {
        throw new Error('Insufficient balance for tournament entry');
      }

      // Deduct entry fee
      await db.query('UPDATE users SET balance = balance - $1 WHERE id = $2', 
        [tournament.entryFee, userId]);

      // Add to tournament participants
      const participant = {
        userId,
        username,
        joinedAt: new Date(),
        totalBets: 0,
        totalWagered: 0,
        totalWon: 0,
        biggestWin: 0,
        highestMultiplier: 0,
        score: 0
      };

      participants.push(participant);
      this.tournamentParticipants.set(tournamentId, participants);

      // Update tournament total entry fees
      tournament.totalEntryFees += tournament.entryFee;
      tournament.totalPrizePool = tournament.totalEntryFees * tournament.prizePool;
      tournament.participants = participants;

      // Update database
      await this.updateTournamentInDatabase(tournament);
      await this.saveParticipantToDatabase(tournamentId, participant);

      logger.info(`User ${username} joined tournament ${tournament.name}`);
      return participant;

    } catch (error) {
      logger.error('Error joining tournament:', error);
      throw error;
    }
  }

  // Update tournament scores
  async updateTournamentScore(tournamentId, userId, betData) {
    const tournament = this.activeTournaments.get(tournamentId);
    if (!tournament || tournament.status !== 'active') {
      return; // Tournament not active
    }

    const participants = this.tournamentParticipants.get(tournamentId) || [];
    const participant = participants.find(p => p.userId === userId);
    if (!participant) {
      return; // Not a participant
    }

    // Update participant stats
    participant.totalBets++;
    participant.totalWagered += betData.amount;

    if (betData.result === 'win') {
      participant.totalWon += betData.winnings;
      participant.biggestWin = Math.max(participant.biggestWin, betData.winnings);
      participant.highestMultiplier = Math.max(participant.highestMultiplier, betData.multiplier);
      
      // Calculate score based on winnings and multiplier
      const score = (betData.winnings * betData.multiplier) / 100;
      participant.score += score;
    }

    // Update leaderboard
    this.updateLeaderboard(tournamentId);

    // Update database
    await this.updateParticipantInDatabase(tournamentId, participant);
  }

  // Update leaderboard
  updateLeaderboard(tournamentId) {
    const participants = this.tournamentParticipants.get(tournamentId) || [];
    const leaderboard = participants
      .sort((a, b) => b.score - a.score)
      .map((participant, index) => ({
        ...participant,
        rank: index + 1
      }));

    const tournament = this.activeTournaments.get(tournamentId);
    if (tournament) {
      tournament.leaderboard = leaderboard;
    }
  }

  // Start tournament
  async startTournament(tournamentId) {
    const tournament = this.activeTournaments.get(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== 'registration') {
      throw new Error('Tournament cannot be started');
    }

    const participants = this.tournamentParticipants.get(tournamentId) || [];
    if (participants.length < 2) {
      throw new Error('Need at least 2 participants to start tournament');
    }

    tournament.status = 'active';
    tournament.actualStartTime = new Date();

    // Update database
    await this.updateTournamentInDatabase(tournament);

    logger.info(`Tournament ${tournament.name} started with ${participants.length} participants`);
    return tournament;
  }

  // End tournament and distribute prizes
  async endTournament(tournamentId) {
    const tournament = this.activeTournaments.get(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== 'active') {
      throw new Error('Tournament is not active');
    }

    tournament.status = 'completed';
    tournament.actualEndTime = new Date();

    // Get final leaderboard
    const leaderboard = tournament.leaderboard || [];
    const winners = this.calculateWinners(leaderboard, tournament.totalPrizePool);

    // Distribute prizes
    await this.distributePrizes(tournamentId, winners);

    // Update database
    await this.updateTournamentInDatabase(tournament);
    await this.saveTournamentResults(tournamentId, winners);

    logger.info(`Tournament ${tournament.name} ended. Winners: ${winners.length}`);
    return { tournament, winners };
  }

  // Calculate winners and prize distribution
  calculateWinners(leaderboard, totalPrizePool) {
    if (leaderboard.length === 0) return [];

    const winners = [];
    const prizeDistribution = [0.50, 0.30, 0.20]; // 50%, 30%, 20%

    for (let i = 0; i < Math.min(3, leaderboard.length); i++) {
      const participant = leaderboard[i];
      const prizeAmount = totalPrizePool * prizeDistribution[i];
      
      winners.push({
        rank: i + 1,
        userId: participant.userId,
        username: participant.username,
        score: participant.score,
        prizeAmount: parseFloat(prizeAmount.toFixed(2)),
        totalBets: participant.totalBets,
        totalWagered: participant.totalWagered,
        totalWon: participant.totalWon,
        biggestWin: participant.biggestWin,
        highestMultiplier: participant.highestMultiplier
      });
    }

    return winners;
  }

  // Distribute prizes to winners
  async distributePrizes(tournamentId, winners) {
    for (const winner of winners) {
      try {
        // Add prize to user balance
        await db.query('UPDATE users SET balance = balance + $1 WHERE id = $2', 
          [winner.prizeAmount, winner.userId]);

        // Record prize distribution
        await db.query(`
          INSERT INTO tournament_prizes (
            tournament_id, user_id, rank, prize_amount, distributed_at
          ) VALUES ($1, $2, $3, $4, NOW())
        `, [tournamentId, winner.userId, winner.rank, winner.prizeAmount]);

        logger.info(`Prize distributed: ${winner.username} - $${winner.prizeAmount}`);
      } catch (error) {
        logger.error(`Error distributing prize to ${winner.username}:`, error);
      }
    }
  }

  // Get active tournaments
  getActiveTournaments() {
    const active = [];
    for (const [id, tournament] of this.activeTournaments) {
      if (tournament.status === 'registration' || tournament.status === 'active') {
        active.push(tournament);
      }
    }
    return active.sort((a, b) => a.startTime - b.startTime);
  }

  // Get tournament by ID
  getTournamentById(tournamentId) {
    return this.activeTournaments.get(tournamentId);
  }

  // Get user's tournaments
  getUserTournaments(userId) {
    const userTournaments = [];
    
    for (const [tournamentId, participants] of this.tournamentParticipants) {
      const participant = participants.find(p => p.userId === userId);
      if (participant) {
        const tournament = this.activeTournaments.get(tournamentId);
        if (tournament) {
          userTournaments.push({
            ...tournament,
            participant
          });
        }
      }
    }
    
    return userTournaments.sort((a, b) => b.createdAt - a.createdAt);
  }

  // Get tournament statistics
  async getTournamentStats() {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_tournaments,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tournaments,
          SUM(total_entry_fees) as total_entry_fees_collected,
          SUM(total_prize_pool) as total_prizes_distributed,
          AVG(total_entry_fees) as average_entry_fees,
          AVG(total_prize_pool) as average_prize_pool
        FROM tournaments
      `);

      const stats = result.rows[0];
      
      return {
        totalTournaments: parseInt(stats.total_tournaments || 0),
        completedTournaments: parseInt(stats.completed_tournaments || 0),
        totalEntryFeesCollected: parseFloat(stats.total_entry_fees_collected || 0),
        totalPrizesDistributed: parseFloat(stats.total_prizes_distributed || 0),
        averageEntryFees: parseFloat(stats.average_entry_fees || 0),
        averagePrizePool: parseFloat(stats.average_prize_pool || 0),
        houseProfit: parseFloat((stats.total_entry_fees_collected - stats.total_prizes_distributed).toFixed(2))
      };
    } catch (error) {
      logger.error('Error getting tournament stats:', error);
      throw error;
    }
  }

  // Calculate profitability
  calculateProfitability() {
    const stats = {
      mini: { entryFee: 1.00, houseCut: 0.30, expectedPlayers: 50 },
      regular: { entryFee: 2.00, houseCut: 0.30, expectedPlayers: 100 },
      major: { entryFee: 5.00, houseCut: 0.30, expectedPlayers: 200 },
      daily: { entryFee: 10.00, houseCut: 0.25, expectedPlayers: 500 }
    };

    const profitability = {};
    let totalDailyProfit = 0;

    for (const [type, config] of Object.entries(stats)) {
      const dailyRevenue = config.entryFee * config.expectedPlayers * 24; // 24 tournaments per day
      const dailyProfit = dailyRevenue * config.houseCut;
      
      profitability[type] = {
        dailyRevenue: parseFloat(dailyRevenue.toFixed(2)),
        dailyProfit: parseFloat(dailyProfit.toFixed(2)),
        monthlyProfit: parseFloat((dailyProfit * 30).toFixed(2)),
        yearlyProfit: parseFloat((dailyProfit * 365).toFixed(2))
      };
      
      totalDailyProfit += dailyProfit;
    }

    return {
      ...profitability,
      totalDailyProfit: parseFloat(totalDailyProfit.toFixed(2)),
      totalMonthlyProfit: parseFloat((totalDailyProfit * 30).toFixed(2)),
      totalYearlyProfit: parseFloat((totalDailyProfit * 365).toFixed(2))
    };
  }

  // Database helper methods
  async updateTournamentInDatabase(tournament) {
    try {
      await db.query(`
        UPDATE tournaments SET 
          status = $1, total_entry_fees = $2, total_prize_pool = $3,
          actual_start_time = $4, actual_end_time = $5
        WHERE tournament_id = $6
      `, [
        tournament.status, tournament.totalEntryFees, tournament.totalPrizePool,
        tournament.actualStartTime, tournament.actualEndTime, tournament.id
      ]);
    } catch (error) {
      logger.error('Error updating tournament in database:', error);
      throw error;
    }
  }

  async saveParticipantToDatabase(tournamentId, participant) {
    try {
      await db.query(`
        INSERT INTO tournament_participants (
          tournament_id, user_id, username, joined_at, total_bets,
          total_wagered, total_won, biggest_win, highest_multiplier, score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        tournamentId, participant.userId, participant.username, participant.joinedAt,
        participant.totalBets, participant.totalWagered, participant.totalWon,
        participant.biggestWin, participant.highestMultiplier, participant.score
      ]);
    } catch (error) {
      logger.error('Error saving participant to database:', error);
      throw error;
    }
  }

  async updateParticipantInDatabase(tournamentId, participant) {
    try {
      await db.query(`
        UPDATE tournament_participants SET 
          total_bets = $1, total_wagered = $2, total_won = $3,
          biggest_win = $4, highest_multiplier = $5, score = $6
        WHERE tournament_id = $7 AND user_id = $8
      `, [
        participant.totalBets, participant.totalWagered, participant.totalWon,
        participant.biggestWin, participant.highestMultiplier, participant.score,
        tournamentId, participant.userId
      ]);
    } catch (error) {
      logger.error('Error updating participant in database:', error);
      throw error;
    }
  }

  async saveTournamentResults(tournamentId, winners) {
    try {
      for (const winner of winners) {
        await db.query(`
          INSERT INTO tournament_results (
            tournament_id, user_id, rank, score, total_bets,
            total_wagered, total_won, biggest_win, highest_multiplier
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          tournamentId, winner.userId, winner.rank, winner.score,
          winner.totalBets, winner.totalWagered, winner.totalWon,
          winner.biggestWin, winner.highestMultiplier
        ]);
      }
    } catch (error) {
      logger.error('Error saving tournament results:', error);
      throw error;
    }
  }

  // Clear cache
  clearCache() {
    this.activeTournaments.clear();
    this.tournamentParticipants.clear();
    this.tournamentScores.clear();
    logger.info('Tournament cache cleared');
  }

  // Update player score for tournament tracking
  async updatePlayerScore(userId, betId, amount, action, additionalData = {}) {
    try {
      // Get all active tournaments
      const activeTournaments = Array.from(this.activeTournaments.values())
        .filter(t => t.status === 'active');
      
      for (const tournament of activeTournaments) {
        // Check if user is participating in this tournament
        const participant = this.tournamentParticipants.get(tournament.id)
          ?.find(p => p.userId === userId);
        
        if (participant) {
          // Update participant stats based on action
          switch (action) {
            case 'bet_placed':
              participant.totalBets++;
              participant.totalWagered += amount;
              participant.score += amount * 0.1; // Small score boost for placing bet
              break;
              
            case 'cashout':
              const { multiplier, winnings } = additionalData;
              participant.totalWon += winnings;
              participant.biggestWin = Math.max(participant.biggestWin, winnings);
              participant.highestMultiplier = Math.max(participant.highestMultiplier, multiplier);
              participant.score += winnings * 0.5; // Higher score boost for winning
              break;
              
            case 'bet_lost':
              participant.score += amount * 0.05; // Small score boost even for losing (participation)
              break;
          }
          
          // Update participant in database
          await this.updateParticipantInDatabase(tournament.id, participant);
          
          // Update tournament leaderboard
          await this.updateTournamentLeaderboard(tournament.id);
          
          logger.info(`Updated tournament score for user ${userId} in tournament ${tournament.id}: ${action}`);
        }
      }
      
      return { success: true, tournamentsUpdated: activeTournaments.length };
    } catch (error) {
      logger.error(`Error updating tournament score for user ${userId}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Update tournament leaderboard
  async updateTournamentLeaderboard(tournamentId) {
    try {
      const participants = this.tournamentParticipants.get(tournamentId) || [];
      
      // Sort participants by score (descending)
      participants.sort((a, b) => b.score - a.score);
      
      // Update tournament leaderboard
      const tournament = this.activeTournaments.get(tournamentId);
      if (tournament) {
        tournament.leaderboard = participants.slice(0, 10); // Top 10 players
      }
      
      logger.info(`Updated leaderboard for tournament ${tournamentId}`);
    } catch (error) {
      logger.error(`Error updating tournament leaderboard for ${tournamentId}:`, error);
    }
  }

  // Get cache statistics
  getCacheStats() {
    return {
      activeTournaments: this.activeTournaments.size,
      tournamentParticipants: this.activeTournaments.size,
      tournamentScores: this.tournamentScores.size
    };
  }
}

module.exports = new TournamentService(); 