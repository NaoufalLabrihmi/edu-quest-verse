import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/auth-context';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToast } from '@/components/ui/use-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireUnauth?: boolean;
  requireProfessor?: boolean;
}

export const ProtectedRoute = ({
  children,
  requireAuth = false,
  requireUnauth = false,
  requireProfessor = false,
}: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: authUser, loading } = useAuth();
  const { profile, checkAuth, initialized } = useAuthStore();
  const isProfessor = profile?.role === 'teacher' || profile?.role === 'admin';

  useEffect(() => {
    if (!loading && authUser && !profile) {
      checkAuth();
    }
  }, [loading, authUser, profile, checkAuth]);

  useEffect(() => {
    if (loading || !initialized) return;

    if (requireAuth && !authUser) {
      toast({
        title: "Authentication required",
        description: "Please sign in to access this page",
        variant: "destructive",
      });
      navigate('/login');
    } else if (requireUnauth && authUser) {
      const isAuthPage = window.location.pathname === '/login' || 
                        window.location.pathname === '/register' || 
                        window.location.pathname === '/auth/confirm-email';
      if (isAuthPage) {
        navigate('/dashboard');
      }
    } else if (requireProfessor && (!profile || !isProfessor)) {
      toast({
        title: "Access denied",
        description: "This page is only accessible to professors",
        variant: "destructive",
      });
      navigate(isProfessor ? '/professor-dashboard' : '/student-dashboard');
    }
  }, [authUser, profile, navigate, requireAuth, requireUnauth, requireProfessor, isProfessor, toast, loading, initialized]);

  if (loading || !initialized || (requireAuth && !authUser) || (requireUnauth && authUser) || (requireProfessor && !profile)) {
    return null;
  }

  return <>{children}</>;
}; 