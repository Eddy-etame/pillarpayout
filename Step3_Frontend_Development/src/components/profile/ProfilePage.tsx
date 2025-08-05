import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import api from '../../utils/api';

const ProfilePage: React.FC = () => {
  const { 
    userId, 
    username, 
    playerBalance,
    playerStats,
    setPlayerStats 
  } = useGameStore();

  const [bettingHistory, setBettingHistory] = useState<any[]>([]);
  const [insuranceHistory, setInsuranceHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'bets' | 'insurance'>('stats');

  // Load player data
  useEffect(() => {
    if (userId) {
      loadPlayerData();
    }
  }, [userId]);

  const loadPlayerData = async () => {
    try {
      setIsLoading(true);
      
      // Load player statistics
      const statsResponse = await api.get(`/api/v1/player-stats/${userId}`);
      setPlayerStats(statsResponse.data);

      // Load betting history
      const betsResponse = await api.get(`/api/v1/player-bets/${userId}?limit=50`);
      setBettingHistory(betsResponse.data);

      // Load insurance history
      const insuranceResponse = await api.get(`/api/v1/insurance/history/${userId}?limit=50`);
      setInsuranceHistory(insuranceResponse.data);

    } catch (error) {
      console.error('Error loading player data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Profile</h1>
          <div className="bg-slate-800 p-8 rounded-lg border border-slate-700 text-center">
            <p className="text-slate-400">Please log in to view your profile</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Profile</h1>
          <div className="bg-slate-800 p-8 rounded-lg border border-slate-700 text-center">
            <p className="text-slate-400">Loading profile data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Profile</h1>
        
        {/* Profile Header */}
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">{username}</h2>
              <p className="text-slate-400">Player ID: {userId}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-sm">Current Balance</p>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(playerBalance)}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'stats'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Statistics
          </button>
          <button
            onClick={() => setActiveTab('bets')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'bets'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Betting History
          </button>
          <button
            onClick={() => setActiveTab('insurance')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'insurance'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Insurance History
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-slate-800 rounded-lg border border-slate-700">
          {activeTab === 'stats' && playerStats && (
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-6">Player Statistics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Basic Stats */}
                <div className="bg-slate-700 p-4 rounded-lg">
                  <h4 className="text-lg font-medium mb-3">Basic Stats</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Bets</span>
                      <span className="text-white font-semibold">{playerStats.totalBets}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Wins</span>
                      <span className="text-green-400 font-semibold">{playerStats.wins}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Losses</span>
                      <span className="text-red-400 font-semibold">{playerStats.losses}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Win Rate</span>
                      <span className="text-white font-semibold">{playerStats.winRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Financial Stats */}
                <div className="bg-slate-700 p-4 rounded-lg">
                  <h4 className="text-lg font-medium mb-3">Financial Stats</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Wagered</span>
                      <span className="text-white font-semibold">{formatCurrency(playerStats.totalWagered)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Won</span>
                      <span className="text-green-400 font-semibold">{formatCurrency(playerStats.totalWon)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Lost</span>
                      <span className="text-red-400 font-semibold">{formatCurrency(playerStats.totalLost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Profit/Loss</span>
                      <span className={`font-semibold ${playerStats.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(playerStats.profitLoss)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Records */}
                <div className="bg-slate-700 p-4 rounded-lg">
                  <h4 className="text-lg font-medium mb-3">Records</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Biggest Win</span>
                      <span className="text-green-400 font-semibold">{formatCurrency(playerStats.biggestWin)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Biggest Loss</span>
                      <span className="text-red-400 font-semibold">{formatCurrency(playerStats.biggestLoss)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Highest Multiplier</span>
                      <span className="text-yellow-400 font-semibold">{playerStats.highestMultiplier.toFixed(2)}x</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Average Bet</span>
                      <span className="text-white font-semibold">{formatCurrency(playerStats.averageBet)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bets' && (
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-6">Betting History</h3>
              
              {bettingHistory.length > 0 ? (
                <div className="space-y-3">
                  {bettingHistory.map((bet) => (
                    <div key={bet.id} className="bg-slate-700 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">Round #{bet.roundId}</p>
                          <p className="text-slate-400 text-sm">{formatDate(bet.timestamp)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">{formatCurrency(bet.amount)}</p>
                          {bet.cashoutMultiplier ? (
                            <p className="text-green-400 text-sm">
                              Cashed out at {bet.cashoutMultiplier.toFixed(2)}x
                            </p>
                          ) : (
                            <p className="text-red-400 text-sm">Lost</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-400 py-8">
                  <p>No betting history found</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'insurance' && (
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-6">Insurance History</h3>
              
              {insuranceHistory.length > 0 ? (
                <div className="space-y-3">
                  {insuranceHistory.map((insurance) => (
                    <div key={insurance.id} className="bg-slate-700 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium capitalize">{insurance.insuranceType} Insurance</p>
                          <p className="text-slate-400 text-sm">{formatDate(insurance.purchasedAt)}</p>
                          <p className="text-slate-400 text-sm">
                            Bet: {formatCurrency(insurance.betAmount)} | Premium: {formatCurrency(insurance.premiumAmount)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">{formatCurrency(insurance.coverageAmount)}</p>
                          <p className={`text-sm ${insurance.status === 'claimed' ? 'text-green-400' : 'text-slate-400'}`}>
                            {insurance.status === 'claimed' ? 'Claimed' : 'Active'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-400 py-8">
                  <p>No insurance history found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 