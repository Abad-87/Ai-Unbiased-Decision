export type UserProfile = {
  name: string;
  email: string;
  createdAt: string;
  provider?: 'google' | 'local';
  photoURL?: string | null;
};

const STORAGE_KEY = 'unbiased-ai:user-profile';

export function loadUserProfile(): UserProfile | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

export function saveUserProfile(profile: UserProfile) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function clearUserProfile() {
  window.localStorage.removeItem(STORAGE_KEY);
}
