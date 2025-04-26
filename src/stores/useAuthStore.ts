import { create } from 'zustand'
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

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  profile: null,
  initialized: false,
  setUser: (user) => set({ user, initialized: true }),
  setProfile: (profile) => set({ profile }),
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null, profile: null, initialized: true });
      await get().checkAuth();
    } catch (error) {
      console.error('Error in signOut:', error);
      set({ user: null, profile: null, initialized: true });
      await get().checkAuth();
    }
  },
  checkAuth: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ user: null, profile: null, initialized: true });
        return;
      }
      set({ user: session.user });
      
      // Try to get profile up to 3 times
      let profile = null;
      let attempts = 0;
      while (!profile && attempts < 3) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (data) {
          profile = data;
          break;
        }
        attempts++;
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (profile) {
        set({ profile, initialized: true });
      } else {
        console.error('Failed to load profile after multiple attempts');
        set({ profile: null, initialized: true });
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      set({ user: null, profile: null, initialized: true });
    }
  },
}));

