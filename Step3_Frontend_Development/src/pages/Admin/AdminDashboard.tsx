import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Users, 
  DollarSign, 
  Shield, 
  Gamepad2, 
  TrendingUp, 
  AlertTriangle,
  Activity,
  Eye,
  EyeOff,
  Play,
  Pause,
  StopCircle,
  UserCheck,
  Ban,
  Unlock,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';

interface ProfitabilityMetrics {
  totalRevenue: number;
  totalPayouts: number;
  netProfit: number;
  profitMargin: number;
  averageBetAmount: number;
  totalBets: number;
  crashRate: number;
  houseEdge: number;
  monthlyProjection: number;
  hourlyRevenue: number;
  dailyRevenue: number;
  weeklyRevenue: number;
}

interface GameControl {
  isPaused: boolean;
  currentRound: number;
  gameState: string;
  crashPoint: number;
  multiplier: number;
  activePlayers: number;
  totalBets: number;
  roundTime: number;
  houseAdvantage: number;
}

interface SecurityMetrics {
  failedLoginAttempts: number;
  suspiciousActivities: number;
  blockedIPs: number;
  lastSecurityScan: string;
  activeThreats: number;
  securityLevel: string;
}

interface UserManagement {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  topPlayers: Array<{
    id: number;
    username: string;
    balance: number;
    totalBets: number;
    totalWinnings: number;
    lastActive: string;
  }>;
}

const AdminDashboard: React.FC = () => {
  const { user, isAdmin, hydrated, logout } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  
  // Real admin data state
  const [profitabilityMetrics, setProfitabilityMetrics] = useState<ProfitabilityMetrics | null>(null);
  const [gameControl, setGameControl] = useState<GameControl | null>(null);
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null);
  const [userManagement, setUserManagement] = useState<UserManagement | null>(null);

  const fetchAdminData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const token = useAuthStore.getState().token;
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found' });
        return;
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Use axios client with baseURL and auth header
      const overviewResponse = await api.get('/v1/admin/dashboard/overview', { headers });
      const overviewData = overviewResponse.data;
      console.log('Dashboard overview data:', overviewData);
      
      // Set all the data from the overview response
      if (overviewData?.profitability) {
        setProfitabilityMetrics(overviewData.profitability);
      }
      if (overviewData?.gameStatus) {
        setGameControl(overviewData.gameStatus);
      }
      if (overviewData?.security) {
        setSecurityMetrics(overviewData.security);
      }
      if (overviewData?.users) {
        setUserManagement(overviewData.users);
      }
      
      setMessage({ type: 'success', text: 'Admin data loaded successfully' });
      
    } catch (error) {
      const status = (error as any)?.response?.status;
      const data = (error as any)?.response?.data;
      if (status === 401) {
        console.error('Dashboard overview API error: 401 Unauthorized', data);
        setMessage({ type: 'error', text: 'Session expired. Redirecting to login...' });
        // Clear auth state and redirect
        try { localStorage.removeItem('authToken'); } catch {}
        logout();
        navigate('/auth');
      } else {
        console.error('Error fetching admin data:', error);
        setMessage({ type: 'error', text: 'Failed to fetch admin data' });
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout, navigate]);

  useEffect(() => {
    if (!hydrated) return;
    if (!user || !isAdmin) {
      navigate('/auth');
      return;
    }
    
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [user, isAdmin, hydrated, navigate, fetchAdminData]);

  // REAL ADMIN FUNCTIONS
  const pauseGame = async () => {
    try {
      const token = useAuthStore.getState().token;
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found' });
        return;
      }
      
      const response = await fetch('/api/v1/admin/game/pause', { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Game paused successfully' });
        fetchAdminData();
      } else {
        setMessage({ type: 'error', text: 'Failed to pause game' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error pausing game' });
    }
  };

  const resumeGame = async () => {
    try {
      const token = useAuthStore.getState().token;
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found' });
        return;
      }
      
      const response = await fetch('/api/v1/admin/game/resume', { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Game resumed successfully' });
        fetchAdminData();
      } else {
        setMessage({ type: 'error', text: 'Failed to resume game' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error resuming game' });
    }
  };

  const emergencyStop = async () => {
    if (window.confirm('Are you sure you want to emergency stop the game? This will crash the current round immediately.')) {
      try {
        const token = useAuthStore.getState().token;
        if (!token) {
          setMessage({ type: 'error', text: 'No authentication token found' });
          return;
        }
        
        const response = await fetch('/api/v1/admin/game/emergency-stop', { 
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          setMessage({ type: 'success', text: 'Game emergency stopped' });
          fetchAdminData();
        } else {
          setMessage({ type: 'error', text: 'Failed to emergency stop game' });
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Error emergency stopping game' });
      }
    }
  };

  const setCrashPoint = async (crashPoint: number) => {
    try {
      const token = useAuthStore.getState().token;
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found' });
        return;
      }
      
      const response = await fetch('/api/v1/admin/game/set-crash-point', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ crashPoint })
      });
      if (response.ok) {
        setMessage({ type: 'success', text: `Crash point set to ${crashPoint}x` });
        fetchAdminData();
      } else {
        setMessage({ type: 'error', text: 'Failed to set crash point' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error setting crash point' });
    }
  };

  const blockUser = async (userId: number, reason: string) => {
    try {
      const token = useAuthStore.getState().token;
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found' });
        return;
      }
      
      const response = await fetch('/api/v1/admin/users/block', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, reason })
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'User blocked successfully' });
        fetchAdminData();
      } else {
        setMessage({ type: 'error', text: 'Failed to block user' });
      }
    } catch (error) {
        setMessage({ type: 'error', text: 'Error blocking user' });
      }
    };

  const unblockUser = async (userId: number) => {
    try {
      const token = useAuthStore.getState().token;
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found' });
        return;
      }
      
      const response = await fetch('/api/v1/admin/users/unblock', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'User unblocked successfully' });
        fetchAdminData();
      } else {
        setMessage({ type: 'error', text: 'Failed to unblock user' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error unblocking user' });
    }
  };

  const blockIP = async (ipAddress: string, reason: string) => {
    try {
      const token = useAuthStore.getState().token;
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found' });
        return;
      }
      
      const response = await fetch('/api/v1/admin/security/block-ip', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ipAddress, reason })
      });
      if (response.ok) {
        setMessage({ type: 'success', text: `IP ${ipAddress} blocked successfully` });
        fetchAdminData();
      } else {
        setMessage({ type: 'error', text: 'Failed to block IP' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error blocking IP' });
    }
  };

  const runSecurityScan = async () => {
    try {
      setIsLoading(true);
      const token = useAuthStore.getState().token;
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found' });
        return;
      }
      
      const response = await fetch('/api/v1/admin/security/scan', { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Security scan completed' });
        fetchAdminData();
      } else {
        setMessage({ type: 'error', text: 'Security scan failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error running security scan' });
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessage = () => setMessage(null);

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-blue-400 mb-2">Admin Dashboard</h1>
        <p className="text-gray-400">Welcome back, {user.username}. Full system control at your fingertips.</p>
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

      {/* Navigation Tabs */}
      <div className="flex space-x-2 mb-8 border-b border-gray-700">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'profitability', label: 'Profitability', icon: DollarSign },
          { id: 'game-control', label: 'Game Control', icon: Gamepad2 },
          { id: 'security', label: 'Security', icon: Shield },
          { id: 'users', label: 'User Management', icon: Users },
          { id: 'analytics', label: 'Analytics', icon: TrendingUp }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg transition-colors ${
              activeTab === id
                ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-gray-800 rounded-lg p-6">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
            <span className="ml-2">Loading admin data...</span>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-blue-400 mb-4">System Overview</h2>
            
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-400">
                      {profitabilityMetrics ? `${profitabilityMetrics.totalRevenue.toLocaleString()} FCFA` : 'Loading...'}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-400" />
                </div>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Active Players</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {gameControl ? gameControl.activePlayers : 'Loading...'}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-blue-400" />
                </div>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Current Round</p>
                    <p className="text-2xl font-bold text-yellow-400">
                      {gameControl ? `#${gameControl.currentRound}` : 'Loading...'}
                    </p>
                  </div>
                  <Gamepad2 className="w-8 h-8 text-yellow-400" />
                </div>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Security Level</p>
                    <p className="text-2xl font-bold text-red-400">
                      {securityMetrics ? securityMetrics.securityLevel : 'Loading...'}
                    </p>
                  </div>
                  <Shield className="w-8 h-8 text-red-400" />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-700 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={pauseGame}
                  disabled={!gameControl || gameControl.isPaused}
                  className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pause Game</span>
                </button>

                <button
                  onClick={resumeGame}
                  disabled={!gameControl || !gameControl.isPaused}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <Play className="w-4 h-4" />
                  <span>Resume Game</span>
                </button>

                <button
                  onClick={emergencyStop}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  <StopCircle className="w-4 h-4" />
                  <span>Emergency Stop</span>
                </button>

                <button
                  onClick={runSecurityScan}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  <span>Security Scan</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Profitability Tab */}
        {activeTab === 'profitability' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-blue-400">Profitability Analysis</h2>
              <button
                onClick={() => setShowSensitiveData(!showSensitiveData)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
              >
                {showSensitiveData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{showSensitiveData ? 'Hide' : 'Show'} Sensitive Data</span>
              </button>
            </div>

            {profitabilityMetrics ? (
              <div className="space-y-6">
                {/* Revenue Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-700 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4 text-green-400">Revenue</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Revenue:</span>
                        <span className="font-semibold">{profitabilityMetrics.totalRevenue.toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Hourly:</span>
                        <span className="font-semibold">{profitabilityMetrics.hourlyRevenue.toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Daily:</span>
                        <span className="font-semibold">{profitabilityMetrics.dailyRevenue.toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Weekly:</span>
                        <span className="font-semibold">{profitabilityMetrics.weeklyRevenue.toLocaleString()} FCFA</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-700 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4 text-red-400">Payouts</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Payouts:</span>
                        <span className="font-semibold">{profitabilityMetrics.totalPayouts.toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Net Profit:</span>
                        <span className="font-semibold text-green-400">{profitabilityMetrics.netProfit.toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Profit Margin:</span>
                        <span className="font-semibold text-green-400">{profitabilityMetrics.profitMargin}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Monthly Projection:</span>
                        <span className="font-semibold">{profitabilityMetrics.monthlyProjection.toLocaleString()} FCFA</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-700 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4 text-blue-400">Game Metrics</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Bets:</span>
                        <span className="font-semibold">{profitabilityMetrics.totalBets.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Average Bet:</span>
                        <span className="font-semibold">{profitabilityMetrics.averageBetAmount} FCFA</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Crash Rate:</span>
                        <span className="font-semibold">{profitabilityMetrics.crashRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">House Edge:</span>
                        <span className="font-semibold">{profitabilityMetrics.houseEdge}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profitability Chart Placeholder */}
                <div className="bg-gray-700 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Profitability Trend</h3>
                  <div className="h-64 bg-gray-600 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-400">Profitability chart will be displayed here</p>
                      <p className="text-sm text-gray-500">Real-time data from backend calculations</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <RefreshCw className="w-16 h-16 mx-auto text-gray-400 mb-4 animate-spin" />
                <p className="text-gray-400">Loading profitability data...</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Game Control Tab */}
        {activeTab === 'game-control' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-blue-400">Game Control Center</h2>

            {gameControl ? (
              <div className="space-y-6">
                {/* Current Game Status */}
                <div className="bg-gray-700 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Current Game Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Round</p>
                      <p className="text-2xl font-bold text-blue-400">#{gameControl.currentRound}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">State</p>
                      <p className={`text-xl font-semibold ${
                        gameControl.gameState === 'running' ? 'text-green-400' :
                        gameControl.gameState === 'waiting' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {gameControl.gameState.toUpperCase()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Crash Point</p>
                      <p className="text-2xl font-bold text-red-400">{gameControl.crashPoint}x</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Multiplier</p>
                      <p className="text-2xl font-bold text-green-400">{gameControl.multiplier}x</p>
                    </div>
                  </div>
                </div>

                {/* Game Controls */}
                <div className="bg-gray-700 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Game Controls</h3>
                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={pauseGame}
                      disabled={gameControl.isPaused}
                      className="flex items-center space-x-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors font-semibold"
                    >
                      <Pause className="w-5 h-5" />
                      <span>Pause Game</span>
                    </button>

                    <button
                      onClick={resumeGame}
                      disabled={!gameControl.isPaused}
                      className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors font-semibold"
                    >
                      <Play className="w-5 h-5" />
                      <span>Resume Game</span>
                    </button>

                    <button
                      onClick={emergencyStop}
                      className="flex items-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-semibold"
                    >
                      <StopCircle className="w-5 h-5" />
                      <span>Emergency Stop</span>
                    </button>
                  </div>
                </div>

                {/* Crash Point Control */}
                <div className="bg-gray-700 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Crash Point Control</h3>
                  <div className="flex items-center space-x-4">
                    <input
                      type="number"
                      step="0.01"
                      min="1.00"
                      max="100.00"
                      placeholder="Enter crash point (e.g., 2.50)"
                      className="flex-1 px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:border-blue-400"
                    />
                    <button
                      onClick={() => {
                        const input = document.querySelector('input[type="number"]') as HTMLInputElement;
                        if (input && input.value) {
                          setCrashPoint(parseFloat(input.value));
                          input.value = '';
                        }
                      }}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-semibold"
                    >
                      Set Crash Point
                    </button>
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    Set a specific crash point for the next round. Use with caution.
                  </p>
                </div>

                {/* Player Activity */}
                <div className="bg-gray-700 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Player Activity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Active Players</p>
                      <p className="text-2xl font-bold text-green-400">{gameControl.activePlayers}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Total Bets</p>
                      <p className="text-2xl font-bold text-blue-400">{gameControl.totalBets.toLocaleString()} FCFA</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">House Advantage</p>
                      <p className="text-2xl font-bold text-yellow-400">{gameControl.houseAdvantage}%</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <RefreshCw className="w-16 h-16 mx-auto text-gray-400 mb-4 animate-spin" />
                <p className="text-gray-400">Loading game control data...</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-blue-400">Security Monitoring</h2>

            {securityMetrics ? (
              <div className="space-y-6">
                {/* Security Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="text-center">
                      <Shield className="w-8 h-8 mx-auto text-blue-400 mb-2" />
                      <p className="text-gray-400 text-sm">Security Level</p>
                      <p className="text-xl font-bold text-blue-400">{securityMetrics.securityLevel}</p>
                    </div>
                  </div>

                  <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="text-center">
                      <AlertTriangle className="w-8 h-8 mx-auto text-red-400 mb-2" />
                      <p className="text-gray-400 text-sm">Failed Logins</p>
                      <p className="text-xl font-bold text-red-400">{securityMetrics.failedLoginAttempts}</p>
                    </div>
                  </div>

                  <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="text-center">
                      <Ban className="w-8 h-8 mx-auto text-orange-400 mb-2" />
                      <p className="text-gray-400 text-sm">Blocked IPs</p>
                      <p className="text-xl font-bold text-orange-400">{securityMetrics.blockedIPs}</p>
                    </div>
                  </div>

                  <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="text-center">
                      <Activity className="w-8 h-8 mx-auto text-yellow-400 mb-2" />
                      <p className="text-gray-400 text-sm">Active Threats</p>
                      <p className="text-xl font-bold text-yellow-400">{securityMetrics.activeThreats}</p>
                    </div>
                  </div>
                </div>

                {/* Security Actions */}
                <div className="bg-gray-700 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Security Actions</h3>
                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={runSecurityScan}
                      disabled={isLoading}
                      className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Run Security Scan</span>
                    </button>

                    <button
                      onClick={() => {
                        const ip = prompt('Enter IP address to block:');
                        const reason = prompt('Enter reason for blocking:');
                        if (ip && reason) {
                          blockIP(ip, reason);
                        }
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                    >
                      <Ban className="w-4 h-4" />
                      <span>Block IP</span>
                    </button>

                    <button
                      onClick={() => {
                        const ip = prompt('Enter IP address to unblock:');
                        if (ip) {
                          // Implement unblock IP function
                          setMessage({ type: 'info', text: 'Unblock IP functionality to be implemented' });
                        }
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>Unblock IP</span>
                    </button>
                  </div>
                </div>

                {/* Last Security Scan */}
                <div className="bg-gray-700 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Last Security Scan</h3>
                  <p className="text-gray-400">
                    Last scan: <span className="text-white">{securityMetrics.lastSecurityScan}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <RefreshCw className="w-16 h-16 mx-auto text-gray-400 mb-4 animate-spin" />
                <p className="text-gray-400">Loading security data...</p>
              </div>
            )}
          </motion.div>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-blue-400">User Management</h2>

            {userManagement ? (
              <div className="space-y-6">
                {/* User Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="text-center">
                      <Users className="w-8 h-8 mx-auto text-blue-400 mb-2" />
                      <p className="text-gray-400 text-sm">Total Users</p>
                      <p className="text-2xl font-bold text-blue-400">{userManagement.totalUsers}</p>
                    </div>
                  </div>

                  <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="text-center">
                      <UserCheck className="w-8 h-8 mx-auto text-green-400 mb-2" />
                      <p className="text-gray-400 text-sm">Active Users</p>
                      <p className="text-2xl font-bold text-green-400">{userManagement.activeUsers}</p>
                    </div>
                  </div>

                  <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="text-center">
                      <UserCheck className="w-8 h-8 mx-auto text-yellow-400 mb-2" />
                      <p className="text-gray-400 text-sm">New Today</p>
                      <p className="text-2xl font-bold text-yellow-400">{userManagement.newUsersToday}</p>
                    </div>
                  </div>
                </div>

                {/* Top Players */}
                <div className="bg-gray-700 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Top Players</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-600">
                          <th className="text-left py-2 px-4">Username</th>
                          <th className="text-left py-2 px-4">Balance</th>
                          <th className="text-left py-2 px-4">Total Bets</th>
                          <th className="text-left py-2 px-4">Total Winnings</th>
                          <th className="text-left py-2 px-4">Last Active</th>
                          <th className="text-left py-2 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userManagement.topPlayers.map((player) => (
                          <tr key={player.id} className="border-b border-gray-600">
                            <td className="py-2 px-4">{player.username}</td>
                            <td className="py-2 px-4">{player.balance.toLocaleString()} FCFA</td>
                            <td className="py-2 px-4">{player.totalBets.toLocaleString()}</td>
                            <td className="py-2 px-4">{player.totalWinnings.toLocaleString()} FCFA</td>
                            <td className="py-2 px-4">{player.lastActive}</td>
                            <td className="py-2 px-4">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => blockUser(player.id, 'Admin action')}
                                  className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors"
                                >
                                  Block
                                </button>
                                <button
                                  onClick={() => unblockUser(player.id)}
                                  className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs transition-colors"
                                >
                                  Unblock
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <RefreshCw className="w-16 h-16 mx-auto text-gray-400 mb-4 animate-spin" />
                <p className="text-gray-400">Loading user data...</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-blue-400">Advanced Analytics</h2>
            
            <div className="bg-gray-700 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">System Analytics</h3>
              <div className="h-64 bg-gray-600 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <TrendingUp className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-400">Advanced analytics dashboard</p>
                  <p className="text-sm text-gray-500">Real-time charts and insights</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
