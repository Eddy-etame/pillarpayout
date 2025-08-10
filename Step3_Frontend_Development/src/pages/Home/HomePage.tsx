import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Info, Wifi, Trophy, Users } from 'lucide-react';

const HomePage: React.FC = () => {
  const features = [
    {
      icon: <Wifi className="w-8 h-8" />,
      title: 'Real-time Gaming',
      description: 'Experience seamless multiplayer gaming with WebSocket technology.',
    },
    {
      icon: <Trophy className="w-8 h-8" />,
      title: 'Tournaments',
      description: 'Compete in exciting tournaments with real prizes and rewards.',
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Community',
      description: 'Join a vibrant community of gamers and chat in real-time.',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-6xl font-bold text-white mb-6"
          >
            Welcome to PillarPayout
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto"
          >
            The ultimate gaming platform with real-time multiplayer action
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/auth"
              className="bg-green-600 hover:bg-green-700 px-8 py-4 rounded-lg text-white font-semibold text-lg transition-colors flex items-center justify-center space-x-2"
            >
              <Play className="w-5 h-5" />
              <span>Start Playing</span>
            </Link>
            
            <button className="bg-gray-700 hover:bg-gray-600 px-8 py-4 rounded-lg text-white font-semibold text-lg transition-colors flex items-center justify-center space-x-2">
              <Info className="w-5 h-5" />
              <span>Learn More</span>
            </button>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 * index }}
                className="bg-gray-800 rounded-lg p-6 border border-gray-700"
              >
                <div className="text-green-400 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Game Status Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="bg-gray-800 rounded-lg p-8 border border-gray-700"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Current Round</h3>
                <p className="text-gray-300">Round #1234 - In Progress</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Active Players</h3>
                <p className="text-gray-300">1,234 players online</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
