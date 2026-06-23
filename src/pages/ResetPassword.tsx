import { useState, useMemo, type FormEvent, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from '../components/AuthLayout';
import { Lock, Loader2, AlertCircle, Check, X, CheckCircle } from 'lucide-react';

function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${met ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
      {met ? <Check size={14} className="text-emerald-500 dark:text-emerald-400" /> : <X size={14} className="text-slate-400 dark:text-slate-500" />}
      <span>{text}</span>
    </div>
  );
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const { updatePassword, session, loading: authLoading, error: authError, clearError } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const passwordValidation = useMemo(() => ({
    minLength: password.length >= 8,
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    matches: password === confirmPassword && password.length > 0,
  }), [password, confirmPassword]);

  const isPasswordValid = passwordValidation.minLength
    && passwordValidation.hasNumber
    && passwordValidation.hasSpecial
    && passwordValidation.matches;

  const hasValidSession = session !== null && session.user !== null;

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');

    // If we have a recovery token in the URL, wait for Supabase to process it
    if (accessToken && type === 'recovery') return;

    // No session and no recovery token — redirect to forgot password
    if (!authLoading && !session && !accessToken) {
      navigate('/forgot-password', { replace: true });
    }
  }, [authLoading, session, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) return;
    clearError();
    setIsSubmitting(true);
    const { error } = await updatePassword(password);
    setIsSubmitting(false);
    if (!error) {
      setShowSuccess(true);
    }
  };

  const isLoading = isSubmitting || authLoading;

  if (showSuccess) {
    return (
      <AuthLayout title="Password updated" subtitle="Your password has been changed" showBackLink={false}>
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={28} />
          </div>
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            Your password has been successfully updated. You can now sign in with your new password.
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
          >
            Continue to app
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (authLoading) {
    return (
      <AuthLayout title="Reset password" subtitle="Set your new password" showBackLink={false}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-slate-400 dark:text-slate-500" size={32} />
        </div>
      </AuthLayout>
    );
  }

  if (!hasValidSession) {
    return (
      <AuthLayout title="Invalid link" subtitle="This reset link has expired" showBackLink={false}>
        <div className="text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-amber-600 dark:text-amber-400" size={28} />
          </div>
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block px-6 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
          >
            Request new link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set new password" subtitle="Choose a strong password" showBackLink={false}>
      {authError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
          <AlertCircle className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" size={16} />
          <p className="text-sm text-red-700 dark:text-red-300">{authError.message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">New password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
            <input
              id="password" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password" required disabled={isLoading}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"
            />
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Confirm new password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
            <input
              id="confirmPassword" type="password" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password" required disabled={isLoading}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"
            />
          </div>
        </div>

        {password.length > 0 && (
          <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg space-y-1.5">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-200 mb-2">Password requirements:</p>
            <PasswordRequirement met={passwordValidation.minLength} text="At least 8 characters" />
            <PasswordRequirement met={passwordValidation.hasNumber} text="Contains a number" />
            <PasswordRequirement met={passwordValidation.hasSpecial} text="Contains a special character" />
            {confirmPassword.length > 0 && (
              <PasswordRequirement met={passwordValidation.matches} text="Passwords match" />
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !isPasswordValid}
          className="w-full py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <><Loader2 className="animate-spin" size={18} /> Updating password...</>
          ) : (
            'Update password'
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
