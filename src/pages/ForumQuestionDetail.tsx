import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Check, Heart, MessageCircle, X } from 'lucide-react';
import { getPostDetail, likePost, unlikePost, addComment, markPostSolved } from '@/lib/forum/forum-api';
import { useAuth } from '@/lib/auth/auth-context';

const ForumQuestionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likes, setLikes] = useState<any[]>([]);
  const [isLiking, setIsLiking] = useState(false);
  const [comment, setComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => document.documentElement.classList.remove('dark');
  }, []);

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getPostDetail(id!);
        setPost(data);
        setLikes(data.likes || []);
      } catch (err) {
        setError('Failed to load question.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchPost();
  }, [id]);

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

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommentLoading(true);
    setCommentError(null);
    if (!user?.id) {
      setCommentError('You must be logged in to comment.');
      setCommentLoading(false);
      return;
    }
    try {
      const newComment = await addComment({
        postId: post.id,
        authorId: user.id,
        content: comment,
      });
      // Merge in author info from current user for immediate UI update
      const commentWithAuthor = {
        ...newComment,
        author: {
          id: user.id,
          username: user.user_metadata?.username || user.email || 'You',
          role: user.user_metadata?.role || 'student',
          avatar_url: user.user_metadata?.avatar_url || '',
        },
      };
      setPost((prev: any) => ({ ...prev, comments: [...(prev.comments || []), commentWithAuthor] }));
      setComment('');
    } catch (err) {
      setCommentError('Failed to add comment.');
    } finally {
      setCommentLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800 text-white">
        <Navigation />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="animate-spin h-10 w-10 text-edu-purple-400" />
        </main>
        <Footer />
      </div>
    );
  }
  if (error || !post) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800 text-white">
        <Navigation />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-destructive text-lg">{error || 'Question not found.'}</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800 text-white">
      <Navigation />
      <main className="flex-grow py-0">
        {/* Main grid layout - full width */}
        <div className="w-full max-w-full mx-auto grid grid-cols-1 md:grid-cols-5 gap-6 px-2 md:px-8 mt-8">
          {/* Left: Question card and comment form */}
          <div className="md:col-span-2 flex flex-col gap-4 sticky top-20 self-start min-h-[60vh]">
            {/* Question card - modern, elegant, with title inside */}
            <div className="relative w-full h-fit">
              <Card className="relative bg-gradient-to-br from-white/10 via-edu-purple-900/30 to-gray-900/80 border border-white/10 text-white shadow-xl rounded-xl p-6 overflow-visible z-10 animate-fade-in-up w-full">
                {/* Author, role, and tag row at the top */}
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-10 w-10 ring-2 ring-white/20 shadow-md">
                    <AvatarImage src={post.author?.avatar_url || ''} />
                    <AvatarFallback className={post.author?.role === 'teacher' ? 'bg-edu-blue-500' : 'bg-edu-purple-500'}>
                      {post.author?.username?.substring(0, 2) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-base font-bold drop-shadow-md">{post.author?.username || 'Unknown'}</span>
                  <span className="text-xs text-white/80 capitalize font-medium px-2 py-1 rounded bg-white/10 border border-white/10">
                    {post.author?.role || 'student'}
                  </span>
                  <Badge variant="outline" className="capitalize ml-2 bg-white/10 text-white border-white/20 px-3 py-1 text-xs font-semibold shadow">
                    {post.category?.name || 'General'}
                  </Badge>
                  {post.solved ? (
                    <Badge className="ml-2 bg-green-400/90 text-white border-green-200 flex items-center px-4 py-1.5 text-base font-semibold shadow-lg animate-bounce">
                      <Check className="h-4 w-4 mr-1.5" />
                      Solved
                    </Badge>
                  ) : (
                    <Badge className="ml-2 bg-yellow-400/90 text-white border-yellow-200 flex items-center px-4 py-1.5 text-base font-semibold shadow-lg animate-pulse">
                      Unsolved
                    </Badge>
                  )}
                  {/* Icon button for author only, in the same row */}
                  {user && post.author?.id === user.id && (
                    <button
                      className={`ml-2 flex items-center justify-center w-8 h-8 rounded-full border border-edu-blue-500 bg-edu-blue-700/20 hover:bg-edu-blue-600/60 transition-colors shadow focus:outline-none focus:ring-2 focus:ring-edu-blue-400`}
                      title={`Mark as ${post.solved ? 'Unsolved' : 'Solved'}`}
                      onClick={async () => {
                        await markPostSolved(post.id, !post.solved);
                        setPost((prev: any) => ({ ...prev, solved: !prev.solved }));
                      }}
                      type="button"
                    >
                      {post.solved ? <X className="h-5 w-5 text-white" /> : <Check className="h-5 w-5 text-white" />}
                      <span className="sr-only">Mark as {post.solved ? 'Unsolved' : 'Solved'}</span>
                    </button>
                  )}
                </div>
                {/* Title under author row */}
                <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-3 mt-0 drop-shadow-lg animate-fade-in-up">
                  {post.title}
                </h1>
                {/* Question details/content under title */}
                <CardContent className="p-0 mb-4">
                  <p className="text-gray-100 text-base whitespace-pre-line leading-relaxed font-medium">
                    {post.content}
                  </p>
                </CardContent>
                {/* Likes, comment number, and date in the same row at the bottom */}
                <div className="flex items-center gap-4 mt-1 mb-2 w-full">
                  <button
                    className={`flex items-center gap-1 group px-3 py-1.5 rounded-full transition-all duration-150 border border-transparent hover:border-edu-purple-200 focus-visible:ring-2 focus-visible:ring-edu-purple-400 ${hasLiked ? 'text-edu-purple-200 bg-edu-purple-900/40' : 'text-white/80 hover:bg-white/10'} ${isLiking ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={handleLike}
                    disabled={isLiking || !user}
                    aria-label={hasLiked ? 'Unlike' : 'Like'}
                    title={hasLiked ? 'Unlike' : 'Like'}
                    type="button"
                  >
                    <Heart className={`h-5 w-5 transition-colors ${hasLiked ? 'fill-edu-purple-200' : 'fill-none'} group-hover:scale-110`} />
                    <span className="font-bold text-base ml-1">{likeCount}</span>
                  </button>
                  <span className="h-5 w-px bg-white/20 mx-2 rounded-full" />
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10">
                    <MessageCircle className="h-5 w-5 text-white/80" />
                    <span className="font-bold text-base ml-1 text-white">{post.comments?.length || 0}</span>
                    <span className="text-xs text-white/70 ml-1">{post.comments?.length === 1 ? 'reply' : 'replies'}</span>
                  </div>
                  <span className="flex-1" />
                  <span className="text-xs text-white/80 font-medium text-right">{formatDate(post.created_at)}</span>
                </div>
              </Card>
            </div>
            {/* Comment form */}
            {user && (
              <div className="w-full">
                <div className="flex items-end gap-2 bg-gradient-to-br from-white/10 via-edu-purple-900/30 to-gray-900/80 backdrop-blur-xl rounded-xl shadow-xl px-4 py-2 border border-white/10 animate-fade-in-up mt-2">
                  <Avatar className="h-8 w-8 shadow-md">
                    <AvatarImage src={user.user_metadata?.avatar_url || ''} />
                    <AvatarFallback className="bg-edu-purple-500">
                      {user.user_metadata?.username?.substring(0, 2) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <form onSubmit={handleAddComment} className="flex-1 flex items-end gap-2">
                    <Textarea
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      className="bg-gray-800/80 border border-edu-purple-700 text-white placeholder-gray-400 min-h-[36px] rounded-lg focus:ring-2 focus:ring-edu-purple-400 focus:border-edu-purple-400 transition-all text-base"
                      placeholder="Write your comment..."
                      required
                    />
                    <Button
                      type="submit"
                      className="bg-edu-purple-600 hover:bg-edu-purple-700 text-white font-bold shadow-md rounded-full px-5 py-2 text-base flex items-center gap-2 transition-all duration-150 active:scale-95"
                      disabled={commentLoading || !comment.trim()}
                    >
                      {commentLoading ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : <span className="flex items-center gap-1">Send <svg className="h-5 w-5 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg></span>}
                    </Button>
                  </form>
                </div>
                {commentError && <div className="text-destructive text-sm text-center mt-2">{commentError}</div>}
              </div>
            )}
          </div>
          {/* Right: Comments (answers) */}
          <div className="md:col-span-3 flex flex-col gap-6 min-h-[60vh] pb-16">
            <h3 className="text-lg font-bold mb-3 text-edu-purple-300">Comments</h3>
            {(!post.comments || post.comments.length === 0) ? (
              <div className="text-muted-foreground text-center py-8 text-base">No comments yet. Be the first to reply!</div>
            ) : (
              <div className="space-y-6">
                {post.comments.map((comment: any, idx: number) => (
                  <div key={comment.id} className={`flex gap-3 items-start animate-fade-in-up w-full ${idx === post.comments.length - 1 ? 'mb-8' : ''}`}> 
                    <Avatar className="h-8 w-8 shadow-md">
                      <AvatarImage src={comment.author?.avatar_url || ''} />
                      <AvatarFallback className={comment.author?.role === 'teacher' ? 'bg-edu-blue-500' : 'bg-edu-purple-500'}>
                        {comment.author?.username?.substring(0, 2) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-white/90 text-base">{comment.author?.username || 'Unknown'}</span>
                        <span className="text-xs text-white/60">{formatDate(comment.created_at)}</span>
                      </div>
                      <div className="relative">
                        <div className="bg-gradient-to-br from-indigo-900/80 via-edu-purple-800/80 to-gray-900/90 border border-indigo-700 rounded-xl px-5 py-3 text-white/90 shadow-lg relative">
                          <p className="text-base leading-relaxed whitespace-pre-line font-medium">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ForumQuestionDetail; 