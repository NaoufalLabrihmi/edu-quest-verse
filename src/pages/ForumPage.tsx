import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Check, Loader2, Heart } from 'lucide-react';
import { getCategories, getPosts, likePost, unlikePost, markPostSolved } from '@/lib/forum/forum-api';
import { useAuth } from '@/lib/auth/auth-context';

const ForumPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
  const [tab, setTab] = useState<'recent' | 'popular' | 'unanswered'>('recent');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const POSTS_PER_PAGE = 4;
  const { user } = useAuth();

  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => document.documentElement.classList.remove('dark');
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategories();
        setCategories([
          { value: 'all', label: 'All Categories' },
          ...data.map((cat: any) => ({ value: cat.id, label: cat.name })),
        ]);
      } catch (err) {
        setError('Failed to load categories');
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      setError(null);
      try {
        let data = await getPosts({
          categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
          search: searchQuery,
          sort: tab,
        });
        // Sort by likes for popular tab
        if (tab === 'popular' && Array.isArray(data)) {
          data = (data as any[])
            .filter(p => p && Array.isArray(p.likes))
            .sort((a, b) => (b.likes.length) - (a.likes.length));
        }
        setPosts(data || []);
        setPage(1);
      } catch (err) {
        setError('Failed to load posts');
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [selectedCategory, searchQuery, tab]);

  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
  const paginatedPosts = posts.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800 text-white transition-colors duration-300">
      <Navigation />
      <main className="flex-grow py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Learning Forum</h1>
              <p className="text-muted-foreground">Ask questions, share knowledge, help others learn</p>
            </div>
            <Button asChild variant="outline" className="shadow-md">
              <Link to="/forum/new">
                <MessageCircle className="h-4 w-4 mr-2" />
                Ask a Question
              </Link>
            </Button>
          </div>

          <div className="p-6 rounded-lg shadow-sm mb-8 bg-gray-900"> 
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 relative">
                <Input
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                />
              </div>
              <div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 text-white">
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value} className="bg-gray-900 text-white">
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Tabs value={tab} onValueChange={value => setTab(value as 'recent' | 'popular' | 'unanswered')} className="mb-8">
            <TabsList className="mb-6 bg-gray-800 border-gray-700"> 
              <TabsTrigger value="recent">Recent Questions</TabsTrigger>
              <TabsTrigger value="popular">Popular Questions</TabsTrigger>
              <TabsTrigger value="unanswered">Unanswered</TabsTrigger>
            </TabsList>
            <TabsContent value={tab}>
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="animate-spin h-8 w-8 text-primary" />
                </div>
              ) : error ? (
                <div className="text-center text-destructive py-8">{error}</div>
              ) : posts.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No questions found.</div>
              ) : (
                <>
                  <div className="space-y-4">
                    {paginatedPosts.map((post) => (
                      <ForumPostCard key={post.id} post={post} formatDate={formatDate} />
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-8">
                      <Button
                        variant="outline"
                        className="px-4 py-2"
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                      >
                        Previous
                      </Button>
                      <span className="text-lg font-semibold text-white">
                        Page {page} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        className="px-4 py-2"
                        disabled={page === totalPages}
                        onClick={() => setPage(page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

interface ForumPostCardProps {
  post: any;
  formatDate: (dateString: string) => string;
}

const ForumPostCard = ({ post, formatDate }: ForumPostCardProps) => {
  const { user } = useAuth();
  const [likes, setLikes] = useState(post.likes || []);
  const [isLiking, setIsLiking] = useState(false);
  const [solved, setSolved] = useState(post.solved);
  const hasLiked = user && likes.some((like: any) => like.user_id === user.id);
  const likeCount = likes.length;

  const handleLike = async () => {
    if (!user) return;
    setIsLiking(true);
    try {
      if (hasLiked) {
        await unlikePost(post.id, user.id);
        setLikes((prev: any[]) => prev.filter((like) => like.user_id !== user.id));
      } else {
        const newLike = await likePost(post.id, user.id);
        setLikes((prev: any[]) => [...prev, newLike]);
      }
    } catch (e) {
      // Optionally show error
    } finally {
      setIsLiking(false);
    }
  };

  const isUnanswered = !post.comments || post.comments.length === 0;
  return (
    <Card className="overflow-hidden card-hover border bg-gray-900 border-gray-700 text-white"> 
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={post.author?.avatar_url || ''} />
              <AvatarFallback className={post.author?.role === 'teacher' ? 'bg-edu-blue-500' : 'bg-edu-purple-500'}>
                {post.author?.username?.substring(0, 2) || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <span className="text-sm font-medium">{post.author?.username || 'Unknown'}</span>
              <div className="text-xs text-muted-foreground capitalize">{post.author?.role || 'student'}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {solved ? (
              <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center dark:bg-green-900 dark:text-green-300 dark:border-green-700">
                <Check className="h-3 w-3 mr-1" />
                Solved
              </Badge>
            ) : (
              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 flex items-center dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-700">
                Unsolved
              </Badge>
            )}
            {isUnanswered && (
              <Badge className="bg-red-100 text-red-700 border-red-200 flex items-center dark:bg-red-900 dark:text-red-300 dark:border-red-700">
                Unanswered
              </Badge>
            )}
            <Badge variant="outline" className="capitalize">
              {post.category?.name || 'General'}
            </Badge>
            {user && post.author?.id === user.id && (
              <button
                className="ml-2 px-2 py-0.5 rounded bg-edu-blue-600 hover:bg-edu-blue-700 text-white text-xs font-semibold shadow transition-all"
                onClick={async (e) => {
                  e.stopPropagation();
                  await markPostSolved(post.id, !solved);
                  setSolved(!solved);
                }}
                type="button"
              >
                Mark as {solved ? 'Unsolved' : 'Solved'}
              </button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <Link to={`/forum/${post.id}`} className="block group">
          <h3 className="font-semibold text-lg hover:text-edu-purple-700 dark:hover:text-edu-blue-400 transition-colors mb-2 group-hover:underline">
            {post.title}
          </h3>
          <p className="text-muted-foreground text-sm line-clamp-2">
            {post.content}
          </p>
        </Link>
      </CardContent>
      <CardFooter className="border-t bg-gray-800 py-3 flex items-center justify-between text-sm">
        <div className="flex items-center gap-6">
          <button
            className={`flex items-center gap-1 group px-2 py-1 rounded-md transition-all duration-150 border border-transparent hover:border-edu-purple-400 focus-visible:ring-2 focus-visible:ring-edu-purple-400 ${hasLiked ? 'text-edu-purple-400 bg-edu-purple-900/30' : 'text-gray-400 hover:bg-gray-700/40'} ${isLiking ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={handleLike}
            disabled={isLiking || !user}
            aria-label={hasLiked ? 'Unlike' : 'Like'}
            title={hasLiked ? 'Unlike' : 'Like'}
            type="button"
          >
            <Heart className={`h-5 w-5 transition-colors ${hasLiked ? 'fill-edu-purple-400' : 'fill-none'} group-hover:scale-110`} />
            <span className="font-semibold text-base ml-1">{likeCount}</span>
          </button>
          <span className="h-5 w-px bg-gray-700 mx-2 rounded-full" />
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-700/40">
            <MessageCircle className="h-4 w-4 text-gray-400" />
            <span className="font-semibold text-base ml-1 text-gray-200">{post.comments?.length || 0}</span>
            <span className="text-xs text-gray-400 ml-1">{post.comments?.length === 1 ? 'reply' : 'replies'}</span>
          </div>
        </div>
        <span className="text-muted-foreground font-medium flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-edu-purple-400 mr-1"></span>
          {formatDate(post.created_at)}
        </span>
      </CardFooter>
    </Card>
  );
};

export default ForumPage;
