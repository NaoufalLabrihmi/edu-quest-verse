import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

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
  const { user: authUser, profile, checkAuth, initialized, loading } = useAuth();
  const isProfessor = profile?.role === 'teacher' || profile?.role === 'admin';
  const profileLoaded = !authUser || !!profile;

  useEffect(() => {
    if (!loading && authUser && !profile) {
      checkAuth();
    }
  }, [loading, authUser, profile, checkAuth]);

  useEffect(() => {
    if (loading || !initialized || !profileLoaded) return;

    if (requireAuth && !authUser) {
      toast({
        title: "Authentication required",
        description: "Please sign in to access this page",
        variant: "destructive",
      });
      navigate('/');
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
  }, [authUser, profile, navigate, requireAuth, requireUnauth, requireProfessor, isProfessor, toast, loading, initialized, profileLoaded]);

  if (loading || !initialized || !profileLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8 text-purple-500" />
        <span className="ml-3 text-lg text-gray-600">Loading...</span>
      </div>
    );
  }

  return <>{children}</>;
}; 