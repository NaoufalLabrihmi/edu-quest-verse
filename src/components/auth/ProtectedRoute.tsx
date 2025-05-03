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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-cyan-900 via-blue-950 to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-gradient-to-br from-cyan-700/30 to-blue-900/0 rounded-full blur-3xl animate-fade-in" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-gradient-to-tr from-blue-800/30 to-cyan-900/0 rounded-full blur-3xl animate-fade-in-slow" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-cyan-400 border-b-4 border-blue-500 shadow-cyan-glow mb-8" />
          <span className="text-3xl font-bold bg-gradient-to-r from-cyan-300 via-blue-300 to-teal-200 text-transparent bg-clip-text drop-shadow-lg animate-gradient-x">Loading...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}; 