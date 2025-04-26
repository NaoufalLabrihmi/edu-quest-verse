import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { GraduationCap, Settings, User } from 'lucide-react';
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from 'react-hot-toast';
import { supabase } from '@/integrations/supabase/client';

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, profile, signOut } = useAuthStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      // First clear all storage
      localStorage.clear();
      sessionStorage.clear();

      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Reset the auth store state
      await signOut();

      // Navigate to home page without refresh
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to log out');
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Navigate to home page and replace the current history entry
    navigate('/', { replace: true });
  };

  // Add debug logging
  console.log('Navigation render - Auth state:', { user, profile });

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link 
          to="/" 
          className="flex items-center space-x-2" 
          onClick={handleLogoClick}
        >
          <GraduationCap className="h-8 w-8 text-edu-purple-500" />
          <span className="text-xl font-display font-semibold bg-gradient-to-r from-edu-purple-500 to-edu-blue-500 bg-clip-text text-transparent">
            EduQuestVerse
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {user ? (
            <>
              <Link 
                to="/dashboard" 
                className="text-gray-700 hover:text-edu-purple-500 font-medium"
              >
                Dashboard
              </Link>
              <Link 
                to="/quizzes" 
                className="text-gray-700 hover:text-edu-purple-500 font-medium"
              >
                Quizzes
              </Link>
              <Link 
                to="/shop" 
                className="text-gray-700 hover:text-edu-purple-500 font-medium"
              >
                Shop
              </Link>
              <Link 
                to="/forum" 
                className="text-gray-700 hover:text-edu-purple-500 font-medium"
              >
                Forum
              </Link>
              
              <div className="flex items-center space-x-4">
                {profile?.role === 'teacher' && (
                  <Link 
                    to="/create-quiz" 
                    className="font-medium text-edu-pink-500 hover:text-edu-pink-600"
                  >
                    Create Quiz
                  </Link>
                )}
                
                <div className="flex items-center space-x-1 px-3 py-1 bg-gradient-to-r from-edu-purple-100 to-edu-blue-100 rounded-full text-sm">
                  <span className="text-edu-purple-500 font-semibold">{profile?.points || 0}</span>
                  <span className="text-gray-600">pts</span>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar>
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-edu-purple-500 text-white">
                          {profile?.username?.substring(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium">{profile?.username}</p>
                      <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
                    </div>
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="cursor-pointer flex w-full">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="cursor-pointer flex w-full">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={(e) => {
                      e.preventDefault();
                      handleSignOut();
                    }}>
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="outline" asChild>
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Sign up</Link>
              </Button>
            </div>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-gray-700 hover:bg-gray-100 p-2 rounded-md"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 px-4 py-2">
          <nav className="flex flex-col space-y-3 py-2">
            {user ? (
              <>
                <Link 
                  to="/dashboard" 
                  className="text-gray-700 hover:text-edu-purple-500 font-medium py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/quizzes" 
                  className="text-gray-700 hover:text-edu-purple-500 font-medium py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Quizzes
                </Link>
                <Link 
                  to="/shop" 
                  className="text-gray-700 hover:text-edu-purple-500 font-medium py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Shop
                </Link>
                <Link 
                  to="/forum" 
                  className="text-gray-700 hover:text-edu-purple-500 font-medium py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Forum
                </Link>
                
                {profile?.role === 'teacher' && (
                  <Link 
                    to="/create-quiz" 
                    className="font-medium text-edu-pink-500 hover:text-edu-pink-600 py-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Create Quiz
                  </Link>
                )}
                <Link 
                  to="/profile" 
                  className="text-gray-700 hover:text-edu-purple-500 py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Profile
                </Link>
                <Link 
                  to="/settings" 
                  className="text-gray-700 hover:text-edu-purple-500 py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Settings
                </Link>
                <button 
                  className="text-left text-red-500 py-2" 
                  onClick={handleSignOut}
                >
                  Log out
                </button>
              </>
            ) : (
              <div className="flex flex-col space-y-2 pt-2">
                <Button variant="outline" asChild>
                  <Link 
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Log in
                  </Link>
                </Button>
                <Button asChild>
                  <Link 
                    to="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign up
                  </Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
