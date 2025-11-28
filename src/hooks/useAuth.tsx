import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  organization?: string;
  role: 'super_admin' | 'admin' | 'partner' | 'user';
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

  const fetchProfile = async (userId: string) => {
    // Check cache first to avoid redundant fetches
    const cached = profileCache.get(userId);
    if (cached) {
      setProfile(cached);
      return;
    }

    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
        setProfile(null);
        return;
      }

      // Fetch all roles from user_roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      }

      // Determine highest role based on hierarchy
      const roleHierarchy = ['super_admin', 'admin', 'partner', 'user'];
      let highestRole: 'super_admin' | 'admin' | 'partner' | 'user' = 'user';
      
      if (rolesData && rolesData.length > 0) {
        const roles = rolesData.map(r => r.role);
        for (const hierarchyRole of roleHierarchy) {
          if (roles.includes(hierarchyRole as any)) {
            highestRole = hierarchyRole as typeof highestRole;
            break;
          }
        }
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

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile fetching to prevent deadlocks
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    user,
    session,
    profile,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  // Allow usage outside provider for navigation component
  return context || {
    user: null,
    session: null,
    profile: null,
    loading: false,
    signOut: async () => {},
  };
};