import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../stores/gameStore';
import { useAuthStore } from '../stores/authStore';

interface GameUpdate {
  type: 'game_state' | 'multiplier' | 'crash' | 'round_start' | 'round_end' | 'player_bet' | 'player_cashout' | 'initial_state' | 'state_update' | 'victory_lap' | 'crash_point_info';
  data: any;
}

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

export const useWebSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const [isConnected, setIsConnected] = useState(false);
  
  // Performance optimization: throttle rapid updates
  const lastUpdateTime = useRef(0);
  const updateThrottle = 50; // Minimum 50ms between updates for smooth performance
  
  const {
    setGameState,
    setMultiplier,
    setIntegrity,
    setCurrentRound,
    setRoundTime,
    setConnectedPlayers,
    addLiveBet,
    removeLiveBet,
    addRoundHistory,
    setCrashPoint,
    setCurrentBet,
    setHasPlacedBet,
    currentBet
  } = useGameStore();

  const { updateBalance } = useAuthStore();

  const handleGameUpdate = useCallback((update: GameUpdate) => {
    switch (update.type) {
      case 'initial_state':
      case 'state_update':
        if (update.data) {
          setGameState(update.data.state || update.data.gameState);
          setCurrentRound(update.data.round || update.data.roundId);
          setMultiplier(update.data.multiplier || 1.0);
          setIntegrity(update.data.integrity || 100);
          setRoundTime(update.data.time || update.data.roundTime || 0);
          setConnectedPlayers(update.data.players || update.data.connectedPlayers || 0);
          // ✅ CRITICAL: Set crash point for frontend synchronization
          if (update.data.crashPoint) {
            setCrashPoint(update.data.crashPoint);
            console.log(`🎯 Crash point set: ${update.data.crashPoint}x`);
          }
        }
        break;
        
      case 'crash_point_info':
        // ✅ NEW: Handle crash point information separately
        if (update.data && update.data.crashPoint) {
          setCrashPoint(update.data.crashPoint);
          console.log(`🎯 Crash point info received: ${update.data.crashPoint}x (Round ${update.data.roundId})`);
        }
        break;
        
      case 'multiplier':
        // Performance optimization: throttle rapid updates for smooth UI
        const now = Date.now();
        if (now - lastUpdateTime.current >= updateThrottle) {
          setMultiplier(update.data.multiplier);
          setIntegrity(update.data.integrity);
          setRoundTime(update.data.roundTime);
          // ✅ CRITICAL: Update crash point if provided
          if (update.data.crashPoint) {
            setCrashPoint(update.data.crashPoint);
          }
          lastUpdateTime.current = now;
        }
        break;
        
      case 'crash':
        setGameState('crashed');
        setCrashPoint(update.data.crashPoint);
        setMultiplier(update.data.finalMultiplier);
        setIntegrity(0);
        
        // Reset bet state when tower crashes - user loses their bet
        if (currentBet > 0) {
          // Deduct the bet amount from user's balance since they lost
          const currentUser = useAuthStore.getState().user;
          if (currentUser) {
            const newBalance = Math.max(0, currentUser.balance - currentBet);
            updateBalance(newBalance);
            console.log(`💸 Bet lost! ${currentBet} FCFA deducted from balance. New balance: ${newBalance} FCFA`);
          }
        }
        setCurrentBet(0);
        setHasPlacedBet(false);
        
        // Add to round history
        addRoundHistory({
          roundId: update.data.roundId,
          multiplier: update.data.finalMultiplier,
          crashed: true,
          timestamp: new Date(),
          crashPoint: update.data.crashPoint
        });
        break;
        
      case 'victory_lap':
        setGameState('results');
        setMultiplier(update.data.finalMultiplier);
        setIntegrity(0);
        break;
        
      case 'round_start':
        setGameState('running');
        setCurrentRound(update.data.round);
        setMultiplier(1.0);
        setIntegrity(100);
        setRoundTime(0);
        
        // Reset bet state for new round
        setCurrentBet(0);
        setHasPlacedBet(false);
        break;
        
      case 'round_end':
        setGameState('waiting');
        setMultiplier(1.0);
        setIntegrity(100);
        
        // Reset bet state when round ends
        setCurrentBet(0);
        setHasPlacedBet(false);
        break;
        
      case 'player_bet':
        addLiveBet(update.data);
        break;
        
      case 'player_cashout':
        removeLiveBet(update.data.userId);
        
        // Reset bet state when player cashes out
        if (currentBet > 0) {
          const currentMultiplier = useGameStore.getState().multiplier;
          console.log(`🎉 Cashout successful! Bet: ${currentBet} FCFA, Multiplier: ${currentMultiplier}x`);
        }
        setCurrentBet(0);
        setHasPlacedBet(false);
        break;
    }
  }, [setGameState, setMultiplier, setIntegrity, setCurrentRound, setRoundTime, setConnectedPlayers, addLiveBet, removeLiveBet, addRoundHistory, setCrashPoint, setCurrentBet, setHasPlacedBet, currentBet, updateBalance]);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return; // Already connected
    }

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      timeout: 20000
    });
    
    socket.on('connect', () => {
      console.log('Socket.IO connected');
      setIsConnected(true);
      reconnectAttempts.current = 0;
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
      setIsConnected(false);
      // Schedule reconnect without circular dependency
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current++;
          // Use a direct function call instead of the connect reference
          const socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: maxReconnectAttempts,
            reconnectionDelay: 1000,
            timeout: 20000
          });
          socketRef.current = socket;
        }, delay);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      setIsConnected(false);
    });

    socket.on('game_update', (data) => {
      handleGameUpdate(data);
    });

    socket.on('live_bets', (bets) => {
      // Handle live bets update
      console.log('Live bets update:', bets);
    });

    socket.on('round_history', (history) => {
      // Handle round history update
      console.log('Round history update:', history);
    });

    socket.on('chat_message', (message) => {
      // Handle incoming chat messages
      console.log('Chat message received:', message);
      // You can emit a custom event here to update the chat component
      window.dispatchEvent(new CustomEvent('chat_message', { detail: message }));
    });

    socket.on('game_event', (event) => {
      // Handle game events like bets, cashouts, etc.
      console.log('Game event received:', event);
      // You can emit a custom event here to update the chat component
    });

    socket.on('balance_update', (data) => {
      // Handle balance updates from successful transactions
      console.log('Balance update received:', data);
      const currentUser = useAuthStore.getState().user;
      if (currentUser && data.userId === currentUser.id) {
        updateBalance(data.newBalance);
        console.log(`💰 Balance updated! New balance: ${data.newBalance} FCFA (Added: ${data.amountAdded} FCFA)`);
      }
    });

    socketRef.current = socket;
  }, [handleGameUpdate, updateBalance]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('player_action', message);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    sendMessage
  };
};
