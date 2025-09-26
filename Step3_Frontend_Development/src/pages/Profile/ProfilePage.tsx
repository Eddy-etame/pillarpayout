import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { User, Shield, Trophy, Clock, TrendingUp, BarChart3 } from 'lucide-react';
import { formatXAF } from '../../utils/currency';

const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [roundHistory, setRoundHistory] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
  });
  const [showFullHistory, setShowFullHistory] = useState(false);

  // Load round history from API
  useEffect(() => {
    const fetchRoundHistory = async () => {
      try {
        const token = localStorage.getItem('pillarPayout_token');
        if (!token) return;

        const response = await fetch('/api/v1/game/user-history?limit=20', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setRoundHistory(data);
        } else {
          console.error('Failed to fetch round history');
        }
      } catch (error) {
        console.error('Error fetching round history:', error);
      }
    };

    fetchRoundHistory();
  }, []);

  const numericBalance: number = (() => {
    const b: unknown = user?.balance as unknown;
    if (typeof b === 'number' && Number.isFinite(b)) return b;
    const parsed = parseFloat(String(b ?? '0'));
    return Number.isFinite(parsed) ? parsed : 0;
  })();

  const handleSave = () => {
    updateUser(formData);
    setIsEditing(false);
  };

  // Calculate real stats from round history
  const totalRounds = roundHistory.length;
  const winRounds = roundHistory.filter(r => r.result === 'win').length;
  const lossRounds = roundHistory.filter(r => r.result === 'loss').length;
  const winRate = totalRounds > 0 ? ((winRounds / totalRounds) * 100).toFixed(1) : '0.0';
  const averageMultiplier = totalRounds > 0 
    ? (roundHistory.reduce((sum, r) => sum + (r.final_multiplier || r.crash_point || 1), 0) / totalRounds).toFixed(2)
    : '1.00';
  const highestMultiplier = totalRounds > 0 
    ? Math.max(...roundHistory.map(r => r.final_multiplier || r.crash_point || 1)).toFixed(2)
    : '1.00';

  const stats = [
    { label: 'Total Rounds', value: totalRounds.toString(), icon: BarChart3 },
    { label: 'Wins', value: winRounds.toString(), icon: Trophy },
    { label: 'Win Rate', value: `${winRate}%`, icon: Shield },
    { label: 'Avg Multiplier', value: `${averageMultiplier}x`, icon: TrendingUp },
  ];

  const recentActivity = [
    { action: 'Won bet', amount: `+${formatXAF(4520)}`, time: '2 minutes ago' },
    { action: 'Placed bet', amount: `-${formatXAF(1000)}`, time: '5 minutes ago' },
    { action: 'Won bet', amount: `+${formatXAF(2350)}`, time: '12 minutes ago' },
    { action: 'Joined tournament', amount: '', time: '1 hour ago' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white py-8">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 mb-8">
            <div className="flex items-center space-x-6">
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-12 h-12 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{user?.username}</h1>
                <p className="text-gray-400 mb-4">{user?.email}</p>
                <div className="flex items-center space-x-4">
                  <span className="bg-green-600 px-3 py-1 rounded-full text-sm">Verified</span>
                  <span className="bg-blue-600 px-3 py-1 rounded-full text-sm">Member since {new Date().getFullYear()}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-400">{formatXAF(numericBalance)}</div>
                <div className="text-gray-400">Balance</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-center space-x-3">
                  <stat.icon className="w-6 h-6 text-blue-400" />
                  <div>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-gray-400 text-sm">{stat.label}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Profile Information</h2>
                <button onClick={() => setIsEditing(!isEditing)} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors">{isEditing ? 'Cancel' : 'Edit'}</button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                  {isEditing ? (
                    <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  ) : (
                    <div className="px-3 py-2 bg-gray-700 rounded-lg">{user?.username}</div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  {isEditing ? (
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  ) : (
                    <div className="px-3 py-2 bg-gray-700 rounded-lg">{user?.email}</div>
                  )}
                </div>
                {isEditing && (<button onClick={handleSave} className="w-full bg-green-600 hover:bg-green-700 py-2 rounded-lg font-semibold transition-colors">Save Changes</button>)}
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-bold mb-6">Recent Activity</h2>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify_between p-3 bg-gray-700 rounded-lg">
                    <div>
                      <div className="font-medium">{activity.action}</div>
                      <div className="text-sm text-gray-400">{activity.time}</div>
                    </div>
                    {activity.amount && (<div className={`font-semibold ${activity.amount.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>{activity.amount}</div>)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Round History Section */}
          {roundHistory.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Last Round
                </h2>
                <button 
                  onClick={() => setShowFullHistory(!showFullHistory)}
                  className="text-sm text-blue-400 hover:text-blue-300 underline cursor-pointer"
                >
                  {showFullHistory ? 'Show Less' : `View All (${roundHistory.length} rounds)`}
                </button>
              </div>

              {/* Last Round Display */}
              <div className="mb-6">
                {(() => {
                  const lastRound = roundHistory[0]; // Most recent round
                  if (!lastRound) return null;
                  
                  const isWin = lastRound.result === 'win';
                  return (
                    <div
                      className={`p-6 rounded-lg text-center transition-all hover:scale-105 cursor-pointer ${
                        isWin 
                          ? 'bg-green-600 text-white hover:bg-green-500' 
                          : 'bg-red-600 text-white hover:bg-red-500'
                      }`}
                      title={`Round ${lastRound.round_id || 1}
Multiplier: ${lastRound.final_multiplier?.toFixed(2) || lastRound.crash_point?.toFixed(2) || 'N/A'}x
Result: ${isWin ? 'WIN' : 'CRASH'}
Time: ${lastRound.timestamp ? new Date(lastRound.timestamp).toLocaleTimeString() : 'N/A'}
Date: ${lastRound.timestamp ? new Date(lastRound.timestamp).toLocaleDateString() : 'N/A'}`}
                    >
                      <div className="text-3xl font-bold mb-2">
                        {lastRound.final_multiplier?.toFixed(2) || lastRound.crash_point?.toFixed(2) || 'N/A'}x
                      </div>
                      <div className="text-lg opacity-90 mb-2">
                        {isWin ? 'WIN' : 'CRASH'}
                      </div>
                      <div className="text-sm opacity-80">
                        {lastRound.timestamp ? new Date(lastRound.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          second: '2-digit'
                        }) : 'N/A'}
                      </div>
                      <div className="text-xs opacity-60 mt-1">
                        {lastRound.timestamp ? new Date(lastRound.timestamp).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Full History (Collapsible) */}
              <AnimatePresence>
                {showFullHistory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-gray-700 pt-6"
                  >
                  
                  {/* Round History Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                    {roundHistory.slice(0, 10).map((round, index) => (
                      <div
                        key={round.round_id || index}
                        className={`p-4 rounded-lg text-center text-sm font-semibold cursor-pointer transition-all hover:scale-105 ${
                          round.result === 'loss' 
                            ? 'bg-red-600 text-white hover:bg-red-500' 
                            : 'bg-green-600 text-white hover:bg-green-500'
                        }`}
                        title={`Round ${round.round_id || index + 1}
Multiplier: ${round.final_multiplier?.toFixed(2) || round.crash_point?.toFixed(2) || 'N/A'}x
Result: ${round.result === 'loss' ? 'CRASH' : 'WIN'}
Time: ${round.timestamp ? new Date(round.timestamp).toLocaleTimeString() : 'N/A'}
Date: ${round.timestamp ? new Date(round.timestamp).toLocaleDateString() : 'N/A'}`}
                      >
                        <div className="text-lg font-bold mb-1">
                          {round.final_multiplier?.toFixed(2) || round.crash_point?.toFixed(2) || 'N/A'}x
                        </div>
                        <div className="text-xs opacity-80 mb-1">
                          {round.result === 'loss' ? 'CRASH' : 'WIN'}
                        </div>
                        <div className="text-xs opacity-60">
                          {round.timestamp ? new Date(round.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Detailed Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-700 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-400">{highestMultiplier}x</div>
                      <div className="text-gray-400 text-sm">Highest Multiplier</div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-400">{lossRounds}</div>
                      <div className="text-gray-400 text-sm">Total Losses</div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-400">
                        {totalRounds > 0 ? ((winRounds / totalRounds) * 100).toFixed(1) : '0.0'}%
                      </div>
                      <div className="text-gray-400 text-sm">Success Rate</div>
                    </div>
                  </div>

                  {roundHistory.length > 10 && (
                    <div className="mt-4 text-center text-gray-400 text-sm">
                      Showing last 10 rounds • Total rounds: {roundHistory.length}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

              {/* Legend */}
              <div className="flex items-center justify-center space-x-4 text-sm mt-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                  <span className="text-gray-400">Wins</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                  <span className="text-gray-400">Losses</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* No History Message */}
          {roundHistory.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center"
            >
              <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-400 mb-2">No Round History Yet</h3>
              <p className="text-gray-500">
                Start playing the game to see your round history and statistics here!
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ProfilePage;
