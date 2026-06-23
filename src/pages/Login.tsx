import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from '../components/AuthLayout';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function AppleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signInWithGoogle, signInWithApple, loading: authLoading, error: authError, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: string })?.from || '/';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    setIsSubmitting(false);
    if (!error) {
      navigate(from, { replace: true });
    }
  };

  const handleGoogle = async () => {
    clearError();
    await signInWithGoogle();
  };

  const handleApple = async () => {
    clearError();
    await signInWithApple();
  };

  const isLoading = isSubmitting || authLoading;

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue">
      {authError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
          <AlertCircle className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" size={16} />
          <p className="text-sm text-red-700 dark:text-red-300">{authError.message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-700" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">or continue with</span>
        </div>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={handleGoogle}
          disabled={isLoading}
          className="w-full py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <button
          type="button"
          onClick={handleApple}
          disabled={isLoading}
          className="w-full py-2.5 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
        >
          <AppleIcon />
          Continue with Apple
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
        Don't have an account?{' '}
        <Link to="/signup" className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
