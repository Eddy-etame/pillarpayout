import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './pages/Home/HomePage';
import AuthPage from './pages/Auth/AuthPage';
import GamePage from './pages/Game/GamePage';
import ProfilePage from './pages/Profile/ProfilePage';
import AdminPage from './pages/Admin/AdminPage';
import RechargePage from './pages/Auth/RechargePage';
import VerificationPage from './pages/Auth/VerificationPage';
import { useAuthStore } from './stores/authStore';
import './App.css';

function Protected({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/auth" replace />;
}

function AppRoutes() {
  const { isAuthenticated, hydrated, user } = useAuthStore();
  const location = useLocation();

  // Ensure hydration triggers and never hangs
  useEffect(() => {
    if (!hydrated) {
      // Trigger persist rehydrate if available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const storeAny = useAuthStore as any;
      storeAny.persist?.rehydrate?.();
      const timeout = setTimeout(() => {
        useAuthStore.setState({ hydrated: true });
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [hydrated]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated && location.pathname === '/auth') {
    return <Navigate to="/game" replace />;
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/recharge" element={<RechargePage />} />
      <Route path="/verify" element={<VerificationPage />} />
      <Route path="/game" element={<Protected><GamePage /></Protected>} />
      <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
      <Route 
        path="/admin" 
        element={isAuthenticated && user?.role === 'admin' ? <AdminPage /> : <Navigate to="/auth" replace />} 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-900 text-white">
        <Header />
        <main className="flex-1">
          <AnimatePresence mode="wait">
            <AppRoutes />
          </AnimatePresence>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App; 