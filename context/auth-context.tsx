'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { Profile, UserRole } from '@/types/database';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    pass: string,
    fullName: string,
    role: 'citizen' | 'driver',
    phone?: string,
    areaId?: string
  ) => Promise<{ error: Error | null }>;
  loginAsDemoRole: (targetRole: UserRole) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USERS: Record<UserRole, { user: User; profile: Profile }> = {
  citizen: {
    user: {
      id: 'b1111111-1111-1111-1111-111111111111',
      email: 'citizen@smartwaste.com',
      app_metadata: {},
      user_metadata: { full_name: 'Ananya Sharma' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as User,
    profile: {
      id: 'b1111111-1111-1111-1111-111111111111',
      full_name: 'Ananya Sharma (Citizen Demo)',
      phone: '+91 98765 43210',
      role: 'citizen',
      created_at: new Date().toISOString(),
    },
  },
  driver: {
    user: {
      id: 'd1111111-1111-1111-1111-111111111111',
      email: 'driver@smartwaste.com',
      app_metadata: {},
      user_metadata: { full_name: 'Ramesh Patel' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as User,
    profile: {
      id: 'd1111111-1111-1111-1111-111111111111',
      full_name: 'Ramesh Patel (Driver Demo)',
      phone: '+91 98765 12345',
      role: 'driver',
      created_at: new Date().toISOString(),
    },
  },
  admin: {
    user: {
      id: 'a1111111-1111-1111-1111-111111111111',
      email: 'admin@smartwaste.com',
      app_metadata: {},
      user_metadata: { full_name: 'Suresh G.' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as User,
    profile: {
      id: 'a1111111-1111-1111-1111-111111111111',
      full_name: 'Suresh G. (Panchayat Admin Demo)',
      phone: '+91 98765 00000',
      role: 'admin',
      created_at: new Date().toISOString(),
    },
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to fetch user profile directly from database
  const fetchProfile = async (userId: string) => {
    try {
      const demoKey = typeof window !== 'undefined' ? (localStorage.getItem('smartwaste_demo_role') as UserRole | null) : null;
      if (demoKey && DEMO_USERS[demoKey]) {
        setProfile(DEMO_USERS[demoKey].profile);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data as Profile);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  useEffect(() => {
    // 1. Initial Session Check
    const getInitialSession = async () => {
      try {
        const demoRole = localStorage.getItem('smartwaste_demo_role') as UserRole | null;
        if (demoRole && DEMO_USERS[demoRole]) {
          setUser(DEMO_USERS[demoRole].user);
          setProfile(DEMO_USERS[demoRole].profile);
          setLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('Initial session fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // 2. Listen to Auth State Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session: Session | null) => {
      const demoRole = localStorage.getItem('smartwaste_demo_role') as UserRole | null;
      if (demoRole && DEMO_USERS[demoRole]) {
        setUser(DEMO_USERS[demoRole].user);
        setProfile(DEMO_USERS[demoRole].profile);
        setLoading(false);
        return;
      }

      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loginAsDemoRole = (targetRole: UserRole) => {
    const demoObj = DEMO_USERS[targetRole];
    if (demoObj) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('smartwaste_demo_role', targetRole);
        document.cookie = `smartwaste_demo_role=${targetRole}; path=/; max-age=86400; SameSite=Lax`;
      }
      setUser(demoObj.user);
      setProfile(demoObj.profile);
      setLoading(false);
    }
  };

  const signIn = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const lowerEmail = email.toLowerCase().trim();

      if (lowerEmail === 'citizen@smartwaste.com') {
        loginAsDemoRole('citizen');
        return { error: null };
      }
      if (lowerEmail === 'driver@smartwaste.com' || lowerEmail === 'worker@smartwaste.com') {
        loginAsDemoRole('driver');
        return { error: null };
      }
      if (lowerEmail === 'admin@smartwaste.com') {
        loginAsDemoRole('admin');
        return { error: null };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) {
        if (lowerEmail.includes('citizen')) {
          loginAsDemoRole('citizen');
          return { error: null };
        } else if (lowerEmail.includes('driver') || lowerEmail.includes('worker')) {
          loginAsDemoRole('driver');
          return { error: null };
        } else if (lowerEmail.includes('admin')) {
          loginAsDemoRole('admin');
          return { error: null };
        }
        throw error;
      }

      if (data.user) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('smartwaste_demo_role');
          document.cookie = 'smartwaste_demo_role=; path=/; max-age=0';
        }
        setUser(data.user);
        await fetchProfile(data.user.id);
      }
      return { error: null };
    } catch (err: any) {
      return { error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    pass: string,
    fullName: string,
    requestedRole: 'citizen' | 'driver',
    phone?: string,
    areaId?: string
  ) => {
    setLoading(true);
    try {
      const allowedRole = requestedRole === 'driver' ? 'driver' : 'citizen';

      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            full_name: fullName,
            role: allowedRole,
            phone: phone || '',
            area_id: areaId || '',
          },
        },
      });

      if (error) throw error;
      if (data.user) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('smartwaste_demo_role', allowedRole);
          document.cookie = `smartwaste_demo_role=${allowedRole}; path=/; max-age=86400; SameSite=Lax`;
        }
        setUser(data.user);
        setProfile({
          id: data.user.id,
          full_name: fullName,
          role: allowedRole,
          phone: phone || '',
          created_at: new Date().toISOString(),
        });
      }
      return { error: null };
    } catch (err: any) {
      return { error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('smartwaste_demo_role');
        document.cookie = 'smartwaste_demo_role=; path=/; max-age=0';
      }
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  const role = profile?.role || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        loading,
        signIn,
        signUp,
        loginAsDemoRole,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
