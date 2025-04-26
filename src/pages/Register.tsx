import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast';
import { GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';
import type { User } from '@supabase/supabase-js';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, setUser, setProfile } = useAuthStore();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      console.log('Starting registration process...', { email, username, role });

      // Basic validation
      if (username.length < 3) {
        throw new Error('Username must be at least 3 characters long');
      }

      if (!email || !password || !username) {
        throw new Error('All fields are required');
      }

      // 1. Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
            role: role,
          },
        },
      });

      console.log('Auth response received:', { 
        success: !!authData?.user, 
        userId: authData?.user?.id,
        error: authError?.message 
      });

      if (authError) {
        console.error('Auth Error:', authError);
        throw authError;
      }

      if (!authData.user?.id) {
        console.error('No user ID returned from signup');
        throw new Error('Registration failed - no user ID returned');
      }

      // Set the user in state
      setUser(authData.user);
      
      toast({
        title: "Account created!",
        description: "Welcome to EduQuestVerse! Please check your email to verify your account.",
      });

      // Navigate to a confirmation page instead of dashboard
      navigate('/auth/confirm-email');

    } catch (error: any) {
      console.error('Registration Error:', {
        message: error.message,
        name: error.name,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      let errorMessage = 'An error occurred during registration';
      
      if (error.message.includes('duplicate key')) {
        errorMessage = 'This username is already taken';
      } else if (error.message.includes('Database error')) {
        errorMessage = 'There was an issue creating your account. Please try again later.';
      } else {
        errorMessage = error.message;
      }

      toast({
        title: "Registration Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      
      <main className="flex-grow flex items-center justify-center bg-gray-50 py-12">
        <div className="w-full max-w-md px-8 py-10 bg-white rounded-lg shadow-md">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-edu-purple-500 to-edu-blue-500 rounded-full blur-md opacity-70"></div>
              <div className="relative bg-white rounded-full p-3">
                <GraduationCap className="h-12 w-12 text-edu-purple-500" />
              </div>
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center mb-6">Create your account</h1>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>I am a...</Label>
              <RadioGroup value={role} onValueChange={(value: 'student' | 'teacher') => setRole(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="student" id="student" />
                  <Label htmlFor="student">Student</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="teacher" id="teacher" />
                  <Label htmlFor="teacher">Teacher</Label>
                </div>
              </RadioGroup>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-edu-blue-600 hover:text-edu-blue-800 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Register;
