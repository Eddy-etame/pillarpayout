import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useGameStore } from './stores/gameStore';
import GameCanvas from './components/game/GameCanvas';
import BettingInterface from './components/game/BettingInterface';
import ChatWindow from './components/game/ChatWindow';
import GameSidebar from './components/game/GameSidebar';
import ProfilePage from './components/profile/ProfilePage';
import socket from './utils/socket';

// Header component with navigation
const Header: React.FC = () => {
  const { userId, username, playerBalance, setUserId, setUsername, setPlayerBalance } = useGameStore();
  const location = useLocation();

  const handleLogin = () => {
    // Simulate login - in real app this would be proper authentication
    const mockUserId = 'user_' + Date.now();
    const mockUsername = 'Player' + Math.floor(Math.random() * 1000);
    const mockBalance = 1000;

    setUserId(mockUserId);
    setUsername(mockUsername);
    setPlayerBalance(mockBalance);

    // Connect to socket with user info
    socket.connect(mockUserId);
  };

  const handleLogout = () => {
    setUserId('');
    setUsername('');
    setPlayerBalance(1000);
    socket.disconnect();
  };

  return (
    <header className="bg-slate-800 border-b border-slate-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold">P</span>
            </div>
            <h1 className="text-2xl font-bold text-blue-400">PillarPayout</h1>
          </div>
          
          <nav className="hidden md:flex space-x-6">
            <Link 
              to="/" 
              className={`transition-colors ${
                location.pathname === '/' 
                  ? 'text-white' 
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Game
            </Link>
            <Link 
              to="/profile" 
              className={`transition-colors ${
                location.pathname === '/profile' 
                  ? 'text-white' 
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Profile
            </Link>
          </nav>
          
          <div className="flex items-center space-x-4">
            {userId ? (
              <>
                <div className="text-right">
                  <p className="text-slate-400 text-sm">{username}</p>
                  <p className="text-green-400 font-semibold">${playerBalance.toFixed(2)}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors text-white"
                >
                  Logout
                </button>
              </>
            ) : (
              <button 
                onClick={handleLogin}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors text-white"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

// Game page component
const GamePage: React.FC = () => {
  const { 
    setCurrentRound, 
    setGameActive, 
    setConnectedPlayers, 
    setRoundTime,
    setMultiplier,
    setGameState,
    userId
  } = useGameStore();

  // Simulate game state updates
  useEffect(() => {
    let currentTime = 0;
    let currentMultiplier = 1.00;
    let gameInterval: NodeJS.Timeout;

    const startNewRound = () => {
      setGameState('waiting');
      setMultiplier(1.00);
      currentMultiplier = 1.00;
      currentTime = 0;
      
      // Simulate countdown
      setTimeout(() => {
        setGameState('running');
        setGameActive(true);
        
        gameInterval = setInterval(() => {
          currentTime += 100;
          currentMultiplier += 0.05; // 0.05x per 100ms
          setRoundTime(currentTime);
          setMultiplier(currentMultiplier);
          
          // Simulate crash after random time
          if (Math.random() < 0.01) { // 1% chance per 100ms
            setGameState('crashed');
            setGameActive(false);
            clearInterval(gameInterval);
            
                         // Start new round after delay
             setTimeout(() => {
               const currentRound = Math.floor(Math.random() * 1000) + 1000;
               setCurrentRound(currentRound);
               startNewRound();
             }, 3000);
          }
        }, 100);
      }, 5000);
    };

    startNewRound();

    return () => {
      if (gameInterval) clearInterval(gameInterval);
    };
  }, [setCurrentRound, setGameActive, setRoundTime, setMultiplier, setGameState]);

  // Simulate connected players
  useEffect(() => {
    const interval = setInterval(() => {
      setConnectedPlayers(Math.floor(Math.random() * 100) + 50);
    }, 5000);

    return () => clearInterval(interval);
  }, [setConnectedPlayers]);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Game Area */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h2 className="text-2xl font-bold mb-6">PillarPayout Game</h2>
              <GameCanvas width={600} height={400} />
            </div>
          </div>

          {/* Betting Interface */}
          <div className="lg:col-span-1">
            <BettingInterface />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <GameSidebar />
          </div>
        </div>

        {/* Chat Section */}
        <div className="mt-6">
          <ChatWindow />
        </div>
      </div>
    </div>
  );
};

// Main App component
function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-900">
        <Header />
        <Routes>
          <Route path="/" element={<GamePage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 