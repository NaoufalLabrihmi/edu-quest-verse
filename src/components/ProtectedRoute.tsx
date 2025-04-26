import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToast } from '@/components/ui/use-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireUnauth?: boolean;
}

export const ProtectedRoute = ({
  children,
  requireAuth = false,
  requireUnauth = false,
}: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthStore();

  useEffect(() => {
    if (requireAuth && !user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to access this page",
        variant: "destructive",
      });
      navigate('/login');
    } else if (requireUnauth && user) {
      // Only redirect to dashboard if trying to access auth pages
      const isAuthPage = window.location.pathname === '/login' || 
                        window.location.pathname === '/register' || 
                        window.location.pathname === '/auth/confirm-email';
      if (isAuthPage) {
        navigate('/dashboard');
      }
    }
  }, [user, navigate, requireAuth, requireUnauth, toast]);

  if (requireAuth && !user) return null;
  if (requireUnauth && user) return null;

  return <>{children}</>;
}; 