import React, { useState, Fragment, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { GraduationCap, MessageCircle, ShoppingBag, X } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

const SignupModal: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { checkAuth } = useAuth();
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (username.length < 3) throw new Error('Username must be at least 3 characters long');
      if (!email || !password || !username) throw new Error('All fields are required');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username, role } },
      });
      if (authError) throw authError;
      if (!authData.user?.id) throw new Error('Registration failed - no user ID returned');
      toast({
        title: 'Account created!',
        description: 'Welcome! Please check your email to verify your account.',
      });
      onSuccess();
      setShowModal(false);
    } catch (error: any) {
      let errorMessage = 'An error occurred during registration';
      if (error.message?.includes('duplicate key')) errorMessage = 'This username is already taken';
      else if (error.message?.includes('Database error')) errorMessage = 'There was an issue creating your account. Please try again later.';
      else errorMessage = error.message;
      toast({ title: 'Registration Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Responsive, compact modal card
  return (
    <div className="relative w-full max-w-sm mx-auto bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 px-3 py-6 flex flex-col gap-2">
      {/* Close button */}
      <button
        type="button"
        aria-label="Close"
        className="absolute top-2 right-2 text-gray-400 hover:text-white p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
        onClick={onSuccess}
      >
        <X className="w-5 h-5" />
      </button>
      <div className="flex justify-center mb-3">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-700 via-purple-500 to-purple-700 rounded-full blur-lg opacity-60"></div>
          <div className="relative bg-gray-900 rounded-full p-2 border-2 border-purple-700">
            <GraduationCap className="h-8 w-8 text-purple-400" />
          </div>
        </div>
      </div>
      <h2 className="text-xl font-extrabold text-center mb-2 text-purple-100">Create your account</h2>
      <form onSubmit={handleSubmit} className="space-y-4 w-full">
        <div className="space-y-1">
          <Label htmlFor="username" className="text-purple-200">Username</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="bg-gray-950 border border-gray-800 text-white placeholder-gray-500 focus:border-purple-500 text-base"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email" className="text-purple-200">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-gray-950 border border-gray-800 text-white placeholder-gray-500 focus:border-purple-500 text-base"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password" className="text-purple-200">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-gray-950 border border-gray-800 text-white placeholder-gray-500 focus:border-purple-500 text-base"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-cyan-200">I am a...</Label>
          <div className="flex flex-row gap-2 justify-center mt-1">
            <button
              type="button"
              className={`flex flex-col items-center px-2 py-2 rounded-xl border-2 transition-all duration-150 w-24 ${role === 'student' ? 'border-cyan-500 bg-cyan-950/60 shadow-md' : 'border-gray-700 bg-gray-950 hover:border-cyan-400'}`}
              onClick={() => setRole('student')}
              aria-pressed={role === 'student'}
            >
              <GraduationCap className={`w-6 h-6 mb-1 ${role === 'student' ? 'text-cyan-400' : 'text-gray-400'}`} />
              <span className={`font-semibold text-xs ${role === 'student' ? 'text-cyan-200' : 'text-gray-300'}`}>Student</span>
            </button>
            <button
              type="button"
              className={`flex flex-col items-center px-2 py-2 rounded-xl border-2 transition-all duration-150 w-24 ${role === 'teacher' ? 'border-cyan-500 bg-cyan-950/60 shadow-md' : 'border-gray-700 bg-gray-950 hover:border-cyan-400'}`}
              onClick={() => setRole('teacher')}
              aria-pressed={role === 'teacher'}
            >
              <MessageCircle className={`w-6 h-6 mb-1 ${role === 'teacher' ? 'text-cyan-400' : 'text-gray-400'}`} />
              <span className={`font-semibold text-xs ${role === 'teacher' ? 'text-cyan-200' : 'text-gray-300'}`}>Teacher</span>
            </button>
          </div>
        </div>
        <Button
          type="submit"
          className="w-full bg-cyan-700 hover:bg-cyan-800 text-base font-bold border-0 shadow-md py-2"
          disabled={isLoading}
        >
          {isLoading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
    </div>
  );
};

const LoginModal: React.FC<{ onSuccess: () => void; showLoading: () => void }> = ({ onSuccess, showLoading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    showLoading(); // Show overlay immediately
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      toast({ title: 'Success', description: 'Logged in successfully!' });
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to sign in',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-sm mx-auto bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 px-3 py-6 flex flex-col gap-2">
      {/* Close button */}
      <button
        type="button"
        aria-label="Close"
        className="absolute top-2 right-2 text-gray-400 hover:text-white p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
        onClick={onSuccess}
      >
        <X className="w-5 h-5" />
      </button>
      <div className="flex justify-center mb-3">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-700 via-purple-500 to-purple-700 rounded-full blur-lg opacity-60"></div>
          <div className="relative bg-gray-900 rounded-full p-2 border-2 border-purple-700">
            <GraduationCap className="h-8 w-8 text-purple-400" />
          </div>
        </div>
      </div>
      <h2 className="text-xl font-extrabold text-center mb-2 text-purple-100">Sign in to your account</h2>
      <form onSubmit={handleSubmit} className="space-y-4 w-full">
        <div className="space-y-1">
          <Label htmlFor="login-email" className="text-purple-200">Email</Label>
          <Input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-gray-950 border border-gray-800 text-white placeholder-gray-500 focus:border-purple-500 text-base"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="login-password" className="text-purple-200">Password</Label>
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-gray-950 border border-gray-800 text-white placeholder-gray-500 focus:border-purple-500 text-base"
          />
        </div>
        <Button
          type="submit"
          className="w-full bg-purple-700 hover:bg-purple-800 text-base font-bold border-0 shadow-md py-2"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
};

// Add the animation CSS directly for demo/dev
const overlayStyles = `
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.animate-fadeIn { animation: fadeIn 0.5s; }
@keyframes spin { 100% { transform: rotate(360deg); } }
.animate-spin-slow { animation: spin 2s linear infinite; }
`;

const Index = () => {
  const [enteredCode, setEnteredCode] = useState('');
  const [signupOpen, setSignupOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const navigate = useNavigate();
  const { user, signOut, profile } = useAuth();
  
  // Show overlay for 1.5s after login is triggered
  const showLoading = () => {
    setShowLoadingOverlay(true);
    setTimeout(() => setShowLoadingOverlay(false), 1500);
  };

  const handleJoinQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would verify the quiz code and navigate to the quiz
    console.log('Joining quiz with code:', enteredCode);
  };

  // Add a handler for logout that resets UI and opens login modal
  const handleLogout = async () => {
    await signOut();
    setLoginOpen(true); // Show login modal after logout
    setShowLoadingOverlay(false); // Ensure overlay is hidden
  };

  // Redirect admin to dashboard_admin after login
  useEffect(() => {
    if (profile?.role === 'admin') {
      navigate('/dashboard_admin', { replace: true });
    }
  }, [profile, navigate]);

  return (
    <>
      <style>{overlayStyles}</style>
      <div className="flex flex-col min-h-screen">
        {/* Loading Overlay */}
        {showLoadingOverlay && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/70 backdrop-blur-md transition-opacity duration-500 animate-fadeIn">
            <div className="flex flex-col items-center gap-6">
              <div className="relative flex items-center justify-center">
                <span className="absolute animate-ping w-24 h-24 rounded-full bg-cyan-600 opacity-30"></span>
                <GraduationCap className="w-20 h-20 text-cyan-400 animate-spin-slow" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white text-center drop-shadow-lg">Welcome back to Brain Boost!</h2>
              <p className="text-lg text-cyan-100 text-center">Empowering your learning journey...</p>
            </div>
          </div>
        )}
        {!showLoadingOverlay && (
          <>
            <Navigation />
            <main className="flex-grow">
              {/* Hero Section */}
              <section className="hero-gradient py-20 md:py-28">
                <div className="container mx-auto px-4 text-center">
                  <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                    Learn, Quiz, Earn Rewards
                  </h1>
                  <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto mb-10">
                    Join EduQuestVerse - the interactive learning platform where knowledge earns rewards. 
                    Create quizzes, earn points, and participate in meaningful educational discussions.
                  </p>
                  <div className="flex flex-col md:flex-row justify-center gap-4 max-w-md mx-auto">
                    {!user && (
                      <>
                        <Dialog open={signupOpen} onOpenChange={setSignupOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              size="lg" 
                              className="bg-white text-cyan-500 hover:bg-gray-100"
                            >
                              Sign up
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-transparent border-0 max-w-full p-0 flex items-center justify-center">
                            <DialogTitle className="sr-only">Sign up</DialogTitle>
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" aria-hidden="true"></div>
                            <div className="relative z-50 w-full flex items-center justify-center min-h-screen">
                              <SignupModal onSuccess={() => setSignupOpen(false)} />
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              size="lg" 
                              variant="outline" 
                              className="border-white text-white hover:bg-white/10"
                            >
                              Log in
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-transparent border-0 max-w-full p-0 flex items-center justify-center">
                            <DialogTitle className="sr-only">Log in</DialogTitle>
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" aria-hidden="true"></div>
                            <div className="relative z-50 w-full flex items-center justify-center min-h-screen">
                              <LoginModal onSuccess={() => setLoginOpen(false)} showLoading={showLoading} />
                            </div>
                          </DialogContent>
                        </Dialog>
                      </>
                    )}
                  </div>
                </div>
              </section>
              
              {/* Join Quiz Section */}
              <section className="bg-white py-12">
                <div className="container mx-auto px-4">
                  <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden md:max-w-2xl">
                    <div className="p-8">
                      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
                        Join a Quiz
                      </h2>
                      <form onSubmit={handleJoinQuiz} className="space-y-4">
                        <div>
                          <input
                            type="text"
                            value={enteredCode}
                            onChange={(e) => setEnteredCode(e.target.value)}
                            placeholder="Enter quiz code"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-center text-2xl font-medium tracking-wider placeholder:text-gray-400"
                            maxLength={6}
                          />
                        </div>
                        <Button 
                          type="submit" 
                          className="w-full bg-cyan-500 hover:bg-cyan-600 text-lg"
                          disabled={!enteredCode}
                        >
                          Enter
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>
              </section>
              
              {/* Features Section */}
              <section className="bg-gray-50 py-16">
                <div className="container mx-auto px-4">
                  <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Quiz Feature */}
                    <div className="bg-white rounded-xl shadow-md p-6 text-center card-hover">
                      <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <GraduationCap className="h-8 w-8 text-cyan-500" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Interactive Quizzes</h3>
                      <p className="text-gray-600">
                        Teachers create engaging quizzes with multiple-choice, true/false, and short answer questions. Students join with a unique access code.
                      </p>
                    </div>
                    
                    {/* Points Feature */}
                    <div className="bg-white rounded-xl shadow-md p-6 text-center card-hover">
                      <div className="w-16 h-16 bg-edu-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShoppingBag className="h-8 w-8 text-edu-orange-500" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Points & Rewards</h3>
                      <p className="text-gray-600">
                        Earn points by performing well on quizzes. Top performers get more points. Redeem them in the shop for exciting rewards.
                      </p>
                    </div>
                    
                    {/* Forum Feature */}
                    <div className="bg-white rounded-xl shadow-md p-6 text-center card-hover">
                      <div className="w-16 h-16 bg-edu-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageCircle className="h-8 w-8 text-edu-blue-500" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Learning Forum</h3>
                      <p className="text-gray-600">
                        Ask questions, share knowledge, and help others. The community-driven forum connects students and teachers.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
              
              {/* Testimonials/Users */}
              <section className="bg-white py-16">
                <div className="container mx-auto px-4">
                  <h2 className="text-3xl font-bold text-center mb-2">Who Uses EduQuestVerse</h2>
                  <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
                    Join thousands of teachers and students already enhancing their educational experience
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Teacher Testimonial */}
                    <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-6 shadow-sm">
                      <div className="flex items-start mb-4">
                        <div className="bg-cyan-500 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mr-3">
                          T
                        </div>
                        <div>
                          <h4 className="font-semibold">Emily Rodriguez</h4>
                          <p className="text-sm text-gray-600">Math Teacher</p>
                        </div>
                      </div>
                      <p className="text-gray-700">
                        "Brain Boost has transformed my classroom. Creating interactive quizzes keeps my students engaged, and the point system motivates them to participate actively."
                      </p>
                    </div>
                    
                    {/* Student Testimonial */}
                    <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-6 shadow-sm">
                      <div className="flex items-start mb-4">
                        <div className="bg-cyan-500 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mr-3">
                          S
                        </div>
                        <div>
                          <h4 className="font-semibold">Alex Johnson</h4>
                          <p className="text-sm text-gray-600">High School Student</p>
                        </div>
                      </div>
                      <p className="text-gray-700">
                        "I love competing in quizzes and earning points! The forum helps me when I'm stuck on homework, and I've already redeemed points for some cool prizes."
                      </p>
                    </div>
                    
                    {/* Admin Testimonial */}
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 shadow-sm">
                      <div className="flex items-start mb-4">
                        <div className="bg-blue-500 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mr-3">
                          A
                        </div>
                        <div>
                          <h4 className="font-semibold">Michael Thompson</h4>
                          <p className="text-sm text-gray-600">School Administrator</p>
                        </div>
                      </div>
                      <p className="text-gray-700">
                        "As an administrator, I appreciate how Brain Boost provides valuable insights into student engagement and performance while making learning fun."
                      </p>
                    </div>
                  </div>
                </div>
              </section>
              
              {/* CTA Section */}
              <section className="bg-cyan-500 py-16">
                <div className="container mx-auto px-4 text-center">
                  <h2 className="text-3xl font-bold text-white mb-6">Ready to Transform Your Learning Experience?</h2>
                  <p className="text-white/90 max-w-2xl mx-auto mb-8 text-lg">
                    Join Brain Boost today and discover a new way to teach, learn, and be rewarded.
                  </p>
                  <Button 
                    size="lg" 
                    className="bg-white text-cyan-500 hover:bg-gray-100 px-8"
                    asChild
                  >
                    <Link to="/register">Get Started Now</Link>
                  </Button>
                </div>
              </section>
            </main>
            
            <Footer />
          </>
        )}
      </div>
    </>
  );
};

export default Index;
