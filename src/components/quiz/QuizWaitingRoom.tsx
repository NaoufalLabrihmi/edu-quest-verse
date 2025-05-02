import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
// @ts-ignore
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  Loader2, 
  Users, 
  Timer, 
  User, 
  Clock, 
  Shield, 
  BookOpen,
  Cake
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion } from 'framer-motion';

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

export function QuizWaitingRoom() {
  const { id } = useParams<{ id: string }>();
  const [quizDetails, setQuizDetails] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [waitingTime, setWaitingTime] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    console.log('QuizWaitingRoom quizId:', id);
  }, [id]);

  // Memoize fetchParticipants
  const fetchParticipants = useCallback(async () => {
    try {
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
              
              if (userError || !userData) {
                return {
                  ...participant,
                  username: 'Unknown'
                };
              }
              
              return {
                ...participant,
                username: userData.username
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
        console.log('QuizWaitingRoom fetched participants:', participantsWithUsernames);
      } else {
        setParticipants([]);
        console.log('QuizWaitingRoom fetched participants: []');
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const fetchQuizDetails = async () => {
      try {
        // Cast the return type to handle the custom view
        const { data, error } = await (supabase as any)
          .from('quizzes_with_creator')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (data) {
          setQuizDetails({
            ...data,
            professor: { username: data.creator_username }
          });
        }
      } catch (error) {
        console.error('Error fetching quiz details:', error);
        toast({
          title: "Error",
          description: "Failed to load quiz details",
          variant: "destructive",
        });
      }
    };

    // Initial load
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchQuizDetails(), fetchParticipants()]);
      setIsLoading(false);
    };
    loadData();

    // Increment waiting time
    const timer = setInterval(() => {
      setWaitingTime(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [id, fetchParticipants, toast]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <Navigation />
        <div className="flex flex-col items-center justify-center flex-grow gap-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
          </motion.div>
          <motion.p 
            className="text-indigo-800 font-medium"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Loading quiz details...
          </motion.p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!quizDetails) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <Navigation />
        <div className="flex flex-col items-center justify-center flex-grow gap-4">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
            <div className="text-red-500 mb-4">
              <Shield className="h-16 w-16 mx-auto" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Quiz Not Found</h1>
            <p className="text-gray-600 mb-6">
              The quiz you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              onClick={() => window.history.back()}
            >
              Go Back
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Format waiting time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getRandomEmoji = () => {
    const emojis = ['🚀', '🎮', '🎯', '🧠', '⭐', '🔥', '💯', '🏆'];
    return emojis[Math.floor(Math.random() * emojis.length)];
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <Navigation />
      <main className="flex-grow py-8 px-4">
        <motion.div 
          className="container mx-auto max-w-4xl"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Quiz Details Card */}
          <Card className="mb-6 overflow-hidden border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white pb-8">
              <div className="flex justify-between items-start">
                <div>
                  <Badge variant="outline" className="bg-white/20 text-white border-none mb-2">
                    Waiting Room
                  </Badge>
                  <CardTitle className="text-3xl font-bold">{quizDetails.title}</CardTitle>
                </div>
                <Badge variant="outline" className="bg-white/20 text-white border-none">
                  Code: {quizDetails.access_code}
                </Badge>
              </div>
            </CardHeader>
            <div className="relative">
              <div className="absolute -top-6 left-6 bg-white rounded-full p-3 shadow-md">
                <BookOpen className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-indigo-600" />
                  <span className="text-gray-700">
                    Created by <span className="font-medium">{quizDetails.professor?.username || quizDetails.creator_username || 'Unknown'}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Timer className="h-5 w-5 text-indigo-600" />
                  <span className="text-gray-700">
                    <span className="font-medium">{quizDetails.question_count || 0}</span> questions
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-indigo-600" />
                  <span className="text-gray-700">
                    Waiting for <span className="font-medium">{formatTime(waitingTime)}</span>
                  </span>
                </div>
              </div>
              {quizDetails.description && (
                <p className="text-gray-600 mt-2">{quizDetails.description}</p>
              )}
            </CardContent>
          </Card>

          {/* Participants Card */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                <span>Waiting for quiz to start</span>
              </CardTitle>
              <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200">
                {participants.length} {participants.length === 1 ? 'participant' : 'participants'}
              </Badge>
            </CardHeader>
            <CardContent>
              {participants.length === 0 ? (
                <div className="text-center p-8">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                    className="text-5xl mb-4"
                  >
                    <Cake className="h-16 w-16 mx-auto text-indigo-300" />
                  </motion.div>
                  <p className="text-gray-500 text-lg mb-2">No participants yet</p>
                  <p className="text-gray-400 text-sm">
                    Share the access code <span className="font-bold">{quizDetails.access_code}</span> with others to join
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  {participants.map((participant, index) => (
                    <motion.div
                      key={participant.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                      className="flex items-center p-3 bg-white border border-indigo-100 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                    >
                      <Avatar className="h-10 w-10 mr-3 bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                        <AvatarFallback>{participant.username?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-grow">
                        <p className="font-medium text-gray-800">
                          {participant.username || 'Unknown'} {getRandomEmoji()}
                        </p>
                        <p className="text-xs text-gray-500">
                          Joined {new Date(participant.joined_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t bg-gray-50 px-6 py-4">
              <div className="w-full">
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>Waiting for instructor to start the quiz</span>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse mr-2"></div>
                    <span>Live</span>
                  </div>
                </div>
                <Progress value={participants.length > 0 ? 100 : 0} className="h-2" />
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
} 