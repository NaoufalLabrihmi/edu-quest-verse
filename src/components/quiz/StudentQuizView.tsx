import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase, QuizSession, QuizParticipantAnswer } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, CheckCircle, XCircle, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

interface Props {
  quizId: string;
  sessionId: string;
  questions: any[];
  userId: string;
}

export function StudentQuizView({ quizId, sessionId, questions, userId }: Props) {
  const [session, setSession] = useState<QuizSession | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [earnedPoints, setEarnedPoints] = useState<number>(0);
  const [participantCount, setParticipantCount] = useState(0);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loadingButtons, setLoadingButtons] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Restore state from localStorage
    const key = `quiz_${quizId}_session_${sessionId}_user_${userId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSelectedAnswer(parsed.selectedAnswer || null);
        setHasAnswered(parsed.hasAnswered || false);
        setTimeLeft(parsed.timeLeft || 0);
        if (parsed.currentQuestionIndex !== undefined) {
          console.log('Restored question index from localStorage:', parsed.currentQuestionIndex);
        }
      } catch (e) {
        console.error('Error parsing localStorage data:', e);
      }
    }

    // Force buttons to appear after a short delay to ensure rendering
    setTimeout(() => {
      setLoadingButtons(false);
    }, 1000);

    // Subscribe to session updates
    const subscription = supabase
      .channel('quiz_session_' + sessionId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('Session update received:', payload.new);
          const newSession = payload.new as QuizSession;
          setSession(newSession);
          setTimeLeft(newSession.time_remaining);
          setIsTimerActive(newSession.status === 'active');
          
          // Reset state for new question
          if (newSession.status === 'waiting') {
            setSelectedAnswer(null);
            setHasAnswered(false);
            setIsAnswerCorrect(null);
            setEarnedPoints(0);
            setShowResultDialog(false);
            setLoadingButtons(false); // Ensure buttons show on question reset
          }
          
          // Handle question ended - show results
          if (newSession.status === 'question_ended') {
            // Fetch and display results
            fetchAnswerResult();
            // Show the results dialog
            setShowResultDialog(true);
          }
          
          // Handle quiz end
          if (newSession.status === 'ended') {
            navigate(`/quiz/${quizId}/results`);
          }

          // Save current state to localStorage
          const stateToSave = {
            selectedAnswer,
            hasAnswered,
            timeLeft: newSession.time_remaining,
            currentQuestionIndex: newSession.current_question_index,
            status: newSession.status
          };
          localStorage.setItem(key, JSON.stringify(stateToSave));
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    // Subscribe to custom broadcasts for status updates
    const broadcastSubscription = supabase
      .channel('session-update')
      .on('broadcast', { event: 'session_status_changed' }, (payload) => {
        console.log('Received manual session status update:', payload);
        if (payload.payload.session_id === sessionId) {
          // Update our local state based on the broadcast
          if (session) {
            const updatedSession = {
              ...session,
              status: payload.payload.status,
              time_remaining: payload.payload.time_remaining,
              current_question_index: payload.payload.current_question_index
            };
            console.log('Updating session from broadcast:', updatedSession);
            setSession(updatedSession);
            setTimeLeft(payload.payload.time_remaining);
            setIsTimerActive(payload.payload.status === 'active');
            setLoadingButtons(false); // Ensure buttons show when status changes
            
            // Show result dialog if question ended
            if (payload.payload.status === 'question_ended') {
              fetchAnswerResult();
              setShowResultDialog(true);
            }
            
            // Save to localStorage
            const stateToSave = {
              selectedAnswer,
              hasAnswered,
              timeLeft: payload.payload.time_remaining,
              currentQuestionIndex: payload.payload.current_question_index,
              status: payload.payload.status
            };
            localStorage.setItem(key, JSON.stringify(stateToSave));
          }
        }
      })
      .subscribe((status) => {
        console.log('Broadcast subscription status:', status);
      });

    // Subscribe specifically to quiz start events
    const quizStartSubscription = supabase
      .channel(`quiz:${quizId}`)
      .on('broadcast', { event: 'quiz_started' }, (payload) => {
        console.log('Received quiz started event:', payload);
        // Force refresh session data when quiz starts
        fetchSession();
        setLoadingButtons(false); // Force buttons to show on quiz start
      })
      .subscribe((status) => {
        console.log('Quiz start subscription status:', status);
      });

    // Subscribe to participant count updates
    const participantSubscription = supabase
      .channel('quiz_participants')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_participants',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchParticipantCount();
        }
      )
      .subscribe();

    // Initial fetch
    fetchSession();
    fetchParticipantCount();

    // Set up interval to keep the session alive and in sync
    const syncInterval = setInterval(() => {
      fetchSession();
    }, 10000); // Sync every 10 seconds

    return () => {
      subscription.unsubscribe();
      broadcastSubscription.unsubscribe();
      quizStartSubscription.unsubscribe();
      participantSubscription.unsubscribe();
      clearInterval(syncInterval);
    };
  }, [sessionId, quizId, userId]);

  // Add local timer effect to match professor's implementation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTimerActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Time's up, show results
            if (!showResultDialog && hasAnswered) {
              fetchAnswerResult();
              setShowResultDialog(true);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isTimerActive, timeLeft, hasAnswered, showResultDialog]);

  // Add additional effect to ensure results dialog appears when status changes
  useEffect(() => {
    if (session?.status === 'question_ended' && !showResultDialog) {
      // Force show the results dialog when question ends
      fetchAnswerResult();
      setShowResultDialog(true);
    }
    
    // Make sure buttons show when active
    if (session?.status === 'active' && !hasAnswered) {
      setLoadingButtons(false);
    }
  }, [session?.status]);

  const fetchSession = async () => {
    console.log('Fetching session:', sessionId);
    const { data, error } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      console.error('Error fetching session:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch session',
        variant: 'destructive',
      });
      return;
    }

    console.log('Session fetched:', data);
    setSession(data);
    setTimeLeft(data.time_remaining);
    setIsTimerActive(data.status === 'active');
    
    // Update localStorage with fresh session data
    const key = `quiz_${quizId}_session_${sessionId}_user_${userId}`;
    const stateToSave = {
      selectedAnswer,
      hasAnswered,
      timeLeft: data.time_remaining,
      currentQuestionIndex: data.current_question_index,
      status: data.status
    };
    localStorage.setItem(key, JSON.stringify(stateToSave));
  };

  const fetchParticipantCount = async () => {
    const { count, error } = await supabase
      .from('quiz_participants')
      .select('*', { count: 'exact' })
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error fetching participant count:', error);
      return;
    }

    setParticipantCount(count || 0);
  };

  const submitAnswer = async (answer: string) => {
    if (!session || hasAnswered) return;

    const currentQuestion = questions[session.current_question_index];
    const isCorrect = answer === currentQuestion.correct_answer;
    const responseTime = currentQuestion.time_limit - timeLeft;
    
    // Kahoot-style point calculation - points only for correct answers
    // Points depend on how quickly you answer
    const pointMultiplier = isCorrect ? 1 + (timeLeft / currentQuestion.time_limit) : 0;
    const points = Math.round(currentQuestion.points * pointMultiplier);

    try {
      // Set state immediately to prevent multiple submissions
      setSelectedAnswer(answer);
      setHasAnswered(true);
      
      console.log('Submitting answer:', {
        session_id: sessionId,
        question_id: currentQuestion.id,
        participant_id: userId,
        answer,
        is_correct: isCorrect,
        points_earned: points,
        response_time: responseTime,
      });

      // Begin transaction to submit answer
      const { data: answerData, error: answerError } = await supabase
        .rpc('submit_answer', {
          p_session_id: sessionId,
          p_question_id: currentQuestion.id,
          p_participant_id: userId,
          p_answer: answer,
          p_is_correct: isCorrect,
          p_points_earned: points,
          p_response_time: responseTime
        });

      if (answerError) {
        console.error('Answer insertion error:', answerError);
        
        // Fallback to regular inserts if RPC fails
        const { error: fallbackError } = await supabase
          .from('participant_answers')
          .insert({
            session_id: sessionId,
            question_id: currentQuestion.id,
            participant_id: userId,
            answer,
            is_correct: isCorrect,
            points_earned: points,
            response_time: responseTime,
          });

        if (fallbackError) {
          console.error('Fallback answer insertion error:', fallbackError);
          throw fallbackError;
        }
        
        // Continue with updating participants and profiles separately
        await updatePointsManually(isCorrect, points);
      } else {
        console.log('Answer submitted successfully with RPC', answerData);
      }

      toast({
        title: 'Answer Submitted',
        description: 'Your answer has been recorded',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit answer',
        variant: 'destructive',
      });
    }
  };
  
  // Separate function to update points if RPC fails
  const updatePointsManually = async (isCorrect: boolean, points: number) => {
    if (!isCorrect) return; // Only update points for correct answers
    
    try {
      // First get current total_points from participants table
      const { data: currentData, error: fetchError } = await supabase
        .from('quiz_participants')
        .select('total_points')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .single();
        
      if (fetchError) {
        console.error('Error fetching current points:', fetchError);
        throw fetchError;
      }
      
      // Add new points to current total
      const currentPoints = currentData?.total_points || 0;
      const newTotalPoints = currentPoints + points;
      
      // Update quiz_participants table
      const { error: pointsError } = await supabase
        .from('quiz_participants')
        .update({ total_points: newTotalPoints })
        .eq('session_id', sessionId)
        .eq('user_id', userId);

      if (pointsError) throw pointsError;
      
      // Also update profile table for shop integration
      const { data: profileData, error: profileFetchError } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', userId)
        .single();
        
      if (profileFetchError) {
        console.error('Error fetching profile points:', profileFetchError);
        return; // Continue even if profile update fails
      }
      
      const currentProfilePoints = profileData?.points || 0;
      const newProfilePoints = currentProfilePoints + points;
      
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ points: newProfilePoints })
        .eq('id', userId);
        
      if (profileUpdateError) {
        console.error('Error updating profile points:', profileUpdateError);
      }
      
      // Update local state for the results dialog
      setTotalPoints(newTotalPoints);
    } catch (error) {
      console.error('Error updating points:', error);
    }
  };
  
  // New function to fetch answer result after question ends
  const fetchAnswerResult = async () => {
    if (!session) return;
    
    try {
      const currentQuestion = questions[session.current_question_index];
      
      // Get this student's answer for the current question
      const { data, error } = await supabase
        .from('participant_answers')
        .select('*')
        .eq('session_id', sessionId)
        .eq('question_id', currentQuestion.id)
        .eq('participant_id', userId)
        .maybeSingle();
        
      if (error) {
        console.error('Error fetching answer result:', error);
        return;
      }
      
      // Also get the user's total points from participants table
      const { data: participantData, error: participantError } = await supabase
        .from('quiz_participants')
        .select('total_points')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .single();
        
      if (participantError) {
        console.error('Error fetching total points:', participantError);
      } else if (participantData) {
        setTotalPoints(participantData.total_points || 0);
      }

      // Also fetch updated profile points
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', userId)
        .single();

      if (!profileError && profileData) {
        console.log('Updated profile points:', profileData.points);
      }
      
      if (data) {
        console.log('Answer result:', data);
        // Now show if the answer was correct and points earned
        setIsAnswerCorrect(data.is_correct);
        setEarnedPoints(data.points_earned);
        
        // Force the dialog to be shown
        setTimeout(() => {
          setShowResultDialog(true);
        }, 100);
        
        toast({
          title: data.is_correct ? 'Correct!' : 'Incorrect',
          description: `You earned ${data.points_earned} points!`,
          variant: data.is_correct ? 'default' : 'destructive',
        });
      } else if (hasAnswered) {
        // Attempt to find data by fetching again with different criteria
        const { data: altData, error: altError } = await supabase
          .from('participant_answers')
          .select('*')
          .eq('session_id', sessionId)
          .eq('participant_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (!altError && altData && altData.length > 0) {
          setIsAnswerCorrect(altData[0].is_correct);
          setEarnedPoints(altData[0].points_earned);
          
          toast({
            title: altData[0].is_correct ? 'Correct!' : 'Incorrect',
            description: `You earned ${altData[0].points_earned} points!`,
            variant: altData[0].is_correct ? 'default' : 'destructive',
          });
        } else {
          // Handle case where no answer was found at all
          console.log('No answer found for this question');
          setIsAnswerCorrect(false);
          setEarnedPoints(0);
          
          toast({
            title: 'No Answer',
            description: 'You did not submit an answer for this question',
            variant: 'destructive',
          });
        }
      } else {
        // Handle case where no answer was submitted
        console.log('No answer found for this question');
        setIsAnswerCorrect(false);
        setEarnedPoints(0);
        
        toast({
          title: 'No Answer',
          description: 'You did not submit an answer for this question',
          variant: 'destructive',
        });
      }
      
      // Always show the dialog regardless of data
      setTimeout(() => {
        setShowResultDialog(true);
      }, 200);
    } catch (e) {
      console.error('Error fetching answer result:', e);
      setIsAnswerCorrect(false);
      setEarnedPoints(0);
      setShowResultDialog(true);
    }
  };

  if (!session) return null;

  const currentQuestion = questions[session.current_question_index];
  const progressPercent = ((session.current_question_index + 1) / questions.length) * 100;
  
  const closeResultDialog = () => {
    setShowResultDialog(false);
  };

  // Button click handling
  const handleButtonClick = (option: string) => {
    if (session?.status === 'active') {
      submitAnswer(option);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Question {session?.current_question_index !== undefined ? session.current_question_index + 1 : '...'}</span>
            <Badge variant="secondary">
              {session?.status === 'waiting' ? 'Waiting' : 
               session?.status === 'active' ? 'Active' :
               session?.status === 'paused' ? 'Paused' :
               session?.status === 'question_ended' ? "Time's Up!" : 'Ended'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Timer and Progress */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Time Remaining:</span>
                </div>
                <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
              </div>
              <Progress value={(timeLeft / (currentQuestion?.time_limit || 1)) * 100} />
            </div>

            {/* Question */}
            <div className="space-y-4">
              <p className="text-lg font-medium">{currentQuestion?.question_text || 'Loading question...'}</p>
              
              <AnimatePresence mode="wait">
                {/* Show loading indicator while buttons are initializing */}
                {loadingButtons && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center p-8"
                  >
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                    <p className="mt-2 text-sm text-gray-500">Loading options...</p>
                  </motion.div>
                )}
                
                {/* Show answer buttons */}
                {!loadingButtons && (session?.status === 'active' || session?.status === 'paused') && !hasAnswered && currentQuestion?.options && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="grid grid-cols-2 gap-4"
                  >
                    {currentQuestion.options.map((option: string, index: number) => (
                      <Button
                        key={`option-${index}-${option}`}
                        onClick={() => handleButtonClick(option)}
                        variant="outline"
                        disabled={session.status === 'paused'}
                        className={cn(
                          "h-24 text-lg font-medium",
                          index === 0 && "bg-red-100 hover:bg-red-200",
                          index === 1 && "bg-blue-100 hover:bg-blue-200",
                          index === 2 && "bg-yellow-100 hover:bg-yellow-200",
                          index === 3 && "bg-green-100 hover:bg-green-200"
                        )}
                      >
                        {option}
                      </Button>
                    ))}
                  </motion.div>
                )}

                {hasAnswered && session?.status !== 'question_ended' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-4"
                  >
                    <p className="text-xl font-medium">Answer Submitted</p>
                    <p className="text-sm text-gray-500">
                      Waiting for other students...
                    </p>
                  </motion.div>
                )}

                {hasAnswered && session?.status === 'question_ended' && isAnswerCorrect !== null && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-4"
                  >
                    <div className="flex items-center justify-center">
                      {isAnswerCorrect ? (
                        <CheckCircle className="h-16 w-16 text-green-500" />
                      ) : (
                        <XCircle className="h-16 w-16 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-xl font-medium">
                        {isAnswerCorrect ? 'Correct!' : 'Incorrect'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {isAnswerCorrect ? `You earned ${earnedPoints} points` : 'No points earned'}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Correct answer: {currentQuestion?.correct_answer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Participants */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-500" />
                <span className="font-medium">Participants</span>
              </div>
              <Badge variant="secondary">{participantCount}</Badge>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <div className="w-full">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Overall Progress</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="mt-2" />
          </div>
        </CardFooter>
      </Card>
      
      {/* Results Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">
              Question Results
            </DialogTitle>
            <DialogDescription className="text-center">
              Question {session?.current_question_index !== undefined ? session.current_question_index + 1 : '...'} of {questions.length}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center justify-center space-y-4 py-6">
            {isAnswerCorrect !== null && (
              <>
                <div className="p-4 rounded-full bg-gray-100">
                  {isAnswerCorrect ? (
                    <CheckCircle className="h-16 w-16 text-green-500" />
                  ) : (
                    <XCircle className="h-16 w-16 text-red-500" />
                  )}
                </div>
                
                <h3 className="text-xl font-bold">
                  {isAnswerCorrect ? 'Correct Answer!' : 'Incorrect Answer'}
                </h3>
                
                <div className="flex items-center space-x-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  <span className="text-lg font-medium">
                    {earnedPoints} points earned
                  </span>
                </div>
                
                <div className="mt-2 text-center">
                  <p className="text-gray-600">
                    Correct answer: {currentQuestion?.correct_answer}
                  </p>
                  {hasAnswered && (
                    <p className="text-gray-600">
                      Your answer: {selectedAnswer}
                    </p>
                  )}
                </div>
                
                <div className="mt-4 bg-gray-50 p-3 rounded-lg w-full">
                  <div className="flex justify-between">
                    <span className="font-medium">Total Score:</span>
                    <span className="font-bold">{totalPoints} points</span>
                  </div>
                </div>
              </>
            )}
            
            {isAnswerCorrect === null && (
              <div className="text-center">
                <p className="text-lg">No answer submitted</p>
                <p className="text-gray-600 mt-2">
                  Correct answer: {currentQuestion?.correct_answer}
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button onClick={closeResultDialog} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 