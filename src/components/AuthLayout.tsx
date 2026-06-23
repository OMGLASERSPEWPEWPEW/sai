import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showBackLink?: boolean;
  /** Pass a custom logo component. Defaults to app name text. */
  logo?: ReactNode;
}

export default function AuthLayout({ children, title, subtitle, showBackLink = true, logo }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {showBackLink && (
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-6"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">Back to home</span>
          </Link>
        )}

        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            {logo ?? (
              <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                Mindshare
              </span>
            )}
          </div>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-50 mb-1">{title}</h2>
          {subtitle && (
            <p className="text-slate-500 dark:text-slate-400 text-sm">{subtitle}</p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
