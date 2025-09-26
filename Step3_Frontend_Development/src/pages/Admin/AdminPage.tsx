import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const AdminPage: React.FC = () => {
  const { isAdmin } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) {
      navigate('/auth');
      return;
    }
    
    // Redirect to admin dashboard
    navigate('/admin/dashboard');
  }, [isAdmin, navigate]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-gray-400">Redirecting to Admin Dashboard...</div>
    </div>
  );
};

export default AdminPage;
