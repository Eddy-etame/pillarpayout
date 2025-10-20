import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Users, Clock, Trophy, TrendingUp } from 'lucide-react';
import { formatXAF } from '../../utils/currency';

interface CommunityGoal {
  id: number;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  rewardType: string;
  rewardValue: number;
  duration: number;
  minBetAmount: number;
  maxBetAmount?: number;
  requiredParticipants: number;
  startTime: string;
  endTime: string;
  status: string;
  participantCount: number;
  contributionCount: number;
}

const CommunityGoalsInterface: React.FC = () => {
  const [goals, setGoals] = useState<CommunityGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<CommunityGoal | null>(null);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:3001/api/community-goals');
      if (!response.ok) {
        throw new Error('Failed to fetch community goals');
      }
      
      const data = await response.json();
      setGoals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch community goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min(100, (current / target) * 100);
  };

  const getTimeRemaining = (endTime: string) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getRewardIcon = (rewardType: string) => {
    switch (rewardType) {
      case 'bonus_multiplier':
        return <TrendingUp className="w-4 h-4" />;
      case 'free_bet':
        return <Target className="w-4 h-4" />;
      case 'cash_reward':
        return <Trophy className="w-4 h-4" />;
      case 'special_feature':
        return <Users className="w-4 h-4" />;
      default:
        return <Trophy className="w-4 h-4" />;
    }
  };

  const getRewardText = (rewardType: string, rewardValue: number) => {
    switch (rewardType) {
      case 'bonus_multiplier':
        return `${rewardValue}x Bonus Multiplier`;
      case 'free_bet':
        return `${formatXAF(rewardValue)} Free Bet`;
      case 'cash_reward':
        return `${formatXAF(rewardValue)} Cash Reward`;
      case 'special_feature':
        return rewardValue;
      default:
        return `${formatXAF(rewardValue)} Reward`;
    }
  };

  if (loading && goals.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-gray-400 mt-2">Loading community goals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 text-center">
        <p className="text-red-400">{error}</p>
        <button 
          onClick={fetchGoals}
          className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 text-center">
        <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-400">No active community goals</p>
        <p className="text-sm text-gray-500 mt-1">Check back later for new challenges!</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center">
          <Target className="w-5 h-5 mr-2" />
          Community Goals
        </h3>
        <button 
          onClick={fetchGoals}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-4">
        {goals.map((goal) => {
          const progress = getProgressPercentage(goal.currentAmount, goal.targetAmount);
          const timeRemaining = getTimeRemaining(goal.endTime);
          const isExpired = timeRemaining === 'Expired';
          
          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                isExpired 
                  ? 'border-gray-600 bg-gray-700/50' 
                  : 'border-gray-600 bg-gray-700 hover:border-gray-500'
              }`}
              onClick={() => setSelectedGoal(goal)}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-white mb-1">{goal.title}</h4>
                  <p className="text-sm text-gray-400 mb-2">{goal.description}</p>
                </div>
                <div className="flex items-center text-sm text-gray-400">
                  <Clock className="w-4 h-4 mr-1" />
                  {timeRemaining}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">
                    {formatXAF(goal.currentAmount)} / {formatXAF(goal.targetAmount)}
                  </span>
                  <span className="text-gray-400">{progress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="flex justify-between items-center text-sm text-gray-400">
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  {goal.participantCount} participants
                </div>
                <div className="flex items-center">
                  {getRewardIcon(goal.rewardType)}
                  <span className="ml-1">{getRewardText(goal.rewardType, goal.rewardValue)}</span>
                </div>
              </div>

              {/* Bet Requirements */}
              {(goal.minBetAmount > 0 || goal.maxBetAmount) && (
                <div className="mt-2 text-xs text-gray-500">
                  Bet: {goal.minBetAmount > 0 ? `Min ${formatXAF(goal.minBetAmount)}` : ''}
                  {goal.maxBetAmount && ` - Max ${formatXAF(goal.maxBetAmount)}`}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Goal Details Modal */}
      {selectedGoal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelectedGoal(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">{selectedGoal.title}</h3>
              <button 
                onClick={() => setSelectedGoal(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-gray-300 mb-4">{selectedGoal.description}</p>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span>{getProgressPercentage(selectedGoal.currentAmount, selectedGoal.targetAmount).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                    style={{ width: `${getProgressPercentage(selectedGoal.currentAmount, selectedGoal.targetAmount)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Target:</span>
                  <div className="font-semibold">{formatXAF(selectedGoal.targetAmount)}</div>
                </div>
                <div>
                  <span className="text-gray-400">Current:</span>
                  <div className="font-semibold">{formatXAF(selectedGoal.currentAmount)}</div>
                </div>
                <div>
                  <span className="text-gray-400">Participants:</span>
                  <div className="font-semibold">{selectedGoal.participantCount}</div>
                </div>
                <div>
                  <span className="text-gray-400">Time Left:</span>
                  <div className="font-semibold">{getTimeRemaining(selectedGoal.endTime)}</div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-700">
                <div className="flex items-center text-sm">
                  {getRewardIcon(selectedGoal.rewardType)}
                  <span className="ml-2 text-gray-400">Reward:</span>
                  <span className="ml-2 font-semibold">{getRewardText(selectedGoal.rewardType, selectedGoal.rewardValue)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default CommunityGoalsInterface;
