import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from '../components/AuthLayout';
import { Mail, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const { resetPassword, loading: authLoading, error: authError, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);
    const { error } = await resetPassword(email);
    setIsSubmitting(false);
    if (!error) {
      setShowSuccess(true);
    }
  };

  const isLoading = isSubmitting || authLoading;

  if (showSuccess) {
    return (
      <AuthLayout title="Check your email" subtitle="We sent you a reset link">
        <div className="text-center">
          <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="text-violet-600 dark:text-violet-400" size={28} />
          </div>
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            We sent a password reset link to <strong className="text-slate-900 dark:text-slate-100">{email}</strong>. Click the link in the email to reset your password.
          </p>
          <Link
            to="/login"
            className="inline-block px-6 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
          >
            Back to login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset password" subtitle="We'll send you a reset link">
      <Link
        to="/login"
        className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-4 text-sm"
      >
        <ArrowLeft size={16} />
        Back to login
      </Link>

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

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Sending reset link...
            </>
          ) : (
            'Send reset link'
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
