import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/auth-context';

const Dashboard = () => {
  const { user, profile } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to role-specific dashboard
  if (profile?.role === 'admin') {
    return <Navigate to="/dashboard_admin" replace />;
  } else if (profile?.role === 'student') {
    return <Navigate to="/student-dashboard" replace />;
  } else {
    return <Navigate to="/professor-dashboard" replace />;
  }
};

export default Dashboard;
