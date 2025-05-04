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
import { MessageCircle, Check, Loader2, Heart, X, MoreVertical } from 'lucide-react';
import { getCategories, getPosts, likePost, unlikePost, markPostSolved, addPost, deletePost, updatePost } from '@/lib/forum/forum-api';
import { useAuth } from '@/lib/auth/auth-context';
import { Textarea } from '@/components/ui/textarea';

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
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newError, setNewError] = useState<string | null>(null);
  const [newLoading, setNewLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editModal, setEditModal] = useState<{ id: string, title: string, description: string, category: string, solved: boolean } | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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

  const fetchPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      let data = await getPosts({
        categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: searchQuery,
        sort: tab,
      });
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

  useEffect(() => {
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
        <div className="container mx-auto px-2 sm:px-4 max-w-6xl pb-8">
          {/* Forum Header Card */}
          <div className="mb-8">
            <div className="bg-gradient-to-br from-cyan-900/80 via-gray-900/80 to-cyan-950/90 rounded-2xl px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold mb-1 bg-gradient-to-r from-cyan-300 via-blue-400 to-teal-300 bg-clip-text text-transparent">Learning Forum</h1>
                <p className="text-cyan-100/80 text-sm sm:text-base font-medium">Ask questions, share knowledge, help others learn</p>
            </div>
            <Button
                className="bg-gradient-to-r from-cyan-700 via-blue-700 to-teal-600 text-white font-bold rounded-full px-4 sm:px-6 py-2 text-base sm:text-lg hover:from-cyan-800 hover:to-teal-700 transition-all border-0"
              onClick={() => setShowNewModal(true)}
            >
                <MessageCircle className="h-5 w-5 mr-2" />
                Ask a Question
            </Button>
            </div>
          </div>
          
          {/* Main Content Layout */}
          <div className="flex flex-col md:flex-row gap-4 md:gap-8">
            {/* Sidebar Filters */}
            <aside className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0 mb-4 md:mb-0">
              <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-gray-900/80 via-gray-950/80 to-cyan-950/40 border border-cyan-900/30 sticky md:top-28 z-20 flex flex-col gap-4 sm:gap-6">
                <h2 className="text-base sm:text-lg font-bold text-cyan-200 mb-2">Filters</h2>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                  </span>
                <Input
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-cyan-950/60 border-0 text-white placeholder-cyan-300 pl-10 pr-10 rounded-full focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all text-base py-2"
                  />
                  {searchQuery && (
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-300 hover:text-cyan-100 focus:outline-none"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
              </div>
              <div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="bg-cyan-950/60 border-0 text-cyan-100 rounded-full px-5 py-2 focus:ring-2 focus:ring-cyan-400 transition-all font-semibold text-base">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                    <SelectContent className="bg-cyan-950 text-cyan-100 border-0 rounded-xl">
                    {categories.map((category) => (
                        <SelectItem key={category.value} value={category.value} className="bg-cyan-950 text-cyan-100 rounded-lg font-semibold text-base hover:bg-cyan-900/40 focus:bg-cyan-900/60">
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            </aside>
            {/* Main Questions Section */}
            <section className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-cyan-200 mb-4 sm:mb-6">Browse Questions</h2>
          <Tabs value={tab} onValueChange={value => setTab(value as 'recent' | 'popular' | 'unanswered')} className="mb-8">
                <TabsList className="bg-cyan-950/60 border-0 rounded-full flex gap-2 px-2 py-1 mb-4 sm:mb-6">
                  <TabsTrigger value="recent">Recent</TabsTrigger>
                  <TabsTrigger value="popular">Popular</TabsTrigger>
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
                      <div className="space-y-3 sm:space-y-4">
                    {paginatedPosts.map((post) => (
                  <ForumPostCard key={post.id} post={post} formatDate={formatDate} setDeleteConfirmId={setDeleteConfirmId} deleting={deleting} setEditModal={setEditModal} />
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
                          <span className="text-base sm:text-lg font-semibold text-white">
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
            </section>
          </div>
        </div>
      </main>
      <Footer />
      {/* Delete confirmation modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-8 flex flex-col items-center animate-fade-in-up">
            <h3 className="text-xl font-bold mb-4 text-white">Delete Question</h3>
            <p className="mb-6 text-white/80 text-center">Are you sure you want to delete this question?</p>
            <div className="flex gap-4 w-full justify-center">
              <Button
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded-lg shadow"
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await deletePost(deleteConfirmId);
                    setDeleteConfirmId(null);
                    fetchPosts();
                  } catch (e) {
                    alert('Failed to delete post.');
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
              <Button
                variant="outline"
                className="px-6 py-2 rounded-lg"
                onClick={() => setDeleteConfirmId(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Question Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative bg-gradient-to-br from-gray-900/90 via-cyan-950/80 to-gray-800/90 border border-gray-700 rounded-2xl shadow-2xl max-w-lg w-full mx-4 animate-fade-in-up font-display">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-800 rounded-full p-2 transition-colors z-10"
              onClick={() => setEditModal(null)}
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
            <form
              className="flex flex-col gap-4 p-6"
              onSubmit={async (e) => {
                e.preventDefault();
                setEditError(null);
                setEditLoading(true);
                try {
                  await updatePost({
                    id: editModal.id,
                    title: editModal.title,
                    content: editModal.description,
                    categoryId: editModal.category,
                    solved: editModal.solved,
                  });
                  setEditModal(null);
                  fetchPosts();
                } catch (err) {
                  setEditError('Failed to update your question. Please try again.');
                } finally {
                  setEditLoading(false);
                }
              }}
            >
              <h2 className="text-2xl font-extrabold mb-2 text-center text-cyan-200 tracking-tight drop-shadow-lg">Edit Question</h2>
              <div>
                <label className="block mb-2 font-semibold text-white/90" htmlFor="edit-title">Title</label>
                <Input
                  id="edit-title"
                  value={editModal.title}
                  onChange={e => setEditModal({ ...editModal, title: e.target.value })}
                  className="bg-gray-800/80 border border-cyan-700 text-white placeholder-gray-400 text-base rounded-xl px-4 py-2 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 font-semibold text-white/90" htmlFor="edit-description">Description</label>
                <Textarea
                  id="edit-description"
                  value={editModal.description}
                  onChange={e => setEditModal({ ...editModal, description: e.target.value })}
                  className="bg-gray-800/80 border border-cyan-700 text-white placeholder-gray-400 text-base rounded-xl px-4 py-2 min-h-[70px] focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 font-semibold text-white/90" htmlFor="edit-category">Category</label>
                <Select value={editModal.category} onValueChange={val => setEditModal({ ...editModal, category: val })} required>
                  <SelectTrigger className="bg-gray-800/80 border border-cyan-500 text-white text-base rounded-xl px-4 py-2 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 text-white border border-cyan-500 rounded-xl shadow-xl">
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value} className="bg-gray-900 text-white rounded-lg font-semibold text-base hover:bg-cyan-900/40 focus:bg-cyan-900/60">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-white font-semibold text-base">Status:</span>
                <button
                  type="button"
                  className={`flex items-center justify-center w-8 h-8 rounded-full border border-cyan-500 bg-cyan-700/20 hover:bg-cyan-600/60 transition-colors shadow focus:outline-none focus:ring-2 focus:ring-cyan-400 ${editModal.solved ? 'ring-2 ring-green-400' : ''}`}
                  title={`Mark as ${editModal.solved ? 'Unsolved' : 'Solved'}`}
                  onClick={() => setEditModal({ ...editModal, solved: !editModal.solved })}
                >
                  {editModal.solved ? <X className="h-5 w-5 text-white" /> : <Check className="h-5 w-5 text-white" />}
                  <span className="sr-only">Mark as {editModal.solved ? 'Unsolved' : 'Solved'}</span>
                </button>
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold shadow ${editModal.solved ? 'bg-green-400/90 text-white border-green-200' : 'bg-yellow-400/90 text-white border-yellow-200 animate-pulse'}`}>
                  {editModal.solved ? 'Solved' : 'Unsolved'}
                </span>
              </div>
              {editError && <div className="text-destructive text-base text-center mt-2">{editError}</div>}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-cyan-600 via-cyan-500 to-cyan-400 hover:from-cyan-700 hover:to-cyan-500 text-white font-extrabold shadow-lg rounded-xl px-6 py-2 text-lg flex items-center gap-2 transition-all duration-150 active:scale-95 mt-2"
                disabled={editLoading}
              >
                {editLoading ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : 'Save Changes'}
              </Button>
            </form>
          </div>
        </div>
      )}
      {showNewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-2 sm:px-0"
          style={{ background: 'rgba(16,22,34,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowNewModal(false)}
        >
          <div
            className="relative bg-gradient-to-br from-gray-900/90 via-cyan-950/80 to-gray-800/90 border border-cyan-700/40 rounded-2xl w-full max-w-lg mx-2 sm:mx-4 animate-fade-in-up font-display shadow-xl px-2 py-2 sm:px-6 sm:py-6"
            style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.25)' }}
            onClick={e => e.stopPropagation()}
            tabIndex={-1}
          >
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-white bg-gray-800 rounded-full p-3 sm:p-2 transition-colors z-10 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              onClick={() => setShowNewModal(false)}
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
            <form
              className="flex flex-col gap-3 sm:gap-4 p-2 sm:p-6"
              onSubmit={async (e) => {
                e.preventDefault();
                setNewError(null);
                setNewLoading(true);
                if (!user?.id) {
                  setNewError('You must be logged in to post a question.');
                  setNewLoading(false);
                  return;
                }
                try {
                  await addPost({
                    title: newTitle,
                    content: newDescription,
                    categoryId: newCategory,
                    authorId: user.id,
                  });
                  setShowNewModal(false);
                  setNewTitle('');
                  setNewDescription('');
                  setNewCategory('');
                  fetchPosts();
                } catch (err) {
                  setNewError('Failed to post your question. Please try again.');
                } finally {
                  setNewLoading(false);
                }
              }}
            >
              <h2 className="text-xl sm:text-2xl font-extrabold mb-2 text-center bg-gradient-to-r from-cyan-300 via-blue-400 to-teal-300 bg-clip-text text-transparent tracking-tight">Ask a Question</h2>
              <div>
                <label className="block mb-2 font-semibold text-white/90" htmlFor="new-title">Title</label>
                <Input
                  id="new-title"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="bg-gray-800/80 border border-cyan-500 text-white placeholder-gray-400 text-base rounded-xl px-3 py-2 sm:px-4 sm:py-2 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                  placeholder="Enter a clear, concise title"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 font-semibold text-white/90" htmlFor="new-description">Description</label>
                <Textarea
                  id="new-description"
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  className="bg-gray-800/80 border border-cyan-500 text-white placeholder-gray-400 text-base rounded-xl px-3 py-2 sm:px-4 sm:py-2 min-h-[70px] focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                  placeholder="Describe your question..."
                  required
                />
              </div>
              <div>
                <label className="block mb-2 font-semibold text-white/90" htmlFor="new-category">Category</label>
                <Select value={newCategory} onValueChange={setNewCategory} required>
                  <SelectTrigger className="bg-gray-800 border-cyan-500 text-white text-base rounded-xl px-3 py-2 sm:px-4 sm:py-2 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 text-white border border-cyan-500 rounded-xl shadow-xl">
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value} className="bg-gray-900 text-white rounded-lg font-semibold text-base hover:bg-cyan-900/40 focus:bg-cyan-900/60">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {newError && <div className="text-destructive text-sm text-center">{newError}</div>}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-cyan-600 via-cyan-500 to-cyan-400 hover:from-cyan-700 hover:to-cyan-500 text-white font-extrabold rounded-xl px-4 py-2 sm:px-6 sm:py-2 text-base sm:text-lg flex items-center gap-2 transition-all duration-150 active:scale-95 mt-2"
                disabled={newLoading}
              >
                {newLoading ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : 'Post Question'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface ForumPostCardProps {
  post: any;
  formatDate: (dateString: string) => string;
  setDeleteConfirmId: (id: string) => void;
  deleting: boolean;
  setEditModal: (modal: { id: string, title: string, description: string, category: string, solved: boolean } | null) => void;
}

// Helper to get initials from user metadata or username/email
function getUserInitialsFromObj(userObj: any) {
  const name = userObj?.username || userObj?.full_name || userObj?.name || userObj?.email || '';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0][0]?.toUpperCase() || '?';
  return (words[0][0] + (words[1]?.[0] || '')).toUpperCase();
}

function getAvatarGradient(role: string) {
  return role === 'teacher'
    ? 'bg-gradient-to-br from-cyan-600 via-blue-600 to-cyan-800 border-cyan-300'
    : 'bg-gradient-to-br from-blue-600 via-cyan-700 to-blue-800 border-blue-300';
}

const ForumPostCard = ({ post, formatDate, setDeleteConfirmId, deleting, setEditModal }: ForumPostCardProps) => {
  const { user } = useAuth();
  const [likes, setLikes] = useState(post.likes || []);
  const [isLiking, setIsLiking] = useState(false);
  const [solved, setSolved] = useState(post.solved);
  const [showMenu, setShowMenu] = useState(false);

  const handleLike = async () => {
    if (!user) return;
    setIsLiking(true);
    try {
      if (likes.some((like: any) => like.user_id === user.id)) {
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

  const handleDelete = () => {
    setDeleteConfirmId(post.id);
  };

  const isUnanswered = !post.comments || post.comments.length === 0;
  return (
    <Card className="w-full overflow-hidden card-hover bg-white/5 border border-cyan-900/20 text-white relative rounded-2xl transition-transform duration-200 hover:scale-[1.015] cursor-pointer group px-2 py-2 sm:px-4 sm:py-4">
      <CardHeader className="pb-2 relative">
        <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-10 w-10 border-2 shadow-lg shadow-cyan-500/20 flex-shrink-0">
              <AvatarImage src={post.author?.avatar_url || ''} />
              <AvatarFallback className={`${getAvatarGradient(post.author?.role)} text-white font-extrabold text-lg flex items-center justify-center`} style={{ letterSpacing: '-1px', textShadow: '0 2px 8px #0008' }}>
                {getUserInitialsFromObj(post.author)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <span className="text-base font-bold truncate block max-w-[120px] sm:max-w-[180px]">{post.author?.username || 'Unknown'}</span>
              <div className="text-xs text-cyan-200 capitalize truncate">{post.author?.role || 'student'}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1 sm:gap-2 min-w-0">
            {solved ? (
              <Badge className="bg-green-600/90 text-white border-green-300 flex items-center px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-full">
                <Check className="h-3 w-3 mr-1" />
                Solved
              </Badge>
            ) : (
              <Badge className="bg-yellow-500/90 text-white border-yellow-200 flex items-center px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-full">
                Unsolved
              </Badge>
            )}
            {isUnanswered && (
              <Badge className="bg-red-600/90 text-white border-red-200 flex items-center px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-full animate-pulse">
                Unanswered
              </Badge>
            )}
            <Badge variant="outline" className="capitalize bg-cyan-900/40 text-cyan-100 border border-cyan-700/30 px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-full break-words whitespace-normal order-2 sm:order-none">
              {post.category?.name || 'General'}
            </Badge>
            {user && post.author?.id === user.id && (
              <button
                className="ml-1 px-2 py-0.5 rounded-full bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold shadow transition-all border border-cyan-400"
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
          {/* 3-dots menu for author only - always top-right on mobile, inline on desktop */}
          {user && post.author?.id === user.id && (
            <div className="absolute right-2 top-2 sm:static sm:ml-1">
              <button
                className="p-2 rounded-full hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition"
                onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v); }}
                aria-label="More options"
              >
                <MoreVertical className="h-5 w-5 text-gray-400" />
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-2 w-32 bg-gray-900 border border-cyan-700 rounded-lg shadow-lg z-20 animate-fade-in-up">
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-cyan-600 hover:text-white rounded-t-lg transition"
                    onClick={() => { setShowMenu(false); setEditModal({ id: post.id, title: post.title, description: post.content, category: post.category?.id, solved }); }}
                  >
                    Edit
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-red-600 hover:text-white rounded-b-lg transition disabled:opacity-50"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <Link to={`/forum/${post.id}`} className="block group focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded-xl min-w-0">
          <h3 className="font-semibold text-base sm:text-lg hover:text-cyan-400 dark:hover:text-blue-400 transition-colors mb-2 group-hover:underline break-words truncate max-w-full">
            {post.title}
          </h3>
          <p className="text-cyan-100/80 text-sm line-clamp-2 break-words">
            {post.content}
          </p>
        </Link>
      </CardContent>
      <CardFooter className="border-t bg-cyan-950/40 py-3 flex flex-row-reverse sm:flex-row items-end sm:items-center justify-between text-sm gap-2 sm:gap-0">
        <span className="text-cyan-200 font-medium flex items-center gap-1 w-full sm:w-auto justify-end">
          <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 mr-1"></span>
          {formatDate(post.created_at)}
        </span>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button
            className={`flex items-center gap-1 group px-2 py-1 rounded-full transition-all duration-150 border border-transparent hover:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400 ${likes.some((like: any) => like.user_id === user.id) ? 'text-cyan-400 bg-cyan-900/30' : 'text-gray-400 hover:bg-gray-700/40'} ${isLiking ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={handleLike}
            disabled={isLiking || !user}
            aria-label={likes.some((like: any) => like.user_id === user.id) ? 'Unlike' : 'Like'}
            title={likes.some((like: any) => like.user_id === user.id) ? 'Unlike' : 'Like'}
            type="button"
          >
            <Heart className={`h-5 w-5 transition-colors ${likes.some((like: any) => like.user_id === user.id) ? 'fill-cyan-400' : 'fill-none'} group-hover:scale-110`} />
            <span className="font-semibold text-base ml-1">{likes.length}</span>
          </button>
          <span className="h-5 w-px bg-cyan-700 mx-2 rounded-full hidden sm:inline-block" />
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-cyan-900/30">
            <MessageCircle className="h-4 w-4 text-cyan-200" />
            <span className="font-semibold text-base ml-1 text-cyan-100">{post.comments?.length || 0}</span>
            <span className="text-xs text-cyan-200 ml-1">{post.comments?.length === 1 ? 'reply' : 'replies'}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ForumPage;
