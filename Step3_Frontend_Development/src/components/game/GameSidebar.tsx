import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, History, Shield, Target, Trophy } from 'lucide-react';
import { useGameStore } from '../../stores/gameStore';
import { useNavigate } from 'react-router-dom';
import { formatXAF } from '../../utils/currency';
import InsuranceInterface from './InsuranceInterface';
import TournamentInterface from './TournamentInterface';
import CommunityGoalsInterface from './CommunityGoalsInterface';


const GameSidebar: React.FC = () => {
  const { roundHistory, connectedPlayers, liveBets } = useGameStore();
  const navigate = useNavigate();
  
  // State for real-time updates
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // State for interface display
  const [showInsurance, setShowInsurance] = useState(false);
  const [showTournament, setShowTournament] = useState(false);
  const [showCommunityGoals, setShowCommunityGoals] = useState(false);

  // Update timestamp every second for real-time feel
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);


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
    setShowCommunityGoals(!showCommunityGoals);
    setShowInsurance(false);
    setShowTournament(false);
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

      {/* Community Goals Interface */}
      {showCommunityGoals && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <CommunityGoalsInterface />
        </motion.div>
      )}

    </motion.div>
  );
};

export default GameSidebar; 