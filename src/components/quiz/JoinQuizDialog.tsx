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

      // Check if student is already in the quiz
      const { data: existingParticipation, error: participationError } = await (supabase as any)
        .from('quiz_participants')
        .select('*')
        .eq('quiz_id', quizDetails.id)
        .eq('student_id', user.id);

      if (participationError) throw participationError;

      if (existingParticipation && existingParticipation.length > 0) {
        navigate(`/quiz/${quizDetails.id}/waiting-room`);
        return;
      }

      // Add student to quiz
      const { error: insertError } = await (supabase as any)
        .from('quiz_participants')
        .insert({
          quiz_id: quizDetails.id,
          student_id: user.id,
          user_id: user.id,
          status: 'joined',
          joined_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Insert error details:', insertError);
        throw insertError;
      }

      // Subscribe to real-time updates
      const channel = supabase
        .channel(`quiz:${quizDetails.id}`)
        .on('broadcast', { event: 'quiz_started' }, (payload) => {
          navigate(`/quiz/${quizDetails.id}/active`);
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