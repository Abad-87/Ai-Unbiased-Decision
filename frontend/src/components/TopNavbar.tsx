import { Bell, Search, Moon, Sun, LogOut, X, CheckCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from './ThemeProvider';
import { ConnectionStatus } from './ConnectionStatus';
import { clearUserProfile, loadUserProfile, saveUserProfile, type UserProfile } from '../lib/userProfile';
import {
  getCurrentGoogleProfile,
  isGoogleAuthConfigured,
  signInWithGoogle,
  signOutGoogle,
} from '../lib/firebaseAuth';

interface TopNavbarProps {
  onNewScan: () => void;
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12S17.4 12 24 12c3 0 5.8 1.1 7.9 2.9l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5Z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 2.9l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.7 0-14.3 4.3-17.7 10.7Z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.8-3.3-11.5-8l-6.6 5.1C9.2 39.6 16 44 24 44Z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 2.8-2.9 5.2-5.4 6.8l6.2 5.2C39.7 36.7 44 31 44 24c0-1.2-.1-2.3-.4-3.5Z" />
    </svg>
  );
}

export function TopNavbar({ onNewScan }: TopNavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(() => loadUserProfile());
  const [showSignup, setShowSignup] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const googleAuthReady = useMemo(() => isGoogleAuthConfigured(), []);

  useEffect(() => {
    const googleProfile = getCurrentGoogleProfile();
    const localProfile = loadUserProfile();
    if (googleProfile && (!localProfile || localProfile.provider === 'google')) {
      saveUserProfile({
        ...googleProfile,
        createdAt: localProfile?.createdAt ?? new Date().toISOString(),
      });
      setProfile((prev) => ({
        ...googleProfile,
        createdAt: prev?.createdAt ?? new Date().toISOString(),
      }));
    }
  }, []);

  const handleGoogleSignup = async () => {
    setIsSigningIn(true);
    try {
      const signedInProfile = await signInWithGoogle();
      const next = {
        ...signedInProfile,
        createdAt: profile?.createdAt ?? new Date().toISOString(),
      };
      saveUserProfile(next);
      setProfile(next);
      setShowSignup(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Google sign-in failed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    if (profile?.provider === 'google') {
      await signOutGoogle().catch(() => undefined);
    }
    clearUserProfile();
    setProfile(null);
  };

  return (
    <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 h-16 flex items-center px-6 justify-between shadow-sm">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={18} />
          <input
            type="text"
            placeholder="Search metrics, cases, or groups..."
            className="w-full pl-11 pr-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-emerald-500 rounded-2xl text-sm focus:outline-none dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <ConnectionStatus />

        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-all duration-200 hover:scale-110 text-zinc-700 dark:text-zinc-300"
        >
          {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
        </button>

        <button className="relative p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-colors text-zinc-700 dark:text-zinc-300">
          <Bell size={22} />
          <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
            3
          </span>
        </button>

        {profile ? (
          <div className="flex items-center gap-2 pl-2">
            <button
              onClick={() => setShowSignup(true)}
              className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 text-sm font-medium rounded-2xl flex items-center gap-2"
              title={profile.email}
            >
              {profile.photoURL ? (
                <img src={profile.photoURL} alt="" className="w-6 h-6 rounded-full" />
              ) : (
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center">
                  {profile.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              {profile.name}
            </button>
            <button
              onClick={() => void handleSignOut()}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-300"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSignup(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-2xl transition-colors flex items-center gap-2"
          >
            <GoogleMark />
            Sign Up with Google
          </button>
        )}

        <button
          onClick={onNewScan}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-2xl transition-colors"
        >
          New Scan
        </button>
      </div>

      {showSignup && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold dark:text-white">Google Sign-In</h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  Use one account for saved settings, audit ownership, and a smoother handoff across devices.
                </p>
              </div>
              <button
                onClick={() => setShowSignup(false)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {[
                'Keeps your saved fairness settings tied to a real signed-in profile.',
                'Makes audit exports easier to trace back to an owner.',
                'Sets the app up for Firebase Auth instead of a browser-only local profile.',
              ].map((line) => (
                <div key={line} className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <CheckCircle size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                  <span>{line}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 p-4 text-sm text-zinc-600 dark:text-zinc-300">
              {googleAuthReady
                ? 'Google sign-in is configured for this app. Continue to open the Google account picker.'
                : 'Google sign-in UI is ready, but Firebase web credentials are missing. Add the VITE_FIREBASE_* values in frontend/.env.local to activate it.'}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowSignup(false)}
                className="px-5 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleGoogleSignup()}
                disabled={!googleAuthReady || isSigningIn}
                className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-400 text-white font-medium flex items-center gap-2"
              >
                <GoogleMark />
                {isSigningIn ? 'Connecting...' : 'Continue with Google'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
