import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/auth-context';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Eye, Edit, Trash, Copy, Users, Play, Clock, CheckCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  correct_answer: string;
  options: string[];
  points: number;
  time_limit: number;
  point_multiplier: number;
  order_number: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  access_code: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  questions: Question[];
  created_by: string;
}

interface Participant {
  id: string;
  student_id: string;
  status: string;
  joined_at: string;
  username: string;
}

const QuizPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  const [startingQuiz, setStartingQuiz] = useState(false);
  const [isProfessor, setIsProfessor] = useState(false);

  useEffect(() => {
    fetchQuiz();
  }, [id]);

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      
      // Check if current user is a professor
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;
      setIsProfessor(profileData?.role === 'teacher' || profileData?.role === 'admin');

      // Get quiz details
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          questions(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setQuiz({
        ...data,
        status: data.status as 'draft' | 'published' | 'archived'
      });

      // If user is the creator, fetch participants
      if (data.created_by === user?.id) {
        fetchParticipants();
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
      toast({
        title: 'Error',
        description: 'Failed to load quiz. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async () => {
    if (!id) return;
    
    try {
      setLoadingParticipants(true);
      
      // First get all participants for this quiz
      const { data: participantsData, error: participantsError } = await supabase
        .from('quiz_participants')
        .select('*')
        .eq('quiz_id', id)
        .order('joined_at', { ascending: true });

      if (participantsError) throw participantsError;

      if (participantsData && participantsData.length > 0) {
        // Then get usernames for all participants
        const participantsWithUsernames = await Promise.all(
          participantsData.map(async (participant: any) => {
            try {
              const { data: userData, error: userError } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', participant.student_id)
                .single();
              
              return {
                ...participant,
                username: userError || !userData ? 'Unknown' : userData.username
              };
            } catch (e) {
              return { 
                ...participant,
                username: 'Unknown'
              };
            }
          })
        );
        
        setParticipants(participantsWithUsernames);
      } else {
        setParticipants([]);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast({
        title: 'Error',
        description: 'Failed to load participants.',
        variant: 'destructive',
      });
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Access code copied!' });
  };

  const handleStartQuiz = async () => {
    if (!quiz) return;
    
    try {
      setStartingQuiz(true);
      
      // Update all participants status to 'started'
      const { error: updateError } = await supabase
        .from('quiz_participants')
        .update({ 
          status: 'started',
          started_at: new Date().toISOString()
        })
        .eq('quiz_id', quiz.id);
        
      if (updateError) throw updateError;
      
      // Broadcast to all clients that the quiz has started
      const channel = supabase.channel(`quiz:${quiz.id}`);
      await channel.send({
        type: 'broadcast',
        event: 'quiz_started',
        payload: { quiz_id: quiz.id }
      });
      
      toast({
        title: 'Quiz Started!',
        description: 'All participants have been notified.',
      });
      
      // Navigate to active quiz page
      navigate(`/quiz/${quiz.id}/active`);
    } catch (error) {
      console.error('Error starting quiz:', error);
      toast({
        title: 'Error',
        description: 'Failed to start quiz. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setStartingQuiz(false);
    }
  };

  const handlePublishQuiz = async () => {
    if (!quiz) return;
    
    try {
      const { error } = await supabase
        .from('quizzes')
        .update({ status: 'published' })
        .eq('id', quiz.id);
        
      if (error) throw error;
      
      toast({
        title: 'Quiz Published!',
        description: 'Students can now join this quiz.',
      });
      
      // Refresh quiz data
      fetchQuiz();
    } catch (error) {
      console.error('Error publishing quiz:', error);
      toast({
        title: 'Error',
        description: 'Failed to publish quiz. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'published':
        return 'bg-green-500/10 text-green-500';
      case 'archived':
        return 'bg-gray-500/10 text-gray-500';
      default:
        return 'bg-blue-500/10 text-blue-500';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800 text-white dark">
        <Navigation />
        <main className="flex-grow py-8">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading quiz...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800 text-white dark">
        <Navigation />
        <main className="flex-grow py-8">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <p className="text-gray-400">Quiz not found</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Is the current user the quiz creator?
  const isCreator = user?.id === quiz.created_by;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800 text-white dark">
      <Navigation />
      <main className="flex-grow py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-extrabold mb-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
              {quiz.title}
            </h1>
            <div className="flex items-center justify-center space-x-4">
              <Badge className={getStatusColor(quiz.status)}>
                {quiz.status.charAt(0).toUpperCase() + quiz.status.slice(1)}
              </Badge>
              <div className="flex items-center text-gray-400">
                <span className="mr-2">Access Code:</span>
                <span className="font-mono mr-2">{quiz.access_code}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-400 hover:text-white"
                  onClick={() => handleCopyCode(quiz.access_code)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Professor Control Panel - Only shown to the quiz creator */}
          {isCreator && (
            <Card className="bg-gradient-to-br from-indigo-900 to-purple-900 shadow-xl rounded-2xl p-6 mb-8 border border-indigo-700">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white">Professor Control Panel</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="participants">
                  <TabsList className="bg-indigo-950 border border-indigo-800">
                    <TabsTrigger value="participants">Participants</TabsTrigger>
                    <TabsTrigger value="controls">Quiz Controls</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="participants" className="mt-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-indigo-300 flex items-center">
                          <Users className="h-5 w-5 mr-2" />
                          Participants
                        </h3>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={fetchParticipants}
                          className="text-indigo-300 border-indigo-600 hover:bg-indigo-800"
                        >
                          Refresh
                        </Button>
                      </div>
                      
                      {loadingParticipants ? (
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                        </div>
                      ) : participants.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                          {participants.map((participant) => (
                            <div 
                              key={participant.id} 
                              className="flex items-center justify-between p-3 bg-indigo-800/40 rounded-lg border border-indigo-700"
                            >
                              <div className="flex items-center">
                                <div className="h-8 w-8 rounded-full bg-purple-700 flex items-center justify-center text-white font-semibold">
                                  {participant.username.charAt(0).toUpperCase()}
                                </div>
                                <span className="ml-3 font-medium text-white">{participant.username}</span>
                              </div>
                              <span className="text-sm text-indigo-300 flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {new Date(participant.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-indigo-300">
                          No participants have joined yet
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="controls" className="mt-4">
                    <div className="space-y-4">
                      <div className="p-4 bg-indigo-800/40 rounded-lg border border-indigo-700">
                        <h3 className="font-semibold text-lg text-white mb-2">Start Quiz</h3>
                        <p className="text-indigo-300 mb-4">
                          Start the quiz for all participants. Everyone in the waiting room will be redirected to the quiz automatically.
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="text-indigo-300 flex items-center">
                            <Users className="h-4 w-4 mr-2" />
                            {participants.length} participants ready
                          </div>
                          <Button 
                            onClick={handleStartQuiz}
                            disabled={startingQuiz || participants.length === 0}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {startingQuiz ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white mr-2"></div>
                                Starting...
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-2" /> 
                                Start Quiz
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-indigo-800/40 rounded-lg border border-indigo-700">
                        <h3 className="font-semibold text-lg text-white mb-2">Quiz Settings</h3>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center text-indigo-300">
                            <span>Quiz Status:</span>
                            <Badge className={getStatusColor(quiz.status)}>
                              {quiz.status.charAt(0).toUpperCase() + quiz.status.slice(1)}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center text-indigo-300">
                            <span>Questions:</span>
                            <span>{quiz.questions.length}</span>
                          </div>
                          <div className="flex justify-between items-center text-indigo-300">
                            <span>Total Points:</span>
                            <span>{quiz.questions.reduce((sum, q) => sum + q.points, 0)}</span>
                          </div>
                          
                          {quiz.status === 'draft' && (
                            <Button 
                              onClick={handlePublishQuiz}
                              className="w-full bg-green-600 hover:bg-green-700 text-white mt-2"
                            >
                              Publish Quiz
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
              <CardFooter className="flex justify-between border-t border-indigo-800 pt-4">
                <Button 
                  variant="outline" 
                  className="text-indigo-300 border-indigo-600 hover:bg-indigo-800"
                  onClick={() => navigate(`/edit-quiz/${quiz.id}`)}
                >
                  <Edit className="h-4 w-4 mr-2" /> Edit Quiz
                </Button>
                <Button 
                  className="bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => navigate('/quizzes')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" /> Done
                </Button>
              </CardFooter>
            </Card>
          )}

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl rounded-2xl p-6 mb-8 border border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-indigo-300">Description</h2>
            <p className="text-gray-300">{quiz.description || 'No description provided'}</p>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4 text-indigo-300">Questions ({quiz.questions.length})</h2>
            {quiz.questions.sort((a, b) => a.order_number - b.order_number).map((question, index) => (
              <Card key={question.id} className="overflow-hidden bg-gray-900 border border-gray-700">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl font-bold text-white">
                      Question {index + 1}
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-indigo-500/10 text-indigo-300">
                        {question.points * (question.point_multiplier || 1)} {question.points * (question.point_multiplier || 1) === 1 ? 'point' : 'points'}
                        {question.point_multiplier > 1 ? ` (${question.point_multiplier}x)` : ''}
                      </Badge>
                      <Badge className="bg-purple-500/10 text-purple-300">
                        {question.time_limit}s
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-gray-300">{question.question_text}</p>
                    {question.question_type === 'multiple_choice' && (
                      <div className="space-y-2">
                        {question.options.map((option, i) => (
                          <div
                            key={i}
                            className={`p-2 rounded ${
                              option === question.correct_answer
                                ? 'bg-green-500/10 text-green-300'
                                : 'bg-gray-800 text-gray-300'
                            }`}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                    {question.question_type === 'true_false' && (
                      <div className="p-2 rounded bg-green-500/10 text-green-300">
                        Correct answer: {question.correct_answer}
                      </div>
                    )}
                    {question.question_type === 'short_answer' && (
                      <div className="p-2 rounded bg-green-500/10 text-green-300">
                        Expected answer: {question.correct_answer}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default QuizPage; 