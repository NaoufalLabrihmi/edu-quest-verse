import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle } from 'lucide-react';
import { getCategories, addPost } from '@/lib/forum/forum-api';
import { useAuth } from '@/lib/auth/auth-context';

const ForumNew = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCategories, setFetchingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => document.documentElement.classList.remove('dark');
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      setFetchingCategories(true);
      try {
        const data = await getCategories();
        setCategories(data.map((cat: any) => ({ value: cat.id, label: cat.name })));
        setCategory(data[0]?.id || '');
      } catch (err) {
        setError('Failed to load categories');
      } finally {
        setFetchingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (!user?.id) {
      setError('You must be logged in to post a question.');
      setLoading(false);
      return;
    }
    try {
      await addPost({
        title,
        content,
        categoryId: category,
        authorId: user.id,
      });
      setSuccess(true);
      setTimeout(() => navigate('/forum'), 1200);
    } catch (err) {
      setError('Failed to post your question. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800 text-white transition-colors duration-300">
      <Navigation />
      <main className="flex-grow py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="bg-gray-900 border border-gray-700 text-white shadow-lg">
            <CardHeader>
              <h1 className="text-2xl font-bold mb-2">Ask a Question</h1>
              <p className="text-muted-foreground">Get help from the community by posting your question below.</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block mb-1 font-medium" htmlFor="title">Title</label>
                  <Input
                    id="title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                    placeholder="Enter a clear, concise title"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium" htmlFor="content">Details</label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 min-h-[120px]"
                    placeholder="Describe your question in detail..."
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium" htmlFor="category">Category</label>
                  {fetchingCategories ? (
                    <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-4 w-4" /> Loading categories...</div>
                  ) : (
                    <Select value={category} onValueChange={setCategory} required>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 text-white">
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value} className="bg-gray-900 text-white">
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {error && <div className="text-destructive text-sm text-center">{error}</div>}
                {success && (
                  <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
                    <CheckCircle className="h-5 w-5" />
                    Question posted! Redirecting...
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full bg-edu-purple-600 hover:bg-edu-purple-700 text-white font-semibold shadow-md"
                  disabled={loading || fetchingCategories}
                >
                  {loading ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : 'Post Question'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ForumNew; 