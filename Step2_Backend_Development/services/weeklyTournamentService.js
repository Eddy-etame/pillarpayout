const db = require('../db');
const logger = require('../utils/logger');

class WeeklyTournamentService {
  constructor() {
    this.activeWeeklyTournaments = new Map(); // tournamentId -> tournament object
    this.weeklyGroups = new Map(); // tournamentId -> groups array
    this.weeklyScores = new Map(); // tournamentId -> scores map
    this.weeklyStats = new Map(); // tournamentId -> stats map
  }

  // Create a new weekly tournament
  async createWeeklyTournament(startDate = null) {
    try {
      const actualStartDate = startDate || new Date();
      const endDate = new Date(actualStartDate);
      endDate.setDate(endDate.getDate() + 7); // 7 days duration

      const tournamentId = `weekly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const tournament = {
        id: tournamentId,
        type: 'weekly',
        name: `Weekly Tournament - ${actualStartDate.toLocaleDateString()}`,
        description: 'Compete for the most bets and highest winnings this week!',
        startDate: actualStartDate,
        endDate: endDate,
        status: 'registration', // registration, active, completed, cancelled
        maxPlayers: 1000,
        entryFee: 0, // Free weekly tournament
        prizePool: 0, // Will be calculated based on house edge
        groups: [],
        totalParticipants: 0,
        createdAt: new Date()
      };

      // Store in memory
      this.activeWeeklyTournaments.set(tournamentId, tournament);
      this.weeklyGroups.set(tournamentId, []);
      this.weeklyScores.set(tournamentId, new Map());
      this.weeklyStats.set(tournamentId, new Map());

      // Store in database
      await this.saveWeeklyTournamentToDatabase(tournament);

      logger.info(`Weekly tournament created: ${tournament.name} (${tournamentId})`);
      return tournament;
    } catch (error) {
      logger.error('Error creating weekly tournament:', error);
      throw error;
    }
  }

  // Join weekly tournament
  async joinWeeklyTournament(tournamentId, userId, username) {
    try {
      const tournament = this.activeWeeklyTournaments.get(tournamentId);
      if (!tournament) {
        throw new Error('Weekly tournament not found');
      }

      if (tournament.status !== 'registration') {
        throw new Error('Tournament registration is closed');
      }

      const groups = this.weeklyGroups.get(tournamentId) || [];
      
      // Check if user already joined
      const existingParticipant = groups.find(group => 
        group.participants.some(p => p.userId === userId)
      );
      if (existingParticipant) {
        throw new Error('User already joined this tournament');
      }

      // Find or create a group for the user
      let targetGroup = groups.find(group => group.participants.length < 8); // Max 8 per group
      if (!targetGroup) {
        targetGroup = {
          groupId: `group_${groups.length + 1}`,
          participants: [],
          totalBets: 0,
          totalWagered: 0,
          totalWinnings: 0,
          groupScore: 0
        };
        groups.push(targetGroup);
      }

      // Add participant to group
      const participant = {
        userId,
        username,
        joinedAt: new Date(),
        totalBets: 0,
        totalWagered: 0,
        totalWinnings: 0,
        biggestWin: 0,
        highestMultiplier: 0,
        score: 0,
        rank: 0
      };

      targetGroup.participants.push(participant);
      tournament.totalParticipants++;

      // Update database
      await this.saveWeeklyParticipantToDatabase(tournamentId, participant, targetGroup.groupId);

      logger.info(`User ${username} joined weekly tournament ${tournament.name} in group ${targetGroup.groupId}`);
      return { participant, group: targetGroup };
    } catch (error) {
      logger.error('Error joining weekly tournament:', error);
      throw error;
    }
  }

  // Update player score for weekly tournament
  async updateWeeklyPlayerScore(userId, betId, amount, action, additionalData = {}) {
    try {
      // Get all active weekly tournaments
      const activeTournaments = Array.from(this.activeWeeklyTournaments.values())
        .filter(t => t.status === 'active');

      for (const tournament of activeTournaments) {
        const groups = this.weeklyGroups.get(tournament.id) || [];
        
        // Find the group containing this user
        for (const group of groups) {
          const participant = group.participants.find(p => p.userId === userId);
          
          if (participant) {
            // Update participant stats based on action
            switch (action) {
              case 'bet_placed':
                participant.totalBets++;
                participant.totalWagered += amount;
                participant.score += amount * 0.1; // Small score boost for placing bet
                group.totalBets++;
                group.totalWagered += amount;
                break;
                
              case 'cashout':
                const { multiplier, winnings } = additionalData;
                participant.totalWinnings += winnings;
                participant.biggestWin = Math.max(participant.biggestWin, winnings);
                participant.highestMultiplier = Math.max(participant.highestMultiplier, multiplier);
                participant.score += winnings * 0.5; // Higher score boost for winning
                group.totalWinnings += winnings;
                break;
                
              case 'bet_lost':
                participant.score += amount * 0.05; // Small score boost even for losing (participation)
                break;
            }
            
            // Update group score
            group.groupScore = group.participants.reduce((sum, p) => sum + p.score, 0);
            
            // Update participant in database
            await this.updateWeeklyParticipantInDatabase(tournament.id, participant, group.groupId);
            
            // Update tournament leaderboard
            await this.updateWeeklyLeaderboard(tournament.id);
            
            logger.info(`Updated weekly tournament score for user ${userId} in tournament ${tournament.id}: ${action}`);
            break; // Found the participant, no need to check other groups
          }
        }
      }
      
      return { success: true, tournamentsUpdated: activeTournaments.length };
    } catch (error) {
      logger.error(`Error updating weekly tournament score for user ${userId}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Start weekly tournament
  async startWeeklyTournament(tournamentId) {
    try {
      const tournament = this.activeWeeklyTournaments.get(tournamentId);
      if (!tournament) {
        throw new Error('Weekly tournament not found');
      }

      if (tournament.status !== 'registration') {
        throw new Error('Tournament cannot be started');
      }

      const groups = this.weeklyGroups.get(tournamentId) || [];
      if (groups.length === 0) {
        throw new Error('No participants to start tournament');
      }

      tournament.status = 'active';
      tournament.actualStartTime = new Date();

      // Calculate prize pool based on house edge (5% of total wagered)
      const totalWagered = groups.reduce((sum, group) => sum + group.totalWagered, 0);
      tournament.prizePool = totalWagered * 0.05; // 5% house edge

      // Update database
      await this.updateWeeklyTournamentInDatabase(tournament);

      logger.info(`Weekly tournament ${tournament.name} started with ${groups.length} groups`);
      return tournament;
    } catch (error) {
      logger.error('Error starting weekly tournament:', error);
      throw error;
    }
  }

  // End weekly tournament and calculate winners
  async endWeeklyTournament(tournamentId) {
    try {
      const tournament = this.activeWeeklyTournaments.get(tournamentId);
      if (!tournament) {
        throw new Error('Weekly tournament not found');
      }

      if (tournament.status !== 'active') {
        throw new Error('Tournament is not active');
      }

      tournament.status = 'completed';
      tournament.actualEndTime = new Date();

      const groups = this.weeklyGroups.get(tournamentId) || [];
      
      // Calculate winners for each group
      const groupWinners = [];
      for (const group of groups) {
        // Sort participants by score (highest first)
        group.participants.sort((a, b) => b.score - a.score);
        
        // Assign ranks
        group.participants.forEach((participant, index) => {
          participant.rank = index + 1;
        });

        // Get top 3 from each group
        const top3 = group.participants.slice(0, 3);
        groupWinners.push(...top3);
      }

      // Calculate overall winners (top 10 across all groups)
      const overallWinners = groupWinners
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      // Distribute prizes
      const prizeDistribution = [0.40, 0.25, 0.15, 0.10, 0.05, 0.02, 0.01, 0.01, 0.01, 0.01]; // Top 10 get prizes
      const winners = overallWinners.map((winner, index) => {
        const prizeAmount = tournament.prizePool * prizeDistribution[index];
        return {
          ...winner,
          prizeAmount: parseFloat(prizeAmount.toFixed(2)),
          overallRank: index + 1
        };
      });

      // Distribute prizes to winners
      await this.distributeWeeklyPrizes(tournamentId, winners);

      // Update database
      await this.updateWeeklyTournamentInDatabase(tournament);
      await this.saveWeeklyTournamentResults(tournamentId, winners);

      logger.info(`Weekly tournament ${tournament.name} ended. Winners: ${winners.length}`);
      return { tournament, winners, groupWinners };
    } catch (error) {
      logger.error('Error ending weekly tournament:', error);
      throw error;
    }
  }

  // Load tournaments from database
  async loadWeeklyTournamentsFromDatabase() {
    try {
      const result = await db.query(`
        SELECT 
          tournament_id,
          name,
          description,
          start_date,
          end_date,
          actual_start_time,
          actual_end_time,
          status,
          max_players,
          entry_fee,
          prize_pool,
          total_participants,
          created_at
        FROM weekly_tournaments 
        WHERE status IN ('registration', 'active')
        ORDER BY start_date ASC
      `);

      // Clear existing in-memory tournaments
      this.activeWeeklyTournaments.clear();

      // Load tournaments into memory
      for (const row of result.rows) {
        const tournament = {
          id: row.tournament_id,
          type: 'weekly',
          name: row.name,
          description: row.description,
          startDate: new Date(row.start_date),
          endDate: new Date(row.end_date),
          actualStartTime: row.actual_start_time ? new Date(row.actual_start_time) : null,
          actualEndTime: row.actual_end_time ? new Date(row.actual_end_time) : null,
          status: row.status,
          maxPlayers: row.max_players,
          entryFee: parseFloat(row.entry_fee) || 0,
          prizePool: parseFloat(row.prize_pool) || 0,
          totalParticipants: row.total_participants || 0,
          groups: [],
          createdAt: new Date(row.created_at)
        };

        this.activeWeeklyTournaments.set(tournament.id, tournament);
        this.weeklyGroups.set(tournament.id, []);
        this.weeklyScores.set(tournament.id, new Map());
        this.weeklyStats.set(tournament.id, new Map());
      }

      logger.info(`Loaded ${result.rows.length} weekly tournaments from database`);
      return result.rows.length;
    } catch (error) {
      logger.error('Error loading weekly tournaments from database:', error);
      throw error;
    }
  }

  // Get active weekly tournaments
  async getActiveWeeklyTournaments() {
    try {
      // Load from database first
      await this.loadWeeklyTournamentsFromDatabase();
      
      const active = [];
      for (const [id, tournament] of this.activeWeeklyTournaments) {
        if (tournament.status === 'registration' || tournament.status === 'active') {
          active.push(tournament);
        }
      }
      return active.sort((a, b) => a.startDate - b.startDate);
    } catch (error) {
      logger.error('Error getting active weekly tournaments:', error);
      throw error;
    }
  }

  // Get weekly tournament leaderboard
  getWeeklyLeaderboard(tournamentId) {
    const groups = this.weeklyGroups.get(tournamentId) || [];
    const allParticipants = [];
    
    groups.forEach(group => {
      group.participants.forEach(participant => {
        allParticipants.push({
          ...participant,
          groupId: group.groupId
        });
      });
    });

    return allParticipants.sort((a, b) => b.score - a.score);
  }

  // Update weekly leaderboard
  async updateWeeklyLeaderboard(tournamentId) {
    try {
      const groups = this.weeklyGroups.get(tournamentId) || [];
      
      // Sort participants within each group by score
      groups.forEach(group => {
        group.participants.sort((a, b) => b.score - a.score);
        group.participants.forEach((participant, index) => {
          participant.rank = index + 1;
        });
      });
      
      logger.info(`Updated leaderboard for weekly tournament ${tournamentId}`);
    } catch (error) {
      logger.error(`Error updating weekly leaderboard for ${tournamentId}:`, error);
    }
  }

  // Database helper methods
  async saveWeeklyTournamentToDatabase(tournament) {
    try {
      await db.query(`
        INSERT INTO weekly_tournaments (
          tournament_id, name, description, start_date, end_date,
          status, max_players, entry_fee, prize_pool, total_participants,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        tournament.id, tournament.name, tournament.description,
        tournament.startDate, tournament.endDate, tournament.status,
        tournament.maxPlayers, tournament.entryFee, tournament.prizePool,
        tournament.totalParticipants, tournament.createdAt
      ]);
    } catch (error) {
      logger.error('Error saving weekly tournament to database:', error);
      throw error;
    }
  }

  async saveWeeklyParticipantToDatabase(tournamentId, participant, groupId) {
    try {
      await db.query(`
        INSERT INTO weekly_tournament_participants (
          tournament_id, user_id, username, group_id, joined_at,
          total_bets, total_wagered, total_winnings, biggest_win,
          highest_multiplier, score, rank
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        tournamentId, String(participant.userId), participant.username, groupId,
        participant.joinedAt, participant.totalBets, participant.totalWagered,
        participant.totalWinnings, participant.biggestWin, participant.highestMultiplier,
        participant.score, participant.rank
      ]);
    } catch (error) {
      logger.error('Error saving weekly participant to database:', error);
      throw error;
    }
  }

  async updateWeeklyParticipantInDatabase(tournamentId, participant, groupId) {
    try {
      await db.query(`
        UPDATE weekly_tournament_participants SET 
          total_bets = $1, total_wagered = $2, total_winnings = $3,
          biggest_win = $4, highest_multiplier = $5, score = $6, rank = $7
        WHERE tournament_id::text = $8::text AND user_id::text = $9::text AND group_id::text = $10::text
      `, [
        participant.totalBets, participant.totalWagered, participant.totalWinnings,
        participant.biggestWin, participant.highestMultiplier, participant.score,
        participant.rank, String(tournamentId), String(participant.userId), String(groupId)
      ]);
    } catch (error) {
      logger.error('Error updating weekly participant in database:', error);
      throw error;
    }
  }

  async updateWeeklyTournamentInDatabase(tournament) {
    try {
      await db.query(`
        UPDATE weekly_tournaments SET 
          status = $1, prize_pool = $2, total_participants = $3,
          actual_start_time = $4, actual_end_time = $5
        WHERE tournament_id = $6
      `, [
        tournament.status, tournament.prizePool, tournament.totalParticipants,
        tournament.actualStartTime, tournament.actualEndTime, tournament.id
      ]);
    } catch (error) {
      logger.error('Error updating weekly tournament in database:', error);
      throw error;
    }
  }

  async distributeWeeklyPrizes(tournamentId, winners) {
    for (const winner of winners) {
      try {
        // Add prize to user balance
        await db.query('UPDATE users SET balance = balance + $1 WHERE id = $2', 
          [winner.prizeAmount, winner.userId]);

        // Record prize distribution
        await db.query(`
          INSERT INTO weekly_tournament_prizes (
            tournament_id, user_id, overall_rank, prize_amount, distributed_at
          ) VALUES ($1, $2, $3, $4, NOW())
        `, [tournamentId, winner.userId, winner.overallRank, winner.prizeAmount]);

        logger.info(`Weekly prize distributed: ${winner.username} - ${winner.prizeAmount} FCFA`);
      } catch (error) {
        logger.error(`Error distributing weekly prize to ${winner.username}:`, error);
      }
    }
  }

  async saveWeeklyTournamentResults(tournamentId, winners) {
    try {
      for (const winner of winners) {
        await db.query(`
          INSERT INTO weekly_tournament_results (
            tournament_id, user_id, overall_rank, score, total_bets,
            total_wagered, total_winnings, biggest_win, highest_multiplier,
            prize_amount, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        `, [
          tournamentId, winner.userId, winner.overallRank, winner.score,
          winner.totalBets, winner.totalWagered, winner.totalWinnings,
          winner.biggestWin, winner.highestMultiplier, winner.prizeAmount
        ]);
      }
    } catch (error) {
      logger.error('Error saving weekly tournament results:', error);
      throw error;
    }
  }

  // Get weekly tournament statistics
  async getWeeklyTournamentStats() {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_tournaments,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tournaments,
          SUM(prize_pool) as total_prizes_distributed,
          AVG(total_participants) as average_participants
        FROM weekly_tournaments
      `);

      const stats = result.rows[0];
      
      return {
        totalTournaments: parseInt(stats.total_tournaments || 0),
        completedTournaments: parseInt(stats.completed_tournaments || 0),
        totalPrizesDistributed: parseFloat(stats.total_prizes_distributed || 0),
        averageParticipants: parseFloat(stats.average_participants || 0)
      };
    } catch (error) {
      logger.error('Error getting weekly tournament stats:', error);
      throw error;
    }
  }

  // Clear cache
  async getGlobalLeaderboard() {
    try {
      // Get aggregated player performance across all tournaments
      const leaderboard = await db.query(`
        SELECT 
          u.username,
          COALESCE(SUM(wtp.total_bets), 0) as total_bets,
          COALESCE(SUM(wtp.total_wagered), 0) as total_wagered,
          COALESCE(SUM(wtp.total_winnings), 0) as total_winnings,
          COALESCE(MAX(wtp.biggest_win), 0) as biggest_win,
          COALESCE(MAX(wtp.highest_multiplier), 0) as highest_multiplier,
          COALESCE(SUM(wtp.score), 0) as total_score
        FROM users u
        LEFT JOIN weekly_tournament_participants wtp ON u.id = wtp.user_id
        LEFT JOIN weekly_tournaments wt ON wtp.tournament_id = wt.tournament_id
        WHERE wt.status = 'completed' OR wt.status IS NULL
        GROUP BY u.id, u.username
        HAVING COALESCE(SUM(wtp.total_bets), 0) > 0
        ORDER BY total_score DESC, total_winnings DESC, total_bets DESC
        LIMIT 50
      `);

      // Add rank to each entry
      const rankedLeaderboard = leaderboard.rows.map((entry, index) => ({
        rank: index + 1,
        username: entry.username,
        score: parseFloat(entry.total_score) || 0,
        totalBets: parseInt(entry.total_bets) || 0,
        totalWagered: parseFloat(entry.total_wagered) || 0,
        totalWon: parseFloat(entry.total_winnings) || 0,
        biggestWin: parseFloat(entry.biggest_win) || 0,
        highestMultiplier: parseFloat(entry.highest_multiplier) || 0
      }));

      return rankedLeaderboard;
    } catch (error) {
      logger.error('Error getting global leaderboard:', error);
      throw error;
    }
  }

  clearCache() {
    this.activeWeeklyTournaments.clear();
    this.weeklyGroups.clear();
    this.weeklyScores.clear();
    this.weeklyStats.clear();
    logger.info('Weekly tournament cache cleared');
  }
}

module.exports = new WeeklyTournamentService();
