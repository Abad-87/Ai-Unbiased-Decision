import { useEffect } from 'react';
import { api } from '../lib/api';

const UPLOAD_RETENTION_MS = 2 * 60 * 60 * 1000;
const RETENTION_DISMISSED_KEY = 'unbiased-ai:retention-dismissed-file-ids';
const RETENTION_LAST_PROMPT_KEY = 'unbiased-ai:retention-last-prompt-key';

export function RetentionGuard() {
  useEffect(() => {
    let cancelled = false;

    const checkExpiredUploads = async () => {
      try {
        const list = await api.listFiles({ limit: 500 });
        if (cancelled || list.files.length === 0) return;

        const dismissed = new Set<string>(
          JSON.parse(window.sessionStorage.getItem(RETENTION_DISMISSED_KEY) || '[]') as string[]
        );
        const expiredFiles = list.files.filter((file) => {
          const uploadedAt = Date.parse(file.uploaded_at);
          return Number.isFinite(uploadedAt)
            && Date.now() - uploadedAt >= UPLOAD_RETENTION_MS
            && !dismissed.has(file.id);
        });

        if (expiredFiles.length === 0) return;

        const promptKey = expiredFiles.map((file) => file.id).sort().join('|');
        if (window.sessionStorage.getItem(RETENTION_LAST_PROMPT_KEY) === promptKey) return;
        window.sessionStorage.setItem(RETENTION_LAST_PROMPT_KEY, promptKey);

        const filenames = expiredFiles.slice(0, 5).map((file) => file.filename).join(', ');
        const remaining = expiredFiles.length > 5 ? ` and ${expiredFiles.length - 5} more` : '';
        const approved = window.confirm(
          `${expiredFiles.length} uploaded file${expiredFiles.length === 1 ? '' : 's'} are older than 2 hours: ${filenames}${remaining}.\n\nDelete them now?`
        );

        if (!approved) {
          window.sessionStorage.setItem(
            RETENTION_DISMISSED_KEY,
            JSON.stringify([...dismissed, ...expiredFiles.map((file) => file.id)])
          );
          return;
        }

        await Promise.allSettled(expiredFiles.map((file) => api.deleteFile(file.id)));
      } catch {
        // Retention checks must never block the app shell.
      }
    };

    void checkExpiredUploads();
    const interval = window.setInterval(checkExpiredUploads, 30 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
