'use client';

import { useState } from 'react';
import { Mail, RefreshCw, LogOut } from 'lucide-react';
import { logout } from '@/lib/actions/auth';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

export default function VerifyEmailPage() {
  const { t } = useDashboardLocale();
  const [resending, setResending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      const supabase = getSupabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        await supabase.auth.resend({ type: 'signup', email: user.email });
        setSent(true);
      }
    } catch { /* ignore */ } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/[0.1] mb-5">
          <Mail className="w-8 h-8 text-blue-500" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2 font-heading">
          {t.verify_title}
        </h1>
        <p className="text-gray-500 mb-8">
          {t.verify_desc}
        </p>

        {sent ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 mb-6 text-emerald-700 text-sm font-medium">
            {t.verify_sent}
          </div>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 mb-4"
          >
            <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
            {resending ? t.verify_resending : t.verify_resend}
          </button>
        )}

        <button
          onClick={() => logout()}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mt-2"
        >
          <LogOut className="w-3.5 h-3.5" /> {t.verify_logout}
        </button>
      </div>
    </div>
  );
}
