import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { useGameStore } from '../../stores/gameStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { DollarSign, Target, Zap, Wallet } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { formatXAF, parseAmount } from '../../utils/currency';

const BettingInterface: React.FC = () => {
  const { user, updateBalance } = useAuthStore();
  const { gameState, currentBet, hasPlacedBet, multiplier, setCurrentBet, setHasPlacedBet } = useGameStore();
  const { isConnected, sendMessage } = useWebSocket();
  const navigate = useNavigate();
  const [betAmount, setBetAmount] = useState('');
  const [autoCashout, setAutoCashout] = useState('');
  const [loading, setLoading] = useState(false);

  const numericBalance: number = (() => {
    const b: unknown = user?.balance as unknown;
    if (typeof b === 'number' && Number.isFinite(b)) return b;
    const parsed = parseFloat(String(b ?? '0'));
    return Number.isFinite(parsed) ? parsed : 0;
  })();

  const MIN_BET = 100; // FCFA

  const handlePlaceBet = async () => {
    const bet = parseAmount(betAmount);
    if (!bet || bet <= 0) return;

    if (hasPlacedBet) {
      alert('You already have an active bet. Please wait for the current round to end.');
      return;
    }

    if (gameState !== 'waiting') {
      alert('You can only place bets before the round starts.');
      return;
    }

    if (numericBalance < bet) {
      navigate('/recharge');
      return;
    }

    if (bet < MIN_BET) {
      alert(`Minimum bet is ${formatXAF(MIN_BET)}`);
      return;
    }

    setLoading(true);
    try {
      // Deduct bet amount immediately
      const newBalance = numericBalance - bet;
      updateBalance(newBalance);
      
      // Set bet state in store
      setCurrentBet(bet);
      setHasPlacedBet(true);
      
      // Send bet to backend via WebSocket
      if (isConnected) {
        sendMessage({
          type: 'player_action',
          action: 'bet',
          amount: bet,
          userId: user?.id
        });
      }
      
      setBetAmount('');
      setAutoCashout('');
    } catch (error) {
      console.error('Error placing bet:', error);
      // Revert balance if bet fails
      updateBalance(numericBalance);
    } finally {
      setLoading(false);
    }
  };

  const handleCashout = async () => {
    if (!hasPlacedBet || currentBet <= 0) {
      alert('No active bet to cash out.');
      return;
    }

    if (gameState !== 'running') {
      alert('Cash out is only available while the round is running.');
      return;
    }

    setLoading(true);
    try {
      // Calculate winnings based on current multiplier
      const winnings = currentBet * multiplier;
      const newBalance = numericBalance + winnings;
      
      // Update balance immediately
      updateBalance(newBalance);
      
      // Send cashout to backend via WebSocket
      if (isConnected) {
        sendMessage({
          type: 'player_action',
          action: 'cashout',
          userId: user?.id
        });
      }
      
      // Reset bet state
      setCurrentBet(0);
      setHasPlacedBet(false);
      
    } catch (error) {
      console.error('Error cashing out:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAmount = (amount: number) => {
    setBetAmount(amount.toString());
  };

  const quickAmounts = [100, 500, 1000, 2500, 5000, 10000]; // FCFA

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-gray-800 rounded-lg border border-gray-700 p-6"
    >
      <h3 className="text-xl font-bold mb-6 flex items-center">
        <Target className="w-5 h-5 mr-2" />
        Place Your Bet
      </h3>

      {/* Connection Status */}
      <div className={`mb-4 p-2 rounded-lg text-center text-sm ${
        isConnected ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
      }`}>
        {isConnected ? 'Connected to Game Server (High-Speed Updates)' : 'Disconnected - Reconnecting...'}
      </div>

      {/* Balance Display */}
      <div className="bg-gray-700 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Balance</span>
          <span className="text-green-400 font-bold text-lg">
            {formatXAF(numericBalance)}
          </span>
        </div>
        <div className="mt-3 text-right">
          <Link to="/recharge" className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300">
            <Wallet className="w-4 h-4 mr-1" /> Recharge
          </Link>
        </div>
      </div>

      {/* Current Bet Status - REMOVED TEXT, KEPT FUNCTIONALITY */}
      {hasPlacedBet && (
        <div className="bg-blue-600 rounded-lg p-4 mb-6">
          <div className="text-center text-white">
            <div className="text-3xl font-bold">{formatXAF(currentBet)}</div>
            <div className="text-sm">Multiplier: {multiplier.toFixed(2)}x</div>
          </div>
        </div>
      )}

      {/* Bet Amount Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Bet Amount (FCFA)
        </label>
        <div className="relative">
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            placeholder="0"
            disabled={hasPlacedBet}
            className="w-full px-3 py-2 pl-10 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
            onClick={() => {
              if (hasPlacedBet) {
                // Show small signal that betting is disabled
                const input = document.querySelector('input[type="number"]') as HTMLInputElement;
                if (input) {
                  input.style.borderColor = '#f59e0b';
                  setTimeout(() => {
                    input.style.borderColor = '#4b5563';
                  }, 300);
                }
              }
            }}
          />
          <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Quick Amount Buttons */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {quickAmounts.map((amount) => (
          <button
            key={amount}
            onClick={(event) => {
              if (hasPlacedBet) {
                // Show small signal that betting is disabled
                const button = event.target as HTMLButtonElement;
                if (button) {
                  button.style.backgroundColor = '#f59e0b';
                  setTimeout(() => {
                    button.style.backgroundColor = '';
                  }, 300);
                }
                return;
              }
              handleQuickAmount(amount);
            }}
            disabled={hasPlacedBet}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm transition-colors"
          >
            {formatXAF(amount)}
          </button>
        ))}
      </div>

      {/* Auto Cashout */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Auto Cashout (x)
        </label>
        <div className="relative">
          <input
            type="number"
            value={autoCashout}
            onChange={(e) => setAutoCashout(e.target.value)}
            placeholder="2.00"
            disabled={hasPlacedBet}
            className="w-full px-3 py-2 pl-10 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
            onClick={() => {
              if (hasPlacedBet) {
                // Show small signal that betting is disabled
                const input = document.querySelector('input[placeholder="2.00"]') as HTMLInputElement;
                if (input) {
                  input.style.borderColor = '#f59e0b';
                  setTimeout(() => {
                    input.style.borderColor = '#4b5563';
                  }, 300);
                }
              }
            }}
          />
          <Zap className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={handlePlaceBet}
          disabled={loading || !betAmount || parseAmount(betAmount) <= 0 || gameState !== 'waiting' || !isConnected || hasPlacedBet}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-3 rounded-lg font-semibold transition-colors"
        >
          {loading ? 'Placing Bet...' : 'Place Bet'}
        </button>
        
        <button
          onClick={handleCashout}
          disabled={loading || !hasPlacedBet || gameState !== 'running' || !isConnected}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-3 rounded-lg font-semibold transition-colors"
        >
          {loading ? 'Processing...' : 'Cash Out'}
        </button>
      </div>
    </motion.div>
  );
};

export default BettingInterface; 