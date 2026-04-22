import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

import type { AppRole } from '@/constants/roles';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  organization?: string;
  role: AppRole;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resendConfirmationEmail: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileCache, setProfileCache] = useState<Map<string, Profile>>(new Map());

  const fetchProfile = async (userId: string, forceRefresh = false) => {
    // Check cache first to avoid redundant fetches
    if (!forceRefresh) {
      const cached = profileCache.get(userId);
      if (cached) {
        setProfile(cached);
        return;
      }
    }

    try {
      // Retry helper for transient PostgREST schema cache errors (PGRST002)
      const withSchemaRetry = async <T,>(fn: () => Promise<{ data: T; error: any }>) => {
        const delays = [500, 1000, 2000];
        let lastResult: { data: T; error: any } | null = null;
        for (let i = 0; i <= delays.length; i++) {
          lastResult = await fn();
          if (!lastResult.error || lastResult.error.code !== 'PGRST002') {
            return lastResult;
          }
          if (i < delays.length) {
            await new Promise((r) => setTimeout(r, delays[i]));
          }
        }
        return lastResult!;
      };

      // Fetch profile (with silent retry on PGRST002)
      const { data: profileData, error: profileError } = await withSchemaRetry(() =>
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle() as any
      );

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
        setProfile(null);
        return;
      }

      // Fetch all roles from user_roles (with silent retry on PGRST002)
      const { data: rolesData, error: rolesError } = await withSchemaRetry(() =>
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId) as any
      );

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      }

      // Determine highest role based on hierarchy
      const { getHighestRole } = await import('@/constants/roles');
      let highestRole: AppRole = 'user';
      
      if (rolesData && rolesData.length > 0) {
        const roles = rolesData.map(r => r.role as string);
        highestRole = getHighestRole(roles);
      }

      // Combine profile with role
      if (profileData) {
        const fullProfile = {
          ...profileData,
          role: highestRole
        };
        setProfile(fullProfile);
        // Cache for 5 minutes
        setProfileCache(prev => new Map(prev).set(userId, fullProfile));
        setTimeout(() => {
          setProfileCache(prev => {
            const newCache = new Map(prev);
            newCache.delete(userId);
            return newCache;
          });
        }, 5 * 60 * 1000);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    }
  };

  const cleanupAuthState = () => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
  };

  const signOut = async () => {
    try {
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Ignore errors
      }
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      // Clear cache and force refresh
      setProfileCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(user.id);
        return newCache;
      });
      await fetchProfile(user.id, true);
    }
  };

  const resendConfirmationEmail = async (): Promise<boolean> => {
    if (!user?.email) return false;
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });
      
      if (error) {
        console.error('Error resending confirmation email:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error resending confirmation email:', error);
      return false;
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile fetching to prevent deadlocks
          setTimeout(() => {
            if (isMounted) fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setProfileCache(new Map());
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session (only set loading=false, no duplicate fetch)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      // Only initialize if onAuthStateChange hasn't fired yet
      if (loading) {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            if (isMounted) fetchProfile(session.user.id);
          }, 0);
        }
        
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      setProfileCache(new Map());
    };
  }, []);

  const value = {
    user,
    session,
    profile,
    loading,
    signOut,
    refreshProfile,
    resendConfirmationEmail,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};