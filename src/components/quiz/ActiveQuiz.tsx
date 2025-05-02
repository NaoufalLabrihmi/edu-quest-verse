import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/lib/auth/auth-context';
import { ProfessorQuizControl } from './ProfessorQuizControl';
import { StudentQuizView } from './StudentQuizView';

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

interface ParticipantAnswer {
  id: string;
  session_id: string;
  question_id: string;
  participant_id: string;
  answer: string;
  is_correct: boolean;
  points_earned: number;
  response_time: number;
  created_at: string;
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
  skipped_questions?: number[];
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
  const { toast } = useToast();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isProfessor, setIsProfessor] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;
    fetchQuizAndSession();
  }, [id, user]);

  const fetchQuizAndSession = async () => {
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
      const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select(`
            *,
            questions(*)
          `)
          .eq('id', id)
          .single();

      if (quizError) throw quizError;
        
        // Sort questions by order_number
      const questions = quizData.questions.sort((a: any, b: any) => a.order_number - b.order_number);
        setQuiz({
        ...quizData,
          questions,
        });
        
      // Get or create quiz session
      let session;
      if (userIsProfessor) {
        // Professor: Check for any active sessions first
        const { data: existingSessions, error: existingError } = await supabase
          .from('quiz_sessions')
          .select('*')
          .eq('quiz_id', id)
          .in('status', ['waiting', 'active', 'paused', 'question_ended'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (existingError) throw existingError;
        
        if (existingSessions && existingSessions.length > 0) {
          session = existingSessions[0];
          
          // Ensure time_remaining is set correctly
          if (session.status === 'waiting' || session.time_remaining === 0) {
            // Refresh the time_remaining to the question's time_limit
            const currentQuestionIndex = session.current_question_index || 0;
            const currentQuestion = questions[currentQuestionIndex];
            
            // Update the session's time_remaining
            const { error: updateError } = await supabase
              .from('quiz_sessions')
              .update({
                time_remaining: currentQuestion.time_limit
              })
              .eq('id', session.id);
              
            if (updateError) {
              console.error('Error updating time_remaining:', updateError);
            } else {
              // Update our local session object
              session.time_remaining = currentQuestion.time_limit;
            }
          }
        } else {
          // Create new session if none exists
          const { data: newSession, error: sessionError } = await supabase
            .from('quiz_sessions')
            .insert({
              quiz_id: id,
              created_by: user.id,
              current_question_index: 0,
              status: 'waiting',
              time_remaining: questions[0].time_limit,
              started_at: new Date().toISOString(),
              ended_at: null
            })
            .select()
            .single();

          if (sessionError) throw sessionError;
          session = newSession;
        }
        
        // As a professor, broadcast the current session status to sync all students
        const channel = supabase.channel('session-update');
        await channel.send({
          type: 'broadcast',
          event: 'session_status_changed',
          payload: {
            session_id: session.id,
            status: session.status,
            time_remaining: session.time_remaining,
            current_question_index: session.current_question_index
          }
        });
      } else {
        // Student: Find active session
        const { data: activeSessions, error: sessionError } = await supabase
          .from('quiz_sessions')
          .select('*')
      .eq('quiz_id', id)
          .in('status', ['waiting', 'active', 'paused', 'question_ended'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (sessionError) throw sessionError;
        
        if (!activeSessions || activeSessions.length === 0) {
      toast({
            title: 'No Active Session',
            description: 'There is no active quiz session available.',
        variant: 'destructive',
      });
          navigate('/quizzes');
          return;
        }

        session = activeSessions[0];
        
        // Verify the session has properly initialized time_remaining
        if (session.time_remaining === 0 && session.status === 'waiting') {
          const currentQuestionIndex = session.current_question_index || 0;
          const currentQuestion = questions[currentQuestionIndex];
          
          // Update the time_remaining locally - the professor will update the DB
          session.time_remaining = currentQuestion.time_limit;
        }

        // Register as participant if not already
        const upsertPayload = {
          session_id: session.id,
          quiz_id: session.quiz_id,
          user_id: user.id,
          student_id: user.id,
          total_points: 0,
          joined_at: new Date().toISOString(),
        };
        const onConflictKeys = 'quiz_id,student_id';
        console.log('Upserting participant:', upsertPayload, 'onConflict:', onConflictKeys);
        const { error: participantError } = await supabase
          .from('quiz_participants')
          .upsert(upsertPayload, {
            onConflict: onConflictKeys
          })
          .select()
        .single();
        
        if (participantError) {
          console.error('Upsert error details:', participantError);
          if (!participantError.message.includes('unique constraint')) {
            throw participantError;
          }
        }
      }

      setSessionId(session.id);
    } catch (error) {
      console.error('Error fetching quiz:', error);
      toast({
        title: 'Error',
        description: 'Failed to load quiz. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <Navigation />
        <div className="flex flex-col items-center justify-center flex-grow gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          <p className="text-indigo-600 font-medium mt-4">Loading quiz...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!quiz || !sessionId) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <Navigation />
        <div className="flex items-center justify-center flex-grow">
          <div className="text-center space-y-4">
            <p className="text-xl font-medium text-gray-600">Quiz not found or has ended</p>
              <Button onClick={() => navigate('/quizzes')}>
                Back to Quizzes
              </Button>
        </div>
      </div>
          <Footer />
        </div>
      );
    }
    
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <Navigation />
      <main className="flex-grow container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {isProfessor ? (
            <ProfessorQuizControl
              quizId={id}
              sessionId={sessionId}
              questions={quiz.questions}
            />
          ) : (
            <StudentQuizView
              quizId={id}
              sessionId={sessionId}
              questions={quiz.questions}
              userId={user!.id}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
} 