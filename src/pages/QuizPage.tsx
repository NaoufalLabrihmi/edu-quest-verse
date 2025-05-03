import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/auth-context';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Eye, Edit, Trash, Copy, Users, Play, Clock, CheckCircle, Rocket, ChevronDown, Lock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

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

interface Quiz {
  id: string;
  title: string;
  description: string;
  access_code: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  questions: Question[];
  created_by: string;
}

interface Participant {
  id: string;
  student_id: string;
  status: string;
  joined_at: string;
  username: string;
}

// Helper: Collapsible Question Card
function QuestionAccordion({ question, index }: { question: Question, index: number }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="mb-4">
      <button
        className="w-full flex justify-between items-center px-6 py-4 bg-gradient-to-r from-cyan-900/80 to-blue-900/80 border border-cyan-800/60 rounded-2xl shadow-xl hover:scale-[1.01] hover:shadow-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`question-content-${question.id}`}
      >
        <span className="flex items-center text-xl font-bold text-white">
          Question {index + 1}: <span className="ml-2 text-cyan-200 font-normal">{question.question_text}</span>
        </span>
        <span className="flex items-center space-x-2">
          <Badge className="bg-cyan-500/10 text-cyan-300">
            {question.points * (question.point_multiplier || 1)} {question.points * (question.point_multiplier || 1) === 1 ? 'point' : 'points'}
            {question.point_multiplier > 1 ? ` (${question.point_multiplier}x)` : ''}
          </Badge>
          <Badge className="bg-blue-500/10 text-blue-300">{question.time_limit}s</Badge>
          <ChevronDown className={`ml-2 h-5 w-5 text-cyan-300 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      <div
        id={`question-content-${question.id}`}
        className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-96 py-4 px-6' : 'max-h-0 py-0 px-6'}`}
        style={{ background: open ? 'rgba(22, 78, 99, 0.7)' : 'transparent', borderRadius: '0 0 1rem 1rem' }}
        aria-hidden={!open}
      >
        {question.question_type === 'multiple_choice' && (
          <div className="space-y-2">
            {question.options.map((option, i) => (
              <div
                key={i}
                className={`p-2 rounded-lg border ${option === question.correct_answer ? 'bg-green-500/10 text-green-300 border-green-400' : 'bg-gray-800 text-cyan-100 border-cyan-700'}`}
              >
                {option}
              </div>
            ))}
          </div>
        )}
        {question.question_type === 'true_false' && (
          <div className="p-2 rounded-lg bg-green-500/10 text-cyan-100 font-semibold border border-green-400">
            Correct answer: <span className="text-green-300">{question.correct_answer}</span>
          </div>
        )}
        {question.question_type === 'short_answer' && (
          <div className="p-2 rounded-lg bg-green-500/10 text-cyan-100 font-semibold border border-green-400">
            Expected answer: <span className="text-green-300">{question.correct_answer}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const QuizPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  const [startingQuiz, setStartingQuiz] = useState(false);
  const [isProfessor, setIsProfessor] = useState(false);

  useEffect(() => {
    fetchQuiz();
  }, [id]);

  // Real-time participant updates
  useEffect(() => {
    if (!id) return;
    // Subscribe to quiz_participants changes for this quiz
    const channel = supabase
      .channel(`realtime:quiz_participants:quiz_id=eq.${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_participants',
          filter: `quiz_id=eq.${id}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          // On any insert/delete/update, re-fetch participants
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      
      // Check if current user is a professor
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;
      setIsProfessor(profileData?.role === 'teacher' || profileData?.role === 'admin');

      // Get quiz details
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          questions(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setQuiz({
        ...data,
        status: data.status as 'draft' | 'published' | 'archived'
      });

      // If user is the creator, fetch participants
      if (data.created_by === user?.id) {
        fetchParticipants();
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
      toast({
        title: 'Error',
        description: 'Failed to load quiz. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async () => {
    if (!id) return;
    
    try {
      setLoadingParticipants(true);
      
      // First get all participants for this quiz
      const { data: participantsData, error: participantsError } = await supabase
        .from('quiz_participants')
        .select('*')
        .eq('quiz_id', id)
        .order('joined_at', { ascending: true });

      if (participantsError) throw participantsError;

      if (participantsData && participantsData.length > 0) {
        // Then get usernames for all participants
        const participantsWithUsernames = await Promise.all(
          participantsData.map(async (participant: any) => {
            try {
              const { data: userData, error: userError } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', participant.student_id)
                .single();
              
              return {
                ...participant,
                username: userError || !userData ? 'Unknown' : userData.username
              };
            } catch (e) {
              return { 
                ...participant,
                username: 'Unknown'
              };
            }
          })
        );
        
        setParticipants(participantsWithUsernames);
      } else {
        setParticipants([]);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast({
        title: 'Error',
        description: 'Failed to load participants.',
        variant: 'destructive',
      });
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Access code copied!' });
  };

  const handleStartQuiz = async () => {
    if (!quiz) return;
    
    try {
      setStartingQuiz(true);
      
      // Update all participants status to 'started'
      const { error: updateError } = await supabase
        .from('quiz_participants')
        .update({ 
          status: 'started',
          started_at: new Date().toISOString()
        })
        .eq('quiz_id', quiz.id);
        
      if (updateError) throw updateError;
      
      // Broadcast to all clients that the quiz has started
      const channel = supabase.channel(`quiz:${quiz.id}`);
      await channel.send({
        type: 'broadcast',
        event: 'quiz_started',
        payload: { quiz_id: quiz.id }
      });
      
      toast({
        title: 'Quiz Started!',
        description: 'All participants have been notified.',
      });
      
      // Navigate to active quiz page
      navigate(`/quiz/${quiz.id}/active`);
    } catch (error) {
      console.error('Error starting quiz:', error);
      toast({
        title: 'Error',
        description: 'Failed to start quiz. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setStartingQuiz(false);
    }
  };

  const handlePublishQuiz = async () => {
    if (!quiz) return;
    
    try {
      const { error } = await supabase
        .from('quizzes')
        .update({ status: 'published' })
        .eq('id', quiz.id);
        
      if (error) throw error;
      
      toast({
        title: 'Quiz Published!',
        description: 'Students can now join this quiz.',
      });
      
      // Refresh quiz data
      fetchQuiz();
    } catch (error) {
      console.error('Error publishing quiz:', error);
      toast({
        title: 'Error',
        description: 'Failed to publish quiz. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'published':
        return 'bg-green-500/10 text-green-500';
      case 'archived':
        return 'bg-gray-500/10 text-gray-500';
      default:
        return 'bg-blue-500/10 text-blue-500';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800 text-white dark relative overflow-x-hidden">
        {/* Animated blobs and grid overlay */}
        <svg width="100%" height="100%" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full z-0" preserveAspectRatio="none">
          <circle cx="400" cy="400" r="300" fill="url(#grad1)" className="animate-blob1 blur-3xl opacity-60" />
          <circle cx="1600" cy="300" r="250" fill="url(#grad2)" className="animate-blob2 blur-3xl opacity-50" />
          <circle cx="1000" cy="800" r="220" fill="url(#grad3)" className="animate-blob3 blur-2xl opacity-40" />
          <defs>
            <radialGradient id="grad1" cx="0.5" cy="0.5" r="0.5" fx="0.5" fy="0.5">
              <stop stopColor="#06b6d4" />
              <stop offset="1" stopColor="#0ea5e9" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="grad2" cx="0.5" cy="0.5" r="0.5" fx="0.5" fy="0.5">
              <stop stopColor="#818cf8" />
              <stop offset="1" stopColor="#a21caf" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="grad3" cx="0.5" cy="0.5" r="0.5" fx="0.5" fy="0.5">
              <stop stopColor="#22d3ee" />
              <stop offset="1" stopColor="#0e7490" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
        <svg width="100%" height="100%" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full z-10" preserveAspectRatio="none">
          <g className="animate-gridwave" style={{ opacity: 0.10 }}>
            {[...Array(32)].map((_, i) => (
              <line key={i} x1={i * 60} y1="0" x2={i * 60} y2="1080" stroke="#67e8f9" strokeWidth="1" />
            ))}
            {[...Array(19)].map((_, i) => (
              <line key={i} x1="0" y1={i * 60} x2="1920" y2={i * 60} stroke="#818cf8" strokeWidth="1" />
            ))}
          </g>
          <style>{`
            @keyframes gridwave { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-20px);} }
            .animate-gridwave{animation:gridwave 16s ease-in-out infinite;}
            @keyframes blob1 { 0%,100%{transform:translate(0,0) scale(1);} 33%{transform:translate(80px,40px) scale(1.1);} 66%{transform:translate(-60px,-30px) scale(0.95);} }
            @keyframes blob2 { 0%,100%{transform:translate(0,0) scale(1);} 33%{transform:translate(-100px,60px) scale(1.05);} 66%{transform:translate(120px,-40px) scale(0.9);} }
            @keyframes blob3 { 0%,100%{transform:translate(0,0) scale(1);} 33%{transform:translate(60px,-80px) scale(1.08);} 66%{transform:translate(-90px,50px) scale(0.92);} }
            .animate-blob1{animation:blob1 18s ease-in-out infinite;}
            .animate-blob2{animation:blob2 22s ease-in-out infinite;}
            .animate-blob3{animation:blob3 20s ease-in-out infinite;}
          `}</style>
        </svg>
        <Navigation />
        <main className="flex-grow py-8 relative z-20">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="mb-8 text-center relative">
              <span className="text-3xl font-bold text-cyan-300">Loading quiz...</span>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800 text-white dark">
        <Navigation />
        <main className="flex-grow py-8">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <p className="text-gray-400">Quiz not found</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Is the current user the quiz creator?
  const isCreator = user?.id === quiz.created_by;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800 text-white dark relative overflow-x-hidden">
      {/* Animated blobs and grid overlay */}
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full z-0" preserveAspectRatio="none">
        <circle cx="400" cy="400" r="300" fill="url(#grad1)" className="animate-blob1 blur-3xl opacity-60" />
        <circle cx="1600" cy="300" r="250" fill="url(#grad2)" className="animate-blob2 blur-3xl opacity-50" />
        <circle cx="1000" cy="800" r="220" fill="url(#grad3)" className="animate-blob3 blur-2xl opacity-40" />
        <defs>
          <radialGradient id="grad1" cx="0.5" cy="0.5" r="0.5" fx="0.5" fy="0.5">
            <stop stopColor="#06b6d4" />
            <stop offset="1" stopColor="#0ea5e9" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="grad2" cx="0.5" cy="0.5" r="0.5" fx="0.5" fy="0.5">
            <stop stopColor="#818cf8" />
            <stop offset="1" stopColor="#a21caf" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="grad3" cx="0.5" cy="0.5" r="0.5" fx="0.5" fy="0.5">
            <stop stopColor="#22d3ee" />
            <stop offset="1" stopColor="#0e7490" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full z-10" preserveAspectRatio="none">
        <g className="animate-gridwave" style={{ opacity: 0.10 }}>
          {[...Array(32)].map((_, i) => (
            <line key={i} x1={i * 60} y1="0" x2={i * 60} y2="1080" stroke="#67e8f9" strokeWidth="1" />
          ))}
          {[...Array(19)].map((_, i) => (
            <line key={i} x1="0" y1={i * 60} x2="1920" y2={i * 60} stroke="#818cf8" strokeWidth="1" />
          ))}
        </g>
        <style>{`
          @keyframes gridwave { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-20px);} }
          .animate-gridwave{animation:gridwave 16s ease-in-out infinite;}
          @keyframes blob1 { 0%,100%{transform:translate(0,0) scale(1);} 33%{transform:translate(80px,40px) scale(1.1);} 66%{transform:translate(-60px,-30px) scale(0.95);} }
          @keyframes blob2 { 0%,100%{transform:translate(0,0) scale(1);} 33%{transform:translate(-100px,60px) scale(1.05);} 66%{transform:translate(120px,-40px) scale(0.9);} }
          @keyframes blob3 { 0%,100%{transform:translate(0,0) scale(1);} 33%{transform:translate(60px,-80px) scale(1.08);} 66%{transform:translate(-90px,50px) scale(0.92);} }
          .animate-blob1{animation:blob1 18s ease-in-out infinite;}
          .animate-blob2{animation:blob2 22s ease-in-out infinite;}
          .animate-blob3{animation:blob3 20s ease-in-out infinite;}
        `}</style>
      </svg>
      <Navigation />
      <main className="flex-grow py-8 relative z-20">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Big Quiz Info Card at the top (now more compact and premium) */}
          <div className="w-full mb-8">
            <div className="bg-gradient-to-br from-cyan-900/80 to-blue-900/80 shadow-2xl rounded-2xl p-6 border border-cyan-700/60 animate-fade-in flex flex-col items-center justify-center backdrop-blur-md bg-opacity-80 ring-1 ring-cyan-400/10">
              <div className="flex flex-col items-center gap-3 w-full">
                <div className="flex items-center gap-3 w-full justify-center">
                  <Rocket className="h-7 w-7 text-cyan-400 animate-float" />
                  <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 text-transparent bg-clip-text drop-shadow-lg text-center">
              {quiz.title}
            </h1>
                  <Badge className={getStatusColor(quiz.status) + ' text-base px-4 py-1.5 rounded-full shadow-lg animate-fade-in ml-4'}>
                {quiz.status.charAt(0).toUpperCase() + quiz.status.slice(1)}
              </Badge>
                </div>
                <div className="w-full border-t border-cyan-700/40 my-3"></div>
                <div className="flex flex-col items-center">
                  <span className="uppercase text-cyan-300 tracking-widest text-base font-semibold mb-1">Access Code</span>
                  <div className="flex items-center bg-cyan-900/60 px-6 py-3 rounded-xl shadow-lg border border-cyan-700 transition-transform duration-200 hover:scale-105 hover:shadow-2xl">
                    <span className="font-mono text-2xl sm:text-3xl text-white tracking-widest select-all mr-3">{quiz.access_code}</span>
                <Button
                  variant="ghost"
                  size="icon"
                      className="h-9 w-9 text-cyan-400 hover:text-white"
                  onClick={() => handleCopyCode(quiz.access_code)}
                      aria-label="Copy access code"
                >
                      <Copy className="h-6 w-6" />
                </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Two-column grid: Participants (left, wider), Description (right, narrower) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-10">
            {/* Left: Participants (wider) */}
            <div className="md:col-span-7">
              <div className="bg-gradient-to-br from-cyan-950/90 via-blue-950/90 to-cyan-900/90 shadow-2xl rounded-3xl p-8 border-2 border-transparent bg-clip-padding bg-gradient-to-r from-cyan-400/30 via-blue-400/20 to-teal-400/30 animate-fade-in ring-2 ring-cyan-400/20 mb-8">
                <Tabs defaultValue="participants">
                  <TabsList className="bg-cyan-950/80 border border-cyan-800 rounded-xl mb-4">
                    <TabsTrigger value="participants" className="text-white font-semibold">Participants</TabsTrigger>
                    <TabsTrigger value="controls" className="text-white font-semibold">Quiz Controls</TabsTrigger>
                  </TabsList>
                  <TabsContent value="participants" className="mt-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white flex items-center">
                          <Users className="h-5 w-5 mr-2 text-cyan-300" />
                          Participants
                        </h3>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={fetchParticipants}
                          className="text-white border-cyan-400 hover:bg-cyan-800/60 hover:text-cyan-200"
                        >
                          Refresh
                        </Button>
                      </div>
                      {loadingParticipants ? (
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                        </div>
                      ) : participants.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                          {participants.map((participant) => (
                            <div 
                              key={participant.id} 
                              className="flex items-center justify-between p-3 bg-cyan-800/40 rounded-lg border border-cyan-700 hover:bg-cyan-700/60 transition-all duration-150"
                            >
                              <div className="flex items-center">
                                <div className="h-8 w-8 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-lg shadow">
                                  {participant.username.charAt(0).toUpperCase()}
                                </div>
                                <span className="ml-3 font-bold text-white text-lg">{participant.username}</span>
                              </div>
                              <span className="text-sm text-cyan-100 flex items-center">
                                <Clock className="h-3 w-3 mr-1 text-cyan-300" />
                                {new Date(participant.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-cyan-100">
                          No participants have joined yet
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="controls" className="mt-4">
                    <div className="space-y-4">
                      <div className="p-4 bg-cyan-800/40 rounded-xl border border-cyan-700">
                        <h3 className="font-bold text-xl text-white mb-2">Start Quiz</h3>
                        <p className="text-cyan-100 mb-4">
                          Start the quiz for all participants. Everyone in the waiting room will be redirected to the quiz automatically.
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="text-cyan-100 flex items-center">
                            <Users className="h-4 w-4 mr-2 text-cyan-300" />
                            {participants.length} participants ready
                          </div>
                          <Button 
                            onClick={handleStartQuiz}
                            disabled={startingQuiz || participants.length === 0}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold"
                          >
                            {startingQuiz ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white mr-2"></div>
                                Starting...
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-2" /> 
                                Start Quiz
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="p-4 bg-cyan-800/40 rounded-xl border border-cyan-700">
                        <h3 className="font-bold text-xl text-white mb-2">Quiz Settings</h3>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center text-cyan-100">
                            <span>Quiz Status:</span>
                            <Badge className={getStatusColor(quiz.status) + ' text-white'}>
                              {quiz.status.charAt(0).toUpperCase() + quiz.status.slice(1)}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center text-cyan-100">
                            <span>Questions:</span>
                            <span>{quiz.questions.length}</span>
                          </div>
                          <div className="flex justify-between items-center text-cyan-100">
                            <span>Total Points:</span>
                            <span>{quiz.questions.reduce((sum, q) => sum + q.points, 0)}</span>
                          </div>
                          {quiz.status === 'draft' && (
                            <Button 
                              onClick={handlePublishQuiz}
                              className="w-full bg-green-600 hover:bg-green-700 text-white mt-2 font-bold"
                            >
                              Publish Quiz
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
                <div className="flex justify-between border-t border-cyan-800 pt-4 mt-6">
                <Button 
                  variant="outline" 
                    className="text-white border-cyan-400 hover:bg-cyan-800/60 hover:text-cyan-200 font-bold"
                  onClick={() => navigate(`/edit-quiz/${quiz.id}`)}
                >
                  <Edit className="h-4 w-4 mr-2" /> Edit Quiz
                </Button>
                <Button 
                    className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold"
                  onClick={() => navigate('/quizzes')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" /> Done
                </Button>
                </div>
              </div>
            </div>
            {/* Right: Description (narrower) */}
            <div className="md:col-span-5">
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl rounded-2xl p-5 border border-cyan-800/60 animate-fade-in">
                <h2 className="text-lg font-bold mb-3 text-cyan-300 flex items-center">
                  <Rocket className="h-5 w-5 mr-2 text-cyan-400 animate-float" /> Description
                </h2>
                <p className="text-cyan-200 text-base">{quiz.description || 'No description provided'}</p>
              </div>
            </div>
          </div>
          {/* Questions section full width below */}
          <div className="space-y-8 mt-10">
            <h2 className="text-2xl font-bold mb-4 text-cyan-300 flex items-center">
              Questions ({quiz.questions.length})
              <Lock className="ml-2 h-5 w-5 text-cyan-400" />
            </h2>
            <div className="rounded-xl bg-cyan-950/60 p-4 border border-cyan-800/40">
              <p className="text-cyan-200 mb-4 text-sm flex items-center">
                <Lock className="h-4 w-4 mr-1 text-cyan-400" />
                Questions are hidden by default. Click a question to view its options/answers. This prevents students from seeing answers if the teacher accidentally shares the screen.
              </p>
              {quiz.questions.sort((a, b) => a.order_number - b.order_number).map((question, index) => (
                <QuestionAccordion key={question.id} question={question} index={index} />
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default QuizPage; 