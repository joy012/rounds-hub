import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BedsPerRow, UserPreferences } from './types';

const PREFERENCES_STORAGE_KEY = 'user_preferences';

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultDepartment: 'Surgery Department',
  defaultWardNumber: '1',
  defaultBedCount: 12,
  theme: 'system',
  bedsPerRow: 4,
};

function parseBedsPerRow(value: unknown): BedsPerRow {
  if (value === 2 || value === 3 || value === 4 || value === 5 || value === 6) return value;
  return 4;
}

function parseTheme(value: unknown): 'light' | 'dark' | 'system' {
  if (value === 'light' || value === 'dark' || value === 'system') return value;
  return 'system';
}

export async function loadPreferences(): Promise<UserPreferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      defaultDepartment:
        typeof parsed.defaultDepartment === 'string' ? parsed.defaultDepartment : DEFAULT_PREFERENCES.defaultDepartment,
      defaultWardNumber:
        typeof parsed.defaultWardNumber === 'string' ? parsed.defaultWardNumber : DEFAULT_PREFERENCES.defaultWardNumber,
      defaultBedCount:
        typeof parsed.defaultBedCount === 'number' && parsed.defaultBedCount >= 1 && parsed.defaultBedCount <= 100
          ? parsed.defaultBedCount
          : DEFAULT_PREFERENCES.defaultBedCount,
      theme: parseTheme(parsed.theme),
      bedsPerRow: parseBedsPerRow(parsed.bedsPerRow),
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  const payload = JSON.stringify({
    defaultDepartment: prefs.defaultDepartment ?? DEFAULT_PREFERENCES.defaultDepartment,
    defaultWardNumber: prefs.defaultWardNumber ?? DEFAULT_PREFERENCES.defaultWardNumber,
    defaultBedCount: prefs.defaultBedCount ?? DEFAULT_PREFERENCES.defaultBedCount,
    theme: prefs.theme ?? DEFAULT_PREFERENCES.theme,
    bedsPerRow: prefs.bedsPerRow ?? DEFAULT_PREFERENCES.bedsPerRow,
  });
  await AsyncStorage.setItem(PREFERENCES_STORAGE_KEY, payload);
}
