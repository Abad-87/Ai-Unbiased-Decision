export type ProtectedAttribute = {
  id: string;
  name: string;
  enabled: boolean;
};

export type FairnessSettings = {
  protectedAttributes: ProtectedAttribute[];
  threshold: number;
  autoMitigation: boolean;
};

const STORAGE_KEY = 'unbiased-ai:fairness-settings';

export const DEFAULT_FAIRNESS_SETTINGS: FairnessSettings = {
  protectedAttributes: [
    { id: 'gender', name: 'Gender', enabled: true },
    { id: 'age_group', name: 'Age Group', enabled: true },
    { id: 'region', name: 'Region', enabled: false },
    { id: 'income_bracket', name: 'Income Bracket', enabled: false },
  ],
  threshold: 0.2,
  autoMitigation: true,
};

function clampThreshold(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_FAIRNESS_SETTINGS.threshold;
  return Math.min(0.5, Math.max(0.05, Number(parsed.toFixed(2))));
}

export function loadFairnessSettings(): FairnessSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FAIRNESS_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<FairnessSettings>;
    const savedAttributes = Array.isArray(parsed.protectedAttributes)
      ? parsed.protectedAttributes
      : [];

    return {
      protectedAttributes: DEFAULT_FAIRNESS_SETTINGS.protectedAttributes.map((fallback) => {
        const saved = savedAttributes.find((item) => item.id === fallback.id || item.name === fallback.name);
        return {
          ...fallback,
          enabled: typeof saved?.enabled === 'boolean' ? saved.enabled : fallback.enabled,
        };
      }),
      threshold: clampThreshold(parsed.threshold),
      autoMitigation:
        typeof parsed.autoMitigation === 'boolean'
          ? parsed.autoMitigation
          : DEFAULT_FAIRNESS_SETTINGS.autoMitigation,
    };
  } catch {
    return DEFAULT_FAIRNESS_SETTINGS;
  }
}

export function saveFairnessSettings(settings: FairnessSettings) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
