import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase, QuizSession, QuizParticipant } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, SkipForward, Users, Clock, BarChart2 } from 'lucide-react';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface Props {
  quizId: string;
  sessionId: string;
  questions: any[];
}

export function ProfessorQuizControl({ quizId, sessionId, questions }: Props) {
  const [session, setSession] = useState<QuizSession | null>(null);
  const [participants, setParticipants] = useState<QuizParticipant[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [questionResults, setQuestionResults] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Subscribe to session updates
    const sessionSubscription = supabase
      .channel(`quiz_session_prof_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload: RealtimePostgresChangesPayload<QuizSession>) => {
          console.log('Professor received session update:', payload.new);
          if (!payload.new || !('time_remaining' in payload.new)) return;
          setSession(payload.new);
          setTimeLeft(payload.new.time_remaining);
          setIsTimerActive(payload.new.status === 'active');
        }
      )
      .subscribe((status) => {
        console.log('Professor subscription status:', status);
      });

    // Subscribe to participant updates
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
          fetchParticipants();
        }
      )
      .subscribe();

    // Initial fetch
    fetchSession();
    fetchParticipants();

    return () => {
      sessionSubscription.unsubscribe();
      participantSubscription.unsubscribe();
    };
  }, [sessionId]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTimerActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleQuestionEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isTimerActive, timeLeft]);

  const fetchSession = async () => {
    try {
      console.log('Fetching session:', sessionId);
      const { data, error } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching session:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch session',
          variant: 'destructive',
        });
        return;
      }

      if (!data) {
        console.error('Session not found:', sessionId);
        toast({
          title: 'Session Not Found',
          description: 'The quiz session could not be found.',
          variant: 'destructive',
        });
        return;
      }

      console.log('Session fetched successfully:', data);
      setSession(data);
      setTimeLeft(data.time_remaining);
      setIsTimerActive(data.status === 'active');
    } catch (e) {
      console.error('Unexpected error fetching session:', e);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const fetchParticipants = async () => {
    const { data, error } = await supabase
      .from('quiz_participants')
      .select('*')
      .eq('session_id', sessionId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch participants',
        variant: 'destructive',
      });
      return;
    }

    setParticipants(data);
  };

  const fetchQuestionResults = async () => {
    if (!session) return;
    
    // Get the current question ID
    const currentQuestion = questions[session.current_question_index];
    
    try {
      // Fetch all answers for the current question
      const { data, error } = await supabase
        .from('participant_answers')
        .select('*')
        .eq('session_id', sessionId)
        .eq('question_id', currentQuestion.id);
        
      if (error) {
        console.error('Error fetching question results:', error);
        return;
      }
      
      console.log('Question results:', data);
      
      // Get data for each participant
      if (data && data.length > 0) {
        const userIds = data.map((answer) => answer.participant_id);
        
        // Fetch usernames only (safer approach)
        const { data: userProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);
          
        if (profilesError) {
          console.error('Error fetching user profiles:', profilesError);
          
          // Last resort - just display participant IDs
          const simpleResults = data.map(answer => ({
            ...answer,
            username: `Participant ${answer.participant_id.substring(0, 6)}`,
            avatar_url: null
          }));
          
          simpleResults.sort((a, b) => b.points_earned - a.points_earned);
          setQuestionResults(simpleResults);
        } else {
          // Map answers with user profiles
          const resultsWithNames = data.map((answer) => {
            const userProfile = userProfiles?.find(p => p.id === answer.participant_id);
            return {
              ...answer,
              username: userProfile?.username || 'Unknown',
              avatar_url: null // Skip avatar URLs altogether
            };
          });
          
          // Sort by points (highest first)
          resultsWithNames.sort((a, b) => b.points_earned - a.points_earned);
          
          setQuestionResults(resultsWithNames);
        }
      } else {
        setQuestionResults([]);
      }
    } catch (e) {
      console.error('Error fetching question results:', e);
      setQuestionResults([]);
    }
  };

  const startQuestion = async () => {
    if (!session) return;

    const currentQuestion = questions[session.current_question_index];
    // Only use the question's time_limit if we're starting fresh (not resuming)
    const timeRemaining = session.status === 'paused' ? timeLeft : currentQuestion.time_limit;
    const updatePayload = {
      status: 'active',
      time_remaining: timeRemaining,
    };
    console.log('Starting question, update payload:', updatePayload);
    
    try {
      // First check if the session still exists
      const { data: sessionCheck, error: checkError } = await supabase
        .from('quiz_sessions')
        .select('id')
        .eq('id', sessionId)
        .maybeSingle();
        
      if (checkError) {
        console.error('Error checking session:', checkError);
        toast({
          title: 'Error',
          description: 'Could not verify session',
          variant: 'destructive',
        });
        return;
      }
      
      if (!sessionCheck) {
        console.error('Session not found:', sessionId);
        toast({
          title: 'Session Not Found',
          description: 'The quiz session could not be found. It may have been deleted.',
          variant: 'destructive',
        });
        return;
      }
      
      // Update our local state first so UI is responsive
      setIsTimerActive(true);
      setTimeLeft(timeRemaining);
      
      // Create a channel and broadcast the change to all connected clients FIRST
      // This helps reduce the delay in updating the student view
      const channel = supabase.channel('session-update');
      
      // Send multiple broadcast attempts to ensure delivery
      const broadcastPromise = channel.send({
        type: 'broadcast',
        event: 'session_status_changed',
        payload: {
          session_id: sessionId,
          status: 'active',
          time_remaining: timeRemaining,
          current_question_index: session.current_question_index
        }
      });
      
      // Send a backup broadcast after a short delay to ensure it's received
      setTimeout(() => {
        channel.send({
          type: 'broadcast',
          event: 'session_status_changed',
          payload: {
            session_id: sessionId,
            status: 'active',
            time_remaining: timeRemaining,
            current_question_index: session.current_question_index
          }
        });
      }, 300);
      
      // Now update the session in the database
      const { data, error } = await supabase
        .from('quiz_sessions')
        .update(updatePayload)
        .eq('id', sessionId);

      if (error) {
        console.error('Error starting question:', error);
        toast({
          title: 'Error',
          description: 'Failed to start question',
          variant: 'destructive',
        });
        return;
      }

      console.log('Question started successfully');
      
      // Also broadcast a direct event specifically for quiz start
      if (session.status === 'waiting') {
        // Broadcast to the quiz-specific channel that students subscribe to
        const quizChannel = supabase.channel(`quiz:${quizId}`);
        await quizChannel.send({
          type: 'broadcast',
          event: 'quiz_started',
          payload: {
            session_id: sessionId,
            quiz_id: quizId
          }
        });
        
        // Send a backup broadcast after a short delay
        setTimeout(() => {
          quizChannel.send({
            type: 'broadcast',
            event: 'quiz_started',
            payload: {
              session_id: sessionId,
              quiz_id: quizId
            }
          });
        }, 500);
      }
    } catch (e) {
      console.error('Unexpected error starting question:', e);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const pauseQuestion = async () => {
    try {
      // Broadcast the pause to all students FIRST
      const channel = supabase.channel('session-update');
      await channel.send({
        type: 'broadcast',
        event: 'session_status_changed',
        payload: {
          session_id: sessionId,
          status: 'paused',
          time_remaining: timeLeft,
          current_question_index: session.current_question_index
        }
      });
      
      // Send a backup broadcast
      setTimeout(() => {
        channel.send({
          type: 'broadcast',
          event: 'session_status_changed',
          payload: {
            session_id: sessionId,
            status: 'paused',
            time_remaining: timeLeft,
            current_question_index: session.current_question_index
          }
        });
      }, 300);
    
      // Now update the status while preserving all other settings
      const { error } = await supabase
        .from('quiz_sessions')
        .update({
          status: 'paused', // New status for paused state
          time_remaining: timeLeft,
        })
        .eq('id', sessionId);

      if (error) {
        console.error('Error pausing question:', error);
        toast({
          title: 'Error',
          description: 'Failed to pause question',
          variant: 'destructive',
        });
        return;
      }

      console.log('Question paused successfully');
      setIsTimerActive(false);
      
      // Fetch the updated session to keep UI in sync
      fetchSession();
    } catch (e) {
      console.error('Unexpected error pausing question:', e);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleQuestionEnd = async () => {
    if (!session) return;

    try {
      // First fetch the results to minimize delay in showing them
      await fetchQuestionResults();
      
      // Broadcast question end to all students FIRST with pre-fetched results
      const channel = supabase.channel('session-update');
      await channel.send({
        type: 'broadcast',
        event: 'session_status_changed',
        payload: {
          session_id: sessionId,
          status: 'question_ended',
          time_remaining: 0,
          current_question_index: session.current_question_index
        }
      });
      
      // Send a backup broadcast
      setTimeout(() => {
        channel.send({
          type: 'broadcast',
          event: 'session_status_changed',
          payload: {
            session_id: sessionId,
            status: 'question_ended',
            time_remaining: 0,
            current_question_index: session.current_question_index
          }
        });
      }, 300);
    
      const { error } = await supabase
        .from('quiz_sessions')
        .update({
          status: 'question_ended',
          time_remaining: 0,
        })
        .eq('id', sessionId);

      if (error) {
        console.error('Error ending question:', error);
        toast({
          title: 'Error',
          description: 'Failed to end question',
          variant: 'destructive',
        });
        return;
      }

      console.log('Question ended successfully');
      setIsTimerActive(false);
    } catch (e) {
      console.error('Unexpected error ending question:', e);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const nextQuestion = async () => {
    if (!session) return;

    try {
      if (session.current_question_index >= questions.length - 1) {
        // End quiz
        const { error } = await supabase
          .from('quiz_sessions')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString(),
          })
          .eq('id', sessionId);

        if (error) {
          console.error('Error ending quiz:', error);
          toast({
            title: 'Error',
            description: 'Failed to end quiz',
            variant: 'destructive',
          });
          return;
        }

        console.log('Quiz ended successfully');
        navigate(`/quiz/${quizId}/results`);
        return;
      }

      const nextIndex = session.current_question_index + 1;
      const nextQuestion = questions[nextIndex];

      const { error } = await supabase
        .from('quiz_sessions')
        .update({
          current_question_index: nextIndex,
          status: 'waiting',
          time_remaining: nextQuestion.time_limit,
        })
        .eq('id', sessionId);

      if (error) {
        console.error('Error moving to next question:', error);
        toast({
          title: 'Error',
          description: 'Failed to move to next question',
          variant: 'destructive',
        });
        return;
      }

      console.log('Moved to next question successfully');
      
      // Fetch the updated session to keep UI in sync
      fetchSession();
    } catch (e) {
      console.error('Unexpected error moving to next question:', e);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  if (!session) return null;

  const currentQuestion = questions[session.current_question_index];
  const progressPercent = ((session.current_question_index + 1) / questions.length) * 100;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Quiz Control Panel</span>
            <Badge variant="secondary">
              Question {session.current_question_index + 1} of {questions.length}
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
              <Progress value={(timeLeft / currentQuestion.time_limit) * 100} />
            </div>

            {/* Question Progress */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>Overall Progress</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} className="bg-gray-100" />
            </div>

            {/* Participants */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-500" />
                <span className="font-medium">Participants</span>
              </div>
              <Badge variant="secondary">{participants.length}</Badge>
            </div>

            {/* Controls */}
            <div className="flex gap-3">
              {session.status === 'waiting' && (
                <Button
                  onClick={startQuestion}
                  className="flex-1"
                  variant="default"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Question
                </Button>
              )}
              {session.status === 'active' && (
                <Button
                  onClick={pauseQuestion}
                  className="flex-1"
                  variant="secondary"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
              )}
              {session.status === 'paused' && (
                <Button
                  onClick={startQuestion}
                  className="flex-1"
                  variant="default"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
              )}
              {(session.status === 'active' || session.status === 'paused') && (
                <Button
                  onClick={handleQuestionEnd}
                  className="flex-1 ml-2"
                  variant="destructive"
                >
                  End Question
                </Button>
              )}
              {session.status === 'question_ended' && (
                <Button
                  onClick={nextQuestion}
                  className="flex-1"
                  variant="default"
                >
                  <SkipForward className="h-4 w-4 mr-2" />
                  Next Question
                </Button>
              )}
              <Button
                onClick={() => navigate(`/quiz/${quizId}/results`)}
                variant="outline"
              >
                <BarChart2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Question Results */}
            {session.status === 'question_ended' && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-medium mb-4">Question Results</h3>
                {questionResults.length > 0 ? (
                  <div className="space-y-2">
                    {questionResults.map((result, index) => (
                      <div key={result.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <span className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded-full mr-3">
                            {index + 1}
                          </span>
                          <span>{result.username}</span>
                        </div>
                        <div className="flex items-center">
                          <span className={`mr-2 ${result.is_correct ? 'text-green-500' : 'text-red-500'}`}>
                            {result.is_correct ? 'Correct' : 'Incorrect'}
                          </span>
                          <span className="font-medium">{result.points_earned} pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No answers submitted yet</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 