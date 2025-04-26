import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit, Trash, Copy, Search, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Quiz {
  id: string;
  title: string;
  description: string;
  access_code: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  question_count: number;
}

const Quizzes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  useEffect(() => {
    fetchQuizzes();
  }, [user]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          questions:questions(count)
        `)
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedQuizzes = data.map(quiz => ({
        ...quiz,
        question_count: quiz.questions[0].count,
        status: quiz.status as 'draft' | 'published' | 'archived'
      }));

      setQuizzes(formattedQuizzes);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load quizzes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    try {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Quiz deleted successfully.',
      });

      fetchQuizzes();
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete quiz. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Access code copied!' });
  };

  const handlePublishQuiz = async (quizId: string) => {
    try {
      const { error } = await supabase
        .from('quizzes')
        .update({ status: 'published' })
        .eq('id', quizId);
        
      if (error) throw error;
      
      toast({
        title: 'Quiz Published!',
        description: 'Students can now join this quiz.',
      });
      
      fetchQuizzes();
    } catch (error) {
      console.error('Error publishing quiz:', error);
      toast({
        title: 'Error',
        description: 'Failed to publish quiz. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const filteredQuizzes = quizzes
    .filter(quiz => {
      const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          quiz.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || quiz.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return 0;
    });

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

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800 text-white dark">
      <Navigation />
      <main className="flex-grow py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-extrabold mb-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
              Your Quizzes
            </h1>
            <p className="text-lg text-gray-300">
              Manage and organize your interactive quizzes
            </p>
          </div>

          {/* Filters and Search */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl rounded-2xl p-6 mb-8 border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search quizzes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-900 border-gray-700 text-white"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="title">Title (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quizzes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
                <p className="mt-4 text-gray-400">Loading quizzes...</p>
              </div>
            ) : filteredQuizzes.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-400">No quizzes found. Create your first quiz!</p>
                <Button
                  onClick={() => navigate('/create-quiz')}
                  className="mt-4 bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-bold shadow-lg hover:from-pink-500 hover:to-indigo-500"
                >
                  Create Quiz
                </Button>
              </div>
            ) : (
              filteredQuizzes.map((quiz) => (
                <Card key={quiz.id} className="overflow-hidden bg-gray-900 border border-gray-700">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl font-bold text-white">{quiz.title}</CardTitle>
                        <CardDescription className="text-gray-400 mt-1">
                          {quiz.description || 'No description provided'}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(quiz.status)}>
                        {quiz.status.charAt(0).toUpperCase() + quiz.status.slice(1)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-400">
                        <span className="mr-2">Questions:</span>
                        <span className="text-white">{quiz.question_count}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-400">
                        <span className="mr-2">Access Code:</span>
                        <div className="flex items-center">
                          <span className="text-white font-mono mr-2">{quiz.access_code}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-gray-400 hover:text-white"
                            onClick={() => handleCopyCode(quiz.access_code)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-400">
                        Created: {new Date(quiz.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end space-x-2">
                    {quiz.status === 'draft' && (
                      <Button
                        variant="outline"
                        className="text-green-300 border-green-500 hover:bg-green-900"
                        onClick={() => handlePublishQuiz(quiz.id)}
                      >
                        Publish
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-indigo-300 border-indigo-500 hover:bg-indigo-900"
                      onClick={() => navigate(`/quiz/${quiz.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-indigo-300 border-indigo-500 hover:bg-indigo-900"
                      onClick={() => navigate(`/edit-quiz/${quiz.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-red-300 border-red-500 hover:bg-red-900"
                      onClick={() => handleDeleteQuiz(quiz.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Quizzes; 