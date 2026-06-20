import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppData, Settings } from './types';

const DATA_KEY = 'scuts.data.v1';
const SETTINGS_KEY = 'scuts.settings.v1';

export async function loadData(): Promise<AppData | null> {
  try {
    const raw = await AsyncStorage.getItem(DATA_KEY);
    return raw ? (JSON.parse(raw) as AppData) : null;
  } catch {
    return null;
  }
}

export async function saveData(data: AppData): Promise<void> {
  try {
    await AsyncStorage.setItem(DATA_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('saveData failed', e);
  }
}

export async function loadSettings(): Promise<Settings | null> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as Settings) : null;
  } catch {
    return null;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('saveSettings failed', e);
  }
}
