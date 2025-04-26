import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/auth-context';

const Dashboard = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to role-specific dashboard
  if (user.user_metadata.role === 'student') {
    return <Navigate to="/student-dashboard" replace />;
  } else {
    return <Navigate to="/professor-dashboard" replace />;
  }
};

export default Dashboard;
