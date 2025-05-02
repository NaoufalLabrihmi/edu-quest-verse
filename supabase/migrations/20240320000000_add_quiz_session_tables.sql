-- Create quiz_sessions table
CREATE TABLE quiz_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  current_question_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('waiting', 'active', 'question_ended', 'ended')),
  time_remaining INTEGER NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create quiz_participants table
CREATE TABLE quiz_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- Create quiz_participant_answers table
CREATE TABLE quiz_participant_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  points_earned INTEGER NOT NULL,
  response_time INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, question_id, participant_id)
);

-- Add RLS policies
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_participant_answers ENABLE ROW LEVEL SECURITY;

-- Quiz sessions policies
CREATE POLICY "Quiz sessions are viewable by creator and participants" ON quiz_sessions
  FOR SELECT USING (
    auth.uid() = created_by OR 
    EXISTS (
      SELECT 1 FROM quiz_participants 
      WHERE session_id = quiz_sessions.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Quiz sessions can be created by quiz creator" ON quiz_sessions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quizzes 
      WHERE id = quiz_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Quiz sessions can be updated by creator" ON quiz_sessions
  FOR UPDATE USING (created_by = auth.uid());

-- Quiz participants policies
CREATE POLICY "Quiz participants are viewable by session creator and participants" ON quiz_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quiz_sessions 
      WHERE id = session_id AND created_by = auth.uid()
    ) OR 
    user_id = auth.uid()
  );

CREATE POLICY "Users can join as quiz participants" ON quiz_participants
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Quiz participants can update their own points" ON quiz_participants
  FOR UPDATE USING (user_id = auth.uid());

-- Quiz participant answers policies
CREATE POLICY "Quiz answers are viewable by session creator and answer owner" ON quiz_participant_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quiz_sessions 
      WHERE id = session_id AND created_by = auth.uid()
    ) OR 
    participant_id = auth.uid()
  );

CREATE POLICY "Users can submit their own answers" ON quiz_participant_answers
  FOR INSERT WITH CHECK (participant_id = auth.uid());

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_quiz_sessions_updated_at
  BEFORE UPDATE ON quiz_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_participants_updated_at
  BEFORE UPDATE ON quiz_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_participant_answers_updated_at
  BEFORE UPDATE ON quiz_participant_answers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 