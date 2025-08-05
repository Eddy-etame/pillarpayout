import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import socket from '../../utils/socket';

const BettingInterface: React.FC = () => {
  const { 
    playerBalance, 
    currentBet, 
    isGameActive, 
    gameState,
    multiplier,
    hasPlacedBet,
    userId,
    insuranceOptions,
    selectedInsurance,
    setCurrentBet, 
    setPlayerBalance,
    setHasPlacedBet,
    setInsuranceOptions,
    setSelectedInsurance
  } = useGameStore();

  const [betAmount, setBetAmount] = useState<number>(10);
  const [autoCashout, setAutoCashout] = useState<number>(2.0);
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(false);
  const [autoPlayRounds, setAutoPlayRounds] = useState<number>(5);
  const [showInsurance, setShowInsurance] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);

  // Calculate insurance cost
  const getInsuranceCost = () => {
    if (!selectedInsurance || !insuranceOptions) return 0;
    const option = insuranceOptions.find(opt => opt.type === selectedInsurance);
    return option ? option.premium : 0;
  };

  // Calculate total cost (bet + insurance)
  const getTotalCost = () => {
    return betAmount + getInsuranceCost();
  };

  // Handle bet placement
  const handleBetPlacement = async () => {
    if (!userId) {
      alert('Please log in to place a bet');
      return;
    }

    if (getTotalCost() > playerBalance) {
      alert('Insufficient balance!');
      return;
    }
    
    if (betAmount < 1 || betAmount > 1000) {
      alert('Bet amount must be between $1 and $1000!');
      return;
    }

    try {
      // Emit bet placement to server
      socket.emit('player_action', {
        action: 'bet',
        amount: betAmount,
        userId: userId,
        insuranceType: selectedInsurance
      });

      setCurrentBet(betAmount);
      setPlayerBalance(playerBalance - getTotalCost());
      setHasPlacedBet(true);
    } catch (error) {
      console.error('Error placing bet:', error);
      alert('Failed to place bet. Please try again.');
    }
  };

  // Handle cash out
  const handleCashOut = async () => {
    if (!userId || !hasPlacedBet || gameState !== 'running') return;
    
    try {
      // Emit cash out to server
      socket.emit('player_action', {
        action: 'cashout',
        userId: userId
      });
    } catch (error) {
      console.error('Error cashing out:', error);
      alert('Failed to cash out. Please try again.');
    }
  };

  // Handle auto-play toggle
  const handleAutoPlayToggle = () => {
    setIsAutoPlay(!isAutoPlay);
  };

  // Get insurance options when bet amount changes
  useEffect(() => {
    if (betAmount >= 5 && betAmount <= 1000) {
      // Request insurance options from server
      socket.emit('get_insurance_options', { betAmount });
    } else {
      setInsuranceOptions(null);
    }
  }, [betAmount, setInsuranceOptions]);

  // Listen for insurance options response
  useEffect(() => {
    const handleInsuranceOptions = (data: any) => {
      if (data.available) {
        setInsuranceOptions(data.options);
      } else {
        setInsuranceOptions(null);
      }
    };

    socket.on('insurance_options', handleInsuranceOptions);
    return () => socket.off('insurance_options');
  }, [setInsuranceOptions]);

  // Listen for bet result
  useEffect(() => {
    const handleBetResult = (data: any) => {
      if (data.success) {
        setPlayerBalance(data.newBalance);
      } else {
        alert(`Bet failed: ${data.message}`);
        // Revert changes
        setCurrentBet(0);
        setHasPlacedBet(false);
        setPlayerBalance(playerBalance + getTotalCost());
      }
    };

    const handleCashoutResult = (data: any) => {
      if (data.success) {
        setPlayerBalance(data.newBalance);
        setCurrentBet(0);
        setHasPlacedBet(false);
        alert(`Cashed out at ${data.cashoutMultiplier.toFixed(2)}x! Won $${data.winnings.toFixed(2)}`);
      } else {
        alert(`Cash out failed: ${data.message}`);
      }
    };

    socket.on('bet_result', handleBetResult);
    socket.on('cashout_result', handleCashoutResult);

    return () => {
      socket.off('bet_result');
      socket.off('cashout_result');
    };
  }, [playerBalance, setPlayerBalance, setCurrentBet, setHasPlacedBet]);

  return (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
      <h3 className="text-xl font-semibold mb-4 text-white">Betting Interface</h3>
      
      {/* Balance Display */}
      <div className="mb-4 p-3 bg-slate-700 rounded-lg">
        <p className="text-slate-300 text-sm">Balance</p>
        <p className="text-2xl font-bold text-green-400">${playerBalance.toFixed(2)}</p>
      </div>

      {/* Current Multiplier Display */}
      {isGameActive && (
        <div className="mb-4 p-3 bg-blue-900 border border-blue-600 rounded-lg">
          <p className="text-blue-300 text-sm">Current Multiplier</p>
          <p className="text-2xl font-bold text-blue-400">{multiplier.toFixed(2)}x</p>
        </div>
      )}

      {/* Bet Amount Input */}
      <div className="mb-4">
        <label className="block text-slate-300 text-sm mb-2">Bet Amount ($1 - $1000)</label>
        <input
          type="number"
          min="1"
          max="1000"
          value={betAmount}
          onChange={(e) => setBetAmount(Number(e.target.value))}
          className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
          disabled={hasPlacedBet || gameState === 'running'}
        />
      </div>

      {/* Insurance Section */}
      {insuranceOptions && insuranceOptions.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-slate-300 text-sm">Insurance</label>
            <button
              onClick={() => setShowInsurance(!showInsurance)}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              {showInsurance ? 'Hide' : 'Show'} Options
            </button>
          </div>
          
          {showInsurance && (
            <div className="space-y-2">
              {insuranceOptions.map((option) => (
                <div
                  key={option.type}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedInsurance === option.type
                      ? 'bg-blue-900 border-blue-600'
                      : 'bg-slate-700 border-slate-600 hover:border-slate-500'
                  }`}
                  onClick={() => setSelectedInsurance(selectedInsurance === option.type ? null : option.type)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white font-semibold capitalize">{option.type} Insurance</p>
                      <p className="text-slate-400 text-sm">
                        Premium: ${option.premium} | Coverage: ${option.coverageAmount}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-semibold">${option.totalCost}</p>
                      <p className="text-slate-400 text-xs">Total Cost</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Total Cost Display */}
      {selectedInsurance && (
        <div className="mb-4 p-3 bg-yellow-900 border border-yellow-600 rounded-lg">
          <p className="text-yellow-300 text-sm">Total Cost (Bet + Insurance)</p>
          <p className="text-xl font-bold text-yellow-400">${getTotalCost().toFixed(2)}</p>
        </div>
      )}

      {/* Bet Button */}
      <button
        onClick={handleBetPlacement}
        disabled={hasPlacedBet || gameState === 'running' || getTotalCost() > playerBalance}
        className="w-full mb-4 p-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        {hasPlacedBet ? 'Bet Placed' : 'Place Bet'}
      </button>

      {/* Cash Out Button */}
      <button
        onClick={handleCashOut}
        disabled={!hasPlacedBet || gameState !== 'running'}
        className="w-full mb-4 p-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        Cash Out
      </button>

      {/* Auto-Play Section */}
      <div className="border-t border-slate-600 pt-4">
        <h4 className="text-lg font-medium mb-3 text-white">Auto-Play Settings</h4>
        
        {/* Auto-Play Toggle */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-slate-300">Auto-Play</span>
          <button
            onClick={handleAutoPlayToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isAutoPlay ? 'bg-green-600' : 'bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isAutoPlay ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Auto-Cashout Multiplier */}
        <div className="mb-3">
          <label className="block text-slate-300 text-sm mb-2">Auto-Cashout Multiplier</label>
          <input
            type="number"
            min="1.1"
            step="0.1"
            value={autoCashout}
            onChange={(e) => setAutoCashout(Number(e.target.value))}
            className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            disabled={!isAutoPlay}
          />
        </div>

        {/* Auto-Play Rounds */}
        <div className="mb-3">
          <label className="block text-slate-300 text-sm mb-2">Number of Rounds</label>
          <input
            type="number"
            min="1"
            max="50"
            value={autoPlayRounds}
            onChange={(e) => setAutoPlayRounds(Number(e.target.value))}
            className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            disabled={!isAutoPlay}
          />
        </div>
      </div>

      {/* Current Bet Display */}
      {hasPlacedBet && (
        <div className="mt-4 p-3 bg-blue-900 border border-blue-600 rounded-lg">
          <p className="text-blue-300 text-sm">Current Bet</p>
          <p className="text-xl font-bold text-blue-400">${currentBet.toFixed(2)}</p>
          {selectedInsurance && (
            <p className="text-blue-300 text-sm">
              + {selectedInsurance} Insurance: ${getInsuranceCost().toFixed(2)}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default BettingInterface; 