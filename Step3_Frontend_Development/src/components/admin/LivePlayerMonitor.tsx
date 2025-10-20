import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, Activity, TrendingUp, RefreshCw } from 'lucide-react';
import { formatXAF } from '../../utils/currency';

interface Player {
  id: number;
  username: string;
  balance: number;
  totalBets: number;
  totalWinnings: number;
  lastActive: string;
  isOnline: boolean;
  currentBet?: number;
  gameStatus?: string;
}

interface LivePlayerMonitorProps {
  refreshInterval?: number;
}

const LivePlayerMonitor: React.FC<LivePlayerMonitorProps> = ({ refreshInterval = 5000 }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchPlayers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/v1/admin/players/live');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setPlayers(data.data || []);
        setLastUpdate(new Date());
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to fetch players');
      }
    } catch (err) {
      console.error('Error fetching live players:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch players');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
    
    if (autoRefresh) {
      const interval = setInterval(fetchPlayers, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchPlayers, autoRefresh, refreshInterval]);

  const handleRefresh = () => {
    fetchPlayers();
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const onlinePlayers = players.filter(p => p.isOnline);
  const totalBalance = players.reduce((sum, p) => sum + p.balance, 0);
  const totalBets = players.reduce((sum, p) => sum + p.totalBets, 0);
  const totalWinnings = players.reduce((sum, p) => sum + p.totalWinnings, 0);

  if (loading && players.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mr-3" />
          <span className="text-gray-400">Loading live players...</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-lg border border-gray-700 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Live Player Monitor</h3>
            <p className="text-sm text-gray-400">
              Real-time player activity • Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleAutoRefresh}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              autoRefresh 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
          >
            {autoRefresh ? 'Auto ON' : 'Auto OFF'}
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-gray-300 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Players</p>
              <p className="text-2xl font-bold text-white">{players.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Online Now</p>
              <p className="text-2xl font-bold text-green-400">{onlinePlayers.length}</p>
            </div>
            <Activity className="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Balance</p>
              <p className="text-2xl font-bold text-yellow-400">{formatXAF(totalBalance)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Winnings</p>
              <p className="text-2xl font-bold text-purple-400">{formatXAF(totalWinnings)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-600 rounded-lg mr-3">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-red-200 font-semibold">Connection Error</h4>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Players List */}
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-white mb-4">Player Activity</h4>
        
        {players.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No players found</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {players.map((player) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${player.isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                    <div>
                      <p className="font-semibold text-white">{player.username}</p>
                      <p className="text-sm text-gray-400">
                        Balance: {formatXAF(player.balance)} • Bets: {player.totalBets}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm text-gray-400">
                      {player.isOnline ? 'Online' : 'Offline'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Last active: {new Date(player.lastActive).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {player.currentBet && (
                  <div className="mt-2 p-2 bg-blue-900 rounded border border-blue-700">
                    <p className="text-sm text-blue-200">
                      Currently betting: {formatXAF(player.currentBet)}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default LivePlayerMonitor;
