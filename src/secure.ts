import * as SecureStore from 'expo-secure-store';

const KEY = 'anthropic_api_key';

export async function saveApiKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, key.trim());
}

export async function loadApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function deleteApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
