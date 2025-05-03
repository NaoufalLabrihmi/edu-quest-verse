import React, { useState, useEffect, useRef } from 'react';
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
import { Eye, Edit, Trash, Copy, Search, Filter, ChevronDown, Check, Loader2, Archive, Rocket } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  const [statusLoading, setStatusLoading] = useState<{ [quizId: string]: boolean }>({});
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const [sortByDropdownOpen, setSortByDropdownOpen] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchQuizzes();
  }, [user]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setParallax({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
        question_count: quiz.question_count ?? 0,
        status: String(quiz.status) as 'draft' | 'published' | 'archived'
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

  const handleChangeQuizStatus = async (quizId: string, newStatus: 'published' | 'archived') => {
    setStatusLoading((prev) => ({ ...prev, [quizId]: true }));
    setQuizzes((prev) => prev.map(q => q.id === quizId ? { ...q, status: newStatus } : q));
    setOpenDropdownId(null);
    try {
      const { error } = await supabase
        .from('quizzes')
        .update({ status: newStatus })
        .eq('id', quizId);
      if (error) throw error;
      toast({
        title: `Quiz status updated!`,
        description: `Quiz is now ${newStatus}.`,
      });
    } catch (error) {
      setQuizzes((prev) => prev.map(q => q.id === quizId ? { ...q, status: q.status === 'published' ? 'archived' : 'published' } : q));
      toast({
        title: 'Error',
        description: 'Failed to update quiz status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setStatusLoading((prev) => ({ ...prev, [quizId]: false }));
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    }
    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  const statusOptions = [
    { value: 'published', label: 'Published', color: 'bg-green-500' },
    { value: 'archived', label: 'Archived', color: 'bg-gray-400' },
  ];

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
  const quizzesPerPage = 6;
  const totalPages = Math.ceil(filteredQuizzes.length / quizzesPerPage);
  const paginatedQuizzes = filteredQuizzes.slice((page - 1) * quizzesPerPage, page * quizzesPerPage);

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

  const PopoverMenu = ({ quiz, statusOptions, handleChangeQuizStatus, setOpenDropdownId, statusLoading }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const firstItemRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
      firstItemRef.current?.focus();
    }, []);
    const handleKeyDown = (e, idx) => {
      if (e.key === 'Escape') setOpenDropdownId(null);
      if (e.key === 'Tab') setOpenDropdownId(null);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = menuRef.current?.querySelectorAll('button')[idx + 1];
        if (next) (next as HTMLElement).focus();
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = menuRef.current?.querySelectorAll('button')[idx - 1];
        if (prev) (prev as HTMLElement).focus();
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        menuRef.current?.querySelectorAll('button')[idx]?.click();
      }
    };
    return (
      <div
        ref={menuRef}
        className="absolute z-50 right-1 top-2 min-w-[9rem] rounded-2xl shadow-2xl border border-cyan-400/60 bg-cyan-950/95 animate-fade-in backdrop-blur-xl transition-all duration-200 origin-top scale-100 opacity-100 focus:ring-2 focus:ring-cyan-400/40 ring-2 ring-cyan-400/30"
        tabIndex={-1}
        role="listbox"
        style={{ boxShadow: '0 8px 32px 0 rgba(0,255,255,0.25), 0 1.5px 8px 0 rgba(0,255,255,0.10)' }}
      >
        {/* Caret/arrow */}
        <div className="absolute -top-2 right-6 w-4 h-4 overflow-hidden">
          <div className="w-4 h-4 bg-cyan-950 border-t border-l border-cyan-400/60 rotate-45 mx-auto shadow-lg" style={{ boxShadow: '0 2px 8px 0 rgba(0,255,255,0.10)' }} />
        </div>
        {statusOptions.map((opt, idx) => (
          <button
            key={opt.value}
            type="button"
            ref={idx === 0 ? firstItemRef : undefined}
            className={`flex items-center w-full gap-2 px-4 py-2 rounded-xl hover:bg-cyan-800/40 focus:bg-cyan-800/40 transition-all duration-150 ${quiz.status === opt.value ? 'font-bold' : ''}`}
            onClick={() => handleChangeQuizStatus(quiz.id, opt.value)}
            onKeyDown={e => handleKeyDown(e, idx)}
            role="option"
            aria-selected={quiz.status === opt.value}
          >
            <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${opt.color}`}></span>
            <span className="capitalize font-medium text-sm">{opt.label}</span>
            {quiz.status === opt.value && <Check className="ml-auto h-4 w-4 text-green-400" />}
          </button>
        ))}
      </div>
    );
  };

  const StatusActionPill = ({ status, loading, onAction }) => {
    const [showBadge, setShowBadge] = useState(false);
    const [lastStatus, setLastStatus] = useState(status);
    const [ariaMsg, setAriaMsg] = useState('');
    useEffect(() => {
      if (status !== lastStatus) {
        setShowBadge(true);
        setAriaMsg(status === 'published' ? 'Quiz published!' : status === 'archived' ? 'Quiz archived!' : 'Quiz is draft');
        setTimeout(() => setShowBadge(false), 1500);
        setLastStatus(status);
      }
    }, [status, lastStatus]);
    let color, label, actionLabel, actionIcon, pillBg, pillGlow, actionTooltip, badgeIcon, badgeColor, borderGrad;
    if (status === 'draft') {
      color = 'bg-yellow-400';
      label = 'Draft';
      actionLabel = 'Publish';
      actionIcon = <Rocket className="h-4 w-4" />;
      pillBg = 'bg-yellow-500/10';
      pillGlow = 'shadow-yellow-400/40';
      actionTooltip = 'Publish this quiz';
      badgeIcon = <Rocket className="h-4 w-4 text-green-400" />;
      badgeColor = 'bg-green-900 text-green-300 border-green-400';
      borderGrad = 'border-2 border-transparent bg-clip-padding bg-gradient-to-r from-yellow-400/30 via-cyan-400/20 to-blue-400/30';
    } else if (status === 'published') {
      color = 'bg-green-400';
      label = 'Published';
      actionLabel = 'Archive';
      actionIcon = <Archive className="h-4 w-4" />;
      pillBg = 'bg-green-500/10';
      pillGlow = 'shadow-green-400/40';
      actionTooltip = 'Archive this quiz';
      badgeIcon = <Check className="h-4 w-4 text-green-400" />;
      badgeColor = 'bg-green-900 text-green-300 border-green-400';
      borderGrad = 'border-2 border-transparent bg-clip-padding bg-gradient-to-r from-green-400/30 via-cyan-400/20 to-blue-400/30';
    } else {
      color = 'bg-gray-400';
      label = 'Archived';
      actionLabel = 'Publish';
      actionIcon = <Rocket className="h-4 w-4" />;
      pillBg = 'bg-gray-500/10';
      pillGlow = 'shadow-gray-400/40';
      actionTooltip = 'Publish this quiz';
      badgeIcon = <Archive className="h-4 w-4 text-gray-300" />;
      badgeColor = 'bg-gray-900 text-gray-200 border-gray-400';
      borderGrad = 'border-2 border-transparent bg-clip-padding bg-gradient-to-r from-gray-400/30 via-cyan-400/20 to-blue-400/30';
    }
    return (
      <div className="relative flex items-center">
        {/* Floating badge */}
        <div
          className={`absolute left-1/2 -top-8 -translate-x-1/2 z-10 transition-all duration-500 ${showBadge ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
          aria-live="polite"
        >
          <div className={`flex items-center gap-2 px-4 py-1 rounded-full border ${badgeColor} shadow-lg animate-fade-in`}>
            {badgeIcon}
            <span className="font-bold text-sm tracking-wide">
              {status === 'published' ? 'Published!' : status === 'archived' ? 'Archived!' : 'Draft'}
            </span>
          </div>
        </div>
        {/* Status pill */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full ${pillBg} ${pillGlow} ${borderGrad} backdrop-blur-md shadow-lg transition-all duration-300 group animate-fade-in focus-within:ring-2 focus-within:ring-cyan-400/40
                  hover:scale-105 hover:shadow-2xl hover:border-cyan-400/60 active:scale-95`}
                style={{ minWidth: 120 }}
                tabIndex={0}
              >
                <span className={`inline-block w-2.5 h-2.5 rounded-full mr-1 transition-colors duration-300 ${color}`}></span>
                <span className="capitalize font-semibold text-sm tracking-wide mr-2 transition-colors duration-300">{label}</span>
                <button
                  onClick={onAction}
                  disabled={loading}
                  className={`ml-2 px-3 py-1 rounded-full font-bold flex items-center gap-1 transition-all duration-200 focus:ring-2 focus:ring-cyan-400/40
                    ${status === 'published' ? 'bg-gray-800 text-gray-200 border border-gray-500 hover:bg-gray-700' : 'bg-gradient-to-r from-green-500 via-cyan-500 to-blue-500 text-white shadow-lg hover:from-blue-500 hover:to-green-500 border-0'}
                    ${loading ? 'opacity-60 pointer-events-none' : 'group-hover:scale-110 group-hover:shadow-xl'}
                    group-active:scale-95`}
                  style={{ minWidth: 80 }}
                  tabIndex={0}
                  aria-label={actionTooltip}
                >
                  {loading ? <Loader2 className="animate-spin h-4 w-4 mr-1 text-cyan-300 animate-pulse" /> : actionIcon}
                  <span className="text-xs font-bold">{actionLabel}</span>
                </button>
                {/* ARIA live region for screen readers */}
                <span className="sr-only" aria-live="polite">{ariaMsg}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-cyan-900/90 border-cyan-700/60 text-cyan-100 shadow-xl rounded-lg px-3 py-2 text-sm">
              {actionTooltip}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-800 text-white dark">
      <Navigation />
      <main className="flex-grow py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="fixed inset-0 w-screen h-screen min-h-screen z-0 pointer-events-none overflow-hidden">
            {/* Animated blobs with parallax */}
            <svg width="100%" height="100%" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              <circle cx={400 + parallax.x * 60} cy={400 + parallax.y * 40} r="300" fill="url(#grad1)" className="animate-blob1 blur-3xl opacity-60" />
              <circle cx={1600 + parallax.x * -80} cy={300 + parallax.y * 60} r="250" fill="url(#grad2)" className="animate-blob2 blur-3xl opacity-50" />
              <circle cx={1000 + parallax.x * 40} cy={800 + parallax.y * -50} r="220" fill="url(#grad3)" className="animate-blob3 blur-2xl opacity-40" />
              <circle cx={800 + parallax.x * 30} cy={200 + parallax.y * 20} r="120" fill="url(#grad4)" className="animate-blob2 blur-2xl opacity-30" />
              <circle cx={1500 + parallax.x * -30} cy={900 + parallax.y * 30} r="180" fill="url(#grad5)" className="animate-blob1 blur-2xl opacity-25" />
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
                <radialGradient id="grad4" cx="0.5" cy="0.5" r="0.5" fx="0.5" fy="0.5">
                  <stop stopColor="#f472b6" />
                  <stop offset="1" stopColor="#a21caf" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="grad5" cx="0.5" cy="0.5" r="0.5" fx="0.5" fy="0.5">
                  <stop stopColor="#facc15" />
                  <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
                </radialGradient>
              </defs>
            </svg>
            {/* Animated grid overlay */}
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
              `}</style>
            </svg>
            <style>{`
              @keyframes blob1 { 0%,100%{transform:translate(0,0) scale(1);} 33%{transform:translate(80px,40px) scale(1.1);} 66%{transform:translate(-60px,-30px) scale(0.95);} }
              @keyframes blob2 { 0%,100%{transform:translate(0,0) scale(1);} 33%{transform:translate(-100px,60px) scale(1.05);} 66%{transform:translate(120px,-40px) scale(0.9);} }
              @keyframes blob3 { 0%,100%{transform:translate(0,0) scale(1);} 33%{transform:translate(60px,-80px) scale(1.08);} 66%{transform:translate(-90px,50px) scale(0.92);} }
              .animate-blob1{animation:blob1 18s ease-in-out infinite;}
              .animate-blob2{animation:blob2 22s ease-in-out infinite;}
              .animate-blob3{animation:blob3 20s ease-in-out infinite;}
            `}</style>
          </div>
          <div className="relative z-10">
            <div className="relative mb-10 flex flex-col items-center justify-center">
              <div className="relative w-full max-w-3xl mx-auto rounded-3xl p-8 bg-gradient-to-br from-cyan-900/80 to-blue-950/80 border-2 border-transparent bg-clip-padding shadow-2xl overflow-hidden animate-fade-in">
                {/* Animated gradient border */}
                <div className="absolute inset-0 rounded-3xl pointer-events-none border-4 border-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 opacity-40 animate-gradient-x" style={{ zIndex: 1 }} />
                {/* Floating Rocket icon */}
                <Rocket className="absolute -top-6 -right-6 w-20 h-20 text-cyan-400/30 drop-shadow-xl animate-float" style={{ zIndex: 2 }} />
                <div className="relative z-10 flex flex-col items-center text-center">
                  <h1 className="text-5xl font-extrabold mb-2 bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 text-transparent bg-clip-text drop-shadow-lg animate-fade-in">Your Quizzes</h1>
                  <p className="text-lg text-cyan-200 mb-6 animate-fade-in">Create, manage, and launch interactive quizzes for your students.</p>
                  <Button
                    onClick={() => navigate('/create-quiz')}
                    className="mt-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold px-8 py-3 rounded-full shadow-lg hover:from-blue-500 hover:to-cyan-500 text-lg animate-pulse focus:ring-2 focus:ring-cyan-400/40"
                  >
                    <Rocket className="h-5 w-5 mr-2 -mt-1" />
                    Create Quiz
                  </Button>
                </div>
              </div>
          </div>

          {/* Filters and Search */}
            <div className="glass-card mb-8 p-6 rounded-2xl shadow-2xl border border-cyan-700/40 bg-gradient-to-br from-gray-800/80 to-gray-900/80 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
              {/* Search with floating label */}
              <div className="relative flex-1 min-w-[200px]">
                <input
                  id="quiz-search"
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="peer w-full px-4 pt-6 pb-2 rounded-lg bg-cyan-950/60 border border-cyan-700/40 text-white placeholder-transparent shadow focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition-all"
                  placeholder="Search quizzes..."
                />
                <label htmlFor="quiz-search" className="absolute left-4 top-2 text-cyan-300 text-sm pointer-events-none transition-all duration-200 peer-focus:top-1 peer-focus:text-xs peer-focus:text-cyan-400 peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-placeholder-shown:text-cyan-300">
                  Search quizzes...
                </label>
              </div>
              {/* Status segmented control */}
              <div className="flex items-center gap-2 bg-cyan-950/60 rounded-full px-2 py-1 border border-cyan-700/40 shadow-inner relative">
                {['all', 'draft', 'published', 'archived'].map((status, idx) => {
                  const statusMap = {
                    all: { label: 'All', color: 'bg-cyan-400' },
                    draft: { label: 'Draft', color: 'bg-yellow-400' },
                    published: { label: 'Published', color: 'bg-green-400' },
                    archived: { label: 'Archived', color: 'bg-gray-400' },
                  };
                  const active = statusFilter === status;
                  return (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`flex items-center gap-1 px-4 py-1.5 rounded-full font-semibold text-sm transition-all duration-200 relative z-10
                        ${active ? 'text-cyan-100' : 'text-cyan-400 hover:text-cyan-200'} focus:outline-none focus:ring-2 focus:ring-cyan-400/40`}
                      style={{ minWidth: 80 }}
                    >
                      <span className={`inline-block w-2 h-2 rounded-full mr-1 ${statusMap[status].color}`}></span>
                      {statusMap[status].label}
                      {active && (
                        <span className="absolute inset-0 rounded-full bg-cyan-400/10 border border-cyan-400/30 shadow-lg -z-10 animate-fade-in"></span>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Sort dropdown */}
              <div className="relative min-w-[160px]">
                <button
                  onClick={() => setSortByDropdownOpen(v => !v)}
                  className="flex items-center gap-2 w-full px-4 py-2 rounded-lg bg-cyan-950/60 border border-cyan-700/40 text-cyan-200 shadow focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition-all"
                >
                  <Filter className="h-4 w-4" />
                  <span className="font-semibold text-sm">{sortBy === 'newest' ? 'Newest First' : sortBy === 'oldest' ? 'Oldest First' : 'Title (A-Z)'}</span>
                  <ChevronDown className="h-4 w-4 ml-auto" />
                </button>
                {sortByDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-44 rounded-xl shadow-2xl border border-cyan-700/60 bg-cyan-950/95 animate-fade-in p-1 backdrop-blur-md z-50">
                    {[
                      { value: 'newest', label: 'Newest First' },
                      { value: 'oldest', label: 'Oldest First' },
                      { value: 'title', label: 'Title (A-Z)' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setSortBy(opt.value); setSortByDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-2 rounded-lg text-cyan-100 hover:bg-cyan-800/40 focus:bg-cyan-800/40 transition-all duration-150 ${sortBy === opt.value ? 'font-bold bg-cyan-800/30' : ''}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
            </div>
              {/* Clear all button */}
              {(searchTerm || statusFilter !== 'all' || sortBy !== 'newest') && (
                <button
                  onClick={() => { setSearchTerm(''); setStatusFilter('all'); setSortBy('newest'); }}
                  className="ml-auto px-4 py-2 rounded-lg bg-cyan-900/60 text-cyan-300 border border-cyan-700/40 hover:bg-cyan-800/80 transition-all text-sm font-semibold shadow"
                >
                  Clear all
                </button>
              )}
          </div>

          {/* Quizzes Grid */}
          <div id="quiz-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
                  <p className="mt-4 text-cyan-400">Loading quizzes...</p>
              </div>
            ) : filteredQuizzes.length === 0 ? (
              <div className="col-span-full text-center py-8">
                  <p className="text-cyan-400">No quizzes found. Create your first quiz!</p>
                <Button
                  onClick={() => navigate('/create-quiz')}
                    className="mt-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold shadow-lg hover:from-blue-500 hover:to-cyan-500"
                >
                  Create Quiz
                </Button>
              </div>
            ) : (
              paginatedQuizzes.map((quiz) => (
                  <Card key={quiz.id} className="overflow-hidden bg-gray-900 border border-cyan-800/60">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl font-bold text-white">{quiz.title}</CardTitle>
                          <CardDescription className="text-cyan-300 mt-1">
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
                              className="h-6 w-6 text-cyan-400 hover:text-white"
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
                    <CardFooter className="flex justify-end items-center space-x-2">
                      <StatusActionPill
                        status={quiz.status}
                        loading={!!statusLoading[quiz.id]}
                        onAction={() => {
                          if (quiz.status === 'draft' || quiz.status === 'archived') handleChangeQuizStatus(quiz.id, 'published');
                          else if (quiz.status === 'published') handleChangeQuizStatus(quiz.id, 'archived');
                        }}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-cyan-300 border-cyan-500 hover:bg-cyan-900"
                        onClick={() => navigate(`/quiz/${quiz.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    <Button
                      variant="outline"
                      size="icon"
                        className="text-cyan-300 border-cyan-500 hover:bg-cyan-900"
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
          {totalPages > 1 && (
            <div className="flex flex-wrap justify-center items-center gap-2 mt-10 mb-4">
              <button
                onClick={() => { if (page > 1) { setPage(page - 1); document.getElementById('quiz-grid')?.scrollIntoView({ behavior: 'smooth' }); } }}
                disabled={page === 1}
                className={`px-4 py-2 rounded-full bg-cyan-900/60 border border-cyan-700/40 text-cyan-300 font-bold shadow transition-all duration-200 flex items-center gap-1 focus:ring-2 focus:ring-cyan-400/40 ${page === 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-cyan-800/80 hover:text-cyan-100'}`}
                aria-label="Previous page"
              >
                <ChevronDown className="rotate-90 h-4 w-4" /> Prev
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setPage(i + 1); document.getElementById('quiz-grid')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className={`relative px-5 py-2 rounded-full font-bold text-base transition-all duration-200 focus:ring-2 focus:ring-cyan-400/40
                    ${page === i + 1 ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg scale-105' : 'bg-cyan-900/60 text-cyan-300 border border-cyan-700/40 hover:bg-cyan-800/80 hover:text-cyan-100'}`}
                  aria-current={page === i + 1 ? 'page' : undefined}
                >
                  {i + 1}
                  {page === i + 1 && (
                    <span className="absolute inset-0 rounded-full border-2 border-cyan-400/60 animate-fade-in pointer-events-none"></span>
                  )}
                </button>
              ))}
              <button
                onClick={() => { if (page < totalPages) { setPage(page + 1); document.getElementById('quiz-grid')?.scrollIntoView({ behavior: 'smooth' }); } }}
                disabled={page === totalPages}
                className={`px-4 py-2 rounded-full bg-cyan-900/60 border border-cyan-700/40 text-cyan-300 font-bold shadow transition-all duration-200 flex items-center gap-1 focus:ring-2 focus:ring-cyan-400/40 ${page === totalPages ? 'opacity-40 cursor-not-allowed' : 'hover:bg-cyan-800/80 hover:text-cyan-100'}`}
                aria-label="Next page"
              >
                Next <ChevronDown className="-rotate-90 h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Quizzes; 