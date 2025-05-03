import React, { useState, useEffect, useCallback } from 'react';
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
    console.log('ProfessorQuizControl sessionId:', sessionId);
  }, [sessionId]);

  // Memoize fetchParticipants
  const fetchParticipants = useCallback(async () => {
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
    console.log('Professor fetched participants:', data);
  }, [sessionId, toast]);

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

    // Subscribe to quiz_participants for this session using a unique channel name
    const channel = supabase
      .channel(`realtime:quiz_participants:session_id=eq.${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_participants',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('Realtime participant event (professor):', payload);
          fetchParticipants();
        }
      )
      .subscribe();

    // Initial fetch
    fetchSession();
    fetchParticipants();

    // Polling fallback: fetch participants every 2 seconds
    const pollInterval = setInterval(() => {
      fetchParticipants();
    }, 2000);

    return () => {
      sessionSubscription.unsubscribe();
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [sessionId, fetchParticipants]);

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

  // Add this function to end the quiz
  const endQuizNow = async () => {
    if (!session) return;
    try {
      const { error } = await supabase
        .from('quiz_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('id', sessionId);
      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to end quiz',
          variant: 'destructive',
        });
        return;
      }
      navigate(`/quiz/${quizId}/results`);
    } catch (e) {
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
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-x-hidden font-sans">
      {/* Full-page animated dark gradient background with subtle academic pattern overlay */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-[#0a1626] via-[#101624] to-[#232b3b] animate-fade-in" aria-hidden="true" />
      {/* Academic pattern overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none" style={{background: 'url(\"data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect x=\'0.5\' y=\'0.5\' width=\'39\' height=\'39\' rx=\'8.5\' fill=\'none\' stroke=\'%2367e8f933\'/%3E%3C/svg%3E\")', opacity: 0.12}} />
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
        .glass-card {
          background: rgba(22, 32, 50, 0.82);
          border-radius: 2rem;
          box-shadow: 0 8px 40px 0 #0fffcf22, 0 1.5px 8px 0 #232b3b44;
          border: 1.5px solid #67e8f955;
          backdrop-filter: blur(18px) saturate(1.2);
        }
        .serif-heading {
          font-family: 'Merriweather', 'Georgia', serif;
        }
        .pill-btn {
          border-radius: 9999px;
          background: linear-gradient(90deg, #0e2233 60%, #1e3a4c 100%);
          color: #e0f7fa;
          border: 1.5px solid #67e8f955;
          box-shadow: 0 2px 16px 0 #22d3ee33;
          font-weight: 700;
          font-size: 1.15rem;
          transition: box-shadow 0.2s, transform 0.2s, background 0.2s;
        }
        .pill-btn:hover, .pill-btn:focus {
          background: linear-gradient(90deg, #22d3ee 0%, #60a5fa 100%);
          color: #0a1626;
          box-shadow: 0 0 0 4px #67e8f955, 0 2px 24px 0 #38bdf844;
          transform: scale(1.04);
        }
        .status-fab {
          position: absolute;
          top: -2.5rem;
          left: -2.5rem;
          z-index: 20;
          background: linear-gradient(135deg, #22d3eecc 60%, #60a5facc 100%);
          color: #fff;
          border-radius: 1.5rem;
          box-shadow: 0 2px 16px 0 #22d3ee33;
          padding: 0.9rem 1.6rem;
          font-size: 1.1rem;
          font-weight: 800;
          border: 2px solid #67e8f9cc;
          backdrop-filter: blur(8px);
        }
        .floating-participants {
          position: absolute;
          top: -2.5rem;
          right: -2.5rem;
          z-index: 20;
          background: linear-gradient(135deg, #232b3bcc 60%, #22d3eecc 100%);
          color: #e0f7fa;
          border-radius: 1.5rem;
          box-shadow: 0 2px 16px 0 #22d3ee33;
          padding: 0.9rem 1.6rem;
          font-size: 1.1rem;
          font-weight: 800;
          border: 2px solid #67e8f9cc;
          backdrop-filter: blur(8px);
        }
      `}</style>
      <div className="relative z-10 w-full flex flex-col items-center justify-center py-8 px-2">
        <div className="relative w-full max-w-md mx-auto glass-card px-6 pt-12 pb-8 flex flex-col items-center shadow-cyan-glow">
          {/* Floating session status card */}
          <div className="status-fab">
            <span className="serif-heading text-base font-bold">
              {session.status === 'waiting' ? 'Waiting' :
                session.status === 'active' ? 'Active' :
                session.status === 'paused' ? 'Paused' :
                session.status === 'question_ended' ? "Time's Up!" : 'Ended'}
            </span>
          </div>
          {/* Floating participants badge */}
          <div className="floating-participants flex items-center gap-2">
            <Users className="h-5 w-5 text-cyan-100" />
            <span className="serif-heading">{participants.length}</span>
          </div>
          {/* Card header */}
          <div className="w-full text-center mb-2">
            <span className="serif-heading text-lg font-bold text-cyan-200 drop-shadow animate-gradient-x">Quiz Control Panel</span>
            <Badge className="ml-3 bg-cyan-500/20 border-cyan-400/20 text-cyan-100 shadow">
              Question {session.current_question_index + 1} of {questions.length}
            </Badge>
            {/* Thin glowing progress bar */}
            <div className="w-full h-1 mt-3 rounded-full bg-cyan-900/60 overflow-hidden">
              <div className="h-1 rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 shadow-cyan-glow transition-all duration-500" style={{width: `${progressPercent}%`}} />
            </div>
              </div>
          {/* Timer */}
          <div className="flex justify-center items-center gap-2 text-base text-cyan-200 font-semibold mt-4 mb-2">
            <Clock className="h-5 w-5 text-cyan-400" />
            <span>Time:</span>
            <span className="font-mono text-cyan-100 text-lg">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
            </div>
          {/* Question */}
          <div className="w-full text-center mt-2 mb-6">
            <p className="serif-heading text-2xl md:text-3xl font-black text-cyan-100 drop-shadow-xl animate-gradient-x mb-2" style={{textShadow: '0 2px 12px #0fffcf33'}}>{currentQuestion?.question_text || 'Loading question...'}</p>
            </div>
            {/* Controls */}
          <div className="flex flex-col gap-3 w-full mt-2">
            <div className="flex gap-3 w-full">
              {session.status === 'waiting' && (
                <button
                  onClick={startQuestion}
                  className="pill-btn flex-1 py-4 px-6 mt-1"
                >
                  <Play className="h-5 w-5 mr-2 inline-block" />
                  Start Question
                </button>
              )}
              {session.status === 'active' && (
                <button
                  onClick={pauseQuestion}
                  className="pill-btn flex-1 py-4 px-6 mt-1"
                >
                  <Pause className="h-5 w-5 mr-2 inline-block" />
                  Pause
                </button>
              )}
              {session.status === 'paused' && (
                <button
                  onClick={startQuestion}
                  className="pill-btn flex-1 py-4 px-6 mt-1"
                >
                  <Play className="h-5 w-5 mr-2 inline-block" />
                  Resume
                </button>
              )}
              {(session.status === 'active' || session.status === 'paused') && (
                <button
                  onClick={handleQuestionEnd}
                  className="pill-btn flex-1 py-4 px-6 mt-1 bg-gradient-to-r from-cyan-600 via-blue-500 to-cyan-400 text-white"
                >
                  End Question
                </button>
              )}
              {session.status === 'question_ended' && (
                <button
                  onClick={nextQuestion}
                  className="pill-btn flex-1 py-4 px-6 mt-1"
                >
                  <SkipForward className="h-5 w-5 mr-2 inline-block" />
                  Next Question
                </button>
              )}
              <button
                onClick={() => navigate(`/quiz/${quizId}/results`)}
                className="pill-btn py-4 px-6 mt-1 flex items-center justify-center"
                style={{minWidth: '3.5rem'}}
                aria-label="Results"
              >
                <BarChart2 className="h-5 w-5" />
              </button>
            </div>
          </div>
            {/* Question Results */}
            {session.status === 'question_ended' && (
            <div className="mt-8 pt-8 border-t border-cyan-800/40 w-full">
              <h3 className="serif-heading font-black text-cyan-200 text-xl mb-4 drop-shadow-xl">Question Results</h3>
                {questionResults.length > 0 ? (
                  <div className="space-y-2">
                    {questionResults.map((result, index) => (
                    <div key={result.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-cyan-900/30 to-slate-900/30 rounded-xl shadow-cyan-glow">
                        <div className="flex items-center">
                        <span className="w-8 h-8 flex items-center justify-center bg-cyan-700/60 text-cyan-100 rounded-full mr-3 font-bold text-lg shadow-cyan-glow">{index + 1}</span>
                        <span className="serif-heading text-cyan-100 font-semibold">{result.username}</span>
                        </div>
                        <div className="flex items-center">
                        <span className={`mr-2 font-bold ${result.is_correct ? 'text-green-400' : 'text-red-400'}`}>{result.is_correct ? 'Correct' : 'Incorrect'}</span>
                        <span className="font-bold text-cyan-200">{result.points_earned} pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                <p className="text-cyan-400">No answers submitted yet</p>
                )}
              </div>
            )}
          </div>
        {/* End Quiz Button */}
        <div className="flex justify-center mt-8 w-full">
          <button
            onClick={endQuizNow}
            className="pill-btn w-full max-w-xs py-4 px-6 bg-gradient-to-r from-cyan-600 via-blue-500 to-cyan-400 text-white font-bold mt-1"
          >
            End Quiz
          </button>
        </div>
      </div>
    </div>
  );
} 