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

  useEffect(() => {
    const fetchQuizResults = async () => {
      try {
        setIsLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        
        // Fetch quiz details
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', id)
          .single();
          
        if (quizError) throw quizError;
        
        // Fetch creator info
        const { data: creatorData } = await supabase
          .from('profiles')
          .select('username, name')
          .eq('id', quizData.created_by)
          .single();
        
        // Type assertion to handle profile data safely
        const creatorProfile = creatorData as unknown as Profile | null;
        
        // Fetch questions to calculate total points possible
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('points')
          .eq('quiz_id', id);
          
        if (questionsError) throw questionsError;
        
        const totalPoints = questionsData.reduce((sum, q) => sum + (q.points || 0), 0);
        const totalQuestions = questionsData.length;
        
        // Fetch all participants and their scores
        const { data: participantsData, error: participantsError } = await supabase
          .from('quiz_participants')
          .select('*')
          .eq('quiz_id', id)
          .order('score', { ascending: false });
          
        if (participantsError) throw participantsError;
        
        // Get usernames and names for all participants
        const processedParticipants = await Promise.all(
          participantsData.map(async (participant, index) => {
            try {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('username, name, avatar_url')
                .eq('id', participant.student_id)
                .single();
              
              // Type assertion to handle profile data safely
              const userProfile = profileData as unknown as Profile | null;
              
              return {
                id: participant.student_id,
                name: userProfile?.name || 'Unknown User',
                username: userProfile?.username || 'unknown',
                avatar_url: userProfile?.avatar_url,
                score: participant.score || 0,
                rank: index + 1,
                total_points: totalPoints,
                points_earned: participant.score || 0
              };
            } catch (e) {
              return {
                id: participant.student_id,
                name: 'Unknown User',
                username: 'unknown',
                score: participant.score || 0,
                rank: index + 1,
                total_points: totalPoints,
                points_earned: participant.score || 0
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
          creator_name: creatorProfile?.name || creatorProfile?.username || 'Unknown',
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
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <Navigation />
        <div className="flex flex-col items-center justify-center flex-grow gap-4">
          <Loader2 className="h-16 w-16 animate-spin text-indigo-600" />
          <p className="text-indigo-600 font-medium mt-4">Loading results...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <Navigation />
        <div className="flex flex-col items-center justify-center flex-grow">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-xl text-center">Quiz Not Found</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p>The quiz results you're looking for could not be found.</p>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button onClick={() => navigate('/')}>
                <Home className="mr-2 h-4 w-4" /> Go Home
              </Button>
            </CardFooter>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <Navigation />
      <main className="flex-grow py-8">
        <div className="container px-4 mx-auto">
          <div className="flex items-center mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="mr-2"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Quiz Results</h1>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Content - 2/3 width on medium screens and up */}
            <div className="md:col-span-2 space-y-6">
              {/* Quiz Info Card */}
              <Card className="border-0 shadow-md overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                  <CardTitle className="flex justify-between items-center">
                    <span>{quiz.title}</span>
                    <Badge className="bg-white/20 border-none text-white">Results</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-gray-600 mb-4">{quiz.description}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-indigo-50 rounded-lg">
                      <Users className="h-5 w-5 mx-auto text-indigo-600 mb-1" />
                      <p className="text-sm text-gray-600">Participants</p>
                      <p className="font-bold text-indigo-600">{participants.length}</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <BarChart2 className="h-5 w-5 mx-auto text-purple-600 mb-1" />
                      <p className="text-sm text-gray-600">Questions</p>
                      <p className="font-bold text-purple-600">{quiz.total_questions}</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <Award className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                      <p className="text-sm text-gray-600">Total Points</p>
                      <p className="font-bold text-blue-600">{quiz.total_points}</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <User className="h-5 w-5 mx-auto text-green-600 mb-1" />
                      <p className="text-sm text-gray-600">Created By</p>
                      <p className="font-bold text-green-600 truncate">{quiz.creator_name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Tabs for different views */}
              <Tabs defaultValue="leaderboard" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
                  <TabsTrigger value="podium">Podium</TabsTrigger>
                </TabsList>
                
                {/* Leaderboard Tab */}
                <TabsContent value="leaderboard" className="mt-4">
                  <Card className="border-0 shadow-md">
                    <CardHeader>
                      <CardTitle className="text-lg">Leaderboard</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {participants.length > 0 ? (
                          participants.map((participant) => (
                            <div 
                              key={participant.id}
                              className={`p-4 rounded-lg border ${
                                participant.id === userScore?.id 
                                  ? 'bg-indigo-50 border-indigo-200' 
                                  : 'bg-white border-gray-100'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${getPodiumColor(participant.rank)}`}>
                                    {participant.rank <= 3 ? (
                                      getPodiumIcon(participant.rank)
                                    ) : (
                                      <span className="font-bold text-gray-600">{participant.rank}</span>
                                    )}
                                  </div>
                                  <div className="ml-3">
                                    <p className="font-medium">{participant.name}</p>
                                    <p className="text-sm text-gray-500">@{participant.username}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-indigo-600">{participant.points_earned} pts</p>
                                  <p className="text-sm text-gray-500">{Math.round((participant.points_earned / participant.total_points) * 100)}%</p>
                                </div>
                              </div>
                              <div className="mt-2">
                                <Progress 
                                  value={(participant.points_earned / participant.total_points) * 100} 
                                  className="h-2"
                                />
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-gray-500">No participants yet</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Podium Tab */}
                <TabsContent value="podium" className="mt-4">
                  <Card className="border-0 shadow-md">
                    <CardHeader>
                      <CardTitle className="text-lg">Winners Podium</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {participants.length > 0 ? (
                        <div className="py-8">
                          <div className="flex items-end justify-center gap-4 h-64 mb-6">
                            {/* Second Place */}
                            {participants.length > 1 && (
                              <motion.div
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                                className="w-24 sm:w-32 flex flex-col items-center"
                              >
                                <div className="relative mb-2">
                                  <div className="absolute -top-1 -right-1 bg-gray-200 rounded-full p-1">
                                    <Medal className="h-5 w-5 text-gray-500" />
                                  </div>
                                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-100 border-4 border-gray-300 flex items-center justify-center overflow-hidden">
                                    {participants[1].avatar_url ? (
                                      <img src={participants[1].avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                      <User className="h-8 w-8 text-gray-400" />
                                    )}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <p className="font-bold truncate max-w-full">{participants[1].name}</p>
                                  <p className="text-gray-500 text-sm">{participants[1].points_earned} pts</p>
                                </div>
                                <div className="bg-gray-300 w-full h-20 sm:h-28 rounded-t-lg mt-2"></div>
                              </motion.div>
                            )}
                          
                            {/* First Place */}
                            {participants.length > 0 && (
                              <motion.div
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.5 }}
                                className="w-24 sm:w-32 flex flex-col items-center"
                              >
                                <div className="relative mb-2">
                                  <div className="absolute -top-1 -right-1 bg-yellow-200 rounded-full p-1">
                                    <Crown className="h-6 w-6 text-yellow-600" />
                                  </div>
                                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-yellow-100 border-4 border-yellow-300 flex items-center justify-center overflow-hidden">
                                    {participants[0].avatar_url ? (
                                      <img src={participants[0].avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                      <User className="h-10 w-10 text-yellow-400" />
                                    )}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <p className="font-bold truncate max-w-full">{participants[0].name}</p>
                                  <p className="text-yellow-600 text-sm font-semibold">{participants[0].points_earned} pts</p>
                                </div>
                                <div className="bg-yellow-300 w-full h-28 sm:h-36 rounded-t-lg mt-2"></div>
                              </motion.div>
                            )}
                          
                            {/* Third Place */}
                            {participants.length > 2 && (
                              <motion.div
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4, duration: 0.5 }}
                                className="w-24 sm:w-32 flex flex-col items-center"
                              >
                                <div className="relative mb-2">
                                  <div className="absolute -top-1 -right-1 bg-amber-200 rounded-full p-1">
                                    <Trophy className="h-5 w-5 text-amber-600" />
                                  </div>
                                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-100 border-4 border-amber-300 flex items-center justify-center overflow-hidden">
                                    {participants[2].avatar_url ? (
                                      <img src={participants[2].avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                      <User className="h-8 w-8 text-amber-400" />
                                    )}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <p className="font-bold truncate max-w-full">{participants[2].name}</p>
                                  <p className="text-gray-500 text-sm">{participants[2].points_earned} pts</p>
                                </div>
                                <div className="bg-amber-200 w-full h-16 sm:h-24 rounded-t-lg mt-2"></div>
                              </motion.div>
                            )}
                          </div>
                          
                          <div className="h-4 bg-gray-200 rounded-t-lg"></div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No participants yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
            
            {/* Sidebar - 1/3 width on medium screens and up */}
            <div className="space-y-6">
              {/* Your Score Card */}
              {userScore && (
                <Card className="border-0 shadow-md bg-gradient-to-b from-white to-indigo-50">
                  <CardHeader>
                    <CardTitle className="text-lg">Your Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center justify-center p-2 rounded-full bg-indigo-100 mb-2">
                        <Award className="h-8 w-8 text-indigo-600" />
                      </div>
                      <h2 className="text-3xl font-bold text-indigo-600">{userScore.points_earned}</h2>
                      <p className="text-gray-500">out of {userScore.total_points} points</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Score:</span>
                          <span>{Math.round((userScore.points_earned / userScore.total_points) * 100)}%</span>
                        </div>
                        <Progress value={(userScore.points_earned / userScore.total_points) * 100} className="h-2" />
                      </div>
                      
                      <Separator />
                      
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Your Rank:</span>
                        <div className="flex items-center">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${getPodiumColor(userScore.rank)}`}>
                            {userScore.rank <= 3 ? (
                              getPodiumIcon(userScore.rank)
                            ) : (
                              <span className="font-bold text-gray-600">{userScore.rank}</span>
                            )}
                          </div>
                          <span className="ml-2 font-bold">
                            {userScore.rank === 1 ? '1st' : 
                             userScore.rank === 2 ? '2nd' : 
                             userScore.rank === 3 ? '3rd' : 
                             `${userScore.rank}th`} place
                          </span>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Participants:</span>
                        <span className="font-bold">{participants.length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Actions Card */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full justify-start" 
                    variant="secondary"
                    onClick={() => navigate('/dashboard')}
                  >
                    <Home className="mr-2 h-4 w-4" /> Go to Dashboard
                  </Button>
                  
                  <Button 
                    className="w-full justify-start"
                    onClick={() => navigate('/quizzes')}
                  >
                    <BarChart2 className="mr-2 h-4 w-4" /> More Quizzes
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 