import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, QuizState, ParticipantAnswer } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  Loader2, 
  Users, 
  Play, 
  Clock, 
  ArrowRight, 
  CheckCircle,
  HelpCircle,
  AlertCircle,
  ChevronRight,
  Lightbulb,
  Award,
  BarChart2,
  PieChart
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/auth-context';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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
  questions: Question[];
  access_code: string;
  status: string;
  created_by: string;
}

// Interface for real-time quiz state updates
interface QuizStateUpdate {
  current_question_index?: number;
  time_remaining?: number;
  is_completed?: boolean;
  last_updated?: string;
}

// Add interface for participant answers with username
interface ParticipantAnswerWithUser extends ParticipantAnswer {
  profiles: {
    username: string;
  };
}

export function ActiveQuiz() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfessor, setIsProfessor] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [quizStateId, setQuizStateId] = useState<string | null>(null);
  const [isStateLoaded, setIsStateLoaded] = useState(false);
  const { toast } = useToast();
  const [showQuestionResults, setShowQuestionResults] = useState(false);
  const [participantAnswers, setParticipantAnswers] = useState<ParticipantAnswerWithUser[]>([]);
  const [answerStats, setAnswerStats] = useState<{[key: string]: number}>({});
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [loadingAnswers, setLoadingAnswers] = useState(false);

  // Function to fetch the current quiz state
  const fetchQuizState = async () => {
    if (!id) return;
    
    try {
      // Check if a quiz state record exists
      const { data, error } = await supabase
        .from('quiz_state')
        .select('*')
        .eq('quiz_id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No state exists yet, we'll create it later if professor
          return null;
        }
        throw error;
      }
      
      return data as QuizState;
    } catch (error) {
      console.error('Error fetching quiz state:', error);
      return null;
    }
  };

  // Function to create or update quiz state
  const updateQuizState = async (state: QuizStateUpdate) => {
    if (!id || !isProfessor) return;
    
    try {
      const now = new Date().toISOString();
      
      if (quizStateId) {
        // Update existing state
        const { error } = await supabase
          .from('quiz_state')
          .update({
            ...state,
            last_updated: now
          })
          .eq('id', quizStateId);
          
        if (error) throw error;
        
        // Broadcast updates to all participants
        const channel = supabase.channel(`quiz:${id}`);
        await channel.send({
          type: 'broadcast',
          event: 'quiz_state_updated',
          payload: { ...state, quiz_id: id }
        });
      } else {
        // Create new state
        const { data, error } = await supabase
          .from('quiz_state')
          .insert({
            quiz_id: id,
            current_question_index: state.current_question_index || 0,
            time_remaining: state.time_remaining || 0,
            is_completed: state.is_completed || false,
            last_updated: now
          })
          .select('id')
          .single();
          
        if (error) throw error;
        
        if (data) {
          setQuizStateId(data.id);
          
          // Broadcast to all participants that the quiz state is initialized
          const channel = supabase.channel(`quiz:${id}`);
          await channel.send({
            type: 'broadcast',
            event: 'quiz_started',
            payload: { 
              quiz_id: id,
              current_question_index: state.current_question_index || 0,
              time_remaining: state.time_remaining || 0
            }
          });
        }
      }
    } catch (error) {
      console.error('Error updating quiz state:', error);
      toast({
        title: "Error",
        description: "Failed to update quiz state",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!id) return;

    const fetchQuiz = async () => {
      try {
        setIsLoading(true);
        
        // Check if professor
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user?.id)
          .single();

        if (profileError) throw profileError;
        const userIsProfessor = profileData?.role === 'teacher' || profileData?.role === 'admin';
        setIsProfessor(userIsProfessor);
        
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
        
        // Sort questions by order_number
        const questions = data.questions.sort((a: any, b: any) => a.order_number - b.order_number);
        
        setQuiz({
          ...data,
          questions,
        });
        
        // Get the current quiz state
        const quizState = await fetchQuizState();
        
        if (quizState) {
          // State exists, use it to set the current question
          setQuizStateId(quizState.id);
          setCurrentQuestion(quizState.current_question_index);
          setTimeLeft(quizState.time_remaining || questions[quizState.current_question_index].time_limit);
          setIsCompleted(quizState.is_completed);
        } else if (userIsProfessor) {
          // No state exists and user is professor, create initial state
          setTimeLeft(questions[0].time_limit);
          updateQuizState({
            current_question_index: 0,
            time_remaining: questions[0].time_limit,
            is_completed: false
          });
        } else {
          // No state and not professor, just use defaults
          setTimeLeft(questions[0].time_limit);
        }
        
        setIsStateLoaded(true);
      } catch (error) {
        console.error('Error fetching quiz:', error);
        toast({
          title: "Error",
          description: "Failed to load quiz",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuiz();

    // Enhanced real-time subscriptions for Kahoot-like synchronization
    const quizStateSubscription = supabase
      .channel(`quiz-state-${id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'quiz_state',
        filter: `quiz_id=eq.${id}`
      }, (payload) => {
        // Only update if not professor (professor controls the state)
        if (!isProfessor && payload.new) {
          const newState = payload.new as QuizState;
          
          // Update UI state immediately to match the professor's view
          setCurrentQuestion(newState.current_question_index);
          setTimeLeft(newState.time_remaining);
          setIsCompleted(newState.is_completed);
          
          // Reset UI state if question changed
          setSelectedAnswer(null);
          setShowFeedback(false);
          setIsSubmitting(false);
        }
      })
      .subscribe();
      
    // Subscribe to broadcast events for real-time updates
    const broadcastSubscription = supabase
      .channel(`quiz:${id}`)
      .on('broadcast', { event: 'quiz_state_updated' }, (payload) => {
        if (!isProfessor && payload.payload) {
          const { current_question_index, time_remaining, is_completed } = payload.payload;
          
          // Update immediately for real-time sync
          if (current_question_index !== undefined) {
            setCurrentQuestion(current_question_index);
            setSelectedAnswer(null);
            setShowFeedback(false);
            setIsSubmitting(false);
          }
          
          if (time_remaining !== undefined) {
            setTimeLeft(time_remaining);
          }
          
          if (is_completed !== undefined) {
            setIsCompleted(is_completed);
          }
        }
      })
      .on('broadcast', { event: 'quiz_started' }, (payload) => {
        if (!isProfessor && payload.payload) {
          // Reset to initial question when quiz starts
          const { current_question_index, time_remaining } = payload.payload;
          
          setCurrentQuestion(current_question_index || 0);
          setTimeLeft(time_remaining || (quiz?.questions[0]?.time_limit || 60));
          setSelectedAnswer(null);
          setShowFeedback(false);
          setIsSubmitting(false);
          setIsCompleted(false);
          
          toast({
            title: "Quiz Started!",
            description: "The professor has started the quiz",
          });
        }
      })
      .subscribe();

    // Clean up any timers and subscription on unmount
    return () => {
      quizStateSubscription.unsubscribe();
      broadcastSubscription.unsubscribe();
    };
  }, [id, user?.id, toast]);

  // Update quiz state more frequently for better real-time experience
  useEffect(() => {
    if (!isProfessor || !isStateLoaded || !quiz) return;
    
    // Update state every 2 seconds instead of 5 for more responsive sync
    const stateUpdateInterval = setInterval(() => {
      updateQuizState({
        current_question_index: currentQuestion,
        time_remaining: timeLeft,
        is_completed: isCompleted
      });
    }, 2000);
    
    return () => clearInterval(stateUpdateInterval);
  }, [isProfessor, isStateLoaded, currentQuestion, timeLeft, isCompleted, quiz]);

  // Improve timer synchronization
  useEffect(() => {
    if (!quiz || !isStateLoaded || timeLeft <= 0 || isSubmitting || showFeedback || isCompleted) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
      
      // If professor, update time more frequently for critical times or every 5 seconds
      if (isProfessor && (timeLeft < 10 || timeLeft % 5 === 0)) {
        updateQuizState({
          time_remaining: timeLeft - 1
        });
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft, quiz, isSubmitting, showFeedback, isProfessor, isStateLoaded, isCompleted]);

  // Move to next question when time is up
  useEffect(() => {
    if (timeLeft === 0 && quiz && !isSubmitting && !showFeedback && isStateLoaded) {
      // Time's up - auto submit without an answer
      handleSubmitAnswer();
    }
  }, [timeLeft, quiz, isSubmitting, showFeedback, isStateLoaded]);

  const handleSelectAnswer = (answer: string) => {
    if (isSubmitting || showFeedback || isProfessor) return;
    setSelectedAnswer(answer);
  };

  const handleSubmitAnswer = async () => {
    if (!quiz || isSubmitting || isProfessor) return;
    
    try {
      setIsSubmitting(true);
      const question = quiz.questions[currentQuestion];
      
      // Check if answer is correct
      const correct = selectedAnswer === question.correct_answer;
      
      // Calculate points based on time and correctness
      const timePercentage = timeLeft / question.time_limit;
      const basePoints = correct ? question.points : 0;
      const timeBonusPoints = correct ? Math.floor(question.points * 0.5 * timePercentage) : 0;
      const pointsEarned = basePoints + timeBonusPoints;
      
      setIsCorrect(correct);
      setEarnedPoints(pointsEarned);
      setTotalPoints(prev => prev + pointsEarned);
      
      // Record the answer in database
      const { error } = await supabase
        .from('participant_answers')
        .insert({
          quiz_id: quiz.id,
          question_id: question.id,
          participant_id: user?.id,
          answer: selectedAnswer || '',
          is_correct: correct,
          points_earned: pointsEarned,
          response_time: question.time_limit - timeLeft
        });
        
      if (error) {
        console.error('Error recording answer:', error);
      }
      
      // Update participant score using our custom function
      const { error: scoreError } = await supabase
        .rpc('increment_score', { 
          quiz_id: quiz.id,
          student_id: user?.id,
          points_to_add: pointsEarned
        });
        
      if (scoreError) {
        console.error('Error updating score:', scoreError);
      }
      
      // Show feedback
      setShowFeedback(true);
      
      // Wait for the next question to be shown by the professor
      // The state subscription will handle moving to the next question
      
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit your answer',
        variant: 'destructive',
      });
    }
  };

  // Add function to fetch participant answers for the current question
  const fetchQuestionResults = async () => {
    if (!quiz || !id) return;
    
    try {
      setLoadingAnswers(true);
      
      // Get the current question
      const question = quiz.questions[currentQuestion];
      
      // Fetch all participant answers for this question
      const { data, error } = await supabase
        .from('participant_answers')
        .select(`
          *,
          profiles:participant_id (
            username
          )
        `)
        .eq('quiz_id', id)
        .eq('question_id', question.id);
        
      if (error) throw error;
      
      // Get total participants
      const { count: participantCount, error: countError } = await supabase
        .from('quiz_participants')
        .select('*', { count: 'exact', head: true })
        .eq('quiz_id', id);
        
      if (countError) throw countError;
      
      // Calculate answer statistics
      const stats: {[key: string]: number} = {};
      data.forEach(answer => {
        stats[answer.answer] = (stats[answer.answer] || 0) + 1;
      });
      
      setParticipantAnswers(data as ParticipantAnswerWithUser[]);
      setAnswerStats(stats);
      setTotalParticipants(participantCount || 0);
      
    } catch (error) {
      console.error('Error fetching question results:', error);
      toast({
        title: "Error",
        description: "Failed to load participant answers",
        variant: "destructive",
      });
    } finally {
      setLoadingAnswers(false);
    }
  };

  const moveToNextQuestion = () => {
    if (!quiz || !isProfessor) return;
    
    // Reset question results state
    setShowQuestionResults(false);
    setParticipantAnswers([]);
    
    if (currentQuestion < quiz.questions.length - 1) {
      const nextQuestion = currentQuestion + 1;
      setCurrentQuestion(nextQuestion);
      setTimeLeft(quiz.questions[nextQuestion].time_limit);
      setSelectedAnswer(null);
      setShowFeedback(false);
      setIsSubmitting(false);
      
      // Update quiz state immediately and notify all participants
      updateQuizState({
        current_question_index: nextQuestion,
        time_remaining: quiz.questions[nextQuestion].time_limit,
        is_completed: false
      });
      
      // Add a specific broadcast for next question to ensure immediate sync
      const channel = supabase.channel(`quiz:${id}`);
      channel.send({
        type: 'broadcast',
        event: 'quiz_state_updated',
        payload: { 
          current_question_index: nextQuestion,
          time_remaining: quiz.questions[nextQuestion].time_limit,
          is_completed: false,
          quiz_id: id 
        }
      });
    } else {
      // Quiz is complete
      setIsCompleted(true);
      
      // Update quiz state to completed and notify all participants
      updateQuizState({
        is_completed: true
      });
      
      // Broadcast completion to all participants
      const channel = supabase.channel(`quiz:${id}`);
      channel.send({
        type: 'broadcast',
        event: 'quiz_state_updated',
        payload: { 
          is_completed: true,
          quiz_id: id 
        }
      });
    }
  };

  const handleFinishQuiz = () => {
    // Navigate to results page
    navigate(`/quiz/${id}/results`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <Navigation />
        <div className="flex flex-col items-center justify-center flex-grow gap-4">
          <Loader2 className="h-16 w-16 animate-spin text-indigo-600" />
          <p className="text-indigo-600 font-medium mt-4">Loading quiz...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <Navigation />
        <div className="flex items-center justify-center flex-grow">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-center">Quiz Not Found</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <AlertCircle className="mx-auto h-16 w-16 text-orange-500 mb-4" />
              <p className="text-gray-600">This quiz doesn't exist or you don't have access to it.</p>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button onClick={() => navigate('/quizzes')}>
                Back to Quizzes
              </Button>
            </CardFooter>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const question = quiz.questions[currentQuestion];
  const progressPercent = ((currentQuestion + 1) / quiz.questions.length) * 100;
  
  // Professor view shows different UI for monitoring the active quiz
  if (isProfessor) {
    // Check if quiz is completed to show results
    if (isCompleted) {
      return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
          <Navigation />
          <main className="flex-grow py-8">
            <div className="container mx-auto px-4">
              <Card className="max-w-3xl mx-auto border-0 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-12 px-6 text-center text-white">
                  <Award className="h-20 w-20 mx-auto mb-4" />
                  <h1 className="text-3xl font-bold mb-2">Quiz Completed!</h1>
                  <p className="text-indigo-100">All students have completed the quiz</p>
                </div>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-600 mb-6">
                    You can now view the detailed results showing performance of all participants.
                  </p>
                </CardContent>
                <CardFooter className="border-t bg-gray-50 flex justify-center p-6">
                  <Button 
                    className="bg-indigo-600 hover:bg-indigo-700"
                    onClick={handleFinishQuiz}
                  >
                    View Results
                    <BarChart2 className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </main>
          <Footer />
        </div>
      );
    }
    
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <Navigation />
        <main className="flex-grow py-8">
          <div className="container mx-auto px-4">
            <Card className="max-w-3xl mx-auto border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-bold">
                    Quiz in Progress: {quiz.title}
                  </CardTitle>
                  <Badge className="bg-white/20 text-white border-none">Professor Control Panel</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <h3 className="font-medium mb-2 flex items-center">
                      <HelpCircle className="h-5 w-5 text-indigo-500 mr-2" />
                      Current Question ({currentQuestion + 1}/{quiz.questions.length})
                    </h3>
                    <p className="text-gray-700 font-medium">{question.question_text}</p>
                    
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-gray-500 mb-1">
                        <span>Time remaining:</span>
                        <span>{formatTime(timeLeft)}</span>
                      </div>
                      <Progress 
                        value={(timeLeft / question.time_limit) * 100} 
                        className="h-2"
                        indicatorClassName="bg-indigo-500" 
                      />
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <h3 className="font-medium mb-2 flex items-center">
                      <Users className="h-5 w-5 text-indigo-500 mr-2" />
                      Overall Progress
                    </h3>
                    <div className="flex justify-between text-sm text-gray-500 mb-1">
                      <span>Question {currentQuestion + 1} of {quiz.questions.length}</span>
                      <span>{Math.round(progressPercent)}% complete</span>
                    </div>
                    <Progress 
                      value={progressPercent} 
                      className="h-2"
                      indicatorClassName="bg-green-500" 
                    />
                  </div>
                  
                  {showQuestionResults ? (
                    <div className="bg-white rounded-lg p-4 border border-gray-200 mt-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium flex items-center">
                          <PieChart className="h-5 w-5 text-indigo-500 mr-2" />
                          Question Results
                        </h3>
                        <Badge className="bg-indigo-100 text-indigo-800">
                          {participantAnswers.length} of {totalParticipants} answered
                        </Badge>
                      </div>
                      
                      {loadingAnswers ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        </div>
                      ) : (
                        <>
                          {/* Answer distribution */}
                          <div className="mb-6">
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Answer Distribution</h4>
                            <div className="space-y-2">
                              {question.options.map((option) => {
                                const count = answerStats[option] || 0;
                                const percentage = totalParticipants > 0 
                                  ? Math.round((count / totalParticipants) * 100) 
                                  : 0;
                                const isCorrect = option === question.correct_answer;
                                
                                return (
                                  <div key={option} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                      <span className="flex items-center">
                                        {option}
                                        {isCorrect && (
                                          <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                                        )}
                                      </span>
                                      <span>{count} ({percentage}%)</span>
                                    </div>
                                    <div className="w-full bg-gray-100 h-2 rounded-full">
                                      <div 
                                        className={`h-2 rounded-full ${isCorrect ? 'bg-green-500' : 'bg-blue-400'}`}
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          
                          {/* Student responses */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Individual Responses</h4>
                            <div className="overflow-y-auto max-h-48 border rounded-lg">
                              {participantAnswers.length > 0 ? (
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Answer</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Points</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {participantAnswers.map((answer) => (
                                      <tr key={answer.id}>
                                        <td className="px-4 py-2 text-sm text-gray-900">{answer.profiles.username}</td>
                                        <td className="px-4 py-2 text-sm">
                                          <span className={`inline-flex items-center ${answer.is_correct ? 'text-green-600' : 'text-red-600'}`}>
                                            {answer.answer}
                                            {answer.is_correct ? (
                                              <CheckCircle className="ml-1 h-4 w-4 text-green-500" />
                                            ) : (
                                              <AlertCircle className="ml-1 h-4 w-4 text-red-500" />
                                            )}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{answer.points_earned}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="text-center py-4 text-gray-500">
                                  No answers submitted yet
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              </CardContent>
              <CardFooter className="border-t bg-gray-50 flex justify-center p-4">
                {!showQuestionResults ? (
                  <Button 
                    onClick={() => {
                      setShowQuestionResults(true);
                      fetchQuestionResults();
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 mr-4"
                  >
                    Show Question Results
                    <PieChart className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button 
                    onClick={() => setShowQuestionResults(false)}
                    variant="outline"
                    className="mr-4"
                  >
                    Hide Results
                  </Button>
                )}
                
                {currentQuestion < quiz.questions.length - 1 ? (
                  <Button 
                    onClick={moveToNextQuestion}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    Next Question
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button 
                    onClick={() => {
                      setIsCompleted(true);
                      updateQuizState({
                        is_completed: true
                      });
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Complete Quiz
                    <CheckCircle className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Quiz completed view
  if (isCompleted) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <Navigation />
        <main className="flex-grow py-8">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="max-w-3xl mx-auto"
            >
              <Card className="border-0 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-12 px-6 text-center text-white">
                  <Award className="h-20 w-20 mx-auto mb-4" />
                  <h1 className="text-3xl font-bold mb-2">Quiz Completed!</h1>
                  <p className="text-indigo-100">You've answered all questions</p>
                </div>
                <CardContent className="pt-6">
                  <div className="text-center mb-6">
                    <p className="text-gray-600 mb-2">Your score</p>
                    <div className="text-5xl font-bold text-indigo-600">{totalPoints}</div>
                    <p className="text-gray-500 mt-2">
                      out of {quiz.questions.reduce((sum, q) => sum + q.points, 0)} points
                    </p>
                  </div>
                  
                  <div className="rounded-lg bg-indigo-50 p-4 mb-6">
                    <h3 className="font-medium text-indigo-700 mb-2">Quiz Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Questions:</span>
                        <span className="font-medium">{quiz.questions.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Quiz Title:</span>
                        <span className="font-medium">{quiz.title}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-gray-50 flex justify-center p-6">
                  <Button 
                    className="bg-indigo-600 hover:bg-indigo-700"
                    onClick={handleFinishQuiz}
                  >
                    View Detailed Results
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Student active quiz view
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <Navigation />
      <main className="flex-grow py-8 px-4">
        <div className="container mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-3xl mx-auto"
            >
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center mb-1">
                    <div>
                      <Badge className="bg-indigo-100 text-indigo-700 mb-2">
                        Question {currentQuestion + 1} of {quiz.questions.length}
                      </Badge>
                      <CardTitle className="text-xl font-bold">{quiz.title}</CardTitle>
                    </div>
                    <div className={cn(
                      "flex items-center gap-1 rounded-full px-3 py-1 text-white font-medium",
                      timeLeft < question.time_limit * 0.25 ? "bg-red-500" : "bg-indigo-600"
                    )}>
                      <Clock className={cn(
                        "h-4 w-4",
                        timeLeft < question.time_limit * 0.25 && "animate-pulse"
                      )} />
                      <span>{formatTime(timeLeft)}</span>
                    </div>
                  </div>
                  
                  <Progress 
                    value={(timeLeft / question.time_limit) * 100} 
                    className="h-2 mb-2" 
                    indicatorClassName={cn(
                      timeLeft < question.time_limit * 0.25 ? "bg-red-500" : "bg-indigo-500"
                    )}
                  />
                  
                  <div className="w-full bg-gray-100 h-1.5 rounded-full">
                    <div 
                      className="bg-green-500 h-1.5 rounded-full" 
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </CardHeader>
                
                <CardContent className="pt-4">
                  {/* Feedback overlay when showing answer feedback */}
                  {showFeedback && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white/95 rounded-lg absolute inset-0 z-10 flex items-center justify-center"
                    >
                      <div className="text-center p-6">
                        {isCorrect ? (
                          <>
                            <motion.div
                              initial={{ scale: 0.5 }}
                              animate={{ scale: 1 }}
                              transition={{ duration: 0.3 }}
                            >
                              <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
                            </motion.div>
                            <h3 className="text-2xl font-bold text-green-600 mb-2">Correct!</h3>
                            <p className="text-gray-600 mb-1">You earned <span className="font-bold">{earnedPoints}</span> points</p>
                            <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
                              <Lightbulb className="h-4 w-4" />
                              <span>Moving to next question...</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <motion.div
                              initial={{ scale: 0.5 }}
                              animate={{ scale: 1 }}
                              transition={{ duration: 0.3 }}
                            >
                              <AlertCircle className="h-20 w-20 text-red-500 mx-auto mb-4" />
                            </motion.div>
                            <h3 className="text-2xl font-bold text-red-600 mb-2">Incorrect</h3>
                            <p className="text-gray-600 mb-1">
                              Correct answer: <span className="font-bold">{question.correct_answer}</span>
                            </p>
                            <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
                              <Lightbulb className="h-4 w-4" />
                              <span>Moving to next question...</span>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                
                  <div className="space-y-6">
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">{question.question_text}</h3>
                      <div className="flex items-center gap-2 text-sm text-indigo-600">
                        <HelpCircle className="h-4 w-4" />
                        <span>{question.question_type === 'multiple_choice' ? 'Choose one answer' : 'True or False'}</span>
                      </div>
                    </div>
                    
                    {question.question_type === 'multiple_choice' && (
                      <RadioGroup 
                        value={selectedAnswer || ''} 
                        className="space-y-3"
                        onValueChange={handleSelectAnswer}
                        disabled={isSubmitting || showFeedback}
                      >
                        {question.options.map((option, i) => (
                          <Label
                            key={i}
                            htmlFor={`option-${i}`}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all select-none",
                              selectedAnswer === option 
                                ? "bg-indigo-50 border-indigo-300 text-indigo-900" 
                                : "bg-white border-gray-200 text-gray-800 hover:bg-gray-50",
                              (isSubmitting || showFeedback) && "opacity-70 cursor-not-allowed"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <RadioGroupItem 
                                value={option} 
                                id={`option-${i}`}
                                disabled={isSubmitting || showFeedback}
                              />
                              <span>{option}</span>
                            </div>
                            {selectedAnswer === option && (
                              <ChevronRight className="h-5 w-5 text-indigo-600" />
                            )}
                          </Label>
                        ))}
                      </RadioGroup>
                    )}
                    
                    {question.question_type === 'true_false' && (
                      <RadioGroup 
                        value={selectedAnswer || ''} 
                        className="space-y-3"
                        onValueChange={handleSelectAnswer}
                        disabled={isSubmitting || showFeedback}
                      >
                        <Label
                          htmlFor="true-option"
                          className={cn(
                            "flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all",
                            selectedAnswer === 'True' 
                              ? "bg-indigo-50 border-indigo-300 text-indigo-900" 
                              : "bg-white border-gray-200 text-gray-800 hover:bg-gray-50",
                            (isSubmitting || showFeedback) && "opacity-70 cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem 
                              value="True" 
                              id="true-option"
                              disabled={isSubmitting || showFeedback}
                            />
                            <span>True</span>
                          </div>
                          {selectedAnswer === 'True' && (
                            <ChevronRight className="h-5 w-5 text-indigo-600" />
                          )}
                        </Label>
                        
                        <Label
                          htmlFor="false-option"
                          className={cn(
                            "flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all",
                            selectedAnswer === 'False' 
                              ? "bg-indigo-50 border-indigo-300 text-indigo-900" 
                              : "bg-white border-gray-200 text-gray-800 hover:bg-gray-50",
                            (isSubmitting || showFeedback) && "opacity-70 cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem 
                              value="False" 
                              id="false-option"
                              disabled={isSubmitting || showFeedback}
                            />
                            <span>False</span>
                          </div>
                          {selectedAnswer === 'False' && (
                            <ChevronRight className="h-5 w-5 text-indigo-600" />
                          )}
                        </Label>
                      </RadioGroup>
                    )}
                  </div>
                </CardContent>
                
                <CardFooter className="border-t bg-gray-50 flex justify-between items-center p-4">
                  <div className="text-sm text-gray-500">
                    <span className="font-medium text-indigo-600">{question.points}</span> points
                    {question.point_multiplier > 1 && (
                      <span className="ml-1">× {question.point_multiplier} multiplier</span>
                    )}
                  </div>
                  <Button 
                    className={cn(
                      "transition-all",
                      selectedAnswer ? "bg-indigo-600 hover:bg-indigo-700" : "bg-gray-300"
                    )}
                    disabled={!selectedAnswer || isSubmitting || showFeedback}
                    onClick={handleSubmitAnswer}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <Footer />
    </div>
  );
} 