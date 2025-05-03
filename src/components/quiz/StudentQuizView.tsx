import React, { useState, useEffect, useRef } from 'react';
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
  const [shortAnswer, setShortAnswer] = useState('');
  const navigate = useNavigate();
  const lastQuestionIndexRef = useRef<number | null>(null);

  useEffect(() => {
    // Restore state from localStorage
    const key = `quiz_${quizId}_session_${sessionId}_user_${userId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSelectedAnswer(parsed.selectedAnswer || null);
        setHasAnswered(parsed.hasAnswered || false);
        if (parsed.currentQuestionIndex !== undefined) {
          console.log('Restored question index from localStorage:', parsed.currentQuestionIndex);
        }
      } catch (e) {
        console.error('Error parsing localStorage data:', e);
      }
    }

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
          
          if (lastQuestionIndexRef.current !== newSession.current_question_index) {
            setSelectedAnswer(null);
            setHasAnswered(false);
            setIsAnswerCorrect(null);
            setEarnedPoints(0);
            setShowResultDialog(false);
            setLoadingButtons(false);
            lastQuestionIndexRef.current = newSession.current_question_index;
          }
          
          if (newSession.status === 'question_ended') {
            fetchAnswerResult();
            setShowResultDialog(true);
          }
          
          if (newSession.status === 'ended') {
            navigate(`/quiz/${quizId}/results`);
          }

          const stateToSave = {
            selectedAnswer,
            hasAnswered,
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

    return () => {
      supabase.removeChannel(subscription);
      broadcastSubscription.unsubscribe();
      quizStartSubscription.unsubscribe();
      participantSubscription.unsubscribe();
    };
  }, [quizId, sessionId, userId, navigate]);

  // Timer interval: decrement timeLeft every second, but sync with server updates
  useEffect(() => {
    if (!isTimerActive || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    return () => clearInterval(interval);
  }, [isTimerActive, timeLeft]);

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
      
      // Submit answer using the atomic RPC (guaranteed DB update)
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
        throw answerError;
      } else {
        console.log('Answer submitted successfully with RPC', answerData);
      }

      // Immediately fetch the answer and up-to-date total points to update UI
      await fetchAnswerResult();

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
  
  // New function to fetch answer result after question ends
  const fetchAnswerResult = async () => {
    if (!session) return;
    
    try {
      const currentQuestion = questions[session.current_question_index];
      console.log('Fetching answer result for:', {
        session_id: sessionId,
        question_id: currentQuestion.id,
        participant_id: userId
      });
      
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
        // Try again after a short delay in case of race condition
        setTimeout(fetchAnswerResult, 300);
        return;
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

  // Debug log for currentQuestion
  console.log('Current question object:', currentQuestion);
  
  const closeResultDialog = () => {
    setShowResultDialog(false);
  };

  // Button click handling
  const handleButtonClick = (option: string) => {
    if (session?.status === 'active') {
      submitAnswer(option);
    }
  };

  // Compute options for the current question, handling true/false fallback
  let currentOptions = currentQuestion?.options;
  if (
    currentQuestion?.question_type === 'true_false' &&
    (!Array.isArray(currentOptions) || currentOptions.length === 0)
  ) {
    currentOptions = ['true', 'false'];
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-x-hidden font-sans">
      {/* Full-page animated dark gradient background with subtle academic pattern overlay */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-[#0a1626] via-[#101624] to-[#232b3b] animate-fade-in" aria-hidden="true" />
      {/* Academic pattern overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none" style={{background: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect x=\'0.5\' y=\'0.5\' width=\'39\' height=\'39\' rx=\'8.5\' fill=\'none\' stroke=\'%2367e8f933\'/%3E%3C/svg%3E")', opacity: 0.12}} />
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
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
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
        .score-fab {
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
        .fab-exit {
          position: fixed;
          bottom: 2.5rem;
          right: 2.5rem;
          z-index: 50;
          background: linear-gradient(135deg, #232b3bcc 60%, #22d3eecc 100%);
          color: #e0f7fa;
          border-radius: 9999px;
          box-shadow: 0 2px 16px 0 #22d3ee33;
          padding: 1.1rem 1.3rem;
          font-size: 1.3rem;
          font-weight: 800;
          border: 2px solid #67e8f9cc;
          backdrop-filter: blur(8px);
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .fab-exit:hover {
          box-shadow: 0 0 0 6px #67e8f955, 0 2px 24px 0 #38bdf844;
          color: #232b3b;
          background: linear-gradient(135deg, #22d3ee 0%, #60a5fa 100%);
          transform: scale(1.07);
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
          {/* Floating score card */}
          <div className="score-fab">
            <Award className="inline-block mr-2 -mt-1 text-yellow-300 animate-podium-glow" />
            <span className="serif-heading">{totalPoints} pts</span>
          </div>
          {/* Floating participants badge */}
          <div className="floating-participants flex items-center gap-2">
            <Users className="h-5 w-5 text-cyan-100" />
            <span className="serif-heading">{participantCount}</span>
          </div>
          {/* Card header */}
          <div className="w-full text-center mb-2">
            <span className="serif-heading text-lg font-bold text-cyan-200 drop-shadow animate-gradient-x">Question {session?.current_question_index !== undefined ? session.current_question_index + 1 : '...'}</span>
            <Badge className="ml-3 bg-cyan-500/20 border-cyan-400/20 text-cyan-100 shadow">
              {session?.status === 'waiting' ? 'Waiting' : 
                session?.status === 'active' ? 'Active' :
                session?.status === 'paused' ? 'Paused' :
                session?.status === 'question_ended' ? "Time's Up!" : 'Ended'}
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
          {/* Answer options */}
          <AnimatePresence mode="wait">
            {loadingButtons && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center p-8"
              >
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan-400 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                <p className="mt-2 text-base text-cyan-300">Loading options...</p>
              </motion.div>
            )}
            {!loadingButtons && (session?.status === 'active' || session?.status === 'paused') && !hasAnswered && (
              currentQuestion?.question_type === 'multiple_choice' && currentOptions && currentOptions.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex flex-col gap-4 w-full mt-2"
                >
                  {currentOptions.map((option: string, index: number) => (
                    <button
                      key={`option-${index}-${option}`}
                      onClick={() => handleButtonClick(option)}
                      disabled={session.status === 'paused'}
                      className="pill-btn w-full py-4 px-6 mt-1"
                      style={{animationDelay: `${index * 0.07}s`}}
                    >
                      {option}
                    </button>
                  ))}
                </motion.div>
              ) : currentQuestion?.question_type === 'true_false' && currentOptions && currentOptions.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex flex-col gap-4 w-full mt-2"
                >
                  {currentOptions.map((option: string, index: number) => (
                    <button
                      key={`option-${index}-${option}`}
                      onClick={() => handleButtonClick(option)}
                      disabled={session.status === 'paused'}
                      className="pill-btn w-full py-4 px-6 mt-1"
                      style={{animationDelay: `${index * 0.07}s`}}
                    >
                      {option}
                    </button>
                  ))}
                </motion.div>
              ) : currentQuestion?.question_type === 'short_answer' ? (
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    if (shortAnswer.trim()) handleButtonClick(shortAnswer.trim());
                  }}
                  className="flex flex-col items-center gap-4 w-full mt-2"
                >
                  <input
                    type="text"
                    value={shortAnswer}
                    onChange={e => setShortAnswer(e.target.value)}
                    placeholder="Type your answer..."
                    className="w-full p-4 rounded-full text-lg bg-gradient-to-r from-cyan-900/40 to-slate-900/40 text-cyan-100 border-cyan-700/40 shadow-cyan-glow focus:ring-2 focus:ring-cyan-400/60"
                    disabled={session.status === 'paused'}
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={session.status === 'paused' || !shortAnswer.trim()}
                    className="pill-btn w-full py-4 px-6"
                  >
                    Submit Answer
                  </button>
                </form>
              ) : (
                <div className="text-center text-cyan-400 font-semibold p-4">
                  No answer choices available for this question.<br />
                  Please contact your teacher or check the question setup.
                </div>
              )
            )}
            {/* Waiting message after submitting */}
            {hasAnswered && session?.status !== 'question_ended' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4 mt-6"
              >
                <p className="text-xl font-bold text-cyan-200 animate-gradient-x">Answer Submitted</p>
                <p className="text-base text-cyan-400">
                  Waiting for other students or for the teacher to end the question...
                </p>
              </motion.div>
            )}
            {/* Result dialog when question ends */}
            {hasAnswered && session?.status === 'question_ended' && isAnswerCorrect !== null && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4 mt-6"
              >
                <div className="flex items-center justify-center">
                  {isAnswerCorrect ? (
                    <CheckCircle className="h-16 w-16 text-green-400 animate-podium-glow" />
                  ) : (
                    <XCircle className="h-16 w-16 text-red-400 animate-podium-glow" />
                  )}
                </div>
                <div>
                  <p className="serif-heading text-2xl font-black animate-gradient-x mb-2">
                    {isAnswerCorrect ? 'Correct!' : 'Incorrect'}
                  </p>
                  <p className="text-lg text-cyan-200 font-bold">
                    {isAnswerCorrect ? `You earned ${earnedPoints} points` : 'No points earned'}
                  </p>
                  <p className="text-base text-cyan-400 mt-2">
                    Correct answer: {currentQuestion?.correct_answer}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Results Dialog */}
        <Dialog open={showResultDialog && session?.status === 'question_ended'} onOpenChange={setShowResultDialog}>
          <DialogContent className="sm:max-w-md bg-gradient-to-br from-[#162032]/90 to-[#232b3b]/80 border-0 shadow-2xl rounded-3xl ring-2 ring-cyan-700/30">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black animate-gradient-x text-center drop-shadow-xl">
                Question Results
              </DialogTitle>
              <DialogDescription className="text-center text-cyan-200">
                Question {session?.current_question_index !== undefined ? session.current_question_index + 1 : '...'} of {questions.length}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center space-y-4 py-6">
              {isAnswerCorrect !== null && (
                <>
                  <div className="p-4 rounded-full bg-cyan-900/40 shadow-cyan-glow">
                    {isAnswerCorrect ? (
                      <CheckCircle className="h-16 w-16 text-green-400 animate-podium-glow" />
                    ) : (
                      <XCircle className="h-16 w-16 text-red-400 animate-podium-glow" />
                    )}
                  </div>
                  <h3 className="text-xl font-black animate-gradient-x">
                    {isAnswerCorrect ? 'Correct Answer!' : 'Incorrect Answer'}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <Award className="h-5 w-5 text-yellow-400" />
                    <span className="text-lg font-bold text-cyan-100">
                      {earnedPoints} points earned
                    </span>
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-cyan-200">
                      Correct answer: {currentQuestion?.correct_answer}
                    </p>
                    {hasAnswered && (
                      <p className="text-cyan-400">
                        Your answer: {selectedAnswer}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 bg-gradient-to-r from-cyan-900/30 to-slate-900/30 p-3 rounded-xl w-full shadow-cyan-glow">
                    <div className="flex justify-between">
                      <span className="font-bold text-cyan-200">Total Score:</span>
                      <span className="font-black text-cyan-100">{totalPoints} points</span>
                    </div>
                  </div>
                </>
              )}
              {isAnswerCorrect === null && (
                <div className="text-center">
                  <p className="text-lg text-cyan-200">No answer submitted</p>
                  <p className="text-cyan-400 mt-2">
                    Correct answer: {currentQuestion?.correct_answer}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={closeResultDialog} className="w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400 text-white font-bold shadow-cyan-glow hover:scale-[1.03] transition-all text-lg py-3">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Floating Exit Quiz Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="fab-exit"
          aria-label="Exit Quiz"
        >
          Exit
        </button>
      </div>
    </div>
  );
} 