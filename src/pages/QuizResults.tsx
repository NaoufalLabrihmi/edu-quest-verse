import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Award, BarChart2, ChevronLeft, Home, Loader2, Star, User, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';

// We'll use Lucide icons for podium positions
import { Crown, Medal, Trophy } from 'lucide-react';

// Import layout components
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

interface Profile {
  username: string;
  name: string;
  avatar_url?: string;
}

interface QuizParticipant {
  id: string;
  name: string;
  username: string;
  avatar_url?: string;
  score: number;
  rank: number;
  total_points: number;
  points_earned: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  created_by: string;
  creator_name: string;
  total_questions: number;
  total_points: number;
}

export default function QuizResults() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [participants, setParticipants] = useState<QuizParticipant[]>([]);
  const [userScore, setUserScore] = useState<QuizParticipant | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuizResults = async () => {
      try {
        setIsLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        
        // Fetch user role
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setUserRole(profileData?.role || null);
        
        // Fetch quiz details (no join)
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', id)
          .single();
        if (quizError) throw quizError;
        // Fetch creator's profile by created_by (use username instead of name)
        const { data: creatorProfile, error: creatorError } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', quizData.created_by)
          .single();
        if (creatorError) throw creatorError;
        
        // Fetch questions to calculate total points possible
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('points, point_multiplier')
          .eq('quiz_id', id);
          
        if (questionsError) throw questionsError;
        
        // Calculate total points using multiplier
        const totalPoints = questionsData.reduce((sum, q) => sum + ((q.points || 0) * (q.point_multiplier || 1)), 0);
        const totalQuestions = questionsData.length;
        
        // Fetch the latest session for this quiz
        const { data: sessionData, error: sessionError } = await supabase
          .from('quiz_sessions')
          .select('*')
          .eq('quiz_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (sessionError || !sessionData) throw sessionError || new Error('No session found');
        const sessionId = sessionData.id;
        
        // Fetch all participants for this session, order by total_points desc
        const { data: participantsData, error: participantsError } = await supabase
          .from('quiz_participants')
          .select('*')
          .eq('session_id', sessionId)
          .order('total_points', { ascending: false });
        if (participantsError) throw participantsError;
        
        // Get usernames for all participants using user_id (only select username)
        const processedParticipants = await Promise.all(
          participantsData.map(async (participant, index) => {
            try {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', participant.user_id)
                .single();
              const userProfile = profileData as unknown as Profile | null;
              return {
                id: participant.user_id,
                name: userProfile?.username || 'Student',
                username: userProfile?.username || 'student',
                avatar_url: undefined,
                score: participant.total_points || 0,
                rank: index + 1,
                total_points: totalPoints,
                points_earned: participant.total_points || 0
              };
            } catch (e) {
              return {
                id: participant.user_id,
                name: 'Student',
                username: 'student',
                avatar_url: undefined,
                score: participant.total_points || 0,
                rank: index + 1,
                total_points: totalPoints,
                points_earned: participant.total_points || 0
              };
            }
          })
        );
        
        setParticipants(processedParticipants);
        
        // Set quiz data
        setQuiz({
          id: quizData.id,
          title: quizData.title,
          description: quizData.description,
          created_by: quizData.created_by,
          creator_name: creatorProfile?.username?.trim() ? creatorProfile.username : 'Unknown',
          total_questions: totalQuestions,
          total_points: totalPoints
        });
        
        // Find current user's score and rank
        const currentUserScore = processedParticipants.find(p => p.id === user.id) || null;
        setUserScore(currentUserScore);
        setUserRank(currentUserScore?.rank || null);
        
      } catch (error) {
        console.error('Error fetching quiz results:', error);
        toast({
          title: "Error",
          description: "Failed to load quiz results",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchQuizResults();
  }, [id, toast]);

  const getPodiumColor = (rank: number) => {
    switch (rank) {
      case 1: return "bg-yellow-100 border-yellow-400 text-yellow-800";
      case 2: return "bg-gray-100 border-gray-400 text-gray-800";
      case 3: return "bg-amber-100 border-amber-400 text-amber-800";
      default: return "bg-white border-gray-200 text-gray-800";
    }
  };

  const getPodiumIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-8 w-8 text-yellow-500" />;
      case 2: return <Medal className="h-7 w-7 text-gray-500" />;
      case 3: return <Trophy className="h-6 w-6 text-amber-500" />;
      default: return <Star className="h-5 w-5 text-gray-400" />;
    }
  };

  const getTopThree = () => {
    return participants.slice(0, 3);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0a1626] via-[#101624] to-[#232b3b] text-white">
        <Navigation />
        {/* Animated background gradient shapes */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-gradient-to-br from-cyan-700/30 to-blue-900/0 rounded-full blur-3xl animate-fade-in" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-gradient-to-tr from-blue-800/30 to-cyan-900/0 rounded-full blur-3xl animate-fade-in-slow" />
        </div>
        <main className="flex-grow py-8 relative z-10">
          <div className="container px-4 mx-auto">
            <div className="flex items-center mb-8">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard')}
                className="mr-2 text-blue-200 hover:bg-blue-900/30 backdrop-blur-md"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-4xl font-black bg-gradient-to-r from-blue-300 via-cyan-300 to-slate-200 text-transparent bg-clip-text drop-shadow-xl animate-gradient-x">Quiz Results</h1>
            </div>
            <div className="flex justify-center items-center min-h-[40vh]">
              <div className="text-cyan-200 text-xl font-bold animate-pulse">Loading quiz results...</div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0a1626] via-[#101624] to-[#232b3b] text-white">
        <Navigation />
        <main className="flex-grow flex flex-col items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-black mb-4">Quiz Not Found</h1>
            <p className="text-lg text-cyan-200 mb-8">Sorry, we couldn't find this quiz or it has been deleted.</p>
            <Button onClick={() => navigate('/dashboard')} className="bg-cyan-700 text-white font-bold px-6 py-3 rounded-xl shadow-cyan-glow">Back to Dashboard</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0a1626] via-[#101624] to-[#232b3b] text-white">
      <Navigation />
      {/* Animated background gradient shapes */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-gradient-to-br from-cyan-700/30 to-blue-900/0 rounded-full blur-3xl animate-fade-in" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-gradient-to-tr from-blue-800/30 to-cyan-900/0 rounded-full blur-3xl animate-fade-in-slow" />
      </div>
      <main className="flex-grow py-8 relative z-10">
        <div className="container px-4 mx-auto">
          <div className="flex items-center mb-8">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="mr-2 text-blue-200 hover:bg-blue-900/30 backdrop-blur-md"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-4xl font-black bg-gradient-to-r from-blue-300 via-cyan-300 to-slate-200 text-transparent bg-clip-text drop-shadow-xl animate-gradient-x">Quiz Results</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Main Content - 2/3 width on medium screens and up */}
            <div className="md:col-span-2 space-y-10">
              {/* Quiz Info Card */}
              <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
                <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden bg-gradient-to-br from-[#162032]/90 to-[#232b3b]/80 backdrop-blur-2xl ring-2 ring-cyan-700/30 hover:ring-cyan-400/40 transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-blue-900/80 via-slate-900/80 to-cyan-900/80 text-white rounded-t-3xl shadow-lg border-b border-cyan-500/10">
                    <CardTitle className="flex justify-between items-center">
                      <span className="text-3xl font-extrabold tracking-tight drop-shadow-xl">{quiz.title}</span>
                      <Badge className="bg-cyan-500/20 border-cyan-400/20 text-cyan-100 shadow">Results</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-8">
                    <p className="text-cyan-200 mb-6 text-lg font-medium drop-shadow">{quiz.description}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                      <div className="text-center p-4 bg-blue-900/40 rounded-2xl shadow-xl border border-blue-500/10">
                        <Users className="h-6 w-6 mx-auto text-blue-300 mb-2 animate-pulse" />
                        <p className="text-sm text-blue-200">Participants</p>
                        <p className="font-black text-blue-100 text-2xl">{participants.length}</p>
                      </div>
                      <div className="text-center p-4 bg-slate-900/40 rounded-2xl shadow-xl border border-slate-500/10">
                        <BarChart2 className="h-6 w-6 mx-auto text-slate-300 mb-2 animate-pulse" />
                        <p className="text-sm text-slate-200">Questions</p>
                        <p className="font-black text-slate-100 text-2xl">{quiz.total_questions}</p>
                      </div>
                      <div className="text-center p-4 bg-cyan-900/40 rounded-2xl shadow-xl border border-cyan-500/10">
                        <Award className="h-6 w-6 mx-auto text-cyan-300 mb-2 animate-pulse" />
                        <p className="text-sm text-cyan-200">Total Points</p>
                        <p className="font-black text-cyan-100 text-2xl">{quiz.total_points}</p>
                      </div>
                      <div className="text-center p-4 bg-slate-800/40 rounded-2xl shadow-xl border border-slate-500/10">
                        <User className="h-6 w-6 mx-auto text-slate-300 mb-2 animate-pulse" />
                        <p className="text-sm text-slate-200">Created By</p>
                        <p className="font-black text-slate-100 truncate text-2xl">{quiz.creator_name}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              {/* Podium or Student Place */}
              {userRole === 'teacher' || userRole === 'admin' ? (
                <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }}>
                  <Card className="border-0 shadow-3xl rounded-3xl mt-10 bg-gradient-to-br from-[#232b3b]/95 to-[#162032]/90 backdrop-blur-2xl ring-2 ring-cyan-700/30 hover:ring-cyan-400/40 transition-all duration-300 relative overflow-visible">
                    <CardHeader>
                      <CardTitle className="text-2xl font-black text-cyan-200 drop-shadow-xl">Winners Podium</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {participants.length > 0 ? (
                        <div className="py-12 relative">
                          <div className="flex items-end justify-center gap-12 h-72 mb-10 relative z-20">
                            {/* Second Place */}
                            {participants.length > 1 && (
                              <motion.div
                                initial={{ y: 60, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3, duration: 0.7 }}
                                className="w-28 sm:w-36 flex flex-col items-center hover:scale-105 transition-transform duration-200"
                              >
                                <div className="relative mb-2">
                                  <div className="absolute -top-2 -right-2 bg-slate-700/80 rounded-full p-1 shadow-cyan-glow">
                                    <Medal className="h-6 w-6 text-slate-100" />
                                  </div>
                                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-900/60 border-4 border-slate-400 flex items-center justify-center overflow-hidden shadow-2xl ring-2 ring-cyan-400/30 animate-podium-glow">
                                    {participants[1].avatar_url ? (
                                      <img src={participants[1].avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                      <User className="h-10 w-10 text-slate-200" />
                                    )}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <p className="font-black truncate max-w-full text-slate-100 text-lg">{participants[1].name}</p>
                                  <p className="text-slate-300 text-base font-bold">{participants[1].points_earned} pts</p>
                                </div>
                                <div className="bg-slate-400/40 w-full h-24 sm:h-32 rounded-t-lg mt-2"></div>
                              </motion.div>
                            )}
                            {/* First Place */}
                            {participants.length > 0 && (
                              <motion.div
                                initial={{ y: 60, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.7 }}
                                className="w-32 sm:w-48 flex flex-col items-center hover:scale-110 transition-transform duration-200"
                              >
                                <div className="relative mb-2">
                                  <div className="absolute -top-2 -right-2 bg-cyan-400/90 rounded-full p-2 shadow-cyan-glow animate-bounce">
                                    <Crown className="h-8 w-8 text-slate-100" />
                                  </div>
                                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-blue-900/70 border-4 border-cyan-400 flex items-center justify-center overflow-hidden shadow-3xl ring-2 ring-cyan-400/30 animate-podium-glow">
                                    {participants[0].avatar_url ? (
                                      <img src={participants[0].avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                      <User className="h-12 w-12 text-blue-100" />
                                    )}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <p className="font-black truncate max-w-full text-blue-100 text-2xl">{participants[0].name}</p>
                                  <p className="text-blue-300 text-lg font-extrabold">{participants[0].points_earned} pts</p>
                                </div>
                                <div className="bg-cyan-400/60 w-full h-32 sm:h-40 rounded-t-lg mt-2"></div>
                              </motion.div>
                            )}
                            {/* Third Place */}
                            {participants.length > 2 && (
                              <motion.div
                                initial={{ y: 60, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5, duration: 0.7 }}
                                className="w-28 sm:w-36 flex flex-col items-center hover:scale-105 transition-transform duration-200"
                              >
                                <div className="relative mb-2">
                                  <div className="absolute -top-2 -right-2 bg-cyan-700/80 rounded-full p-1 shadow-cyan-glow">
                                    <Trophy className="h-6 w-6 text-cyan-100" />
                                  </div>
                                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-cyan-900/60 border-4 border-cyan-400 flex items-center justify-center overflow-hidden shadow-2xl ring-2 ring-cyan-400/30 animate-podium-glow">
                                    {participants[2].avatar_url ? (
                                      <img src={participants[2].avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                      <User className="h-10 w-10 text-cyan-100" />
                                    )}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <p className="font-black truncate max-w-full text-cyan-100 text-lg">{participants[2].name}</p>
                                  <p className="text-cyan-300 text-base font-bold">{participants[2].points_earned} pts</p>
                                </div>
                                <div className="bg-cyan-400/40 w-full h-20 sm:h-28 rounded-t-lg mt-2"></div>
                              </motion.div>
                            )}
                          </div>
                          <div className="h-6 bg-gradient-to-r from-blue-800 via-slate-800 to-cyan-900 rounded-t-lg"></div>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <p className="text-cyan-400 text-lg font-bold">No participants yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ) : null}
            </div>
            {/* Sidebar - 1/3 width on medium screens and up */}
            <div className="space-y-10">
              {/* Your Score Card */}
              {userScore && (
                <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.7 }}>
                  <Card className="border-0 shadow-2xl rounded-3xl bg-gradient-to-b from-[#162032]/95 to-[#0a1626]/90 backdrop-blur-xl ring-2 ring-cyan-700/30 hover:ring-cyan-400/40 transition-all duration-300">
                    <CardHeader>
                      <CardTitle className="text-xl text-cyan-200 font-bold drop-shadow-xl">Your Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center p-3 rounded-full bg-blue-900 mb-3 shadow-cyan-glow animate-podium-glow">
                          <Award className="h-10 w-10 text-cyan-400" />
                        </div>
                        <h2 className="text-4xl text-cyan-100 font-bold drop-shadow-xl">{userScore.points_earned}</h2>
                        <p className="text-cyan-400 font-semibold">out of {userScore.total_points} points</p>
                      </div>
                      <div className="space-y-6">
                        <div>
                          <div className="flex justify-between text-base mb-2 text-cyan-200">
                            <span>Score:</span>
                            <span>{Math.round((userScore.points_earned / userScore.total_points) * 100)}%</span>
                          </div>
                          <Progress value={(userScore.points_earned / userScore.total_points) * 100} className="h-3 bg-cyan-900/60" />
                        </div>
                        <Separator className="bg-cyan-700/30" />
                        <div className="flex justify-between items-center">
                          <span className="text-cyan-300 font-semibold">Your Rank:</span>
                          <div className="flex items-center">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full ring-2 ring-cyan-400/30 shadow-cyan-glow animate-podium-glow ${getPodiumColor(userScore.rank)}`}>
                              {userScore.rank <= 3 ? (
                                getPodiumIcon(userScore.rank)
                              ) : (
                                <span className="text-cyan-100 text-lg font-bold">{userScore.rank}</span>
                              )}
                            </div>
                            <span className="ml-3 text-cyan-100 font-bold text-lg">
                              {userScore.rank === 1 ? '1st' : 
                                userScore.rank === 2 ? '2nd' : 
                                userScore.rank === 3 ? '3rd' : 
                                `${userScore.rank}th`} place
                            </span>
                          </div>
                        </div>
                        <Separator className="bg-cyan-700/30" />
                        <div className="flex justify-between items-center">
                          <span className="text-cyan-300 font-semibold">Total Participants:</span>
                          <span className="text-cyan-100 font-bold text-lg">{participants.length}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
              {/* Actions Card */}
              <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.7 }}>
                <Card className="border-0 shadow-xl rounded-3xl bg-gradient-to-b from-[#162032]/95 to-[#0a1626]/90 backdrop-blur-xl ring-2 ring-cyan-700/30 hover:ring-cyan-400/40 transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="text-xl text-cyan-200 font-black drop-shadow-xl">Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button 
                      className="w-full justify-start bg-cyan-900/40 hover:bg-cyan-900/60 text-cyan-200 font-bold shadow-xl" 
                      variant="secondary"
                      onClick={() => navigate('/dashboard')}
                    >
                      <Home className="mr-2 h-5 w-5" /> Go to Dashboard
                    </Button>
                    <Button 
                      className="w-full justify-start bg-cyan-900/40 hover:bg-cyan-900/60 text-cyan-200 font-bold shadow-xl" 
                      onClick={() => navigate('/quizzes')}
                    >
                      <BarChart2 className="mr-2 h-5 w-5" /> More Quizzes
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      {/* Custom CSS for gradient-x, glass, and glows */}
      <style>{`
        .animate-gradient-x {
          background: linear-gradient(90deg, #67e8f9, #60a5fa, #cbd5e1, #67e8f9);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradient-x 3s ease-in-out infinite;
        }
        @keyframes gradient-x {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .shadow-cyan-glow {
          box-shadow: 0 0 24px 4px #22d3ee44, 0 0 48px 8px #38bdf844;
        }
        .animate-podium-glow {
          animation: podium-glow 2.5s alternate infinite;
        }
        @keyframes podium-glow {
          0% { box-shadow: 0 0 16px 4px #22d3ee44, 0 0 32px 8px #38bdf844; }
          100% { box-shadow: 0 0 32px 8px #38bdf844, 0 0 64px 16px #22d3ee44; }
        }
        .animate-fade-in {
          animation: fade-in 1.2s cubic-bezier(0.4,0,0.2,1) both;
        }
        .animate-fade-in-slow {
          animation: fade-in 2.2s cubic-bezier(0.4,0,0.2,1) both;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
} 