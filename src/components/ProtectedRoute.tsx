import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/auth-context';
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
  const { user, profile, checkAuth, initialized } = useAuth();
  const isProfessor = profile?.role === 'teacher' || profile?.role === 'admin';

  useEffect(() => {
    // If we have a user but no profile, try to load the profile
    if (user && !profile) {
      checkAuth();
    }
  }, [user, profile, checkAuth]);

  useEffect(() => {
    console.log('ProtectedRoute state:', {
      user: !!user,
      profile: profile,
      isProfessor,
      requireAuth,
      requireProfessor
    });

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
    } else if (requireProfessor && !isProfessor) {
      console.log('Access denied - not a professor:', { profile, isProfessor });
      toast({
        title: "Access denied",
        description: "This page is only accessible to professors",
        variant: "destructive",
      });
      navigate('/dashboard');
    }
  }, [user, profile, navigate, requireAuth, requireUnauth, requireProfessor, isProfessor, toast]);

  // Don't render anything until we have the necessary data
  if (requireAuth && !user) return null;
  if (requireUnauth && user) return null;
  if (requireProfessor && (!profile || !isProfessor)) return null;

  return <>{children}</>;
}; 