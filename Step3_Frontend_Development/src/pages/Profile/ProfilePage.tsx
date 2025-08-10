import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { User, Shield, DollarSign, Trophy, Clock } from 'lucide-react';
import { formatXAF } from '../../utils/currency';

const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
  });

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

  const stats = [
    { label: 'Total Bets', value: '156', icon: DollarSign },
    { label: 'Wins', value: '89', icon: Trophy },
    { label: 'Win Rate', value: '57%', icon: Shield },
    { label: 'Play Time', value: '24h 32m', icon: Clock },
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
        </motion.div>
      </div>
    </div>
  );
};

export default ProfilePage;
