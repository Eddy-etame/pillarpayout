import { useEffect, useRef, useCallback, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useAuthStore } from '../stores/authStore';

interface GameUpdate {
  type: 'game_state' | 'multiplier' | 'crash' | 'round_start' | 'round_end' | 'player_bet' | 'player_cashout';
  data: any;
}

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';

export const useWebSocket = () => {
  const wsRef = useRef<WebSocket | null>(null);
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
  
  const { token } = useAuthStore();

  const handleGameUpdate = useCallback((update: GameUpdate) => {
    switch (update.type) {
      case 'game_state':
        setGameState(update.data.state);
        setCurrentRound(update.data.round);
        setRoundTime(update.data.time);
        setConnectedPlayers(update.data.players);
        break;
        
      case 'multiplier':
        setMultiplier(update.data.multiplier);
        setIntegrity(update.data.integrity);
        break;
        
      case 'crash':
        setGameState('crashed');
        setCrashPoint(update.data.crashPoint);
        setMultiplier(update.data.crashPoint);
        setIntegrity(0);
        
        // Add to round history
        addRoundHistory({
          roundId: update.data.roundId,
          multiplier: update.data.crashPoint,
          crashed: true,
          timestamp: new Date(),
          crashPoint: update.data.crashPoint
        });
        
        // Reset game after crash with delay
        setTimeout(() => {
          resetGame();
        }, 3000);
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
      // Use setTimeout to avoid circular dependency
      setTimeout(() => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          const ws = new WebSocket(WS_URL);
          
          ws.onopen = () => {
            console.log('WebSocket reconnected');
            setIsConnected(true);
            reconnectAttempts.current = 0;
            
            if (token) {
              ws.send(JSON.stringify({ type: 'auth', token }));
            }
          };
          
          ws.onclose = () => {
            console.log('WebSocket reconnection failed');
            setIsConnected(false);
          };
          
          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              handleGameUpdate(data);
            } catch (error) {
              console.error('Error parsing WebSocket message:', error);
            }
          };
          
          ws.onerror = (error) => {
            console.error('WebSocket reconnection error:', error);
          };
          
          wsRef.current = ws;
        }
      }, 0);
    }, delay);
  }, [token, handleGameUpdate]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      reconnectAttempts.current = 0;
      
      // Send authentication
      if (token) {
        ws.send(JSON.stringify({ type: 'auth', token }));
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      scheduleReconnect();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleGameUpdate(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current = ws;
  }, [token, scheduleReconnect, handleGameUpdate]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  useEffect(() => {
    if (token && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'auth',
        token: token
      }));
    }
  }, [token]);

  return {
    isConnected,
    sendMessage
  };
};
