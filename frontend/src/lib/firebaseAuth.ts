import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import type { UserProfile } from './userProfile';

interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

function loadFirebaseConfig(): FirebaseWebConfig | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID as string | undefined;
  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined;
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined;

  if (!apiKey || !authDomain || !projectId || !appId) {
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  };
}

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;

function getFirebaseAuth(): Auth | null {
  const config = loadFirebaseConfig();
  if (!config) return null;

  if (!cachedApp) {
    cachedApp = initializeApp(config);
    cachedAuth = getAuth(cachedApp);
  }

  return cachedAuth;
}

function toUserProfile(user: User): UserProfile {
  return {
    name: user.displayName || user.email?.split('@')[0] || 'Google User',
    email: user.email || '',
    createdAt: new Date().toISOString(),
    provider: 'google',
    photoURL: user.photoURL,
  };
}

export function isGoogleAuthConfigured() {
  return getFirebaseAuth() != null;
}

export function getCurrentGoogleProfile(): UserProfile | null {
  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;
  return currentUser ? toUserProfile(currentUser) : null;
}

export async function signInWithGoogle(): Promise<UserProfile> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Google sign-in is not configured yet. Add the Firebase web app keys in frontend/.env.local.');
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return toUserProfile(result.user);
}

export async function signOutGoogle() {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await signOut(auth);
}
