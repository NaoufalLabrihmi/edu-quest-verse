import React, { useState, Fragment, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { GraduationCap, MessageCircle, ShoppingBag, X } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
        className="absolute top-2 right-2 text-gray-400 hover:text-white p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-500"
        onClick={onSuccess}
      >
        <X className="w-5 h-5" />
      </button>
      <div className="flex justify-center mb-3">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-700 via-cyan-500 to-blue-700 rounded-full blur-lg opacity-60"></div>
          <div className="relative bg-gray-900 rounded-full p-2 border-2 border-cyan-700">
            <GraduationCap className="h-8 w-8 text-cyan-400" />
          </div>
        </div>
      </div>
      <h2 className="text-xl font-extrabold text-center mb-2 text-cyan-100">Create your account</h2>
      <form onSubmit={handleSubmit} className="space-y-4 w-full">
        <div className="space-y-1">
          <Label htmlFor="username" className="text-cyan-200">Username</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="bg-gray-950 border border-gray-800 text-white placeholder-gray-500 focus:border-cyan-500 text-base"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email" className="text-cyan-200">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-gray-950 border border-gray-800 text-white placeholder-gray-500 focus:border-cyan-500 text-base"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password" className="text-cyan-200">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-gray-950 border border-gray-800 text-white placeholder-gray-500 focus:border-cyan-500 text-base"
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
        className="absolute top-2 right-2 text-gray-400 hover:text-white p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-500"
        onClick={onSuccess}
      >
        <X className="w-5 h-5" />
      </button>
      <div className="flex justify-center mb-3">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-700 via-cyan-500 to-blue-700 rounded-full blur-lg opacity-60"></div>
          <div className="relative bg-gray-900 rounded-full p-2 border-2 border-cyan-700">
            <GraduationCap className="h-8 w-8 text-cyan-400" />
          </div>
        </div>
      </div>
      <h2 className="text-xl font-extrabold text-center mb-2 text-cyan-100">Sign in to your account</h2>
      <form onSubmit={handleSubmit} className="space-y-4 w-full">
        <div className="space-y-1">
          <Label htmlFor="login-email" className="text-cyan-200">Email</Label>
          <Input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-gray-950 border border-gray-800 text-white placeholder-gray-500 focus:border-cyan-500 text-base"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="login-password" className="text-cyan-200">Password</Label>
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-gray-950 border border-gray-800 text-white placeholder-gray-500 focus:border-cyan-500 text-base"
          />
        </div>
        <Button
          type="submit"
          className="w-full bg-cyan-700 hover:bg-cyan-800 text-base font-bold border-0 shadow-md py-2"
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
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
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
              {/* Hero Section - visually stunning dark mode with animated icon and dynamic background */}
              <section className="relative py-24 md:py-36 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 overflow-hidden">
                {/* Animated background: gradient blobs and floating shapes for competition energy */}
                <div className="absolute inset-0 pointer-events-none z-0">
                  {/* Animated gradient blobs */}
                  <div className="absolute left-1/3 top-0 w-[60vw] h-[60vw] bg-gradient-to-br from-cyan-500/30 via-blue-500/20 to-teal-400/20 rounded-full blur-3xl opacity-70 animate-blob-move" />
                  <div className="absolute right-0 top-1/4 w-[40vw] h-[40vw] bg-gradient-to-br from-yellow-400/20 via-pink-400/10 to-cyan-400/10 rounded-full blur-2xl opacity-40 animate-blob-move2" />
                  {/* Animated floating lines */}
                  <svg className="absolute left-0 bottom-0 w-full h-32 opacity-30 animate-float-lines" viewBox="0 0 1440 320"><path fill="#22d3ee" fillOpacity="0.2" d="M0,160L60,170.7C120,181,240,203,360,197.3C480,192,600,160,720,133.3C840,107,960,85,1080,101.3C1200,117,1320,171,1380,197.3L1440,224L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path></svg>
                  {/* Confetti for competition */}
                  <div className="absolute inset-0 z-10 pointer-events-none">
                    {[...Array(18)].map((_, i) => (
                      <span key={i} className={`absolute w-2 h-2 rounded-full bg-gradient-to-br from-cyan-400 to-blue-400 opacity-70 animate-confetti${i % 3 + 1}`} style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }} />
                    ))}
                  </div>
                </div>
                <div className="container mx-auto px-4 relative z-10 text-center flex flex-col items-center">
                  <div className="mb-6 animate-bounce-slow">
                    <GraduationCap className="w-20 h-20 text-cyan-400 drop-shadow-cyan-glow" />
                  </div>
                  <h1 className="text-5xl md:text-7xl font-extrabold mb-4 bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 text-transparent bg-clip-text drop-shadow-cyan-glow animate-fadeIn">Brain Boost</h1>
                  <p className="text-2xl md:text-3xl font-semibold text-cyan-100 mb-6 max-w-2xl mx-auto animate-slideUp flex items-center justify-center gap-3">
                    The Ultimate Learning Competition Platform
                    <span className="inline-block animate-bounce"><svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" fill="#facc15"/></svg></span>
                  </p>
                  <p className="text-lg md:text-xl text-cyan-200/90 max-w-3xl mx-auto mb-10 animate-fadeIn">
                    Compete in interactive quizzes, climb the leaderboard, earn points, and unlock real rewards. Join a vibrant community where every answer brings you closer to victory. Are you ready to challenge your friends and become a champion of knowledge?
                  </p>
                  <div className="flex flex-col md:flex-row justify-center gap-4 max-w-md mx-auto animate-fadeIn">
                    {!user && (
                      <>
                        <Dialog open={signupOpen} onOpenChange={setSignupOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              size="lg" 
                              className="bg-cyan-500 text-white font-bold text-lg px-8 py-3 rounded-full shadow-cyan-glow hover:bg-cyan-600 hover:scale-105 transition-transform flex items-center gap-2"
                            >
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="inline-block mr-1"><path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" fill="#facc15"/></svg>
                              Join the Competition
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-transparent border-0 max-w-full p-0 flex items-center justify-center">
                            <DialogTitle className="sr-only">Sign up</DialogTitle>
                            <DialogDescription className="sr-only">Create your account to access quizzes and rewards.</DialogDescription>
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
                              className="border-cyan-400 text-cyan-200 hover:bg-cyan-900/30 hover:text-white text-lg px-8 py-3 rounded-full shadow-cyan-glow"
                            >
                              Log in
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-transparent border-0 max-w-full p-0 flex items-center justify-center">
                            <DialogTitle className="sr-only">Log in</DialogTitle>
                            <DialogDescription className="sr-only">Sign in to your account to join quizzes and track your progress.</DialogDescription>
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
              {/* Features Section - visually distinct, animated cards */}
              <section className="py-20 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
                <div className="container mx-auto px-4">
                  <h2 className="text-4xl font-bold text-center mb-14 bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 text-transparent bg-clip-text drop-shadow-cyan-glow animate-fadeIn">Why Brain Boost?</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    {/* Quiz Feature */}
                    <div className="bg-gradient-to-br from-cyan-900/60 to-blue-900/60 rounded-3xl shadow-2xl p-10 text-left border-l-4 border-cyan-400/40 hover:scale-105 transition-transform duration-300 animate-slideUp delay-100">
                      <div className="w-16 h-16 bg-cyan-700/30 rounded-xl flex items-center justify-center mb-6 shadow-cyan-glow animate-bounce">
                        <GraduationCap className="h-9 w-9 text-cyan-300" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2 text-cyan-100">Interactive Quizzes</h3>
                      <p className="text-cyan-200/90">
                        Teachers create engaging quizzes with multiple-choice, true/false, and short answer questions. Students join with a unique access code and compete for the top spot.
                      </p>
                    </div>
                    {/* Points Feature */}
                    <div className="bg-gradient-to-br from-blue-900/60 to-cyan-900/60 rounded-2xl shadow-xl p-8 text-center border-t-4 border-blue-400/40 hover:scale-105 transition-transform duration-300 animate-slideUp delay-200">
                      <div className="w-16 h-16 bg-blue-700/30 rounded-full flex items-center justify-center mx-auto mb-5 shadow-cyan-glow animate-bounce">
                        <ShoppingBag className="h-8 w-8 text-blue-300" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2 text-blue-100">Points & Rewards</h3>
                      <p className="text-blue-200/90">
                        Earn points by performing well on quizzes. Redeem your points in the shop for real rewards and prizes. The more you learn, the more you earn!
                      </p>
                    </div>
                    {/* Forum Feature */}
                    <div className="bg-gradient-to-br from-teal-900/60 to-cyan-900/60 rounded-xl shadow-lg p-7 text-right border-r-4 border-teal-400/40 hover:scale-105 transition-transform duration-300 animate-slideUp delay-300">
                      <div className="w-14 h-14 bg-teal-700/30 rounded-2xl flex items-center justify-center ml-auto mb-4 shadow-cyan-glow animate-bounce">
                        <MessageCircle className="h-7 w-7 text-teal-300" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2 text-teal-100">Collaborative Forum</h3>
                      <p className="text-teal-200/90">
                        Ask questions, share knowledge, and help others in a vibrant, supportive community. The forum connects students and teachers for deeper learning.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
              {/* Testimonials Section - horizontal scroll on mobile, fade-in on desktop */}
              <section className="py-20 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
                <div className="container mx-auto px-4">
                  <h2 className="text-4xl font-bold text-center mb-10 bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 text-transparent bg-clip-text drop-shadow-cyan-glow animate-fadeIn">What Our Users Say</h2>
                  <div className="flex gap-8 overflow-x-auto md:grid md:grid-cols-3 md:gap-10 snap-x md:snap-none pb-4 md:pb-0">
                    {/* Teacher Testimonial */}
                    <div className="min-w-[320px] md:min-w-0 bg-gradient-to-br from-cyan-900/60 to-blue-900/60 rounded-2xl p-8 shadow-xl border border-cyan-700/30 snap-center animate-fadeIn delay-100">
                      <div className="flex items-center mb-5">
                        <div className="bg-cyan-500 w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-cyan-glow mr-4">T</div>
                        <div>
                          <h4 className="font-semibold text-cyan-100">Emily Rodriguez</h4>
                          <p className="text-sm text-cyan-200/80">Math Teacher</p>
                        </div>
                      </div>
                      <p className="text-cyan-100 text-lg">
                        "Brain Boost has transformed my classroom. Creating interactive quizzes keeps my students engaged, and the point system motivates them to participate actively."
                      </p>
                    </div>
                    {/* Student Testimonial */}
                    <div className="min-w-[320px] md:min-w-0 bg-gradient-to-br from-blue-900/60 to-cyan-900/60 rounded-2xl p-8 shadow-xl border border-blue-700/30 snap-center animate-fadeIn delay-200">
                      <div className="flex items-center mb-5">
                        <div className="bg-blue-500 w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-cyan-glow mr-4">S</div>
                        <div>
                          <h4 className="font-semibold text-blue-100">Alex Johnson</h4>
                          <p className="text-sm text-blue-200/80">High School Student</p>
                        </div>
                      </div>
                      <p className="text-blue-100 text-lg">
                        "I love competing in quizzes and earning points! The forum helps me when I'm stuck on homework, and I've already redeemed points for some cool prizes."
                      </p>
                    </div>
                    {/* Admin Testimonial */}
                    <div className="min-w-[320px] md:min-w-0 bg-gradient-to-br from-teal-900/60 to-cyan-900/60 rounded-2xl p-8 shadow-xl border border-teal-700/30 snap-center animate-fadeIn delay-300">
                      <div className="flex items-center mb-5">
                        <div className="bg-teal-500 w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-cyan-glow mr-4">A</div>
                        <div>
                          <h4 className="font-semibold text-teal-100">Michael Thompson</h4>
                          <p className="text-sm text-teal-200/80">School Administrator</p>
                        </div>
                      </div>
                      <p className="text-teal-100 text-lg">
                        "As an administrator, I appreciate how Brain Boost provides valuable insights into student engagement and performance while making learning fun."
                      </p>
                    </div>
                  </div>
                </div>
              </section>
              {/* CTA Section - strong, glowing call to action, competition themed */}
              <section className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-500 py-20">
                <div className="container mx-auto px-4 text-center">
                  <h2 className="text-4xl font-bold text-white mb-6 drop-shadow-cyan-glow animate-fadeIn flex items-center justify-center gap-3">
                    Are You Ready to Compete, Learn, and Win?
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" fill="#facc15"/></svg>
                  </h2>
                  <p className="text-white/90 max-w-2xl mx-auto mb-8 text-lg animate-fadeIn">
                    Join Brain Boost today and experience the thrill of learning through competition. Sign up for free and start your journey to the top of the leaderboard!
                  </p>
                  <Button 
                    size="lg" 
                    className="bg-white text-cyan-500 hover:bg-gray-100 px-8 font-bold text-lg shadow-cyan-glow animate-bounce flex items-center gap-2"
                    asChild
                  >
                    <Link to="/register">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="inline-block mr-1"><path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" fill="#facc15"/></svg>
                      Start Competing
                    </Link>
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
