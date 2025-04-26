import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  quizId: string;
  currentQuestionIndex: number;
  totalQuestions: number;
}

export default function ProfessorQuizControl({ quizId, currentQuestionIndex, totalQuestions }: Props) {
  const navigate = useNavigate();

  const handleSkipQuestion = async () => {
    try {
      // First fetch current state
      const { data: currentState, error: getError } = await supabase
        .from('quiz_state')
        .select('skipped_questions')
        .eq('quiz_id', quizId)
        .single();

      if (getError) {
        console.error('Error fetching current state:', getError);
        toast({
          title: "Error",
          description: "Failed to skip question",
          variant: "destructive",
        });
        return;
      }

      // Create or update the skipped questions array
      const skippedQuestions = currentState?.skipped_questions || [];
      skippedQuestions.push(currentQuestionIndex);

      // Update quiz state with skipped question
      const { error: updateError } = await supabase
        .from('quiz_state')
        .update({ 
          current_question_index: currentQuestionIndex + 1,
          skipped_questions: skippedQuestions
        })
        .eq('quiz_id', quizId);

      if (updateError) {
        console.error('Error updating quiz state:', updateError);
        toast({
          title: "Error",
          description: "Failed to skip question",
          variant: "destructive",
        });
        return;
      }

      // If successful, show success message and navigate
      toast({
        title: "Success",
        description: "Question skipped successfully",
      });

      // Navigate to next question or results if it was the last question
      if (currentQuestionIndex < totalQuestions - 1) {
        navigate(`/quiz/${quizId}/question/${currentQuestionIndex + 1}`);
      } else {
        navigate(`/quiz/${quizId}/results`);
      }

    } catch (error) {
      console.error('Error skipping question:', error);
      toast({
        title: "Error",
        description: "Failed to skip question",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg">
      <Button 
        variant="outline" 
        onClick={handleSkipQuestion}
        className="w-full"
      >
        Skip Question
      </Button>
    </div>
  );
} 