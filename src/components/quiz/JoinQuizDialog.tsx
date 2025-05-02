import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

// Define types for the quizzes_with_creator view
interface QuizWithCreator {
  id: string;
  title: string;
  description: string;
  access_code: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  question_count: number;
  profile_id: string;
  creator_username: string;
  creator_role: string;
}

interface JoinQuizDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinQuizDialog({ isOpen, onClose }: JoinQuizDialogProps) {
  const [quizCode, setQuizCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quizDetails, setQuizDetails] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (quizCode.length === 6) {
      checkQuizCode();
    } else {
      setQuizDetails(null);
    }
  }, [quizCode]);

  const checkQuizCode = async () => {
    try {
      setIsLoading(true);
      
      // Use the quizzes_with_creator view to get quiz data with creator info in one query
      const { data, error } = await (supabase as any)
        .from('quizzes_with_creator')
        .select('*')
        .eq('access_code', quizCode);

      if (error) throw error;
      
      if (data && data.length > 0) {
        setQuizDetails({
          ...data[0],
          professor: { username: data[0].creator_username }
        });
      } else {
        setQuizDetails(null);
      }
    } catch (error) {
      console.error('Error checking quiz code:', error);
      setQuizDetails(null);
      
      // Only show toast for errors other than "not found"
      if (!(error as any).message?.includes('The result contains 0 rows')) {
        toast({
          title: "Error",
          description: "Failed to check quiz code",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinQuiz = async () => {
    if (!quizDetails) return;

    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Find any session for the quiz, not just active ones
      const { data: activeSessions, error: sessionError } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('quiz_id', quizDetails.id)
        .order('created_at', { ascending: false })
        .limit(1);

      console.log('Fetched sessions:', activeSessions);
      
      if (sessionError) {
        console.error('Session error details:', sessionError);
        throw sessionError;
      }
      
      let session;
      
      if (!activeSessions || activeSessions.length === 0) {
        // No session exists - create one in 'waiting' status
        console.log('No session found, creating a new waiting session');
        
        // Get the first question to set its time limit
        const { data: questions, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .eq('quiz_id', quizDetails.id)
          .order('order_number', { ascending: true });
          
        if (questionsError) {
          console.error('Error fetching questions:', questionsError);
          throw questionsError;
        }
        
        // Default time limit if no questions found
        const defaultTimeLimit = 60;
        const firstQuestionTimeLimit = questions && questions.length > 0 ? questions[0].time_limit : defaultTimeLimit;
        
        // Create a new waiting session
        const { data: newSession, error: createError } = await supabase
          .from('quiz_sessions')
          .insert({
            quiz_id: quizDetails.id,
            created_by: user.id, // Student creates the session
            current_question_index: 0,
            status: 'waiting',
            time_remaining: firstQuestionTimeLimit,
            started_at: new Date().toISOString(),
            ended_at: null
          })
          .select()
          .single();
          
        if (createError) {
          console.error('Error creating session:', createError);
          throw createError;
        }
        
        session = newSession;
      } else {
        // Use the most recent session
        session = activeSessions[0];
      }
      
      console.log('Using session_id:', session.id, 'for quiz_id:', quizDetails.id);

      // 2. Check if student is already in the quiz
      const { data: existingParticipation, error: participationError } = await supabase
        .from('quiz_participants')
        .select('*')
        .eq('quiz_id', quizDetails.id)
        .eq('student_id', user.id);

      if (participationError) throw participationError;

      if (existingParticipation && existingParticipation.length > 0) {
        console.log('Student already participating:', existingParticipation);
        navigate(`/quiz/${quizDetails.id}/waiting-room`);
        return;
      }

      // 3. Add student to session
      const participantObj = {
        session_id: session.id,
        quiz_id: quizDetails.id,
        user_id: user.id,
        student_id: user.id,
        status: 'joined',
        joined_at: new Date().toISOString(),
      };
      console.log('Inserting participant:', participantObj);
      const { error: insertError } = await supabase
        .from('quiz_participants')
        .insert(participantObj);

      if (insertError) {
        console.error('Insert error details:', insertError, 'for participant:', participantObj);
        throw insertError;
      }

      // Subscribe to real-time updates
      const channel = supabase
        .channel(`quiz:${quizDetails.id}`)
        .on('broadcast', { event: 'quiz_started' }, (payload) => {
          console.log('Received quiz_started event:', payload);
          navigate(`/quiz/${quizDetails.id}/active`);
        })
        .subscribe();

      // Subscribe to session status changes as well
      const statusChannel = supabase
        .channel('session-update')
        .on('broadcast', { event: 'session_status_changed' }, (payload) => {
          console.log('Received session status update in join dialog:', payload);
          if (payload.payload.session_id === session.id && payload.payload.status === 'active') {
            // Quiz is active, navigate to active view
            navigate(`/quiz/${quizDetails.id}/active`);
          }
        })
        .subscribe();

      navigate(`/quiz/${quizDetails.id}/waiting-room`);
    } catch (error) {
      console.error('Error joining quiz:', error);
      toast({
        title: "Error",
        description: "Failed to join quiz",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Join Quiz</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Enter quiz code"
              value={quizCode}
              onChange={(e) => setQuizCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="h-12 text-lg text-center tracking-widest"
            />
          </div>

          {isLoading && (
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {quizDetails && !isLoading && (
            <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold">{quizDetails.title}</h3>
              <p className="text-sm text-gray-600">
                Created by: {quizDetails.professor?.username || quizDetails.creator_username || 'Unknown'}
              </p>
              <p className="text-sm text-gray-600">
                Questions: {quizDetails.question_count || 0}
              </p>
              <Button
                onClick={handleJoinQuiz}
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Joining...' : 'Join Quiz'}
              </Button>
            </div>
          )}

          {!quizDetails && quizCode.length === 6 && !isLoading && (
            <div className="text-center text-gray-500">
              No quiz found with this code
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 