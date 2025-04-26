
import { create } from 'zustand'
import { supabase } from '@/integrations/supabase/client'
import { User } from '@supabase/supabase-js'

type Profile = {
  username: string;
  role: 'admin' | 'teacher' | 'student';
  points: number;
}

type AuthState = {
  user: User | null;
  profile: Profile | null;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  initialized: false,
  setUser: (user) => set({ user, initialized: true }),
  setProfile: (profile) => set({ profile }),
  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },
}))

