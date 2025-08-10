import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Trophy, Activity } from 'lucide-react';

const GameSidebar: React.FC = () => {
  const recentRounds = [
    { id: 1, multiplier: 2.45, result: 'win' },
    { id: 2, multiplier: 1.23, result: 'win' },
    { id: 3, multiplier: 5.67, result: 'win' },
    { id: 4, multiplier: 1.89, result: 'win' },
    { id: 5, multiplier: 0.98, result: 'crash' },
    { id: 6, multiplier: 3.21, result: 'win' },
    { id: 7, multiplier: 1.56, result: 'win' },
    { id: 8, multiplier: 0.87, result: 'crash' },
  ];

  const topPlayers = [
    { username: 'Player1', winnings: 1250.50 },
    { username: 'Player2', winnings: 890.25 },
    { username: 'Player3', winnings: 675.80 },
    { username: 'Player4', winnings: 543.20 },
    { username: 'Player5', winnings: 432.10 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      {/* Game Statistics */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2" />
          Game Stats
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Total Players</span>
            <span className="text-white font-semibold">1,234</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Active Bets</span>
            <span className="text-green-400 font-semibold">89</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Total Wagered</span>
            <span className="text-blue-400 font-semibold">$45,678</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-300">House Edge</span>
            <span className="text-yellow-400 font-semibold">1.5%</span>
          </div>
        </div>
      </div>

      {/* Recent Rounds */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          Recent Rounds
        </h3>
        
        <div className="grid grid-cols-4 gap-2">
          {recentRounds.map((round) => (
            <div
              key={round.id}
              className={`p-2 rounded-lg text-center text-sm font-semibold ${
                round.result === 'win' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-red-600 text-white'
              }`}
            >
              {round.multiplier.toFixed(2)}x
            </div>
          ))}
        </div>
      </div>

      {/* Top Players */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <Trophy className="w-5 h-5 mr-2" />
          Top Players
        </h3>
        
        <div className="space-y-3">
          {topPlayers.map((player, index) => (
            <div key={player.username} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-yellow-500 text-black' :
                  index === 1 ? 'bg-gray-400 text-black' :
                  index === 2 ? 'bg-orange-500 text-white' :
                  'bg-gray-600 text-white'
                }`}>
                  {index + 1}
                </span>
                <span className="text-gray-300">{player.username}</span>
              </div>
              <span className="text-green-400 font-semibold">
                ${player.winnings.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
        
        <div className="space-y-3">
          <button className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-semibold transition-colors">
            View History
          </button>
          
          <button className="w-full bg-green-600 hover:bg-green-700 py-2 rounded-lg font-semibold transition-colors">
            Join Tournament
          </button>
          
          <button className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded-lg font-semibold transition-colors">
            Community Goals
          </button>
          
          <button className="w-full bg-orange-600 hover:bg-orange-700 py-2 rounded-lg font-semibold transition-colors">
            Insurance
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default GameSidebar; 