import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/auth-context';

const Dashboard = () => {
  const { user, profile } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Only allow admin dashboard, otherwise redirect to login
  if (profile?.role === 'admin') {
    return <Navigate to="/dashboard_admin" replace />;
  } else {
    return <Navigate to="/login" replace />;
  }
};

export default Dashboard;
