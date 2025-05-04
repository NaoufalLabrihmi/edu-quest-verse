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
import { Loader2, Check, Heart, MessageCircle, X, User as UserIcon } from 'lucide-react';
import { getPostDetail, likePost, unlikePost, addComment, markPostSolved } from '@/lib/forum/forum-api';
import { useAuth } from '@/lib/auth/auth-context';

// Helper to get initials from user metadata or username/email
function getUserInitialsFromObj(userObj: any) {
  const name = userObj?.username || userObj?.full_name || userObj?.name || userObj?.email || '';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0][0]?.toUpperCase() || '?';
  return (words[0][0] + (words[1]?.[0] || '')).toUpperCase();
}

// Helper to get avatar gradient class by role
function getAvatarGradient(role: string) {
  return role === 'teacher'
    ? 'bg-gradient-to-br from-cyan-600 via-blue-600 to-cyan-800 border-cyan-300'
    : 'bg-gradient-to-br from-blue-600 via-cyan-700 to-blue-800 border-blue-300';
}

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
        <div className="w-full max-w-full mx-auto grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6 px-2 sm:px-4 md:px-8 mt-4 md:mt-8">
          {/* Left: Question card and comment form */}
          <div className="md:col-span-2 flex flex-col gap-4 md:sticky md:top-24 self-start min-h-[60vh]">
            {/* Question card - modern, glassy, flat accent */}
            <div className="relative w-full h-fit">
              <Card className="relative bg-gradient-to-br from-cyan-900/60 via-gray-900/80 to-gray-950/90 border border-cyan-800/30 text-white rounded-2xl p-4 sm:p-6 overflow-visible z-10 animate-fade-in-up w-full shadow-none">
                {/* Author, role, and tag row at the top */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <Avatar className="h-10 w-10 border-2 shadow-lg shadow-cyan-500/20">
                    <AvatarImage src={post.author?.avatar_url || ''} />
                    <AvatarFallback
                      className={`${getAvatarGradient(post.author?.role)} text-white font-extrabold text-xl flex items-center justify-center`}
                      style={{ letterSpacing: '-1px', textShadow: '0 2px 8px #0008' }}
                    >
                      {getUserInitialsFromObj(post.author)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-base font-bold">{post.author?.username || 'Unknown'}</span>
                  <span className="text-xs capitalize font-medium px-2 py-1 rounded bg-cyan-800/40 border border-cyan-700/30 text-cyan-100">
                    {post.author?.role || 'student'}
                  </span>
                  <Badge variant="outline" className="capitalize ml-2 bg-cyan-900/40 text-cyan-100 border border-cyan-700/30 px-3 py-1 text-xs font-semibold">
                    {post.category?.name || 'General'}
                  </Badge>
                  {post.solved ? (
                    <Badge className="ml-2 bg-green-600/90 text-white border-green-300 flex items-center px-4 py-1.5 text-base font-semibold">
                      <Check className="h-4 w-4 mr-1.5" />
                      Solved
                    </Badge>
                  ) : (
                    <Badge className="ml-2 bg-yellow-500/90 text-white border-yellow-200 flex items-center px-4 py-1.5 text-base font-semibold">
                      Unsolved
                    </Badge>
                  )}
                  {/* Icon button for author only, in the same row */}
                  {user && post.author?.id === user.id && (
                    <button
                      className="ml-2 flex items-center justify-center w-8 h-8 rounded-full border border-cyan-700 bg-cyan-900/60 hover:bg-cyan-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400"
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
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white mb-2 sm:mb-3 mt-0 break-words">
                  {post.title}
                </h1>
                {/* Question details/content under title */}
                <CardContent className="p-0 mb-3 sm:mb-4">
                  <p className="text-gray-100 text-base sm:text-lg whitespace-pre-line leading-relaxed font-medium break-words">
                    {post.content}
                  </p>
                </CardContent>
                {/* Likes, comment number, and date in the same row at the bottom */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 mb-2 w-full text-sm sm:text-base">
                  <button
                    className={`flex items-center gap-1 group px-3 py-1.5 rounded-full transition-all duration-150 border border-transparent hover:border-cyan-300 focus-visible:ring-2 focus-visible:ring-cyan-400 ${hasLiked ? 'text-cyan-200 bg-cyan-900/60' : 'text-white/80 hover:bg-cyan-900/30'} ${isLiking ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={handleLike}
                    disabled={isLiking || !user}
                    aria-label={hasLiked ? 'Unlike' : 'Like'}
                    title={hasLiked ? 'Unlike' : 'Like'}
                    type="button"
                  >
                    <Heart className={`h-5 w-5 transition-colors ${hasLiked ? 'fill-cyan-200' : 'fill-none'} group-hover:scale-110`} />
                    <span className="font-bold text-base ml-1">{likeCount}</span>
                  </button>
                  <span className="h-5 w-px bg-cyan-700/30 mx-2 rounded-full" />
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-cyan-900/30">
                    <MessageCircle className="h-5 w-5 text-cyan-200" />
                    <span className="font-bold text-base ml-1 text-cyan-100">{post.comments?.length || 0}</span>
                    <span className="text-xs text-cyan-200 ml-1">{post.comments?.length === 1 ? 'reply' : 'replies'}</span>
                  </div>
                  <span className="flex-1" />
                  <span className="text-xs text-cyan-200 font-medium text-right">{formatDate(post.created_at)}</span>
                </div>
              </Card>
            </div>
            {/* Comment form - visually unified with question card */}
            {user && (
              <div className="w-full mt-2">
                <div className="flex items-end gap-2 bg-cyan-900/60 border border-cyan-800/30 rounded-2xl px-2 sm:px-4 py-2">
                  <Avatar className="h-8 w-8 border-2 shadow-lg shadow-cyan-500/20">
                    <AvatarImage src={user.user_metadata?.avatar_url || ''} />
                    <AvatarFallback
                      className={`${getAvatarGradient(user.user_metadata?.role)} text-white font-extrabold text-lg flex items-center justify-center`}
                      style={{ letterSpacing: '-1px', textShadow: '0 2px 8px #0008' }}
                    >
                      {getUserInitialsFromObj(user.user_metadata)}
                    </AvatarFallback>
                  </Avatar>
                  <form onSubmit={handleAddComment} className="flex-1 flex items-end gap-2">
                    <Textarea
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      className="bg-cyan-950/80 border border-cyan-800 text-white placeholder-cyan-300 min-h-[36px] rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all text-base"
                      placeholder="Write your comment..."
                      required
                    />
                    <Button
                      type="submit"
                      className="bg-cyan-700 hover:bg-cyan-800 text-white font-bold rounded-full px-5 py-2 text-base flex items-center gap-2 transition-all duration-150 active:scale-95"
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
          <div className="md:col-span-3 flex flex-col gap-4 sm:gap-6 min-h-[60vh] pb-8 sm:pb-16">
            <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3 text-cyan-400">Comments</h3>
            {(!post.comments || post.comments.length === 0) ? (
              <div className="text-muted-foreground text-center py-6 sm:py-8 text-base">No comments yet. Be the first to reply!</div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {[...post.comments].slice().reverse().map((comment: any, idx: number) => (
                  <div
                    key={comment.id}
                    className={`flex gap-2 sm:gap-4 items-start w-full group transition-transform duration-150 ${idx === 0 ? 'mb-6 sm:mb-8' : ''}`}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10 sm:h-14 sm:w-14 border-2 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
                        {comment.author?.avatar_url ? (
                          <AvatarImage src={comment.author?.avatar_url} />
                        ) : (
                          <AvatarFallback
                            className={`${getAvatarGradient(comment.author?.role)} text-white font-extrabold text-2xl flex items-center justify-center`}
                            style={{ letterSpacing: '-1px', textShadow: '0 2px 8px #0008' }}
                          >
                            {getUserInitialsFromObj(comment.author)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                        <span className="font-semibold text-cyan-100 text-sm sm:text-base">{comment.author?.username || 'Unknown'}</span>
                        <span className="text-xs text-cyan-300 sm:ml-2 flex-1 text-right">{formatDate(comment.created_at)}</span>
                      </div>
                      <div className="relative">
                        <div className="bg-gradient-to-br from-cyan-900/80 via-cyan-950/90 to-blue-950/90 border-l-4 border-cyan-500 rounded-xl px-3 sm:px-5 py-2 sm:py-3 text-cyan-100 relative shadow-none group-hover:scale-[1.025] group-hover:border-cyan-400 transition-all duration-150 backdrop-blur-md">
                          <p className="text-sm sm:text-base leading-relaxed whitespace-pre-line font-medium break-words">{comment.content}</p>
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