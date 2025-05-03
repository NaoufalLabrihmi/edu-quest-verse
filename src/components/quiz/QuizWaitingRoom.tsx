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
  Cake,
  Copy,
  CheckCircle
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
  const [copied, setCopied] = useState(false);
  const [quote, setQuote] = useState('');

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

  useEffect(() => {
    // Fun facts or motivational quotes
    const quotes = [
      '“Education is the most powerful weapon which you can use to change the world.” – Nelson Mandela',
      '“The beautiful thing about learning is that no one can take it away from you.” – B.B. King',
      '“Learning never exhausts the mind.” – Leonardo da Vinci',
      '“The mind is not a vessel to be filled, but a fire to be kindled.” – Plutarch',
      '“Success is not the key to happiness. Happiness is the key to success.” – Albert Schweitzer',
      '“The expert in anything was once a beginner.”',
      '“Dream big. Work hard. Stay focused.”',
      '“Knowledge is power.”',
    ];
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, []);

  const handleCopyCode = () => {
    if (quizDetails?.access_code) {
      navigator.clipboard.writeText(quizDetails.access_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  if (isLoading) {
    return (
      <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-x-hidden font-sans">
        {/* Full-page animated dark gradient background with subtle academic pattern overlay */}
        <div className="fixed inset-0 z-0 bg-gradient-to-br from-[#0a1626] via-[#101624] to-[#232b3b] animate-fade-in" aria-hidden="true" />
        <div className="fixed inset-0 z-0 pointer-events-none" style={{background: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect x=\'0.5\' y=\'0.5\' width=\'39\' height=\'39\' rx=\'8.5\' fill=\'none\' stroke=\'%2367e8f933\'/%3E%3C/svg%3E")', opacity: 0.12}} />
        <style>{`
          .glass-card {
            background: linear-gradient(135deg, #182232 80%, #1a2636 100%);
            border-radius: 2.5rem;
            box-shadow: 0 4px 32px 0 #101624cc, 0 1.5px 8px 0 #232b3b55;
            border: 1.5px solid #23344b;
            backdrop-filter: blur(14px) saturate(1.1);
            position: relative;
            overflow: hidden;
            transition: box-shadow 0.25s, border-color 0.25s;
          }
          .glass-card:hover {
            box-shadow: 0 8px 40px 0 #23344bcc, 0 2px 12px 0 #10162499;
            border-color: #38bdf8;
          }
          .glass-nav {
            background: rgba(18, 28, 40, 0.93);
            border-bottom: 1.5px solid #67e8f933;
            box-shadow: 0 2px 16px 0 #10162433;
            backdrop-filter: blur(8px) saturate(1.05);
          }
          .glass-footer {
            background: rgba(18, 28, 40, 0.93);
            border-top: 1.5px solid #67e8f933;
            box-shadow: 0 -2px 16px 0 #10162433;
            backdrop-filter: blur(8px) saturate(1.05);
          }
          .serif-heading {
            font-family: 'Merriweather', 'Georgia', serif;
          }
          .pill-participant {
            border-radius: 9999px;
            background: linear-gradient(90deg, #1a2636 60%, #23344b 100%);
            color: #7dd3fc;
            border: 1.5px solid #23344b;
            box-shadow: 0 1px 8px 0 #10162444;
            font-weight: 700;
            font-size: 1.05rem;
            padding: 0.5rem 1.2rem;
            margin: 0.2rem 0;
            transition: box-shadow 0.2s, transform 0.2s, background 0.2s;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          .pill-participant:hover, .pill-participant:focus {
            background: linear-gradient(90deg, #23344b 0%, #38bdf8 100%);
            color: #bae6fd;
            box-shadow: 0 0 0 2px #23344b, 0 2px 12px 0 #38bdf822;
            transform: scale(1.04);
          }
          .floating-code {
            position: absolute;
            top: -2.5rem;
            right: -2.5rem;
            z-index: 20;
            background: linear-gradient(135deg, #1a2636cc 60%, #23344bcc 100%);
            color: #7dd3fc;
            border-radius: 1.5rem;
            box-shadow: 0 2px 16px 0 #22d3ee33;
            padding: 0.9rem 1.6rem;
            font-size: 1.1rem;
            font-weight: 800;
            border: 2px solid #23344b;
            backdrop-filter: blur(8px);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.7rem;
            transition: box-shadow 0.2s, background 0.2s;
          }
          .floating-code:hover {
            background: linear-gradient(135deg, #23344b 0%, #38bdf8 100%);
            color: #bae6fd;
            box-shadow: 0 0 0 3px #23344b, 0 2px 12px 0 #38bdf822;
          }
          .stat-chip {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: linear-gradient(90deg, #1a2636 60%, #23344b 100%);
            color: #7dd3fc;
            border-radius: 1.2rem;
            padding: 0.5rem 1.2rem;
            font-weight: 600;
            font-size: 1rem;
            box-shadow: 0 1px 8px 0 #10162422;
          }
          .waiting-anim {
            animation: shimmer 2.5s infinite linear;
            background: linear-gradient(90deg, #23344b 0%, #1a2636 50%, #38bdf8 100%);
            background-size: 200% 100%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          @keyframes shimmer {
            0% { background-position: 0% 50%; }
            100% { background-position: 200% 50%; }
          }
        `}</style>
        <Navigation />
        <div className="flex flex-col items-center justify-center flex-grow gap-4 w-full">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Loader2 className="h-12 w-12 animate-spin text-cyan-400" />
          </motion.div>
          <motion.p 
            className="text-cyan-200 font-medium text-xl serif-heading drop-shadow-xl"
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
      <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-x-hidden font-sans">
        <div className="fixed inset-0 z-0 bg-gradient-to-br from-[#0a1626] via-[#101624] to-[#232b3b] animate-fade-in" aria-hidden="true" />
        <div className="fixed inset-0 z-0 pointer-events-none" style={{background: 'url(\"data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect x=\'0.5\' y=\'0.5\' width=\'39\' height=\'39\' rx=\'8.5\' fill=\'none\' stroke=\'%2367e8f933\'/%3E%3C/svg%3E\")', opacity: 0.12}} />
        <Navigation />
        <div className="flex flex-col items-center justify-center flex-grow gap-4 w-full">
          <div className="glass-card p-8 rounded-3xl shadow-2xl max-w-md w-full text-center">
            <div className="text-cyan-400 mb-4">
              <Shield className="h-16 w-16 mx-auto" />
            </div>
            <h1 className="text-2xl font-bold text-cyan-100 mb-2 serif-heading drop-shadow-xl">Quiz Not Found</h1>
            <p className="text-cyan-200 mb-6">
              The quiz you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button 
              className="w-full bg-cyan-700 hover:bg-cyan-800 text-white font-bold rounded-xl shadow-cyan-glow"
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
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-x-hidden font-sans">
      {/* Multi-layered animated gradient background with SVG academic motif */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-[#101624] via-[#162032] to-[#1a2636] animate-fade-in" aria-hidden="true" />
      <div className="fixed inset-0 z-0 pointer-events-none" style={{background: 'url("data:image/svg+xml,%3Csvg width=\'100%\' height=\'100%\' viewBox=\'0 0 400 400\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 200 Q200 100 400 200 T800 200\' stroke=\'%2367e8f933\' stroke-width=\'2\' fill=\'none\'/%3E%3Ccircle cx=\'200\' cy=\'200\' r=\'120\' stroke=\'%2360a5fa33\' stroke-width=\'2\' fill=\'none\'/%3E%3C/svg%3E")', opacity: 0.10}} />
      <style>{`
        .glass-card {
          background: linear-gradient(135deg, #182232 80%, #1a2636 100%);
          border-radius: 2.5rem;
          box-shadow: 0 4px 32px 0 #101624cc, 0 1.5px 8px 0 #232b3b55;
          border: 1.5px solid #23344b;
          backdrop-filter: blur(14px) saturate(1.1);
          position: relative;
          overflow: hidden;
          transition: box-shadow 0.25s, border-color 0.25s;
        }
        .glass-card:hover {
          box-shadow: 0 8px 40px 0 #23344bcc, 0 2px 12px 0 #10162499;
          border-color: #38bdf8;
        }
        .glass-nav {
          background: rgba(18, 28, 40, 0.93);
          border-bottom: 1.5px solid #67e8f933;
          box-shadow: 0 2px 16px 0 #10162433;
          backdrop-filter: blur(8px) saturate(1.05);
        }
        .glass-footer {
          background: rgba(18, 28, 40, 0.93);
          border-top: 1.5px solid #67e8f933;
          box-shadow: 0 -2px 16px 0 #10162433;
          backdrop-filter: blur(8px) saturate(1.05);
        }
        .serif-heading {
          font-family: 'Merriweather', 'Georgia', serif;
        }
        .pill-participant {
          border-radius: 9999px;
          background: linear-gradient(90deg, #1a2636 60%, #23344b 100%);
          color: #7dd3fc;
          border: 1.5px solid #23344b;
          box-shadow: 0 1px 8px 0 #10162444;
          font-weight: 700;
          font-size: 1.05rem;
          padding: 0.5rem 1.2rem;
          margin: 0.2rem 0;
          transition: box-shadow 0.2s, transform 0.2s, background 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .pill-participant:hover, .pill-participant:focus {
          background: linear-gradient(90deg, #23344b 0%, #38bdf8 100%);
          color: #bae6fd;
          box-shadow: 0 0 0 2px #23344b, 0 2px 12px 0 #38bdf822;
          transform: scale(1.04);
        }
        .floating-code {
          position: absolute;
          top: -2.5rem;
          right: -2.5rem;
          z-index: 20;
          background: linear-gradient(135deg, #1a2636cc 60%, #23344bcc 100%);
          color: #7dd3fc;
          border-radius: 1.5rem;
          box-shadow: 0 2px 16px 0 #22d3ee33;
          padding: 0.9rem 1.6rem;
          font-size: 1.1rem;
          font-weight: 800;
          border: 2px solid #23344b;
          backdrop-filter: blur(8px);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.7rem;
          transition: box-shadow 0.2s, background 0.2s;
        }
        .floating-code:hover {
          background: linear-gradient(135deg, #23344b 0%, #38bdf8 100%);
          color: #bae6fd;
          box-shadow: 0 0 0 3px #23344b, 0 2px 12px 0 #38bdf822;
        }
        .stat-chip {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(90deg, #1a2636 60%, #23344b 100%);
          color: #7dd3fc;
          border-radius: 1.2rem;
          padding: 0.5rem 1.2rem;
          font-weight: 600;
          font-size: 1rem;
          box-shadow: 0 1px 8px 0 #10162422;
        }
        .waiting-anim {
          animation: shimmer 2.5s infinite linear;
          background: linear-gradient(90deg, #23344b 0%, #1a2636 50%, #38bdf8 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>
      <div className="glass-nav w-full sticky top-0 z-30">
      <Navigation />
      </div>
      <main className="flex-grow py-8 px-4 w-full flex flex-col items-center justify-center">
        <motion.div 
          className="relative w-full max-w-2xl mx-auto glass-card px-14 pt-14 pb-12 flex flex-col items-center shadow-cyan-glow mb-8 mt-10"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7 }}
        >
          {/* Floating code badge with copy-to-clipboard */}
          <div className="floating-code" onClick={handleCopyCode} title="Copy code to clipboard">
            <span>Code: {quizDetails.access_code}</span>
            {copied ? <CheckCircle className="h-5 w-5 text-green-300 animate-bounce" /> : <Copy className="h-5 w-5 text-cyan-100" />}
                </div>
          {/* Card header */}
          <div className="w-full text-center mb-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <span className="serif-heading text-lg font-bold text-cyan-200 drop-shadow animate-gradient-x waiting-anim">Waiting Room</span>
            <div className="w-full h-1 mt-3 rounded-full bg-cyan-900/60 overflow-hidden">
              <div className="h-1 rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 shadow-cyan-glow transition-all duration-500" style={{width: `100%`}} />
            </div>
                </div>
          {/* Quiz title */}
          <div className="w-full text-center mt-4 mb-6 md:mb-4 md:text-left">
            <p className="serif-heading text-2xl md:text-3xl font-black text-cyan-100 drop-shadow-xl animate-gradient-x mb-2" style={{textShadow: '0 2px 12px #0fffcf33'}}>{quizDetails.title}</p>
                </div>
          {/* Quiz meta as stat chips */}
          <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-6">
            <div className="stat-chip"><User className="h-5 w-5 text-cyan-400" /> <span>By <span className="font-bold">{quizDetails.professor?.username || quizDetails.creator_username || 'Unknown'}</span></span></div>
            <div className="stat-chip"><Timer className="h-5 w-5 text-cyan-400" /> <span>{quizDetails.question_count || 0} questions</span></div>
            <div className="stat-chip"><Clock className="h-5 w-5 text-cyan-400" /> <span>Waiting <span className="font-bold">{formatTime(waitingTime)}</span></span></div>
              </div>
              {quizDetails.description && (
            <p className="text-cyan-300 mt-2 text-center">{quizDetails.description}</p>
          )}
          {/* Animated waiting message */}
          <div className="w-full flex flex-col items-center md:flex-row md:justify-between mt-8 mb-4 gap-2">
            <span className="serif-heading text-xl font-bold waiting-anim flex items-center gap-2">
              <Clock className="h-5 w-5 text-cyan-400 animate-pulse" />
              Waiting for instructor to start the quiz
              <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse ml-2"></div>
            </span>
            <span className="text-cyan-400 text-sm mt-2 italic">{quote}</span>
          </div>
          {/* Participants list */}
          <div className="w-full flex flex-wrap gap-3 justify-center md:justify-start mt-8">
              {participants.length === 0 ? (
              <div className="text-center p-8 w-full">
                <Cake className="h-16 w-16 mx-auto text-cyan-300 mb-4" />
                <p className="text-cyan-400 text-lg mb-2">No participants yet</p>
                <p className="text-cyan-500 text-sm">
                    Share the access code <span className="font-bold">{quizDetails.access_code}</span> with others to join
                  </p>
                </div>
              ) : (
              participants.map((participant, index) => (
                    <motion.div
                      key={participant.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.07, duration: 0.3 }}
                  className="pill-participant"
                >
                  <span className="font-bold text-cyan-100">{participant.username || 'Unknown'}</span>
                  <span>{getRandomEmoji()}</span>
                    </motion.div>
              ))
            )}
                  </div>
          {/* Live badge */}
          <div className="absolute top-4 left-4 bg-cyan-700/80 text-cyan-100 font-bold rounded-full px-4 py-1 shadow-cyan-glow flex items-center gap-2 animate-pulse">
            <Users className="h-4 w-4" /> {participants.length} Live
              </div>
        </motion.div>
      </main>
      <div className="glass-footer w-full mt-8">
      <Footer />
      </div>
    </div>
  );
} 