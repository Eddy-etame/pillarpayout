import React from 'react';

function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
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
              <a href="#" className="text-slate-300 hover:text-white transition-colors">Home</a>
              <a href="#" className="text-slate-300 hover:text-white transition-colors">Game</a>
              <a href="#" className="text-slate-300 hover:text-white transition-colors">Tournaments</a>
              <a href="#" className="text-slate-300 hover:text-white transition-colors">Profile</a>
            </nav>
            <div className="flex items-center space-x-4">
              <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors">
                Connect Wallet
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Welcome to PillarPayout</h2>
          <p className="text-xl text-slate-400 mb-8">
            The ultimate gaming platform with real-time multiplayer action
          </p>
          <div className="flex justify-center space-x-4">
            <button className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold transition-colors">
              Start Playing
            </button>
            <button className="bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-lg font-semibold transition-colors">
              Learn More
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h3 className="text-xl font-semibold mb-3">Real-time Gaming</h3>
            <p className="text-slate-400">Experience seamless multiplayer gaming with WebSocket technology.</p>
          </div>
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h3 className="text-xl font-semibold mb-3">Tournaments</h3>
            <p className="text-slate-400">Compete in exciting tournaments with real prizes and rewards.</p>
          </div>
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h3 className="text-xl font-semibold mb-3">Community</h3>
            <p className="text-slate-400">Join a vibrant community of gamers and chat in real-time.</p>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h3 className="text-2xl font-semibold mb-4">Game Status</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-medium mb-2">Current Round</h4>
              <p className="text-slate-400">Round #1234 - In Progress</p>
            </div>
            <div>
              <h4 className="text-lg font-medium mb-2">Active Players</h4>
              <p className="text-slate-400">1,234 players online</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App; 