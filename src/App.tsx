import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthProvider } from "@/lib/auth/auth-context";

import Index from "./pages/Index";
import ConfirmEmail from "./pages/auth/ConfirmEmail";
import Dashboard from "./pages/Dashboard";
import StudentDashboard from "./pages/StudentDashboard";
import ProfessorDashboard from "./pages/ProfessorDashboard";
import CreateQuiz from "./pages/CreateQuiz";
import ShopPage from "./pages/ShopPage";
import ForumPage from "./pages/ForumPage";
import NotFound from "./pages/NotFound";
import Quizzes from './pages/Quizzes';
import QuizPage from './pages/QuizPage';
import QuizResults from './pages/QuizResults';
import EditQuiz from './pages/EditQuiz';
import { QuizWaitingRoom } from './components/quiz/QuizWaitingRoom';
import { ActiveQuiz } from './components/quiz/ActiveQuiz';
import ForumNew from './pages/ForumNew';
import ForumQuestionDetail from './pages/ForumQuestionDetail';
import DashboardAdmin from './pages/DashboardAdmin';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            
            {/* Auth Routes */}
            <Route
              path="/confirm-email"
              element={
                <ProtectedRoute>
                  <ConfirmEmail />
                </ProtectedRoute>
              }
            />

            {/* Dashboard Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requireAuth>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student-dashboard"
              element={
                <ProtectedRoute requireAuth>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/professor-dashboard"
              element={
                <ProtectedRoute requireAuth>
                  <ProfessorDashboard />
                </ProtectedRoute>
              }
            />

            {/* Quiz Management Routes */}
            <Route
              path="/create-quiz"
              element={
                <ProtectedRoute requireAuth requireProfessor>
                  <CreateQuiz />
                </ProtectedRoute>
              }
            />
            <Route
              path="/edit-quiz/:id"
              element={
                <ProtectedRoute requireAuth requireProfessor>
                  <EditQuiz />
                </ProtectedRoute>
              }
            />

            {/* General Routes */}
            <Route
              path="/shop"
              element={
                <ProtectedRoute requireAuth>
                  <ShopPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/forum"
              element={
                <ProtectedRoute requireAuth>
                  <ForumPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/forum/new"
              element={
                <ProtectedRoute requireAuth>
                  <ForumNew />
                </ProtectedRoute>
              }
            />
            <Route
              path="/forum/:id"
              element={
                <ProtectedRoute requireAuth>
                  <ForumQuestionDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/quizzes"
              element={
                <ProtectedRoute requireAuth requireProfessor>
                  <Quizzes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/quiz/:id"
              element={
                <ProtectedRoute requireAuth>
                  <QuizPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/quiz/:id/waiting-room"
              element={
                <ProtectedRoute requireAuth>
                  <QuizWaitingRoom />
                </ProtectedRoute>
              }
            />
            <Route
              path="/quiz/:id/active"
              element={
                <ProtectedRoute requireAuth>
                  <ActiveQuiz />
                </ProtectedRoute>
              }
            />
            <Route
              path="/quiz/:id/results"
              element={
                <ProtectedRoute requireAuth>
                  <QuizResults />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/dashboard_admin"
              element={
                <ProtectedRoute requireAuth>
                  <DashboardAdmin />
                </ProtectedRoute>
              }
            />

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
