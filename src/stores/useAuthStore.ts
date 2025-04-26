import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { supabase } from '@/integrations/supabase/client'
import { User } from '@supabase/supabase-js'

type Profile = {
  id: string;
  username: string;
  role: 'admin' | 'teacher' | 'student';
  points: number;
  created_at: string;
  updated_at: string;
}

type AuthState = {
  user: User | null;
  profile: Profile | null;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      initialized: false,
      setUser: (user) => set({ user, initialized: true }),
      setProfile: (profile) => set({ profile }),
      signOut: async () => {
        try {
          // Clear Supabase session
          const { error } = await supabase.auth.signOut();
          if (error) throw error;

          // Clear all storage
          localStorage.clear();
          sessionStorage.clear();

          // Reset store state
          set({ 
            user: null, 
            profile: null,
            initialized: true 
          });
        } catch (error) {
          console.error('Error in signOut:', error);
          // Still try to clear state even if Supabase logout fails
          localStorage.clear();
          sessionStorage.clear();
          set({ 
            user: null, 
            profile: null,
            initialized: true 
          });
        }
      },
      checkAuth: async () => {
        try {
          // Get current session
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session?.user) {
            set({ user: null, profile: null, initialized: true });
            return;
          }

          // Set user
          set({ user: session.user });

          // Get profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            set({ profile });
          }

          set({ initialized: true });
        } catch (error) {
          console.error('Error checking auth:', error);
          set({ user: null, profile: null, initialized: true });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        user: state.user,
        profile: state.profile,
      }),
    }
  )
);

