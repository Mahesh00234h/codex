import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { DEMO_DATA_MODE } from '@/lib/backendMode';

export type UserRole = 'farmer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  isVerified: boolean;
  createdAt: Date;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  register: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isMissingSchemaError = (error: unknown) => {
    const message = error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message)
      : String(error ?? '');
    return message.includes('schema cache') || message.includes('relation') || message.includes('does not exist');
  };

  const userFromAuthMetadata = (supabaseUser: SupabaseUser): User => {
    const metadata = supabaseUser.user_metadata || {};
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: typeof metadata.name === 'string' ? metadata.name : supabaseUser.email?.split('@')[0] || 'Farmer',
      role: 'farmer',
      isVerified: Boolean(supabaseUser.email_confirmed_at),
      createdAt: new Date(supabaseUser.created_at),
    };
  };

  // Fetch user profile and role from database
  const fetchUserData = useCallback(async (supabaseUser: SupabaseUser): Promise<User | null> => {
    if (DEMO_DATA_MODE) {
      return userFromAuthMetadata(supabaseUser);
    }

    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', supabaseUser.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      // Fetch role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', supabaseUser.id)
        .maybeSingle();

      if (roleError) {
        console.error('Error fetching role:', roleError);
      }

      if (isMissingSchemaError(profileError) || isMissingSchemaError(roleError)) {
        return userFromAuthMetadata(supabaseUser);
      }

      if (profile && roleData?.role === 'farmer') {
        return {
          id: supabaseUser.id,
          email: profile.email,
          name: profile.name,
          role: 'farmer',
          avatar: profile.avatar_url || undefined,
          phone: profile.phone || undefined,
          isVerified: profile.is_verified || false,
          createdAt: new Date(profile.created_at),
        };
      }

      const metadataRole = supabaseUser.user_metadata?.role;
      if (!profile && !roleData && metadataRole === 'farmer') {
        return userFromAuthMetadata(supabaseUser);
      }

      return null;
    } catch (error) {
      console.error('Error in fetchUserData:', error);
      return null;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    try {
      // Set up auth state listener FIRST
      const result = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);

        if (session?.user) {
          // Use setTimeout to avoid potential deadlocks with Supabase client
          setTimeout(async () => {
            try {
              const userData = await fetchUserData(session.user);
              setUser(userData);
            } catch (error) {
              console.error('Auth state profile load failed:', error);
              setUser(null);
            } finally {
              setIsLoading(false);
            }
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      });
      subscription = result.data.subscription;
    } catch (error) {
      console.error('Auth listener initialization failed:', error);
      setUser(null);
      setIsLoading(false);
    }

    // Then check for existing session
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (session?.user) {
          const userData = await fetchUserData(session.user);
          setUser(userData);
        }
      })
      .catch((error) => {
        console.error('Auth session initialization failed:', error);
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchUserData]);

  const login = useCallback(async (email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        if (DEMO_DATA_MODE) {
          setUser(userFromAuthMetadata(data.user));
          return;
        }

        // Verify the user has the expected role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (roleError) {
          if (!isMissingSchemaError(roleError)) {
            throw roleError;
          }
        }

        const metadataRole = data.user.user_metadata?.role;
        const resolvedRole = roleData?.role || (metadataRole === 'farmer' ? 'farmer' : null);

        if (resolvedRole !== role) {
          // User selected wrong role, sign them out
          await supabase.auth.signOut();
          throw new Error('Only farmer accounts can sign in to this hackathon build.');
        }

        const userData = await fetchUserData(data.user);
        setUser(userData);
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserData]);

  const register = useCallback(async (email: string, password: string, name: string, role: UserRole) => {
    setIsLoading(true);
    try {
      const registerWithSupabaseAuth = async () => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, role },
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });

        if (error) {
          throw error;
        }

        if (!data.session || !data.user) {
          throw new Error(
            'Email confirmation is still enabled in Supabase Auth. Turn it off in Authentication > Providers > Email, then delete this unconfirmed user or use a new email.'
          );
        }

        if (DEMO_DATA_MODE) {
          await supabase.auth.signOut();
          return data;
        }

        const [{ error: profileError }, { error: roleError }] = await Promise.all([
          supabase.from('profiles').upsert(
            {
              user_id: data.user.id,
              email,
              name,
              is_verified: true,
            },
            { onConflict: 'user_id' }
          ),
          supabase.from('user_roles').upsert(
            {
              user_id: data.user.id,
              role,
            },
            { onConflict: 'user_id,role' }
          ),
        ]);

        if (isMissingSchemaError(profileError) || isMissingSchemaError(roleError)) {
          await supabase.auth.signOut();
          return data;
        }

        if (profileError || roleError) {
          const message = profileError?.message || roleError?.message || 'Unable to finish farmer profile setup';
          throw new Error(`${message}. Confirm the new Supabase project has the database migrations applied.`);
        }

        await supabase.auth.signOut();
        return data;
      };

      if (DEMO_DATA_MODE) {
        return await registerWithSupabaseAuth();
      }

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 20000);

      let response: Response;
      try {
        response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ email, password, name, role }),
          signal: controller.signal,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new Error('Registration timed out. Deploy auth-register or disable email confirmations in Supabase Auth settings.');
        }
        return await registerWithSupabaseAuth();
      } finally {
        window.clearTimeout(timeoutId);
      }

      let data: { error?: string; message?: string; user?: unknown } = {};
      try {
        data = await response.json();
      } catch {
        // Keep the default empty response object.
      }

      if (!response.ok) {
        if (response.status === 404) {
          return await registerWithSupabaseAuth();
        }
        const setupHint = response.status === 404
          ? ' Deploy the auth-register Edge Function to auto-confirm farmer accounts.'
          : '';
        throw new Error(data.error || `Registration failed.${setupHint}`);
      }

      return data;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Role-based access utilities
export const roleLabels: Record<UserRole, string> = {
  farmer: 'Farmer',
};

export const roleIcons: Record<UserRole, string> = {
  farmer: '🌾',
};

export const roleColors: Record<UserRole, string> = {
  farmer: 'bg-primary',
};

export const rolePaths: Record<UserRole, string> = {
  farmer: '/farmer',
};
