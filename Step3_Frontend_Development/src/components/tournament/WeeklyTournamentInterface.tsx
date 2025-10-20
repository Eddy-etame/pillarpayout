import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Users, 
  Clock, 
  Target, 
  TrendingUp, 
  Award,
  Calendar,
  UserCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import api from '../../utils/api';

interface WeeklyTournament {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'registration' | 'active' | 'completed' | 'cancelled';
  maxPlayers: number;
  entryFee: number;
  prizePool: number;
  totalParticipants: number;
  participant?: {
    userId: number;
    username: string;
    joinedAt: string;
    totalBets: number;
    totalWagered: number;
    totalWinnings: number;
    biggestWin: number;
    highestMultiplier: number;
    score: number;
    rank: number;
  };
  group?: {
    groupId: string;
    participants: any[];
    totalBets: number;
    totalWagered: number;
    totalWinnings: number;
    groupScore: number;
  };
  leaderboard?: Array<{
    userId: number;
    username: string;
    score: number;
    totalBets: number;
    totalWagered: number;
    totalWinnings: number;
    biggestWin: number;
    highestMultiplier: number;
    rank: number;
    groupId: string;
  }>;
}

interface WeeklyTournamentStats {
  totalTournaments: number;
  completedTournaments: number;
  totalPrizesDistributed: number;
  averageParticipants: number;
}

const WeeklyTournamentInterface: React.FC = () => {
  const { user, token } = useAuthStore();
  const [activeTab, setActiveTab] = useState('active');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  
  // Tournament data
  const [activeTournaments, setActiveTournaments] = useState<WeeklyTournament[]>([]);
  const [userTournaments, setUserTournaments] = useState<WeeklyTournament[]>([]);
  const [stats, setStats] = useState<WeeklyTournamentStats | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<WeeklyTournament | null>(null);

  const fetchActiveTournaments = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/v1/weekly-tournaments');
      setActiveTournaments(response.data.data || []);
    } catch (error) {
      console.error('Error fetching active tournaments:', error);
      setMessage({ type: 'error', text: 'Failed to fetch tournaments' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchUserTournaments = useCallback(async () => {
    if (!token) return;
    
    try {
      setIsLoading(true);
      const response = await api.get('/v1/weekly-tournaments/user', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserTournaments(response.data.data || []);
    } catch (error) {
      console.error('Error fetching user tournaments:', error);
      setMessage({ type: 'error', text: 'Failed to fetch your tournaments' });
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/v1/weekly-tournaments/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching tournament stats:', error);
    }
  }, []);

  const joinTournament = async (tournamentId: string) => {
    if (!token) {
      setMessage({ type: 'error', text: 'Please login to join tournaments' });
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.post('/v1/weekly-tournaments/join', 
        { tournamentId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessage({ type: 'success', text: 'Successfully joined tournament!' });
      fetchActiveTournaments();
      fetchUserTournaments();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to join tournament';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTournamentDetails = async (tournamentId: string) => {
    try {
      const response = await api.get(`/v1/weekly-tournaments/${tournamentId}`);
      setSelectedTournament(response.data.data);
    } catch (error) {
      console.error('Error fetching tournament details:', error);
      setMessage({ type: 'error', text: 'Failed to fetch tournament details' });
    }
  };

  useEffect(() => {
    fetchActiveTournaments();
    fetchUserTournaments();
    fetchStats();
  }, [fetchActiveTournaments, fetchUserTournaments, fetchStats]);

  const clearMessage = () => setMessage(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registration': return 'text-yellow-400';
      case 'active': return 'text-green-400';
      case 'completed': return 'text-blue-400';
      case 'cancelled': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'registration': return <Clock className="w-4 h-4" />;
      case 'active': return <Target className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
            Weekly Tournaments
          </h1>
          <div className="absolute -top-2 -left-2 w-full h-full bg-gradient-to-r from-blue-400/20 to-purple-400/20 blur-xl -z-10"></div>
        </motion.div>
        <p className="text-gray-300 text-lg">Compete for the most bets and highest winnings this week!</p>
        <div className="mt-4 flex justify-center">
          <div className="flex items-center space-x-2 bg-gray-800/50 px-4 py-2 rounded-full border border-gray-700">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="text-sm text-gray-300">Free Entry • Weekly Prizes • Group Competition</span>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg mb-6 flex items-center justify-between ${
            message.type === 'success' ? 'bg-green-600' : 
            message.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
          }`}
        >
          <div className="flex items-center">
            {message.type === 'success' && <CheckCircle className="w-5 h-5 mr-2" />}
            {message.type === 'error' && <XCircle className="w-5 h-5 mr-2" />}
            {message.type === 'info' && <AlertCircle className="w-5 h-5 mr-2" />}
            {message.text}
          </div>
          <button onClick={clearMessage} className="ml-4 hover:opacity-80">
            <XCircle className="w-5 h-5" />
          </button>
        </motion.div>
      )}

      {/* Stats Overview */}
      {stats && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <motion.div 
            whileHover={{ scale: 1.05, y: -5 }}
            className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl border border-gray-700 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-400/10 rounded-full -translate-y-10 translate-x-10"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <Trophy className="w-8 h-8 text-blue-400" />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              </div>
              <p className="text-gray-400 text-sm mb-2">Total Tournaments</p>
              <p className="text-3xl font-bold text-blue-400">{stats.totalTournaments}</p>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.05, y: -5 }}
            className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl border border-gray-700 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-green-400/10 rounded-full -translate-y-10 translate-x-10"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <p className="text-gray-400 text-sm mb-2">Completed</p>
              <p className="text-3xl font-bold text-green-400">{stats.completedTournaments}</p>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.05, y: -5 }}
            className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl border border-gray-700 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-400/10 rounded-full -translate-y-10 translate-x-10"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <Award className="w-8 h-8 text-yellow-400" />
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              </div>
              <p className="text-gray-400 text-sm mb-2">Prizes Distributed</p>
              <p className="text-3xl font-bold text-yellow-400">{stats.totalPrizesDistributed.toLocaleString()}</p>
              <p className="text-xs text-gray-500">FCFA</p>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.05, y: -5 }}
            className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl border border-gray-700 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-400/10 rounded-full -translate-y-10 translate-x-10"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <Users className="w-8 h-8 text-purple-400" />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              </div>
              <p className="text-gray-400 text-sm mb-2">Avg Participants</p>
              <p className="text-3xl font-bold text-purple-400">{Math.round(stats.averageParticipants)}</p>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Navigation Tabs */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex space-x-2 mb-8 border-b border-gray-700/50"
      >
        {[
          { id: 'active', label: 'Active Tournaments', icon: Target },
          { id: 'my-tournaments', label: 'My Tournaments', icon: UserCheck },
          { id: 'leaderboard', label: 'Leaderboard', icon: TrendingUp }
        ].map(({ id, label, icon: Icon }) => (
          <motion.button
            key={id}
            onClick={() => setActiveTab(id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center space-x-2 px-6 py-3 rounded-t-xl transition-all duration-200 relative ${
              activeTab === id
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="font-semibold">{label}</span>
            {activeTab === id && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        ))}
      </motion.div>

      {/* Content Area */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50 shadow-2xl"
      >
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
            <span className="ml-2">Loading tournaments...</span>
          </div>
        )}

        {/* Active Tournaments Tab */}
        {activeTab === 'active' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-blue-400 mb-4">Active Weekly Tournaments</h2>
            
            {activeTournaments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeTournaments.map((tournament, index) => (
                  <motion.div
                    key={tournament.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl border border-gray-700 shadow-2xl relative overflow-hidden group"
                  >
                    {/* Background Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                          {tournament.name}
                        </h3>
                        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold border ${
                          tournament.status === 'active' ? 'bg-green-900/50 text-green-300 border-green-700' :
                          tournament.status === 'registration' ? 'bg-blue-900/50 text-blue-300 border-blue-700' :
                          'bg-gray-900/50 text-gray-300 border-gray-700'
                        }`}>
                          {getStatusIcon(tournament.status)}
                          <span>{tournament.status.toUpperCase()}</span>
                        </div>
                      </div>

                      <p className="text-gray-400 text-sm mb-6 leading-relaxed">{tournament.description}</p>

                      <div className="space-y-4 mb-6">
                        <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                          <span className="text-gray-400 flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            Start Date:
                          </span>
                          <span className="text-white font-medium">{formatDate(tournament.startDate)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                          <span className="text-gray-400 flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            End Date:
                          </span>
                          <span className="text-white font-medium">{formatDate(tournament.endDate)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                          <span className="text-gray-400 flex items-center">
                            <Users className="w-4 h-4 mr-2" />
                            Participants:
                          </span>
                          <span className="text-white font-medium">{tournament.totalParticipants}/{tournament.maxPlayers}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-gray-400 flex items-center">
                            <Trophy className="w-4 h-4 mr-2" />
                            Prize Pool:
                          </span>
                          <span className="text-yellow-400 font-bold text-lg">{tournament.prizePool.toLocaleString()} FCFA</span>
                        </div>
                      </div>

                      <div className="flex space-x-3">
                        <button
                          onClick={() => joinTournament(tournament.id)}
                          disabled={isLoading || tournament.status !== 'registration'}
                          className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 shadow-lg"
                        >
                          {tournament.status === 'registration' ? 'Join Tournament' : 'View Details'}
                        </button>
                        <button
                          onClick={() => fetchTournamentDetails(tournament.id)}
                          className="bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
                        >
                          <Trophy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-400">No active tournaments available</p>
                <p className="text-sm text-gray-500">Check back later for new tournaments</p>
              </div>
            )}
          </motion.div>
        )}

        {/* My Tournaments Tab */}
        {activeTab === 'my-tournaments' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-blue-400 mb-4">My Weekly Tournaments</h2>
            
            {userTournaments.length > 0 ? (
              <div className="space-y-4">
                {userTournaments.map((tournament) => (
                  <div key={tournament.id} className="bg-gray-700 p-6 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">{tournament.name}</h3>
                      <div className={`flex items-center space-x-1 ${getStatusColor(tournament.status)}`}>
                        {getStatusIcon(tournament.status)}
                        <span className="text-sm font-medium">{tournament.status.toUpperCase()}</span>
                      </div>
                    </div>

                    {tournament.participant && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <p className="text-gray-400 text-sm">My Rank</p>
                          <p className="text-xl font-bold text-blue-400">#{tournament.participant.rank}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400 text-sm">My Score</p>
                          <p className="text-xl font-bold text-green-400">{tournament.participant.score.toFixed(2)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400 text-sm">Total Bets</p>
                          <p className="text-xl font-bold text-yellow-400">{tournament.participant.totalBets}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400 text-sm">Winnings</p>
                          <p className="text-xl font-bold text-purple-400">{tournament.participant.totalWinnings.toLocaleString()} FCFA</p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between text-sm text-gray-400">
                      <span>Group: {tournament.group?.groupId}</span>
                      <span>Ends: {formatDate(tournament.endDate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <UserCheck className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-400">You haven't joined any tournaments yet</p>
                <p className="text-sm text-gray-500">Join an active tournament to start competing!</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && selectedTournament && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-blue-400 mb-4">
              Leaderboard - {selectedTournament.name}
            </h2>
            
            {selectedTournament.leaderboard && selectedTournament.leaderboard.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="text-left py-2 px-4">Rank</th>
                      <th className="text-left py-2 px-4">Player</th>
                      <th className="text-left py-2 px-4">Score</th>
                      <th className="text-left py-2 px-4">Bets</th>
                      <th className="text-left py-2 px-4">Wagered</th>
                      <th className="text-left py-2 px-4">Winnings</th>
                      <th className="text-left py-2 px-4">Group</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTournament.leaderboard.map((player, index) => (
                      <tr key={player.userId} className="border-b border-gray-600">
                        <td className="py-2 px-4">
                          <div className="flex items-center">
                            {index < 3 && <Trophy className="w-4 h-4 mr-2 text-yellow-400" />}
                            <span className="font-semibold">#{player.rank}</span>
                          </div>
                        </td>
                        <td className="py-2 px-4 font-medium">{player.username}</td>
                        <td className="py-2 px-4 text-green-400 font-semibold">{player.score.toFixed(2)}</td>
                        <td className="py-2 px-4">{player.totalBets}</td>
                        <td className="py-2 px-4">{player.totalWagered.toLocaleString()} FCFA</td>
                        <td className="py-2 px-4 text-yellow-400">{player.totalWinnings.toLocaleString()} FCFA</td>
                        <td className="py-2 px-4 text-gray-400">{player.groupId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-400">No leaderboard data available</p>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default WeeklyTournamentInterface;

