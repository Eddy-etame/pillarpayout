import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Target, 
  Users, 
  TrendingUp, 
  Award, 
  Clock, 
  Calendar,
  Crown,
  Medal,
  Activity,
  XCircle
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import api from '../../utils/api';

interface TournamentStats {
  totalTournaments: number;
  completedTournaments: number;
  totalPrizesDistributed: number;
  averageParticipants: number;
}

interface WeeklyTournament {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'registration' | 'active' | 'completed' | 'cancelled';
  totalParticipants: number;
  maxPlayers: number;
  prizePool: number;
  groupId?: string;
}

interface UserTournament {
  id: string;
  tournamentId: string;
  tournamentName: string;
  groupId: string;
  rank: number;
  score: number;
  totalBets: number;
  totalWagered: number;
  totalWon: number;
  biggestWin: number;
  highestMultiplier: number;
  status: 'active' | 'completed';
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  totalBets: number;
  totalWagered: number;
  totalWon: number;
  biggestWin: number;
  highestMultiplier: number;
  isCurrentUser?: boolean;
}

const TournamentPage: React.FC = () => {
  const { user, token, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'my-tournaments' | 'leaderboard'>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  // Data states
  const [stats, setStats] = useState<TournamentStats | null>(null);
  const [activeTournaments, setActiveTournaments] = useState<WeeklyTournament[]>([]);
  const [userTournaments, setUserTournaments] = useState<UserTournament[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userPosition, setUserPosition] = useState<number | null>(null);
  const [joinedTournamentIds, setJoinedTournamentIds] = useState<Set<string>>(new Set());

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/v1/weekly-tournaments/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching tournament stats:', error);
    }
  }, []);

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
    if (!token) {
      console.warn('No token available for fetching user tournaments');
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('Fetching user tournaments with token:', token.substring(0, 20) + '...');
      
      const response = await api.get('/v1/weekly-tournaments/user');
      const tournaments = response.data.data || [];
      setUserTournaments(tournaments);
      
      // Update joined tournament IDs
      const joinedIds = new Set<string>(tournaments.map((t: any) => String(t.tournamentId || t.id)));
      setJoinedTournamentIds(joinedIds);
      
      console.log('Successfully fetched user tournaments:', tournaments.length);
    } catch (error: any) {
      console.error('Error fetching user tournaments:', error);
      console.error('Error response:', error.response?.data);
      
      if (error.response?.status === 401) {
        console.warn('Authentication failed - token may be expired');
        setMessage({ type: 'error', text: 'Your session has expired. Please log in again.' });
      } else {
        setMessage({ type: 'error', text: 'Failed to fetch your tournaments' });
      }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/v1/weekly-tournaments/global-leaderboard');
      const leaderboardData = response.data.data || [];
      
      // Mark current user in the leaderboard
      const leaderboardWithUser = leaderboardData.map((entry: any) => ({
        ...entry,
        isCurrentUser: entry.username === user?.username
      }));
      
      setLeaderboard(leaderboardWithUser);
      
      // Find user position
      const userIndex = leaderboardWithUser.findIndex((entry: any) => entry.isCurrentUser);
      setUserPosition(userIndex >= 0 ? userIndex + 1 : null);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setMessage({ type: 'error', text: 'Failed to fetch leaderboard' });
      
      // Fallback to mock data if API fails
      const mockLeaderboard: LeaderboardEntry[] = [
        { rank: 1, username: 'CryptoKing', score: 1250.50, totalBets: 45, totalWagered: 50000, totalWon: 125050, biggestWin: 25000, highestMultiplier: 5.2, isCurrentUser: false },
        { rank: 2, username: 'LuckyGamer', score: 1180.25, totalBets: 38, totalWagered: 42000, totalWon: 89025, biggestWin: 18000, highestMultiplier: 4.8, isCurrentUser: false },
        { rank: 3, username: 'BetMaster', score: 1050.75, totalBets: 42, totalWagered: 38000, totalWon: 67580, biggestWin: 15000, highestMultiplier: 4.5, isCurrentUser: false },
        { rank: 4, username: 'FortuneSeeker', score: 980.30, totalBets: 35, totalWagered: 35000, totalWon: 54320, biggestWin: 12000, highestMultiplier: 4.2, isCurrentUser: false },
        { rank: 5, username: 'RiskTaker', score: 920.15, totalBets: 40, totalWagered: 32000, totalWon: 43210, biggestWin: 10000, highestMultiplier: 4.0, isCurrentUser: false },
        { rank: 6, username: 'HighRoller', score: 875.60, totalBets: 33, totalWagered: 30000, totalWon: 38500, biggestWin: 9000, highestMultiplier: 3.8, isCurrentUser: false },
        { rank: 7, username: 'LuckyStrike', score: 820.40, totalBets: 36, totalWagered: 28000, totalWon: 34200, biggestWin: 8000, highestMultiplier: 3.6, isCurrentUser: false },
        { rank: 8, username: 'BetPro', score: 780.25, totalBets: 31, totalWagered: 26000, totalWon: 30100, biggestWin: 7500, highestMultiplier: 3.4, isCurrentUser: false },
        { rank: 9, username: 'WinMaster', score: 740.80, totalBets: 29, totalWagered: 24000, totalWon: 26800, biggestWin: 7000, highestMultiplier: 3.2, isCurrentUser: false },
        { rank: 10, username: user?.username || 'You', score: 680.50, totalBets: 25, totalWagered: 20000, totalWon: 22500, biggestWin: 6000, highestMultiplier: 3.0, isCurrentUser: true },
      ];
      
      setLeaderboard(mockLeaderboard);
      setUserPosition(10);
    } finally {
      setIsLoading(false);
    }
  }, [user?.username]);

  const joinTournament = async (tournamentId: string) => {
    if (!token) {
      setMessage({ type: 'error', text: 'Please login to join tournaments' });
      return;
    }

    try {
      setIsLoading(true);
      await api.post('/v1/weekly-tournaments/join', 
        { tournamentId }
      );
      
      setMessage({ type: 'success', text: 'Successfully joined tournament!' });
      fetchActiveTournaments();
      fetchUserTournaments();
    } catch (error: any) {
      console.error('Error joining tournament:', error);
      console.error('Error response:', error.response?.data);
      
      // Handle duplicate join returned as either 400 or 500 with duplicate detail
      const details: string = (error.response?.data?.details || error.response?.data?.error || '').toString().toLowerCase();
      if (details.includes('duplicate key') || details.includes('already joined')) {
        setMessage({ type: 'success', text: 'You have already joined this tournament' });
        // Optimistically mark as joined
        setJoinedTournamentIds((prev) => new Set<string>([...Array.from(prev), String(tournamentId)]));
        // Refresh lists
        fetchUserTournaments();
        fetchActiveTournaments();
        return;
      }
      
      let errorMsg = 'Failed to join tournament';
      if (error.response?.data?.error) {
        if (error.response.data.error.includes('already joined')) {
          errorMsg = 'You have already joined this tournament';
        } else if (error.response.data.error.includes('closed')) {
          errorMsg = 'Tournament registration is closed';
        } else if (error.response.data.error.includes('full')) {
          errorMsg = 'Tournament is full';
        } else if (error.response.data.code === 'TOKEN_EXPIRED') {
          errorMsg = 'Your session has expired. Please log in again.';
          return;
        } else {
          errorMsg = error.response.data.error;
        }
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      }
      
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('TournamentPage useEffect - isAuthenticated:', isAuthenticated, 'token:', token ? 'present' : 'missing');
    
    fetchStats();
    fetchActiveTournaments();
    if (isAuthenticated && token) {
      fetchUserTournaments();
    } else {
      console.warn('User not authenticated or no token available');
    }
    fetchLeaderboard();
  }, [fetchStats, fetchActiveTournaments, fetchUserTournaments, fetchLeaderboard, token, isAuthenticated]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'registration': return <Target className="w-4 h-4" />;
      case 'active': return <Activity className="w-4 h-4" />;
      case 'completed': return <Trophy className="w-4 h-4" />;
      case 'cancelled': return <Clock className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-5 h-5 text-yellow-400" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Award className="w-5 h-5 text-amber-600" />;
      default: return <span className="w-5 h-5 flex items-center justify-center text-gray-400 font-bold">{rank}</span>;
    }
  };

  // Show authentication message if user is not logged in
  if (!isAuthenticated || !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Please Log In</h1>
          <p className="text-gray-400 mb-6">You need to be logged in to view tournaments.</p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

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
            Tournament Center
          </h1>
          <div className="absolute -top-2 -left-2 w-full h-full bg-gradient-to-r from-blue-400/20 to-purple-400/20 blur-xl -z-10"></div>
        </motion.div>
        <p className="text-gray-300 text-lg">Compete, climb the leaderboard, and win big prizes!</p>
        <div className="mt-4 flex justify-center">
          <div className="flex items-center space-x-2 bg-gray-800/50 px-4 py-2 rounded-full border border-gray-700">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="text-sm text-gray-300">Free Entry • Weekly Prizes • Real-time Competition</span>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 p-4 rounded-lg flex items-center justify-between ${
            message.type === 'success' ? 'bg-green-900/50 border border-green-700' :
            message.type === 'error' ? 'bg-red-900/50 border border-red-700' :
            'bg-blue-900/50 border border-blue-700'
          }`}
        >
          <span className={`${
            message.type === 'success' ? 'text-green-300' :
            message.type === 'error' ? 'text-red-300' :
            'text-blue-300'
          }`}>
            {message.text}
          </span>
          <button
            onClick={() => setMessage(null)}
            className="ml-4 text-gray-400 hover:text-white"
          >
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
                <Activity className="w-8 h-8 text-green-400" />
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
              <p className="text-3xl font-bold text-yellow-400">{(stats.totalPrizesDistributed || 0).toLocaleString()}</p>
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
          { id: 'overview', label: 'Overview', icon: Target },
          { id: 'my-tournaments', label: 'My Tournaments', icon: Users },
          { id: 'leaderboard', label: 'Leaderboard', icon: TrendingUp }
        ].map(({ id, label, icon: Icon }) => (
          <motion.button
            key={id}
            onClick={() => setActiveTab(id as any)}
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
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-blue-400 mb-6">Active Tournaments</h2>
            
            {isLoading ? (
              <div className="text-center py-12">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="inline-block w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full"
                ></motion.div>
                <p className="mt-4 text-gray-400">Loading tournaments...</p>
              </div>
            ) : activeTournaments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeTournaments.map((tournament, index) => (
                  <motion.div
                    key={tournament.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 shadow-2xl relative overflow-hidden group"
                  >
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
                          <span className="text-yellow-400 font-bold text-lg">{(tournament.prizePool || 0).toLocaleString()} FCFA</span>
                        </div>
                      </div>

                      <div className="flex space-x-3">
                        <button
                          onClick={() => joinTournament(tournament.id)}
                          disabled={isLoading || tournament.status !== 'registration' || joinedTournamentIds.has(tournament.id)}
                          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 shadow-lg ${
                            joinedTournamentIds.has(tournament.id)
                              ? 'bg-gradient-to-r from-green-600 to-green-700 cursor-default'
                              : tournament.status === 'registration'
                              ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed'
                              : 'bg-gradient-to-r from-gray-600 to-gray-700 cursor-not-allowed'
                          } text-white`}
                        >
                          {joinedTournamentIds.has(tournament.id)
                            ? 'Already Joined'
                            : tournament.status === 'registration'
                            ? 'Join Tournament'
                            : 'View Details'}
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
            <h2 className="text-2xl font-bold text-blue-400 mb-6">My Tournament History</h2>
            
            {userTournaments.length > 0 ? (
              <div className="space-y-4">
                {userTournaments.map((tournament, index) => (
                  <motion.div
                    key={tournament.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gradient-to-r from-gray-800 to-gray-900 p-6 rounded-xl border border-gray-700 shadow-lg"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">{tournament.tournamentName}</h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-400">Group {tournament.groupId}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          tournament.status === 'active' ? 'bg-green-900/50 text-green-300' : 'bg-yellow-900/50 text-yellow-300'
                        }`}>
                          {tournament.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-gray-400 text-sm">Rank</p>
                        <p className="text-2xl font-bold text-blue-400">#{tournament.rank}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-400 text-sm">Score</p>
                        <p className="text-2xl font-bold text-green-400">{(tournament.score || 0).toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-400 text-sm">Total Bets</p>
                        <p className="text-2xl font-bold text-purple-400">{tournament.totalBets || 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-400 text-sm">Winnings</p>
                        <p className="text-2xl font-bold text-yellow-400">{(tournament.totalWon || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-400">You haven't joined any tournaments yet</p>
                <p className="text-sm text-gray-500">Join a tournament to start competing!</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-blue-400">Global Leaderboard</h2>
              {userPosition && (
                <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-4 py-2 rounded-lg border border-blue-500/30">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span className="text-white font-semibold">Your Position: #{userPosition}</span>
                </div>
              )}
            </div>
            
            {leaderboard.length > 0 ? (
              <div className="space-y-3">
                {leaderboard.map((entry, index) => (
                  <motion.div
                    key={entry.username}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-xl border transition-all duration-200 ${
                      entry.isCurrentUser 
                        ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/50 shadow-lg' 
                        : 'bg-gradient-to-r from-gray-800/50 to-gray-900/50 border-gray-700/50 hover:border-gray-600/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-8 h-8">
                          {getRankIcon(entry.rank)}
                        </div>
                        <div>
                          <h3 className={`font-semibold ${entry.isCurrentUser ? 'text-blue-400' : 'text-white'}`}>
                            {entry.username}
                            {entry.isCurrentUser && <span className="ml-2 text-xs bg-blue-600 px-2 py-1 rounded-full">YOU</span>}
                          </h3>
                          <p className="text-sm text-gray-400">Score: {(entry.score || 0).toFixed(2)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6 text-sm">
                        <div className="text-center">
                          <p className="text-gray-400">Bets</p>
                          <p className="font-semibold text-white">{entry.totalBets}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400">Wagered</p>
                          <p className="font-semibold text-white">{(entry.totalWagered || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400">Winnings</p>
                          <p className="font-semibold text-green-400">{(entry.totalWon || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400">Best Win</p>
                          <p className="font-semibold text-yellow-400">{(entry.biggestWin || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-400">No leaderboard data available</p>
                <p className="text-sm text-gray-500">Check back after tournaments complete</p>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default TournamentPage;
