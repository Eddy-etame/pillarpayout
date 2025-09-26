import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Activity, History, Shield, Target } from 'lucide-react';
import { useGameStore } from '../../stores/gameStore';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { formatXAF } from '../../utils/currency';
import InsuranceInterface from './InsuranceInterface';
import TournamentInterface from './TournamentInterface';


const GameSidebar: React.FC = () => {
  const { roundHistory, connectedPlayers, liveBets } = useGameStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  // State for real-time updates
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // State for interface display
  const [showInsurance, setShowInsurance] = useState(false);
  const [showTournament, setShowTournament] = useState(false);

  // Update timestamp every second for real-time feel
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Realistic top players data (this would come from backend)
  // Using FCFA values and realistic player names
  const topPlayers = [
    { username: 'CryptoKing', winnings: 1250500, rank: 1 },
    { username: 'LuckyGamer', winnings: 890250, rank: 2 },
    { username: 'BetMaster', winnings: 675800, rank: 3 },
    { username: 'FortuneSeeker', winnings: 543200, rank: 4 },
    { username: 'RiskTaker', winnings: 432100, rank: 5 },
  ];

  // Calculate total wagered from live bets
  const totalWagered = liveBets.reduce((total, bet) => total + bet.amount, 0);

  // Calculate win rate from round history
  const totalRounds = roundHistory.length;
  const winRounds = roundHistory.filter(r => !r.crashed).length;
  const winRate = totalRounds > 0 ? ((winRounds / totalRounds) * 100).toFixed(1) : '0.0';

  // Calculate average multiplier
  const averageMultiplier = totalRounds > 0 
    ? (roundHistory.reduce((sum, r) => sum + r.multiplier, 0) / totalRounds).toFixed(2)
    : '1.00';

  // Quick Actions Functions
  const handleViewHistory = () => {
    // Store current round history in localStorage for profile page
    localStorage.setItem('pillarPayout_roundHistory', JSON.stringify(roundHistory));
    navigate('/profile');
  };

  const handleJoinTournament = () => {
    setShowTournament(!showTournament);
    setShowInsurance(false);
  };

  const handleCommunityGoals = () => {
    // Navigate to community goals page
    console.log('Opening community goals...');
    // For now, show an alert - you can implement community goals later
    alert('Community Goals feature coming soon! 🎯');
  };

  const handleInsurance = () => {
    setShowInsurance(!showInsurance);
    setShowTournament(false);
  };

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
            <span className="text-white font-semibold">{connectedPlayers}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Active Bets</span>
            <span className="text-green-400 font-semibold">{liveBets.length}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Total Wagered</span>
            <span className="text-blue-400 font-semibold">{formatXAF(totalWagered)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Win Rate</span>
            <span className="text-green-400 font-semibold">{winRate}%</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Avg Multiplier</span>
            <span className="text-yellow-400 font-semibold">{averageMultiplier}x</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-300">House Edge</span>
            <span className="text-yellow-400 font-semibold">1.5%</span>
          </div>
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-700 text-xs text-gray-400 text-center">
          Last updated: {lastUpdate.toLocaleTimeString()}
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
            <div key={player.username} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-700 transition-colors">
              <div className="flex items-center space-x-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-yellow-500 text-black' :
                  index === 1 ? 'bg-gray-400 text-black' :
                  index === 2 ? 'bg-orange-500 text-white' :
                  'bg-gray-600 text-white'
                }`}>
                  {player.rank}
                </span>
                <div className="flex flex-col">
                  <span className="text-gray-300 font-medium">{player.username}</span>
                  <span className="text-xs text-gray-500">
                    {index === 0 ? '🥇 Champion' : 
                     index === 1 ? '🥈 Runner-up' : 
                     index === 2 ? '🥉 Third Place' : 
                     `Rank ${player.rank}`}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-green-400 font-semibold text-lg">
                  {formatXAF(player.winnings)}
                </span>
                <div className="text-xs text-gray-500">
                  {player.winnings >= 1000000 ? 'Millionaire' : 
                   player.winnings >= 500000 ? 'High Roller' : 
                   player.winnings >= 100000 ? 'Pro Player' : 'Regular Player'}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-700 text-xs text-gray-400 text-center">
          Rankings update every round • Top 5 players shown
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
        
        <div className="space-y-3">
          <button 
            className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
            onClick={handleViewHistory}
          >
            <History className="w-4 h-4" />
            <span>View History ({roundHistory.length} rounds)</span>
          </button>
          
          <button 
            className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
            onClick={handleJoinTournament}
          >
            <Trophy className="w-4 h-4" />
            <span>Join Tournament</span>
          </button>
          
          <button 
            className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
            onClick={handleCommunityGoals}
          >
            <Target className="w-4 h-4" />
            <span>Community Goals</span>
          </button>
          
          <button 
            className="w-full bg-orange-600 hover:bg-orange-700 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
            onClick={handleInsurance}
          >
            <Shield className="w-4 h-4" />
            <span>Insurance</span>
          </button>
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-700 text-xs text-gray-400 text-center">
          Click buttons above to access features! 🚀
        </div>
      </div>

      {/* Insurance Interface */}
      {showInsurance && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <InsuranceInterface />
        </motion.div>
      )}

      {/* Tournament Interface */}
      {showTournament && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <TournamentInterface />
        </motion.div>
      )}

      {/* Current Round Info */}
      {user && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-bold mb-4">Your Stats</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Balance</span>
              <span className="text-green-400 font-semibold">{formatXAF(user.balance)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Total Bets</span>
              <span className="text-blue-400 font-semibold">{roundHistory.filter(r => !r.crashed).length}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Wins</span>
              <span className="text-green-400 font-semibold">{roundHistory.filter(r => !r.crashed).length}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Losses</span>
              <span className="text-red-400 font-semibold">{roundHistory.filter(r => r.crashed).length}</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default GameSidebar; 