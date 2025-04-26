import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider } from "@/components/AuthProvider";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CreateQuiz from "./pages/CreateQuiz";
import ShopPage from "./pages/ShopPage";
import ForumPage from "./pages/ForumPage";
import NotFound from "./pages/NotFound";
import ConfirmEmail from "./pages/auth/ConfirmEmail";

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
            
            {/* Auth Routes - Only for non-authenticated users */}
            <Route
              path="/login"
              element={
                <ProtectedRoute requireUnauth>
                  <Login />
                </ProtectedRoute>
              }
            />
            <Route
              path="/register"
              element={
                <ProtectedRoute requireUnauth>
                  <Register />
                </ProtectedRoute>
              }
            />
            <Route
              path="/auth/confirm-email"
              element={
                <ProtectedRoute requireUnauth>
                  <ConfirmEmail />
                </ProtectedRoute>
              }
            />

            {/* Protected Routes - Only for authenticated users */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requireAuth>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-quiz"
              element={
                <ProtectedRoute requireAuth>
                  <CreateQuiz />
                </ProtectedRoute>
              }
            />
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

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
