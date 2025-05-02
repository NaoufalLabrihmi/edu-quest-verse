-- Create a stored procedure to handle answer submission and points updates in a transaction
CREATE OR REPLACE FUNCTION public.submit_answer(
  p_session_id uuid,
  p_question_id uuid,
  p_participant_id uuid,
  p_answer text,
  p_is_correct boolean,
  p_points_earned integer,
  p_response_time integer
) 
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_points integer;
  profile_points integer;
  new_total_points integer;
  new_profile_points integer;
  result json;
BEGIN
  -- Begin transaction
  BEGIN
    -- Insert answer record
    INSERT INTO public.participant_answers(
      session_id,
      question_id,
      participant_id,
      answer,
      is_correct,
      points_earned,
      response_time
    ) VALUES (
      p_session_id,
      p_question_id,
      p_participant_id,
      p_answer,
      p_is_correct,
      p_points_earned,
      p_response_time
    );
    
    -- Only update points if answer is correct
    IF p_is_correct THEN
      -- Get current points from quiz_participants
      SELECT total_points INTO current_points
      FROM public.quiz_participants
      WHERE session_id = p_session_id AND user_id = p_participant_id;
      
      -- Calculate new total
      new_total_points := COALESCE(current_points, 0) + p_points_earned;
      
      -- Update quiz_participants points
      UPDATE public.quiz_participants
      SET total_points = new_total_points
      WHERE session_id = p_session_id AND user_id = p_participant_id;
      
      -- Also update profile points for shop integration
      SELECT points INTO profile_points
      FROM public.profiles
      WHERE id = p_participant_id;
      
      -- Calculate new profile total
      new_profile_points := COALESCE(profile_points, 0) + p_points_earned;
      
      -- Update profile points
      UPDATE public.profiles
      SET points = new_profile_points
      WHERE id = p_participant_id;
    END IF;
    
    -- Prepare result
    result := json_build_object(
      'success', true,
      'participant_id', p_participant_id,
      'points_earned', p_points_earned,
      'new_total_points', new_total_points,
      'new_profile_points', new_profile_points
    );
    
    -- Commit transaction
    RETURN result;
  EXCEPTION
    WHEN OTHERS THEN
      -- Handle error and rollback transaction
      RAISE;
  END;
END;
$$; 