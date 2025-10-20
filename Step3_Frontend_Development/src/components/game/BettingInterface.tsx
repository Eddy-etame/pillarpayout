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
  const [selectedInsurance, setSelectedInsurance] = useState<'basic' | 'premium' | 'elite' | null>(null);
  const [insuranceOptions, setInsuranceOptions] = useState<any[]>([]);
  const [insuranceGames, setInsuranceGames] = useState(1); // Number of games to insure
  const [insuranceLoading, setInsuranceLoading] = useState(false);

  const numericBalance: number = (() => {
    const b: unknown = user?.balance as unknown;
    if (typeof b === 'number' && Number.isFinite(b)) return b;
    const parsed = parseFloat(String(b ?? '0'));
    return Number.isFinite(parsed) ? parsed : 0;
  })();

  const MIN_BET = 100; // FCFA

  // Fetch insurance options when bet amount changes
  const fetchInsuranceOptions = async (amount: number) => {
    if (amount < 100) { // Minimum bet for insurance
      setInsuranceOptions([]);
      return;
    }
    
    setInsuranceLoading(true);
    try {
      console.log('🔍 Fetching insurance for amount:', amount);
      const response = await fetch(`http://localhost:3001/api/insurance/options?betAmount=${amount}`);
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Insurance data:', data);
        setInsuranceOptions(data.options || []);
      } else {
        console.error('❌ Insurance API error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('❌ Error details:', errorText);
        setInsuranceOptions([]);
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      setInsuranceOptions([]);
    } finally {
      setInsuranceLoading(false);
    }
  };

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
      
      // Send bet to backend via WebSocket with insurance
      if (isConnected) {
        sendMessage({
          type: 'player_action',
          action: 'bet',
          amount: bet,
          insuranceType: selectedInsurance,
          insuranceGames: selectedInsurance ? insuranceGames : 1,
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
    fetchInsuranceOptions(amount);
  };

  // Fetch insurance options when bet amount changes
  React.useEffect(() => {
    const amount = parseAmount(betAmount);
    
    if (amount && amount >= 100) {
      fetchInsuranceOptions(amount);
    } else {
      setInsuranceOptions([]);
      setSelectedInsurance(null); // Reset insurance selection when amount is invalid
    }
  }, [betAmount]);

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

      {/* Insurance Options */}
      {parseAmount(betAmount) >= 100 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-300">
              🛡️ Bet Insurance (Optional)
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">For</span>
              <select
                value={insuranceGames}
                onChange={(e) => setInsuranceGames(parseInt(e.target.value))}
                className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
              >
                <option value={1}>1 game</option>
                <option value={3}>3 games</option>
                <option value={5}>5 games</option>
                <option value={10}>10 games</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            {/* No Insurance Option */}
            <button
              onClick={() => setSelectedInsurance(null)}
              className={`w-full p-4 rounded-lg border-2 transition-all ${
                selectedInsurance === null
                  ? 'border-green-500 bg-green-500/20'
                  : 'border-gray-600 bg-gray-700 hover:border-gray-500'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="text-left">
                  <div className="font-semibold text-lg">No Insurance</div>
                  <div className="text-sm text-gray-400">
                    Play without protection - Risk it all!
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-400">
                    {formatXAF(parseAmount(betAmount))}
                  </div>
                  <div className="text-xs text-gray-400">Bet Only</div>
                </div>
              </div>
            </button>
            
            {/* Loading State */}
            {insuranceLoading && (
              <div className="w-full p-4 rounded-lg border-2 border-gray-600 bg-gray-700">
                <div className="flex justify-center items-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mr-2"></div>
                  <div className="text-sm text-gray-400">Loading insurance options...</div>
                </div>
              </div>
            )}
            
            {/* Insurance Options */}
            {insuranceOptions.length > 0 && insuranceOptions.map((option) => {
              const totalPremium = option.premium * insuranceGames;
              const totalCoverage = option.coverageAmount * insuranceGames;
              const totalCost = option.totalCost * insuranceGames;
              const netCost = totalCost - parseAmount(betAmount);
              
              return (
                <button
                  key={option.type}
                  onClick={() => setSelectedInsurance(option.type)}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    selectedInsurance === option.type
                      ? 'border-orange-500 bg-orange-500/20'
                      : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="text-left flex-1">
                      <div className="font-semibold text-lg capitalize">{option.type} Insurance</div>
                      <div className="text-sm text-gray-400 mb-2">
                        {insuranceGames} game{insuranceGames > 1 ? 's' : ''} • {formatXAF(option.premium)} per game
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-gray-800 p-2 rounded">
                          <div className="text-gray-400">Premium</div>
                          <div className="font-bold text-red-400">{formatXAF(totalPremium)}</div>
                        </div>
                        <div className="bg-gray-800 p-2 rounded">
                          <div className="text-gray-400">Coverage</div>
                          <div className="font-bold text-green-400">{formatXAF(totalCoverage)}</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-lg font-bold">
                        {formatXAF(totalCost)}
                      </div>
                      <div className="text-xs text-gray-400">Total Cost</div>
                      <div className="text-xs text-orange-400 mt-1">
                        +{formatXAF(netCost)} extra
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          
          <div className="mt-3 p-3 bg-gray-900 rounded-lg">
            <div className="text-xs text-gray-400 space-y-1">
              <p>• <strong>Premium:</strong> What you pay upfront for insurance</p>
              <p>• <strong>Coverage:</strong> What you get back if you lose</p>
              <p>• <strong>Multi-game:</strong> Insurance applies to {insuranceGames} consecutive game{insuranceGames > 1 ? 's' : ''}</p>
              <p>• <strong>Auto-claim:</strong> Coverage is automatically applied when you lose</p>
            </div>
          </div>
        </div>
      )}

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