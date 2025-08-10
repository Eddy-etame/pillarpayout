import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, DollarSign, Settings, BarChart3, Shield } from 'lucide-react';

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'transactions', label: 'Transactions', icon: DollarSign },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const stats = [
    { label: 'Total Users', value: '1,234', change: '+12%', icon: Users },
    { label: 'Total Revenue', value: '$45,678', change: '+8%', icon: DollarSign },
    { label: 'Active Games', value: '89', change: '+5%', icon: BarChart3 },
    { label: 'System Health', value: '98%', change: '+2%', icon: Shield },
  ];

  const recentUsers = [
    { id: 1, username: 'player1', email: 'eddy.etame@enkoschools.com', balance: 1250.50, status: 'active' },
    { id: 2, username: 'player2', email: 'drdavid10000@gmail.com', balance: 890.25, status: 'active' },
    { id: 3, username: 'player3', email: 'eddyetame10@gmail.com', balance: 675.80, status: 'suspended' },
  ];

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-800 rounded-lg border border-gray-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-green-400 text-sm">{stat.change}</p>
              </div>
              <stat.icon className="w-8 h-8 text-blue-400" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-bold mb-4">Recent Users</h3>
          <div className="space-y-3">
            {recentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div>
                  <p className="font-medium">{user.username}</p>
                  <p className="text-sm text-gray-400">{user.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-semibold">${user.balance.toFixed(2)}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    user.status === 'active' ? 'bg-green-600' : 'bg-red-600'
                  }`}>
                    {user.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-bold mb-4">System Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Database</span>
              <span className="text-green-400">Online</span>
            </div>
            <div className="flex items-center justify-between">
              <span>WebSocket</span>
              <span className="text-green-400">Connected</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Game Engine</span>
              <span className="text-green-400">Running</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Redis Cache</span>
              <span className="text-yellow-400">Limited</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <h3 className="text-lg font-bold mb-4">User Management</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left p-2">ID</th>
              <th className="text-left p-2">Username</th>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Balance</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {recentUsers.map((user) => (
              <tr key={user.id} className="border-b border-gray-700">
                <td className="p-2">{user.id}</td>
                <td className="p-2">{user.username}</td>
                <td className="p-2">{user.email}</td>
                <td className="p-2 text-green-400">${user.balance.toFixed(2)}</td>
                <td className="p-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    user.status === 'active' ? 'bg-green-600' : 'bg-red-600'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="p-2">
                  <button className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm mr-2">
                    Edit
                  </button>
                  <button className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm">
                    Suspend
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTransactions = () => (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <h3 className="text-lg font-bold mb-4">Transaction History</h3>
      <p className="text-gray-400">Transaction management interface will be implemented here.</p>
    </div>
  );

  const renderSettings = () => (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <h3 className="text-lg font-bold mb-4">System Settings</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            House Edge (%)
          </label>
          <input
            type="number"
            defaultValue="1.5"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Minimum Bet
          </label>
          <input
            type="number"
            defaultValue="1"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Maximum Bet
          </label>
          <input
            type="number"
            defaultValue="1000"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-semibold transition-colors">
          Save Settings
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white py-8">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto"
        >
          <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-800 rounded-lg p-1 mb-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'users' && renderUsers()}
          {activeTab === 'transactions' && renderTransactions()}
          {activeTab === 'settings' && renderSettings()}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminPage;
