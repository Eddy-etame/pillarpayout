import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingUp, Trophy, Target, DollarSign } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import api from '../../utils/api';

interface ActivityData {
  type: string;
  description: string;
  amountChange: number;
  timestamp: string;
  category: string;
  timeAgo: string;
}

interface ActivitiesData {
  activities: ActivityData[];
}

const RecentActivitiesInterface: React.FC = () => {
  const { token } = useAuthStore();
  const [activitiesData, setActivitiesData] = useState<ActivitiesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecentActivities = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/history/activities?limit=10', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setActivitiesData(response.data.data);
      } else {
        setError('Failed to fetch recent activities');
      }
    } catch (err: any) {
      console.error('Error fetching recent activities:', err);
      setError('Failed to load recent activities');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRecentActivities();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchRecentActivities, 30000);
    return () => clearInterval(interval);
  }, [fetchRecentActivities]);

  const formatXAF = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getActivityIcon = (category: string, type: string) => {
    switch (category) {
      case 'bet':
        if (type === 'bet_won') {
          return <TrendingUp className="w-5 h-5 text-green-400" />;
        } else {
          return <DollarSign className="w-5 h-5 text-blue-400" />;
        }
      case 'tournament':
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 'community_goal':
        return <Target className="w-5 h-5 text-purple-400" />;
      default:
        return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  const getAmountColor = (amount: number) => {
    if (amount > 0) {
      return 'text-green-400';
    } else if (amount < 0) {
      return 'text-red-400';
    } else {
      return 'text-gray-400';
    }
  };

  const formatAmount = (amount: number) => {
    if (amount === 0) return '';
    const formatted = formatXAF(Math.abs(amount));
    return amount > 0 ? `+${formatted}` : `-${formatted}`;
  };

  if (loading && !activitiesData) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          <span className="ml-2 text-gray-400">Loading activities...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-center py-8">
          <Activity className="w-16 h-16 mx-auto text-red-400 mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchRecentActivities}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!activitiesData || activitiesData.activities.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-center py-12">
          <Activity className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No Recent Activity</h3>
          <p className="text-gray-400">
            Your recent activities will appear here as you play the game!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white flex items-center">
          <Activity className="w-5 h-5 mr-2" />
          Recent Activity
        </h3>
        <button
          onClick={fetchRecentActivities}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {activitiesData.activities.map((activity, index) => (
          <motion.div
            key={`${activity.type}-${activity.timestamp}-${index}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getActivityIcon(activity.category, activity.type)}
                <div>
                  <div className="font-semibold text-white">{activity.description}</div>
                  <div className="text-sm text-gray-400">{activity.timeAgo}</div>
                </div>
              </div>

              {activity.amountChange !== 0 && (
                <div className={`font-semibold ${getAmountColor(activity.amountChange)}`}>
                  {formatAmount(activity.amountChange)}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {activitiesData.activities.length >= 10 && (
        <div className="mt-4 text-center">
          <button
            onClick={fetchRecentActivities}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Load More Activities
          </button>
        </div>
      )}
    </div>
  );
};

export default RecentActivitiesInterface;
