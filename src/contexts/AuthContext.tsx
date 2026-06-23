import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session, AuthError } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signInWithApple: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  /** Called when a user signs in (initial load or auth state change) */
  onSignIn?: (user: User) => void | Promise<void>;
  /** Called when a user signs out */
  onSignOut?: () => void | Promise<void>;
}

export function AuthProvider({ children, onSignIn, onSignOut }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user && onSignIn) {
        onSignIn(initialSession.user);
      }

      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (event === 'SIGNED_IN' && currentSession?.user && onSignIn) {
          await onSignIn(currentSession.user);
        }
        if (event === 'SIGNED_OUT' && onSignOut) {
          await onSignOut();
        }

        setLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, [onSignIn, onSignOut]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setError(signInError);
    return { error: signInError };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setError(null);
    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) setError(signUpError);
    return { error: signUpError };
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (googleError) setError(googleError);
    return { error: googleError };
  }, []);

  const signInWithApple = useCallback(async () => {
    setError(null);
    const { error: appleError } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (appleError) setError(appleError);
    return { error: appleError };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (resetError) setError(resetError);
    return { error: resetError };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) setError(updateError);
    return { error: updateError };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider value={{
      user, session, loading, error,
      signIn, signUp, signOut,
      signInWithGoogle, signInWithApple,
      resetPassword, updatePassword,
      clearError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
