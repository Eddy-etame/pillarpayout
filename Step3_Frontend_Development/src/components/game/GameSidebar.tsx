import React, { useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import socket from '../../utils/socket';

const GameSidebar: React.FC = () => {
  const { 
    connectedPlayers, 
    roundHistory, 
    liveBets,
    setRoundHistory,
    setLiveBets,
    setConnectedPlayers,
    addLiveBet,
    removeLiveBet,
    addRoundHistory
  } = useGameStore();

  // Listen for real-time updates
  useEffect(() => {
    const handleGameUpdate = (data: any) => {
      if (data.type === 'state_update') {
        // Update game state
        if (data.data.connectedPlayers !== undefined) {
          setConnectedPlayers(data.data.connectedPlayers);
        }
      }
    };

    const handleLiveBets = (bets: any[]) => {
      const typedBets = bets.map(bet => ({
        userId: bet.userId,
        username: bet.username,
        amount: bet.amount,
        multiplier: bet.multiplier || 0,
        timestamp: new Date(bet.timestamp)
      }));
      setLiveBets(typedBets);
    };

    const handleRoundHistory = (history: any[]) => {
      const typedHistory = history.map(round => ({
        roundId: round.id,
        multiplier: round.crash_point,
        crashed: true,
        timestamp: new Date(round.timestamp),
        crashPoint: round.crash_point
      }));
      setRoundHistory(typedHistory);
    };

    const handleNewBet = (bet: any) => {
      const newBet = {
        userId: bet.userId,
        username: bet.username,
        amount: bet.amount,
        multiplier: 0,
        timestamp: new Date()
      };
      
      addLiveBet(newBet);
    };

    const handleBetRemoved = (userId: string) => {
      removeLiveBet(userId);
    };

    const handleNewRound = (round: any) => {
      const newRound = {
        roundId: round.id,
        multiplier: round.crash_point,
        crashed: true,
        timestamp: new Date(round.timestamp),
        crashPoint: round.crash_point
      };
      
      addRoundHistory(newRound);
    };

    // Listen for socket events
    socket.on('game_update', handleGameUpdate);
    socket.on('live_bets', handleLiveBets);
    socket.on('round_history', handleRoundHistory);
    socket.on('new_bet', handleNewBet);
    socket.on('bet_removed', handleBetRemoved);
    socket.on('new_round', handleNewRound);

    // Request initial data
    socket.emit('get_round_history');
    socket.emit('get_live_bets');

    return () => {
      socket.off('game_update');
      socket.off('live_bets');
      socket.off('round_history');
      socket.off('new_bet');
      socket.off('bet_removed');
      socket.off('new_round');
    };
  }, [setRoundHistory, setLiveBets, setConnectedPlayers]);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 h-full overflow-y-auto">
      {/* Game Statistics */}
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-3">Game Statistics</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Online Players</span>
            <span className="text-white font-semibold">{connectedPlayers.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Active Bets</span>
            <span className="text-white font-semibold">{liveBets.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Total Wagered</span>
            <span className="text-white font-semibold">
              {formatCurrency(liveBets.reduce((sum, bet) => sum + bet.amount, 0))}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Average Bet</span>
            <span className="text-white font-semibold">
              {liveBets.length > 0 
                ? formatCurrency(liveBets.reduce((sum, bet) => sum + bet.amount, 0) / liveBets.length)
                : '$0.00'
              }
            </span>
          </div>
        </div>
      </div>

      {/* Round History */}
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-3">Round History</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {roundHistory.length > 0 ? (
            roundHistory.map((round) => (
              <div
                key={round.roundId}
                className="flex items-center justify-between p-2 bg-slate-700 rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400">#{round.roundId}</span>
                  <span className={`text-sm font-semibold ${
                    round.crashed ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {round.multiplier.toFixed(2)}x
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {formatTime(round.timestamp)}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center text-slate-500 text-sm py-4">
              No recent rounds
            </div>
          )}
        </div>
      </div>

      {/* Live Bets */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Live Bets</h3>
        <div className="space-y-2">
          {liveBets.length > 0 ? (
            liveBets.map((bet, index) => (
              <div
                key={`${bet.userId}-${index}`}
                className="flex items-center justify-between p-2 bg-slate-700 rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm text-white truncate max-w-20">
                    {bet.username}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-green-400 font-semibold">
                    {formatCurrency(bet.amount)}
                  </div>
                  <div className="text-xs text-slate-400">
                    {formatTime(bet.timestamp)}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-slate-500 text-sm py-4">
              No active bets
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameSidebar; 