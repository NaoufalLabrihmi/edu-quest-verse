import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { GraduationCap, Settings, User, Plus, Key, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'react-hot-toast';
import { JoinQuizDialog } from '@/components/quiz/JoinQuizDialog';

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isJoinQuizOpen, setIsJoinQuizOpen] = useState(false);
  const { user, profile, signOut, initialized, checkAuth } = useAuthStore();
  const navigate = useNavigate();
  const isProfessor = profile?.role === 'teacher' || profile?.role === 'admin';

  useEffect(() => {
    if (!initialized || !profile) {
      checkAuth();
    }
  }, [initialized, profile, checkAuth]);

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
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-edu-purple-500 to-edu-blue-500">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-display font-bold bg-gradient-to-r from-edu-purple-600 to-edu-blue-600 bg-clip-text text-transparent">
                EduQuestVerse
              </span>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-100/50 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link 
              to="/" 
              className="flex items-center space-x-3 group" 
              onClick={handleLogoClick}
            >
              <div className="p-2 rounded-lg bg-gradient-to-br from-edu-purple-500 to-edu-blue-500 group-hover:from-edu-purple-600 group-hover:to-edu-blue-600 transition-all duration-200 shadow-sm">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-display font-bold bg-gradient-to-r from-edu-purple-600 to-edu-blue-600 bg-clip-text text-transparent group-hover:from-edu-purple-700 group-hover:to-edu-blue-700 transition-all duration-200">
                EduQuestVerse
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {user ? (
                <>
                  {/* Common Routes for All Users */}
                  <Link 
                    to={isProfessor ? "/professor-dashboard" : "/student-dashboard"} 
                    className="px-4 py-2 rounded-lg text-gray-700 hover:text-edu-purple-600 hover:bg-gray-50/80 font-medium transition-all duration-200 hover:shadow-sm"
                  >
                    Dashboard
                  </Link>

                  {/* Role-Specific Routes */}
                  {isProfessor ? (
                    // Professor Routes
                    <>
                      <Link 
                        to="/quizzes" 
                        className="px-4 py-2 rounded-lg text-gray-700 hover:text-edu-purple-600 hover:bg-gray-50/80 font-medium transition-all duration-200 hover:shadow-sm"
                      >
                        Quizzes
                      </Link>
                      <Link 
                        to="/create-quiz" 
                        className="px-4 py-2 rounded-lg text-gray-700 hover:text-edu-purple-600 hover:bg-gray-50/80 font-medium transition-all duration-200 hover:shadow-sm"
                      >
                        Create Quiz
                      </Link>
                    </>
                  ) : (
                    // Student Routes
                    <Button 
                      variant="ghost" 
                      className="px-4 py-2 rounded-lg text-gray-700 hover:text-edu-purple-600 hover:bg-gray-50/80 font-medium transition-all duration-200 hover:shadow-sm"
                      onClick={() => setIsJoinQuizOpen(true)}
                    >
                      <Key className="mr-2 h-4 w-4" />
                      Join Quiz
                    </Button>
                  )}

                  {/* Common Routes for All Users */}
                  <Link 
                    to="/shop" 
                    className="px-4 py-2 rounded-lg text-gray-700 hover:text-edu-purple-600 hover:bg-gray-50/80 font-medium transition-all duration-200 hover:shadow-sm"
                  >
                    Shop
                  </Link>
                  <Link 
                    to="/forum" 
                    className="px-4 py-2 rounded-lg text-gray-700 hover:text-edu-purple-600 hover:bg-gray-50/80 font-medium transition-all duration-200 hover:shadow-sm"
                  >
                    Forum
                  </Link>
                  
                  {/* User Menu */}
                  <div className="flex items-center ml-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="relative h-10 w-10 rounded-full hover:bg-gray-100/80 transition-all duration-200 hover:shadow-sm"
                        >
                          <Avatar className="h-10 w-10 border-2 border-gray-100 shadow-sm">
                            <AvatarImage src={user.user_metadata.avatar_url} alt={user.email || ''} />
                            <AvatarFallback className="bg-gradient-to-br from-edu-purple-500 to-edu-blue-500 text-white">
                              {user.email?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuItem asChild>
                          <Link to="/profile" className="flex items-center cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/settings" className="flex items-center cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600 cursor-pointer"
                          onClick={handleSignOut}
                        >
                          Sign out
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link 
                    to="/login" 
                    className="px-4 py-2 rounded-lg text-gray-700 hover:text-edu-purple-600 hover:bg-gray-50/80 font-medium transition-all duration-200 hover:shadow-sm"
                  >
                    Login
                  </Link>
                </div>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100/80 transition-all duration-200 hover:shadow-sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-gray-600" />
              ) : (
                <Menu className="h-6 w-6 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="md:hidden bg-white/95 backdrop-blur-md border-t border-gray-100/50 shadow-sm">
            <div className="container mx-auto px-4 py-2">
              {user ? (
                <div className="flex flex-col space-y-1">
                  {/* Common Routes for All Users */}
                  <Link
                    to={isProfessor ? "/professor-dashboard" : "/student-dashboard"}
                    className="px-4 py-3 rounded-lg text-gray-700 hover:text-edu-purple-600 hover:bg-gray-50/80 font-medium transition-all duration-200 hover:shadow-sm"
                  >
                    Dashboard
                  </Link>

                  {/* Role-Specific Routes */}
                  {isProfessor ? (
                    // Professor Routes
                    <>
                      <Link
                        to="/quizzes"
                        className="px-4 py-3 rounded-lg text-gray-700 hover:text-edu-purple-600 hover:bg-gray-50/80 font-medium transition-all duration-200 hover:shadow-sm"
                      >
                        Quizzes
                      </Link>
                      <Link
                        to="/create-quiz"
                        className="px-4 py-3 rounded-lg text-gray-700 hover:text-edu-purple-600 hover:bg-gray-50/80 font-medium transition-all duration-200 hover:shadow-sm"
                      >
                        Create Quiz
                      </Link>
                    </>
                  ) : (
                    // Student Routes
                    <button 
                      className="w-full px-4 py-3 rounded-lg text-gray-700 hover:text-edu-purple-600 hover:bg-gray-50/80 font-medium transition-all duration-200 hover:shadow-sm text-left flex items-center"
                      onClick={() => setIsJoinQuizOpen(true)}
                    >
                      <Key className="mr-2 h-4 w-4" />
                      Join Quiz
                    </button>
                  )}

                  {/* Common Routes for All Users */}
                  <Link
                    to="/shop"
                    className="px-4 py-3 rounded-lg text-gray-700 hover:text-edu-purple-600 hover:bg-gray-50/80 font-medium transition-all duration-200 hover:shadow-sm"
                  >
                    Shop
                  </Link>
                  <Link
                    to="/forum"
                    className="px-4 py-3 rounded-lg text-gray-700 hover:text-edu-purple-600 hover:bg-gray-50/80 font-medium transition-all duration-200 hover:shadow-sm"
                  >
                    Forum
                  </Link>

                  <button
                    onClick={handleSignOut}
                    className="px-4 py-3 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50/80 font-medium transition-all duration-200 hover:shadow-sm text-left"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col space-y-1">
                  <Link
                    to="/login"
                    className="px-4 py-3 rounded-lg text-gray-700 hover:text-edu-purple-600 hover:bg-gray-50/80 font-medium transition-all duration-200 hover:shadow-sm"
                  >
                    Login
                  </Link>
                </div>
              )}
            </div>
          </nav>
        )}
      </header>

      <JoinQuizDialog 
        isOpen={isJoinQuizOpen} 
        onClose={() => setIsJoinQuizOpen(false)} 
      />
    </>
  );
}
