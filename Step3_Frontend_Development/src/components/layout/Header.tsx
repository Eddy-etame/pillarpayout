import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Wifi, Wallet, Shield } from 'lucide-react';
import { formatXAF } from '../../utils/currency';

const Header: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, user, isAdmin, logout } = useAuthStore();

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/game', label: 'Game' },
    { path: '/tournaments', label: 'Tournaments' },
    { path: '/profile', label: 'Profile' },
  ];

  // Add admin navigation if user is admin
  if (isAdmin) {
    navItems.push({ path: '/admin', label: 'Admin' });
  }

  const numericBalance: number = (() => {
    const b: unknown = user?.balance as unknown;
    if (typeof b === 'number' && Number.isFinite(b)) return b;
    const parsed = parseFloat(String(b ?? '0'));
    return Number.isFinite(parsed) ? parsed : 0;
  })();

  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold text-white">P</span>
            </div>
            <h1 className="text-2xl font-bold text-white">PillarPayout</h1>
          </div>
          
          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`transition-colors flex items-center space-x-1 ${
                  location.pathname === item.path
                    ? 'text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {item.path === '/admin' && <Shield className="w-4 h-4" />}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          
          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {/* Auth Status */}
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${isAuthenticated ? 'bg-green-600' : 'bg-gray-600'}`}>
              <Wifi className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-medium">{isAuthenticated ? 'Authenticated' : 'Guest'}</span>
            </div>
            
            {/* Admin Badge */}
            {isAdmin && (
              <div className="flex items-center space-x-2 px-3 py-1 rounded-lg bg-purple-600">
                <Shield className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-medium">Admin</span>
              </div>
            )}
            
            {/* User Actions */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-gray-400 text-sm">{user?.username}</p>
                  <p className="text-green-400 font-semibold">{formatXAF(numericBalance)}</p>
                </div>
                <button
                  onClick={logout}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors text-white"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors text-white flex items-center space-x-2"
              >
                <Wallet className="w-4 h-4" />
                <span>Connect Wallet</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
