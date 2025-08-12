import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../stores/gameStore';

interface GameUpdate {
  type: 'game_state' | 'multiplier' | 'crash' | 'round_start' | 'round_end' | 'player_bet' | 'player_cashout' | 'initial_state' | 'state_update' | 'victory_lap';
  data: any;
}

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

export const useWebSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const [isConnected, setIsConnected] = useState(false);
  
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
    resetGame
  } = useGameStore();

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
          setConnectedPlayers(update.data.players || 0);
        }
        break;
        
      case 'multiplier':
        setMultiplier(update.data.multiplier);
        setIntegrity(update.data.integrity);
        setRoundTime(update.data.roundTime);
        break;
        
      case 'crash':
        setGameState('crashed');
        setCrashPoint(update.data.crashPoint);
        setMultiplier(update.data.finalMultiplier);
        setIntegrity(0);
        
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
        break;
        
      case 'round_end':
        setGameState('waiting');
        setMultiplier(1.0);
        setIntegrity(100);
        break;
        
      case 'player_bet':
        addLiveBet(update.data);
        break;
        
      case 'player_cashout':
        removeLiveBet(update.data.userId);
        break;
    }
  }, [setGameState, setMultiplier, setIntegrity, setCurrentRound, setRoundTime, setConnectedPlayers, addLiveBet, removeLiveBet, addRoundHistory, setCrashPoint, resetGame]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttempts.current++;
      connect();
    }, delay);
  }, []);

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
      scheduleReconnect();
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

    socketRef.current = socket;
  }, [scheduleReconnect, handleGameUpdate]);

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
