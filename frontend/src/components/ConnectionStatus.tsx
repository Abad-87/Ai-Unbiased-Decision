import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { api } from '../lib/api';

type Status = 'checking' | 'online' | 'offline';

/**
 * Pings the backend /health endpoint on mount and every 30 s.
 * Shows a green pill when the backend is reachable and an expanded
 * red banner (dismissible) when it is not — so wiring issues are
 * obvious immediately.
 */
export function ConnectionStatus() {
  const [status, setStatus] = useState<Status>('checking');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [dismissed, setDismissed] = useState(false);

  const check = async () => {
    try {
      await api.health();
      setStatus('online');
      setErrorMsg('');
    } catch (e) {
      setStatus('offline');
      setErrorMsg((e as Error).message || 'Backend unreachable');
    }
  };

  useEffect(() => {
    check();
    const t = setInterval(check, 30_000);
    return () => clearInterval(t);
  }, []);

  if (status === 'checking') {
    return (
      <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
        <Loader2 size={14} className="animate-spin" />
        Connecting to API…
      </div>
    );
  }

  if (status === 'online') {
    return (
      <div
        className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
        title="Backend API is reachable"
      >
        <CheckCircle2 size={14} />
        API connected
      </div>
    );
  }

  // offline
  if (dismissed) {
    return (
      <button
        onClick={() => { setDismissed(false); check(); }}
        className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 hover:scale-105 transition-transform"
        title="Click to retry"
      >
        <AlertCircle size={14} />
        API offline
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm px-4 py-2 rounded-2xl bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800 max-w-xl">
      <AlertCircle size={18} className="flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium">Backend not reachable</p>
        <p className="text-xs opacity-80 truncate" title={errorMsg}>
          {errorMsg || 'GET /health failed'} — start the API with{' '}
          <code className="font-mono">uvicorn main:app --reload</code> in <code className="font-mono">backend/</code>.
        </p>
      </div>
      <button
        onClick={check}
        className="text-xs px-2 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700"
      >
        Retry
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
