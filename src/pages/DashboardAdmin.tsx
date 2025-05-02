import React, { useState, useEffect } from 'react';
import { Users, Package, BarChart2, Layers, GraduationCap, BookOpen, User2, Edit2, Trash2, ChevronDown, Loader2, Coins, ListChecks, Menu, X } from 'lucide-react';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ProductTable from '@/components/admin/ProductTable';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/lib/auth/auth-context';
import { useNavigate } from 'react-router-dom';
import PurchaseTable from '@/components/admin/PurchaseTable';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Chart.js options for the user growth line chart
const userGrowthOptions = {
  responsive: true,
  plugins: {
    legend: {
      display: true,
      labels: { color: '#c7d2fe', font: { size: 13 } },
    },
    tooltip: { enabled: true },
  },
  elements: {
    point: { radius: 3 },
    line: { borderWidth: 2 },
  },
  scales: {
    x: {
      ticks: { color: '#c7d2fe', font: { size: 11 } },
      grid: { color: 'rgba(100,116,139,0.08)' },
    },
    y: {
      ticks: { color: '#c7d2fe', font: { size: 11 } },
      grid: { color: 'rgba(100,116,139,0.08)' },
    },
  },
};

const navItems = [
  { key: 'stats', label: 'Statistics', icon: <BarChart2 className="w-4 h-4 mr-2" /> },
  { key: 'users', label: 'Users', icon: <Users className="w-4 h-4 mr-2" /> },
  { key: 'products', label: 'Products', icon: <Package className="w-4 h-4 mr-2" /> },
  { key: 'categories', label: 'Forum Categories', icon: <Layers className="w-4 h-4 mr-2" /> },
  { key: 'purchases', label: 'Purchases', icon: <Package className="w-4 h-4 mr-2" /> },
];

const glass =
  'bg-gray-900/70 backdrop-blur-2xl border border-gray-800 shadow-lg rounded-xl';

const DashboardAdmin = () => {
  const [active, setActive] = useState('stats');
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(6);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshUsers, setRefreshUsers] = useState(0);
  const [deletingId, setDeletingId] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [studentGrowth, setStudentGrowth] = useState([]);
  const [teacherGrowth, setTeacherGrowth] = useState([]);
  const [productActivity, setProductActivity] = useState([]);
  const [forumActivity, setForumActivity] = useState([]);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [purchasesPerMonth, setPurchasesPerMonth] = useState([]);
  const [pointsAwardedPerMonth, setPointsAwardedPerMonth] = useState([]);
  const [pointsSpentPerMonth, setPointsSpentPerMonth] = useState([]);
  const [adminNavOpen, setAdminNavOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleDeleteUser = async (userId) => {
    setDeletingId(userId);
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    setDeletingId(null);
    setRefreshUsers((r) => r + 1);
  };

  const openEditModal = (user) => {
    setEditUser(user);
    setEditUsername(user.username);
    setEditError('');
    setEditSuccess('');
  };

  const closeEditModal = () => {
    setEditUser(null);
    setEditUsername('');
    setEditError('');
    setEditSuccess('');
  };

  const handleEditSave = async () => {
    setEditLoading(true);
    setEditError('');
    setEditSuccess('');
    // Validate
    if (editUsername.trim().length < 3) {
      setEditError('Username must be at least 3 characters.');
      setEditLoading(false);
      return;
    }
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: editUsername })
        .eq('id', editUser.id);
      setEditLoading(false);
      if (error) {
        setEditError(error.message || 'Update failed.');
        console.error('Update error:', error);
      } else {
        setEditSuccess('User updated successfully!');
        setRefreshUsers((r) => r + 1);
        setTimeout(closeEditModal, 1200);
      }
    } catch (err) {
      setEditLoading(false);
      setEditError('Unexpected error updating user.');
      console.error('Unexpected update error:', err);
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  useEffect(() => {
    if (active !== 'users') return;
    setLoadingUsers(true);
    let query = supabase
      .from('profiles')
      .select('id, username, role', { count: 'exact' })
      .in('role', ['student', 'teacher']);
    if (roleFilter !== 'all') {
      query = query.eq('role', roleFilter);
    }
    if (search.trim() !== '') {
      query = query.ilike('username', `%${search.trim()}%`);
    }
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
    query.then(({ data, error, count }) => {
      if (error) {
        setUsers([]);
      } else {
        setUsers(data || []);
      }
      setTotalCount(count || 0);
      setLoadingUsers(false);
    });
  }, [active, search, roleFilter, page, pageSize, refreshUsers]);

  useEffect(() => {
    async function fetchStats() {
      setStatsLoading(true);
      const { data, error } = await supabase.rpc('dashboard_admin_stats');
      if (!error && data) setStats(data);
      setStatsLoading(false);
    }
    fetchStats();
  }, []);

  useEffect(() => {
    async function fetchCharts() {
      setChartsLoading(true);
      const [studentRes, teacherRes, productRes, forumRes, purchasesRes, pointsAwardedRes, pointsSpentRes] = await Promise.all([
        supabase.rpc('student_growth_per_month'),
        supabase.rpc('teacher_growth_per_month'),
        supabase.rpc('product_activity_per_month'),
        supabase.rpc('forum_activity_per_month'),
        supabase.rpc('purchases_per_month'),
        supabase.rpc('points_awarded_per_month'),
        supabase.rpc('points_spent_per_month'),
      ]);
      setStudentGrowth(studentRes.data || []);
      setTeacherGrowth(teacherRes.data || []);
      setProductActivity(productRes.data || []);
      setForumActivity(forumRes.data || []);
      setPurchasesPerMonth(purchasesRes.data || []);
      setPointsAwardedPerMonth(pointsAwardedRes.data || []);
      setPointsSpentPerMonth(pointsSpentRes.data || []);
      setChartsLoading(false);
    }
    fetchCharts();
  }, []);

  // Prepare chart data
  const months = Array.from(new Set([
    ...studentGrowth.map(d => d.month),
    ...teacherGrowth.map(d => d.month),
    ...productActivity.map(d => d.month),
    ...forumActivity.map(d => d.month),
    ...purchasesPerMonth.map(d => d.month),
    ...pointsAwardedPerMonth.map(d => d.month),
    ...pointsSpentPerMonth.map(d => d.month),
  ])).sort();

  const studentGrowthData = {
    labels: months,
    datasets: [
      {
        label: 'Student Growth',
        data: months.map(m => studentGrowth.find(d => d.month === m)?.count || 0),
        borderColor: '#60a5fa',
        backgroundColor: 'rgba(96,165,250,0.12)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#60a5fa',
        pointBorderColor: '#fff',
      },
    ],
  };
  const teacherGrowthData = {
    labels: months,
    datasets: [
      {
        label: 'Teacher Growth',
        data: months.map(m => teacherGrowth.find(d => d.month === m)?.count || 0),
        borderColor: '#34d399',
        backgroundColor: 'rgba(52,211,153,0.12)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#34d399',
        pointBorderColor: '#fff',
      },
    ],
  };
  const activityData = {
    labels: months,
    datasets: [
      {
        label: 'Products',
        data: months.map(m => productActivity.find(d => d.month === m)?.count || 0),
        backgroundColor: '#f472b6',
        borderRadius: 6,
        barPercentage: 0.6,
        categoryPercentage: 0.6,
      },
      {
        label: 'Forum Posts',
        data: months.map(m => forumActivity.find(d => d.month === m)?.count || 0),
        backgroundColor: '#fde68a',
        borderRadius: 6,
        barPercentage: 0.6,
        categoryPercentage: 0.6,
      },
    ],
  };

  // Forum & Products chart
  const forumProductsData = {
    labels: months,
    datasets: [
      {
        label: 'Forum Posts',
        data: months.map(m => forumActivity.find(d => d.month === m)?.count || 0),
        borderColor: '#fde68a',
        backgroundColor: 'transparent',
        tension: 0.4,
        fill: false,
        pointBackgroundColor: '#fde68a',
        pointBorderColor: '#fff',
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: 'Products',
        data: months.map(m => productActivity.find(d => d.month === m)?.count || 0),
        borderColor: '#f472b6',
        backgroundColor: 'transparent',
        tension: 0.4,
        fill: false,
        pointBackgroundColor: '#f472b6',
        pointBorderColor: '#fff',
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };
  // Purchases chart
  const purchasesData = {
    labels: months,
    datasets: [
      {
        label: 'Purchases',
        data: months.map(m => purchasesPerMonth.find(d => d.month === m)?.count || 0),
        borderColor: '#a78bfa',
        backgroundColor: '#a78bfa',
        tension: 0.4,
        fill: false,
        pointBackgroundColor: '#a78bfa',
        pointBorderColor: '#fff',
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };
  // Points Awarded & Spent chart
  const pointsData = {
    labels: months,
    datasets: [
      {
        label: 'Points Awarded',
        data: months.map(m => pointsAwardedPerMonth.find(d => d.month === m)?.total || 0),
        borderColor: '#facc15',
        backgroundColor: 'transparent',
        tension: 0.4,
        fill: false,
        pointBackgroundColor: '#facc15',
        pointBorderColor: '#fff',
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: 'Points Spent',
        data: months.map(m => pointsSpentPerMonth.find(d => d.month === m)?.total || 0),
        borderColor: '#818cf8',
        backgroundColor: 'transparent',
        tension: 0.4,
        fill: false,
        pointBackgroundColor: '#818cf8',
        pointBorderColor: '#fff',
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };

  // Pie chart for user role distribution
  const userRoleData = {
    labels: ['Students', 'Teachers'],
    datasets: [
      {
        data: [stats?.total_students || 0, stats?.total_teachers || 0],
        backgroundColor: ['#60a5fa', '#34d399'],
        borderColor: ['#1e40af', '#065f46'],
        borderWidth: 2,
      },
    ],
  };
  // Doughnut chart for points awarded vs spent
  const pointsDoughnutData = {
    labels: ['Awarded', 'Spent'],
    datasets: [
      {
        data: [stats?.total_points_awarded || 0, stats?.total_points_spent || 0],
        backgroundColor: ['#fde68a', '#818cf8'],
        borderColor: ['#facc15', '#3730a3'],
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className="flex min-h-screen relative bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white overflow-x-hidden">
      {/* Soft gradient overlay for extra depth */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-br from-purple-900/30 via-transparent to-blue-900/20" />
      {/* Floating sidebar toggle button */}
      <button
        className="fixed top-4 left-4 z-50 p-2 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg hover:scale-105 transition-transform md:hidden"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open admin sidebar"
      >
        <Menu className="w-7 h-7 text-white" />
      </button>
      {/* Sidebar Drawer */}
      <div className={`fixed inset-0 z-40 transition-all duration-300 ${sidebarOpen ? 'visible' : 'invisible pointer-events-none'}`}
        style={{ background: sidebarOpen ? 'rgba(20,20,40,0.45)' : 'transparent' }}
        onClick={() => setSidebarOpen(false)}
      >
        <aside
          className={`absolute top-0 left-0 h-full w-64 bg-gradient-to-br from-gray-950/90 via-gray-900/90 to-blue-950/90 border-r border-purple-700/40 shadow-2xl backdrop-blur-xl flex flex-col py-6 px-2 gap-2 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-8 px-2">
            <span className="inline-flex items-center gap-2">
              <span className="p-2 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600">
                <BarChart2 className="h-5 w-5 text-white" />
              </span>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Admin
              </span>
            </span>
            <button
              className="p-2 rounded-full hover:bg-gray-800/60 transition"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="w-6 h-6 text-gray-300" />
            </button>
          </div>
          <nav className="flex flex-col gap-1 flex-1">
            {navItems.map((item) => (
              <button
                key={item.key}
                className={`flex items-center px-3 py-2 rounded-lg text-base font-medium transition-all duration-150 hover:bg-purple-800/40 focus:outline-none border border-transparent w-full text-left ${
                  active === item.key ? 'bg-purple-800/70 border-purple-500 shadow' : 'bg-transparent'
                }`}
                onClick={() => { setActive(item.key); setSidebarOpen(false); }}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 mt-auto mb-4 rounded-lg text-base font-medium transition-all duration-150 hover:bg-red-900/40 focus:outline-none border border-transparent text-red-300 hover:text-red-200 hover:border-red-800/50 group"
          >
            <svg
              className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:-translate-x-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </aside>
      </div>
      {/* Desktop sidebar (hidden on mobile) */}
      <aside className={`hidden md:flex w-52 flex-col py-6 px-2 gap-2 ${glass} sticky top-0 h-screen z-30 border-r border-gray-800/80`}> 
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="inline-block p-1.5 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600">
            <BarChart2 className="h-5 w-5 text-white" />
          </span>
          <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Admin
          </span>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`flex items-center px-3 py-2 rounded-lg text-base font-medium transition-all duration-150 hover:bg-purple-800/40 focus:outline-none border border-transparent w-full text-left ${
                active === item.key ? 'bg-purple-800/70 border-purple-500 shadow' : 'bg-transparent'
              }`}
              onClick={() => setActive(item.key)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 mt-auto mb-4 rounded-lg text-base font-medium transition-all duration-150 hover:bg-red-900/40 focus:outline-none border border-transparent text-red-300 hover:text-red-200 hover:border-red-800/50 group"
        >
          <svg
            className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:-translate-x-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col py-8 px-2 md:px-8 max-w-full">
        {active === 'stats' && (
          <section>
            <h1 className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-blue-400 text-transparent bg-clip-text">
              Dashboard Statistics
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {statsLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-900/70 border border-gray-800 rounded-xl p-5 h-24 flex items-center gap-4">
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                    <div>
                      <div className="h-5 w-24 bg-gray-800 rounded mb-2" />
                      <div className="h-4 w-16 bg-gray-800 rounded" />
                    </div>
                  </div>
                ))
              ) : stats && (
                <>
                  <div className={`${glass} p-5 flex items-center gap-4 min-w-0`}>
                    <Users className="w-6 h-6 text-purple-400" />
                    <div className="truncate">
                      <div className="text-xl font-bold text-white mb-0.5 truncate">{stats.total_users}</div>
                      <div className="text-base text-gray-300 truncate">Total Users</div>
                    </div>
                  </div>
                  <div className={`${glass} p-5 flex items-center gap-4 min-w-0`}>
                    <GraduationCap className="w-6 h-6 text-blue-400" />
                    <div className="truncate">
                      <div className="text-xl font-bold text-white mb-0.5 truncate">{stats.total_students}</div>
                      <div className="text-base text-gray-300 truncate">Students</div>
                    </div>
                  </div>
                  <div className={`${glass} p-5 flex items-center gap-4 min-w-0`}>
                    <BookOpen className="w-6 h-6 text-emerald-400" />
                    <div className="truncate">
                      <div className="text-xl font-bold text-white mb-0.5 truncate">{stats.total_teachers}</div>
                      <div className="text-base text-gray-300 truncate">Teachers</div>
                    </div>
                  </div>
                  <div className={`${glass} p-5 flex items-center gap-4 min-w-0`}>
                    <Package className="w-6 h-6 text-pink-400" />
                    <div className="truncate">
                      <div className="text-xl font-bold text-white mb-0.5 truncate">{stats.total_products}</div>
                      <div className="text-base text-gray-300 truncate">Products</div>
                    </div>
                  </div>
                  <div className={`${glass} p-5 flex items-center gap-4 min-w-0`}>
                    <ListChecks className="w-6 h-6 text-purple-300" />
                    <div className="truncate">
                      <div className="text-xl font-bold text-white mb-0.5 truncate">{stats.total_purchases}</div>
                      <div className="text-base text-gray-300 truncate">Purchases</div>
                    </div>
                  </div>
                  <div className={`${glass} p-5 flex items-center gap-4 min-w-0`}>
                    <Coins className="w-6 h-6 text-yellow-300" />
                    <div className="truncate">
                      <div className="text-xl font-bold text-white mb-0.5 truncate">{stats.total_points_awarded}</div>
                      <div className="text-base text-gray-300 truncate">Points Awarded</div>
                    </div>
                  </div>
                  <div className={`${glass} p-5 flex items-center gap-4 min-w-0`}>
                    <Coins className="w-6 h-6 text-purple-400" />
                    <div className="truncate">
                      <div className="text-xl font-bold text-white mb-0.5 truncate">{stats.total_points_spent}</div>
                      <div className="text-base text-gray-300 truncate">Points Spent</div>
                    </div>
                  </div>
                  <div className={`${glass} p-5 flex items-center gap-4 min-w-0`}>
                    <Layers className="w-6 h-6 text-yellow-400" />
                  <div className="truncate">
                      <div className="text-xl font-bold text-white mb-0.5 truncate">{stats.total_forum_posts}</div>
                      <div className="text-base text-gray-300 truncate">Forum Posts</div>
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Analytics Grid */}
            <div className="my-10 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* User Growth Over Time (Line) */}
              <div className="w-full max-w-xl mx-auto p-0 rounded-2xl border border-blue-700/30 bg-gradient-to-br from-blue-950/60 via-gray-900/80 to-gray-950/90 shadow-lg backdrop-blur-xl">
                <div className="flex items-center justify-between px-6 pt-5 pb-2">
                  <h2 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-emerald-400 text-transparent bg-clip-text">User Growth Over Time</h2>
                </div>
                <div className="px-4 pb-5">
                  {chartsLoading ? (
                    <Loader2 className="h-7 w-7 animate-spin text-blue-400 my-8 mx-auto" />
                  ) : (
                    <Line
                      data={{
                        labels: months,
                        datasets: [
                          {
                            label: 'Students',
                            data: months.map(m => studentGrowth.find(d => d.month === m)?.count || 0),
                            borderColor: '#60a5fa',
                            backgroundColor: 'transparent',
                            tension: 0.4,
                            fill: false,
                            pointBackgroundColor: '#60a5fa',
                            pointBorderColor: '#fff',
                            pointRadius: 3,
                            pointHoverRadius: 5,
                          },
                          {
                            label: 'Teachers',
                            data: months.map(m => teacherGrowth.find(d => d.month === m)?.count || 0),
                            borderColor: '#34d399',
                            backgroundColor: 'transparent',
                            tension: 0.4,
                            fill: false,
                            pointBackgroundColor: '#34d399',
                            pointBorderColor: '#fff',
                            pointRadius: 3,
                            pointHoverRadius: 5,
                          },
                        ],
                      }}
                      options={{
                        ...userGrowthOptions,
                        plugins: {
                          ...userGrowthOptions.plugins,
                          legend: { display: true, labels: { color: '#c7d2fe', font: { size: 13 } } },
                          tooltip: { enabled: true },
                        },
                        elements: { ...userGrowthOptions.elements, line: { borderWidth: 2 } },
                        scales: {
                          x: { ...userGrowthOptions.scales.x, grid: { color: 'rgba(100,116,139,0.08)' }, ticks: { color: '#c7d2fe', font: { size: 11 } } },
                          y: { ...userGrowthOptions.scales.y, grid: { color: 'rgba(100,116,139,0.08)' }, ticks: { color: '#c7d2fe', font: { size: 11 } } },
                        },
                      }}
                      height={120}
                    />
                  )}
                </div>
              </div>
              {/* Forum Posts & Products (Bar) */}
              <div className="w-full max-w-xl mx-auto p-0 rounded-2xl border border-yellow-400/30 bg-gradient-to-br from-yellow-900/40 via-gray-900/80 to-gray-950/90 shadow-lg backdrop-blur-xl">
                <div className="flex items-center justify-between px-6 pt-5 pb-2">
                  <h2 className="text-lg font-bold bg-gradient-to-r from-yellow-300 to-pink-400 text-transparent bg-clip-text">Forum Posts & Products</h2>
                </div>
                <div className="px-4 pb-5">
                  {chartsLoading ? (
                    <Loader2 className="h-7 w-7 animate-spin text-yellow-400 my-8 mx-auto" />
                  ) : (
                    <Bar
                      data={{
                        labels: months,
                        datasets: [
                          {
                            label: 'Forum Posts',
                            data: months.map(m => forumActivity.find(d => d.month === m)?.count || 0),
                            backgroundColor: '#fde68a',
                            borderRadius: 6,
                            barPercentage: 0.6,
                            categoryPercentage: 0.6,
                          },
                          {
                            label: 'Products',
                            data: months.map(m => productActivity.find(d => d.month === m)?.count || 0),
                            backgroundColor: '#f472b6',
                            borderRadius: 6,
                            barPercentage: 0.6,
                            categoryPercentage: 0.6,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: { display: true, labels: { color: '#fde68a', font: { size: 13 } } },
                          tooltip: { enabled: true },
                        },
                        scales: {
                          x: { grid: { color: 'rgba(100,116,139,0.08)' }, ticks: { color: '#fde68a', font: { size: 11 } } },
                          y: { grid: { color: 'rgba(100,116,139,0.08)' }, ticks: { color: '#fde68a', font: { size: 11 } } },
                        },
                      }}
                      height={120}
                    />
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
        {active === 'users' && (
          <section>
            <h1 className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-blue-400 text-transparent bg-clip-text">
              Manage Users
            </h1>
            {/* Search bar and filter */}
            <div className="mb-4 flex flex-col sm:flex-row items-center gap-2">
              <Input
                type="text"
                placeholder="Search users..."
                className="pl-9 w-full max-w-xs bg-purple-950/50 border-purple-800/50 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-700 rounded-lg py-2 pr-2"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {/* Role filter dropdown using DropdownMenu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900/70 border border-gray-800 text-white font-medium shadow-sm hover:bg-purple-900/40 focus:outline-none focus:ring-2 focus:ring-purple-700 transition-all">
                    {roleFilter === 'all' && <Users className="w-4 h-4 text-purple-300" />}
                    {roleFilter === 'student' && <GraduationCap className="w-4 h-4 text-blue-300" />}
                    {roleFilter === 'teacher' && <BookOpen className="w-4 h-4 text-emerald-300" />}
                    <span>
                      {roleFilter === 'all' && 'All Roles'}
                      {roleFilter === 'student' && 'Student'}
                      {roleFilter === 'teacher' && 'Teacher'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-44 p-2 bg-gray-900/90 border border-gray-800 rounded-xl shadow-xl backdrop-blur-xl">
                  <DropdownMenuItem className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-purple-800/30 text-white transition-all cursor-pointer"
                    onClick={() => setRoleFilter('all')}
                  >
                    <Users className="w-4 h-4 text-purple-300" />
                    All Roles
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-purple-800/30 text-blue-200 transition-all cursor-pointer"
                    onClick={() => setRoleFilter('student')}
                  >
                    <GraduationCap className="w-4 h-4 text-blue-300" />
                    Student
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-purple-800/30 text-emerald-200 transition-all cursor-pointer"
                    onClick={() => setRoleFilter('teacher')}
                  >
                    <BookOpen className="w-4 h-4 text-emerald-300" />
                    Teacher
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* User table */}
            <div className={`${glass} p-0`}>
              <ScrollArea className="w-full max-h-[600px] rounded-xl pb-8">
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                    <span className="ml-2 text-purple-200">Loading users...</span>
                  </div>
                ) : (
                  <Table>
                    <TableCaption className="text-purple-200">All registered users. You can search, filter, edit, or delete users here.</TableCaption>
                    <TableHeader>
                      <TableRow className="sticky top-0 bg-gray-900/80 z-10">
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user, i) => (
                        <TableRow key={user.id} className="hover:bg-purple-900/20 transition-all group">
                          <TableCell className="font-mono text-xs text-gray-400">{i + 1}</TableCell>
                          <TableCell className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-700/60 to-blue-700/40">
                              {user.role === 'student' ? (
                                <GraduationCap className="w-5 h-5 text-blue-300" />
                              ) : (
                                <BookOpen className="w-5 h-5 text-emerald-300" />
                              )}
                            </span>
                            <span className="font-semibold text-white">{user.username}</span>
                          </TableCell>
                          <TableCell>
                            <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${user.role === 'student' ? 'bg-blue-800/60 text-blue-100' : 'bg-emerald-800/60 text-emerald-100'}`}>
                              {user.role === 'student' ? (
                                <GraduationCap className="w-4 h-4 text-blue-200" />
                              ) : (
                                <BookOpen className="w-4 h-4 text-emerald-200" />
                              )}
                              {user.role}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <button
                                className="p-2 rounded-full bg-gray-800/60 hover:bg-blue-700/70 transition-colors"
                                title="Edit user"
                                onClick={() => openEditModal(user)}
                              >
                                <Edit2 className="w-4 h-4 text-blue-300" />
                              </button>
                              <button
                                className="p-2 rounded-full bg-gray-800/60 hover:bg-red-700/70 transition-colors disabled:opacity-50"
                                title="Delete user"
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={deletingId === user.id}
                              >
                                <Trash2 className="w-4 h-4 text-red-300" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
              {/* Pagination controls */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 bg-gray-900/50">
                <div className="text-sm text-gray-400">
                  Showing {Math.min((page - 1) * pageSize + 1, totalCount)} to{' '}
                  {Math.min(page * pageSize, totalCount)} of {totalCount} entries
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1 || loadingUsers}
                    className="bg-gray-900/70 border-gray-800 text-gray-200 hover:bg-gray-800"
                  >
                    Previous
                  </Button>
                  {Array.from({ length: Math.min(Math.ceil(totalCount / pageSize), 5) }, (_, i) => {
                    let pageNum = i + 1;
                    if (Math.ceil(totalCount / pageSize) > 5) {
                      if (page > 3 && page < Math.ceil(totalCount / pageSize) - 2) {
                        pageNum = i === 0 ? 1 
                          : i === 1 ? page - 1
                          : i === 2 ? page
                          : i === 3 ? page + 1
                          : Math.ceil(totalCount / pageSize);
                      } else if (page >= Math.ceil(totalCount / pageSize) - 2) {
                        pageNum = Math.ceil(totalCount / pageSize) - 4 + i;
                      }
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        disabled={loadingUsers}
                        className={pageNum === page 
                          ? "bg-purple-600 hover:bg-purple-700 text-white border-none"
                          : "bg-gray-900/70 border-gray-800 text-gray-200 hover:bg-gray-800"
                        }
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === Math.ceil(totalCount / pageSize) || loadingUsers}
                    className="bg-gray-900/70 border-gray-800 text-gray-200 hover:bg-gray-800"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}
        {active === 'products' && (
          <section>
            <ProductTable />
          </section>
        )}
        {active === 'categories' && (
          <section>
            <h1 className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-blue-400 text-transparent bg-clip-text">
              Manage Forum Categories
            </h1>
            <div className={`${glass} p-5`}>
              <p className="text-gray-400 text-sm">(Forum category management table goes here.)</p>
            </div>
          </section>
        )}
        {active === 'purchases' && (
          <div className="space-y-4">
            <PurchaseTable />
          </div>
        )}
      </main>
      <Dialog open={!!editUser} onOpenChange={closeEditModal}>
        <DialogContent className="max-w-md w-full bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900 border border-purple-700 rounded-2xl shadow-2xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-purple-200 mb-2">Edit User</DialogTitle>
            <p className="text-gray-400 mb-4">Update the user's name. Only students and teachers can be edited.</p>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-purple-100">Username</span>
              <Input
                value={editUsername}
                onChange={e => setEditUsername(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:border-purple-500 focus:ring-2 focus:ring-purple-700"
                disabled={editLoading}
              />
            </label>
            {editError && <div className="text-red-400 text-sm font-medium mt-1">{editError}</div>}
            {editSuccess && <div className="text-green-400 text-sm font-medium mt-1">{editSuccess}</div>}
          </div>
          <DialogFooter className="mt-6 flex gap-2 justify-end">
            <Button variant="ghost" onClick={closeEditModal} disabled={editLoading}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={editLoading} className="bg-purple-700 hover:bg-purple-800 text-white font-semibold px-6 py-2 rounded-lg shadow">
              {editLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardAdmin; 