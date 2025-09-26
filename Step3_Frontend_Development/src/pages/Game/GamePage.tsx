import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useAuthStore } from '../../stores/authStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import Tower3D from '../../components/game/Tower3D';
import BettingInterface from '../../components/game/BettingInterface';
import GameSidebar from '../../components/game/GameSidebar';
import ChatWindow from '../../components/game/ChatWindow';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

const GamePage: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    gameState, 
    currentRound, 
    multiplier, 
    integrity, 
    roundTime,
    setGameState, 
    setMultiplier, 
    setIntegrity, 
    setRoundTime, 
    setCurrentRound 
  } = useGameStore();
  


  // Use ref to track current time to avoid stale closure issues
  const currentTimeRef = useRef(0);

  // Initialize game state when component mounts
  useEffect(() => {
    if (user) {
      // Set initial game state
      setGameState('waiting');
      setMultiplier(1.0);
      setIntegrity(100);
      setCurrentRound(1);
      setRoundTime(0);
    }
  }, [user, setGameState, setMultiplier, setIntegrity, setCurrentRound, setRoundTime]);

  // Remove local game simulation - backend handles all game logic
  // useEffect(() => {
  //   if (gameState === 'waiting' && isConnected) {
  //     // Start a new round after 5 seconds
  //     const timer = setTimeout(() => {
  //       setGameState('running');
  //       setMultiplier(1.0);
  //       setIntegrity(100);
  //       setRoundTime(0);
  //     }, 5000);

  //     return () => clearTimeout(timer);
  //   }
  // }, [gameState, isConnected, setGameState, setMultiplier, setIntegrity, setRoundTime]);

  // Remove local multiplier simulation - backend provides real-time updates
  // useEffect(() => {
  //   if (gameState === 'running') {
  //     const interval = setInterval(() => {
  //       const newTime = currentTimeRef.current + 100;
  //       currentTimeRef.current = newTime;
  //       setRoundTime(newTime);
  //       
  //       // Match backend speed: 0.05x per 100ms = 0.5x per second
  //       const newMultiplier = multiplier + 0.05;
  //       setMultiplier(newMultiplier);
  //       
  //       // Simulate crash at random point between 1.5x and 5x
  //       if (newMultiplier > 2.5 && Math.random() < 0.02) {
  //         setGameState('crashed');
  //       }
  //       
  //       // Decrease integrity as multiplier increases (faster to match multiplier speed)
  //       const newIntegrity = Math.max(0, 100 - (newMultiplier - 1) * 10);
  //       setIntegrity(newIntegrity);
  //     }, 100);

  //     return () => clearInterval(interval);
  //   }
  // }, [gameState, setRoundTime, setMultiplier, setIntegrity, setGameState, multiplier, roundTime]);

  // Handle crash state with victory lap
  useEffect(() => {
    if (gameState === 'crashed') {
      // Victory lap - show results for 3 seconds
      const victoryTimer = setTimeout(() => {
        setGameState('results');
      }, 3000);

      return () => clearTimeout(victoryTimer);
    }
  }, [gameState, setGameState]);

  // Handle results state with break time
  useEffect(() => {
    if (gameState === 'results') {
      // Break time between rounds - 5 seconds
      const breakTimer = setTimeout(() => {
        setGameState('waiting');
        setMultiplier(1.0);
        setIntegrity(100);
        currentTimeRef.current = 0; // Reset ref
        setRoundTime(0);
        setCurrentRound(currentRound + 1);
      }, 5000);

      return () => clearTimeout(breakTimer);
    }
  }, [gameState, setGameState, setMultiplier, setIntegrity, setRoundTime, setCurrentRound, currentRound]);

  // Reset time ref when game state changes to waiting
  useEffect(() => {
    if (gameState === 'waiting') {
      currentTimeRef.current = 0;
    }
  }, [gameState]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Please log in to play the game.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - Betting Interface */}
          <div className="lg:col-span-1">
            <BettingInterface />
          </div>

          {/* Main Game Area */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-2xl font-bold mb-6 text-center">PillarPayout Tower</h2>
              
              {/* Game Status */}
              <div className="mb-6 text-center">
                <div className="text-lg font-semibold mb-2">
                  Round #{currentRound}
                </div>
                <div className={`text-2xl font-bold ${
                  gameState === 'running' ? 'text-green-400' : 
                  gameState === 'crashed' ? 'text-red-400' : 
                  gameState === 'results' ? 'text-yellow-400' : 'text-gray-400'
                }`}>
                  {gameState === 'running' ? `${multiplier.toFixed(2)}x` : 
                   gameState === 'crashed' ? 'CRASHED!' : 
                   gameState === 'results' ? 'VICTORY LAP!' : 'Waiting...'}
                </div>
                <div className="text-sm text-gray-400 mb-2">
                  {gameState === 'running' && `Time: ${(roundTime / 1000).toFixed(1)}s`}
                  {gameState === 'results' && 'Next round starting soon...'}
                </div>
                {/* Performance Indicator */}
                <div className="inline-flex items-center text-xs bg-blue-600 text-white px-3 py-1 rounded-full">
                  ⚡ High-Speed Updates (0.05x/100ms)
                </div>
              </div>

              {/* 3D Tower */}
              <div className="h-96 bg-gray-900 rounded-lg overflow-hidden">
                <Canvas camera={{ position: [0, 5, 8], fov: 60 }}>
                  <Tower3D 
                    multiplier={multiplier}
                    gameState={gameState}
                    integrity={integrity}
                  />
                  <OrbitControls 
                    enablePan={false}
                    enableZoom={true}
                    enableRotate={true}
                    minDistance={5}
                    maxDistance={15}
                  />
                </Canvas>
              </div>

              {/* Game Controls */}
              <div className="mt-6 text-center">
                <div className="text-sm text-gray-400">
                  {gameState === 'waiting' && 'Place your bet and wait for the round to start...'}
                  {gameState === 'running' && 'Round in progress! Cash out before it crashes!'}
                  {gameState === 'crashed' && 'Round ended! Victory lap in progress...'}
                  {gameState === 'results' && 'Break time! Prepare for the next round...'}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Game Info & Chat */}
          <div className="lg:col-span-1 space-y-6">
            <GameSidebar />
            <ChatWindow />
          </div>
        </div>
      </div>
      
      {/* Live Chat Window */}
      <ChatWindow />
    </div>
  );
};

export default GamePage;
