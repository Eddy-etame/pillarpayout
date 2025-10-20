import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, TrendingDown, Target, CheckCircle, XCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import api from '../../utils/api';

interface RoundHistory {
  roundId: number;
  crashPoint: number;
  betAmount: number;
  cashoutMultiplier: number | null;
  finalMultiplier: number | null;
  result: 'win' | 'loss';
  winnings: number;
  betTimestamp: string;
  roundStartTime: string;
  roundEndTime: string;
}

interface RoundHistoryData {
  rounds: RoundHistory[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRounds: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

const RoundHistoryInterface: React.FC = () => {
  const { token } = useAuthStore();
  const [historyData, setHistoryData] = useState<RoundHistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchRoundHistory = useCallback(async (page: number = 1) => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/history/user-rounds?page=${page}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setHistoryData(response.data.data);
        setCurrentPage(page);
      } else {
        setError('Failed to fetch round history');
      }
    } catch (err: any) {
      console.error('Error fetching round history:', err);
      setError('Failed to load round history');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRoundHistory(1);
  }, [fetchRoundHistory]);

  const formatXAF = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
  };

  const getResultIcon = (result: string, cashoutMultiplier: number | null) => {
    if (result === 'win') {
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    } else if (cashoutMultiplier) {
      return <Target className="w-5 h-5 text-yellow-400" />;
    } else {
      return <XCircle className="w-5 h-5 text-red-400" />;
    }
  };

  const getResultText = (result: string, cashoutMultiplier: number | null) => {
    if (result === 'win') {
      return 'Won';
    } else if (cashoutMultiplier) {
      return 'Cashed Out';
    } else {
      return 'Lost';
    }
  };

  const getResultColor = (result: string, cashoutMultiplier: number | null) => {
    if (result === 'win') {
      return 'text-green-400';
    } else if (cashoutMultiplier) {
      return 'text-yellow-400';
    } else {
      return 'text-red-400';
    }
  };

  if (loading && !historyData) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          <span className="ml-2 text-gray-400">Loading round history...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-center py-8">
          <XCircle className="w-16 h-16 mx-auto text-red-400 mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => fetchRoundHistory(currentPage)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!historyData || historyData.rounds.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-center py-12">
          <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No Round History Yet</h3>
          <p className="text-gray-400">
            Start playing the game to see your round history and statistics here!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          Round History
        </h3>
        <div className="text-sm text-gray-400">
          {historyData.pagination.totalRounds} rounds
        </div>
      </div>

      <div className="space-y-3">
        {historyData.rounds.map((round) => (
          <motion.div
            key={round.roundId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {getResultIcon(round.result, round.cashoutMultiplier)}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-white">Round #{round.roundId}</span>
                    <span className={`text-sm font-medium ${getResultColor(round.result, round.cashoutMultiplier)}`}>
                      {getResultText(round.result, round.cashoutMultiplier)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    {formatTimeAgo(round.betTimestamp)}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-400">Bet</div>
                    <div className="font-semibold text-white">{formatXAF(round.betAmount)}</div>
                  </div>
                  
                  {round.cashoutMultiplier && (
                    <div className="text-center">
                      <div className="text-sm text-gray-400">Cashed Out</div>
                      <div className="font-semibold text-yellow-400">{round.cashoutMultiplier.toFixed(2)}x</div>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <div className="text-sm text-gray-400">Crashed At</div>
                    <div className="font-semibold text-red-400">{round.crashPoint.toFixed(2)}x</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm text-gray-400">Result</div>
                    <div className={`font-semibold flex items-center ${
                      round.winnings > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {round.winnings > 0 ? (
                        <TrendingUp className="w-4 h-4 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 mr-1" />
                      )}
                      {round.winnings > 0 ? '+' : ''}{formatXAF(round.winnings)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pagination */}
      {historyData.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700">
          <button
            onClick={() => fetchRoundHistory(currentPage - 1)}
            disabled={!historyData.pagination.hasPrevPage}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Previous
          </button>
          
          <div className="text-sm text-gray-400">
            Page {currentPage} of {historyData.pagination.totalPages}
          </div>
          
          <button
            onClick={() => fetchRoundHistory(currentPage + 1)}
            disabled={!historyData.pagination.hasNextPage}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default RoundHistoryInterface;
