import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { GraduationCap, MessageCircle, User, Plus, Key, Menu, X, ShoppingBag, Receipt } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { toast } from 'react-hot-toast';
import { JoinQuizDialog } from '@/components/quiz/JoinQuizDialog';
import { PurchaseStatusBadge } from './admin/PurchaseStatusBadge';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StudentPurchaseDropdown } from './StudentPurchaseDropdown';

// Helper to get initials from user metadata
function getUserInitials(user) {
  const meta = user?.user_metadata || {};
  const name = meta.full_name || meta.name || meta.username || user.email || '';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0][0]?.toUpperCase() || '';
  return (words[0][0] + (words[1]?.[0] || '')).toUpperCase();
}

// Helper to get display name from user metadata
function getUserDisplayName(user) {
  const meta = user?.user_metadata || {};
  return meta.full_name || meta.name || meta.username || user.email || '';
}

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isJoinQuizOpen, setIsJoinQuizOpen] = useState(false);
  const { user, profile, signOut, initialized, checkAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isProfessor = profile?.role === 'teacher' || profile?.role === 'admin';
  const [showPurchases, setShowPurchases] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);

  useEffect(() => {
    if (!initialized || !profile) {
      checkAuth();
    }
  }, [initialized, profile, checkAuth]);

  useEffect(() => {
    if (profile?.role === 'student') {
      setPurchasesLoading(true);
      supabase
        .from('purchases')
        .select(`id, status, points_spent, created_at, products:products!purchases_product_id_fkey(name, image_url)`)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          setPurchasesLoading(false);
          if (!error && data) setPurchases(data);
        });
    }
  }, [profile]);

  const handleSignOut = async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to log out');
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/', { replace: true });
  };

  // Show loading state if not initialized or profile not loaded
  if (!initialized || !profile) {
    return (
      <header className="glass-nav bg-gradient-to-r from-[#0f172a] via-[#162032] to-[#1e293b] sticky top-0 z-50 border-b border-cyan-900/60 shadow-cyan-glow">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-700 via-blue-700 to-teal-700 shadow-cyan-glow animate-bounce-slow">
                <GraduationCap className="h-7 w-7 text-cyan-300 drop-shadow-cyan" />
              </div>
              <span className="text-2xl font-serif font-extrabold bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 bg-clip-text text-transparent tracking-tight animate-fadeIn">
                Brain Boost
              </span>
            </div>
          </div>
        </div>
        <div className="absolute left-0 right-0 bottom-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 animate-gradient-x opacity-80" />
        <style>{`
          @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
          .animate-bounce-slow { animation: bounce-slow 2.2s infinite; }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          .animate-fadeIn { animation: fadeIn 0.7s; }
          @keyframes gradient-x { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
          .animate-gradient-x { background-size: 200% 200%; animation: gradient-x 6s ease-in-out infinite; }
        `}</style>
      </header>
    );
  }

  return (
    <>
      <header className="glass-nav bg-gradient-to-r from-[#0f172a] via-[#162032] to-[#1e293b] sticky top-0 z-50 border-b border-cyan-900/60 shadow-cyan-glow">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link 
              to="/" 
              className="flex items-center space-x-3 group" 
              onClick={handleLogoClick}
            >
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-700 via-blue-700 to-teal-700 shadow-cyan-glow animate-bounce-slow">
                <GraduationCap className="h-7 w-7 text-cyan-300 drop-shadow-cyan" />
              </div>
              <span className="text-2xl font-serif font-extrabold bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 bg-clip-text text-transparent tracking-tight animate-fadeIn">
                Brain Boost
              </span>
            </Link>
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-2">
              {user ? (
                <>
                  {isProfessor ? (
                    <>
                      <Link 
                        to="/quizzes" 
                        className={`relative px-5 py-2 rounded-full font-bold text-cyan-100 bg-cyan-950/70 hover:bg-cyan-800/80 transition-all duration-200 card-hover focus:outline-none focus:ring-2 focus:ring-cyan-400/60 ${location.pathname === '/quizzes' ? 'active-nav-link' : ''}`}
                      >
                        <span className="relative z-10">Quizzes</span>
                        <span className="absolute left-0 bottom-0 w-full h-0.5 bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 rounded-full transition-all duration-300" style={{ height: location.pathname === '/quizzes' ? '3px' : '2px', opacity: location.pathname === '/quizzes' ? 1 : 0.5 }} />
                      </Link>
                      <Link 
                        to="/create-quiz" 
                        className={`relative px-5 py-2 rounded-full font-bold text-cyan-100 bg-cyan-950/70 hover:bg-cyan-800/80 transition-all duration-200 card-hover focus:outline-none focus:ring-2 focus:ring-cyan-400/60 ${location.pathname === '/create-quiz' ? 'active-nav-link' : ''}`}
                      >
                        <span className="relative z-10">Create Quiz</span>
                        <span className="absolute left-0 bottom-0 w-full h-0.5 bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 rounded-full transition-all duration-300" style={{ height: location.pathname === '/create-quiz' ? '3px' : '2px', opacity: location.pathname === '/create-quiz' ? 1 : 0.5 }} />
                      </Link>
                    </>
                  ) : (
                    <Button 
                      variant="ghost" 
                      className="relative px-5 py-2 rounded-full font-bold text-cyan-100 bg-cyan-900/40 hover:bg-cyan-800/60 transition-all duration-200 card-hover focus:outline-none focus:ring-2 focus:ring-cyan-400/60 flex items-center gap-2"
                      onClick={() => setIsJoinQuizOpen(true)}
                    >
                      <Key className="mr-2 h-4 w-4" />
                      Join Quiz
                      <span className="absolute left-0 bottom-0 w-full h-0.5 bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 rounded-full transition-all duration-300" style={{ height: location.pathname === '/join-quiz' ? '3px' : '2px', opacity: location.pathname === '/join-quiz' ? 1 : 0.5 }} />
                    </Button>
                  )}
                  {profile?.role === 'student' && (
                    <Link 
                      to="/shop" 
                      className={`relative px-5 py-2 rounded-full font-bold text-cyan-100 bg-cyan-950/70 hover:bg-cyan-800/80 transition-all duration-200 card-hover focus:outline-none focus:ring-2 focus:ring-cyan-400/60 ${location.pathname === '/shop' ? 'active-nav-link' : ''}`}
                    >
                      <span className="relative z-10">Shop</span>
                      <span className="absolute left-0 bottom-0 w-full h-0.5 bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 rounded-full transition-all duration-300" style={{ height: location.pathname === '/shop' ? '3px' : '2px', opacity: location.pathname === '/shop' ? 1 : 0.5 }} />
                    </Link>
                  )}
                  {profile?.role === 'student' && (
                    <div className="relative">
                      <button
                        className="relative px-5 py-2 rounded-full font-bold text-cyan-100 bg-cyan-900/40 hover:bg-cyan-800/60 transition-all duration-200 card-hover focus:outline-none focus:ring-2 focus:ring-cyan-400/60 flex items-center gap-2"
                        onClick={() => setShowPurchases((v) => !v)}
                        aria-label="My Purchases"
                      >
                        <Receipt className="w-5 h-5" />
                        {purchases.filter(p => p.status === 'pending').length > 0 && (
                          <span className="absolute -top-1 -right-1 bg-yellow-400 text-gray-900 text-xs rounded-full px-1.5 py-0.5 shadow-lg border-2 border-white animate-pulse">
                            {purchases.filter(p => p.status === 'pending').length}
                          </span>
                        )}
                        My Purchases
                        <span className="absolute left-0 bottom-0 w-full h-0.5 bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 rounded-full transition-all duration-300" style={{ height: location.pathname === '/purchases' ? '3px' : '2px', opacity: location.pathname === '/purchases' ? 1 : 0.5 }} />
                      </button>
                      {showPurchases && (
                        <StudentPurchaseDropdown
                          purchases={purchases}
                          loading={purchasesLoading}
                          onClose={() => setShowPurchases(false)}
                        />
                      )}
                    </div>
                  )}
                  <Link 
                    to="/forum" 
                    className={`relative px-5 py-2 rounded-full font-bold text-cyan-100 bg-cyan-950/70 hover:bg-cyan-800/80 transition-all duration-200 card-hover focus:outline-none focus:ring-2 focus:ring-cyan-400/60 ${location.pathname === '/forum' ? 'active-nav-link' : ''}`}
                  >
                    <span className="relative z-10">Forum</span>
                    <span className="absolute left-0 bottom-0 w-full h-0.5 bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 rounded-full transition-all duration-300" style={{ height: location.pathname === '/forum' ? '3px' : '2px', opacity: location.pathname === '/forum' ? 1 : 0.5 }} />
                  </Link>
                  <div className="flex items-center ml-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="relative h-11 w-11 rounded-full bg-cyan-900/40 hover:bg-cyan-800/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 flex items-center justify-center p-0 border-0"
                        >
                          <div className="relative group">
                            {user.user_metadata.avatar_url ? (
                              <span className="absolute -inset-1 rounded-full bg-gradient-to-tr from-cyan-400 via-blue-500 to-teal-400 blur-lg opacity-70 animate-avatar-glow" />
                            ) : (
                              <span className="absolute -inset-1 rounded-full bg-gradient-to-tr from-cyan-500 via-blue-600 to-teal-400 blur-lg opacity-80 animate-avatar-glow" />
                            )}
                            <Avatar className="h-11 w-11 border-2 border-cyan-400 animate-avatar-float relative z-10">
                              {user.user_metadata.avatar_url ? (
                                <AvatarImage src={user.user_metadata.avatar_url} alt={user.email || ''} />
                              ) : (
                                <AvatarFallback className="bg-gradient-to-tr from-cyan-500 via-blue-600 to-teal-400 text-white text-2xl font-extrabold">
                                  {getUserInitials(user)}
                                </AvatarFallback>
                              )}
                            </Avatar>
                          </div>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-60 glass-nav bg-cyan-950/95 border-cyan-700/60 shadow-cyan-glow p-2 rounded-2xl mt-2 animate-dropdown-fade" align="end" forceMount>
                        {/* User Info Section */}
                        <div className="flex flex-col items-center gap-1 px-2 pt-2 pb-3">
                          <div className="text-lg font-extrabold text-cyan-100 text-center truncate w-full" style={{letterSpacing:'-0.5px'}}>{getUserDisplayName(user)}</div>
                          <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold tracking-wide ${profile?.role === 'student' ? 'bg-cyan-800/60 text-cyan-200' : profile?.role === 'teacher' ? 'bg-blue-800/60 text-blue-200' : 'bg-teal-800/60 text-teal-200'}`}>{profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : ''}</span>
                          {profile?.role === 'student' && (
                            <span className="mt-1 text-sm font-bold text-yellow-300 bg-yellow-900/30 rounded-full px-3 py-0.5 shadow-cyan-glow">Points: {profile?.points ?? 0}</span>
                          )}
                        </div>
                        <DropdownMenuSeparator className="my-2 bg-cyan-800/40" />
                        <DropdownMenuItem
                          className="rounded-xl px-4 py-3 font-bold text-red-400 hover:bg-red-900/60 hover:text-white transition-all duration-200 flex items-center gap-3 cursor-pointer"
                          onClick={handleSignOut}
                        >
                          <X className="w-5 h-5" />
                          <span>Sign out</span>
                        </DropdownMenuItem>
                        <style>{`
                          @keyframes avatar-glow { 0%,100%{opacity:0.7;} 50%{opacity:1;} }
                          .animate-avatar-glow { animation: avatar-glow 2.5s ease-in-out infinite; }
                          @keyframes avatar-float { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-4px);} }
                          .animate-avatar-float { animation: avatar-float 2.8s ease-in-out infinite; }
                          @keyframes dropdown-fade { from{opacity:0;transform:translateY(-10px);} to{opacity:1;transform:translateY(0);} }
                          .animate-dropdown-fade { animation: dropdown-fade 0.35s cubic-bezier(.4,0,.2,1) both; }
                        `}</style>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link 
                    to="/login" 
                    className={`relative px-5 py-2 rounded-full font-bold text-cyan-100 bg-cyan-950/70 hover:bg-cyan-800/80 transition-all duration-200 card-hover focus:outline-none focus:ring-2 focus:ring-cyan-400/60 ${location.pathname === '/login' ? 'active-nav-link' : ''}`}
                  >
                    <span className="relative z-10">Login</span>
                    <span className="absolute left-0 bottom-0 w-full h-0.5 bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 rounded-full transition-all duration-300" style={{ height: location.pathname === '/login' ? '3px' : '2px', opacity: location.pathname === '/login' ? 1 : 0.5 }} />
                  </Link>
                  <Link
                    to="/register"
                    className={`relative px-5 py-2 rounded-full font-bold text-cyan-100 bg-cyan-950/70 hover:bg-cyan-800/80 transition-all duration-200 card-hover focus:outline-none focus:ring-2 focus:ring-cyan-400/60 ${location.pathname === '/register' ? 'active-nav-link' : ''}`}
                  >
                    <span className="relative z-10">Register</span>
                    <span className="absolute left-0 bottom-0 w-full h-0.5 bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 rounded-full transition-all duration-300" style={{ height: location.pathname === '/register' ? '3px' : '2px', opacity: location.pathname === '/register' ? 1 : 0.5 }} />
                  </Link>
                </div>
              )}
            </nav>
            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-full bg-cyan-900/40 hover:bg-cyan-800/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-cyan-200" />
              ) : (
                <Menu className="h-6 w-6 text-cyan-200" />
              )}
            </button>
          </div>
        </div>
        {/* Animated gradient bar at bottom of nav */}
        <div className="absolute left-0 right-0 bottom-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 animate-gradient-x opacity-80" />
        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="fixed inset-0 z-50 flex items-center justify-end">
            <div
              className="absolute inset-0 bg-gradient-to-br from-[#101624]/90 via-[#162032]/80 to-[#1a2636]/90 backdrop-blur-2xl animate-fade-in"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close menu overlay"
            />
            <div className="relative w-4/5 max-w-xs h-full glass-nav border-l-4 border-cyan-400/40 rounded-l-3xl flex flex-col py-8 px-6 gap-6 animate-slide-in-right shadow-cyan-glow">
              {/* Close Button */}
              <button
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-cyan-900/80 hover:bg-cyan-800/90 border border-cyan-700 text-cyan-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                style={{ boxShadow: 'none' }}
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" strokeWidth={2.2} />
              </button>
              <div className="flex flex-col gap-4 mt-10">
              {user ? (
                  <>
                  {isProfessor ? (
                    <>
                      <Link
                        to="/quizzes"
                        className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-lg font-bold text-cyan-100 bg-cyan-950/70 hover:bg-cyan-800/80 border border-cyan-400/30 shadow-cyan-glow transition-all duration-200 focus:ring-2 focus:ring-cyan-400/40 ${location.pathname === '/quizzes' ? 'active-nav-link' : ''}`}
                        onClick={() => { setIsMobileMenuOpen(false); }}
                      >
                        <GraduationCap className="w-6 h-6 text-cyan-200 drop-shadow-cyan" /> Quizzes
                      </Link>
                      <Link
                        to="/create-quiz"
                        className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-lg font-bold text-cyan-100 bg-cyan-950/70 hover:bg-cyan-800/80 border border-cyan-400/30 shadow-cyan-glow transition-all duration-200 focus:ring-2 focus:ring-cyan-400/40 ${location.pathname === '/create-quiz' ? 'active-nav-link' : ''}`}
                        onClick={() => { setIsMobileMenuOpen(false); }}
                      >
                        <Plus className="w-6 h-6 text-cyan-200 drop-shadow-cyan" /> Create Quiz
                      </Link>
                    </>
                  ) : (
                    <button 
                        className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-lg font-bold text-cyan-100 bg-cyan-950/70 hover:bg-cyan-800/80 border border-cyan-400/30 shadow-cyan-glow transition-all duration-200 focus:ring-2 focus:ring-cyan-400/40 ${location.pathname === '/join-quiz' ? 'active-nav-link' : ''}`}
                        onClick={() => { setIsJoinQuizOpen(true); setIsMobileMenuOpen(false); }}
                    >
                        <Key className="w-6 h-6 text-cyan-200 drop-shadow-cyan" /> Join Quiz
                    </button>
                  )}
                  {profile?.role === 'student' && (
                    <Link
                      to="/shop"
                      className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-lg font-bold text-cyan-100 bg-cyan-950/70 hover:bg-cyan-800/80 border border-cyan-400/30 shadow-cyan-glow transition-all duration-200 focus:ring-2 focus:ring-cyan-400/40 ${location.pathname === '/shop' ? 'active-nav-link' : ''}`}
                      onClick={() => { setIsMobileMenuOpen(false); }}
                    >
                      <span className="relative z-10">Shop</span>
                      <span className="absolute left-0 bottom-0 w-full h-0.5 bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 rounded-full transition-all duration-300" style={{ height: location.pathname === '/shop' ? '3px' : '2px', opacity: location.pathname === '/shop' ? 1 : 0.5 }} />
                    </Link>
                  )}
                  {profile?.role === 'student' && (
                      <button
                        className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-lg font-bold text-cyan-100 bg-cyan-950/70 hover:bg-cyan-800/80 border border-cyan-400/30 shadow-cyan-glow transition-all duration-200 focus:ring-2 focus:ring-cyan-400/40 ${location.pathname === '/purchases' ? 'active-nav-link' : ''}`}
                        onClick={() => { setShowPurchases((v) => !v); }}
                        aria-label="My Purchases"
                      >
                        <Receipt className="w-6 h-6 text-cyan-200 drop-shadow-cyan" /> My Purchases
                        {purchases.filter(p => p.status === 'pending').length > 0 && (
                          <span className="absolute top-2 right-2 bg-yellow-400 text-gray-900 text-xs rounded-full px-1.5 py-0.5 shadow-lg border-2 border-white animate-pulse">
                            {purchases.filter(p => p.status === 'pending').length}
                          </span>
                        )}
                      {showPurchases && (
                          <div className="absolute left-full top-0 z-50">
                        <StudentPurchaseDropdown
                          purchases={purchases}
                          loading={purchasesLoading}
                          onClose={() => setShowPurchases(false)}
                        />
                    </div>
                  )}
                      </button>
                    )}
                  <Link
                    to="/forum"
                    className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-lg font-bold text-cyan-100 bg-cyan-950/70 hover:bg-cyan-800/80 border border-cyan-400/30 shadow-cyan-glow transition-all duration-200 focus:ring-2 focus:ring-cyan-400/40 ${location.pathname === '/forum' ? 'active-nav-link' : ''}`}
                    onClick={() => { setIsMobileMenuOpen(false); }}
                  >
                    <MessageCircle className="w-6 h-6 text-cyan-200" /> Forum
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-lg font-bold text-red-200 bg-cyan-950/70 hover:bg-red-900 border border-red-400/30 shadow-cyan-glow transition-all duration-200 mt-4 focus:ring-2 focus:ring-red-400/40 ${location.pathname === '/logout' ? 'active-nav-link' : ''}`}
                  >
                    <X className="w-6 h-6" /> Sign out
                  </button>
                  </>
              ) : (
                  <>
                  <Link
                    to="/login"
                    className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-lg font-bold text-cyan-100 bg-cyan-950/70 hover:bg-cyan-800/80 border border-cyan-400/30 shadow-cyan-glow transition-all duration-200 ${location.pathname === '/login' ? 'active-nav-link' : ''}`}
                    onClick={() => { setIsMobileMenuOpen(false); }}
                  >
                    <User className="w-6 h-6 text-cyan-300" /> Login
                  </Link>
                  <Link
                    to="/register"
                    className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-lg font-bold text-cyan-100 bg-cyan-950/70 hover:bg-cyan-800/80 border border-cyan-400/30 shadow-cyan-glow transition-all duration-200 ${location.pathname === '/register' ? 'active-nav-link' : ''}`}
                    onClick={() => { setIsMobileMenuOpen(false); }}
                  >
                    <Plus className="w-6 h-6 text-cyan-200" /> Register
                  </Link>
                  </>
                )}
                </div>
            </div>
            <style>{`
              @keyframes slide-in-right {
                0% { transform: translateX(100%); opacity: 0; }
                100% { transform: translateX(0); opacity: 1; }
              }
              .animate-slide-in-right { animation: slide-in-right 0.5s cubic-bezier(0.4,0,0.2,1) both; }
              @keyframes fade-in {
                0% { opacity: 0; }
                100% { opacity: 1; }
              }
              .animate-fade-in { animation: fade-in 0.4s ease both; }
              @keyframes gradient-x { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
              .animate-gradient-x { background-size: 200% 200%; animation: gradient-x 6s ease-in-out infinite; }
              @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
              .animate-bounce-slow { animation: bounce-slow 2.2s infinite; }
              .active-nav-link {
                color: #fff !important;
                font-weight: 800;
                background: none;
              }
            `}</style>
          </nav>
        )}
      </header>
      <JoinQuizDialog 
        isOpen={isJoinQuizOpen} 
        onClose={() => setIsJoinQuizOpen(false)} 
      />
      <style>{`
        .shadow-cyan-glow { box-shadow: 0 0 24px 4px #22d3ee44, 0 0 48px 8px #38bdf844; }
        .drop-shadow-cyan { text-shadow: 0 0 8px #22d3ee, 0 0 16px #38bdf8; }
      `}</style>
    </>
  );
}
