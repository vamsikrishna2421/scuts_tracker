import * as SplashScreen from 'expo-splash-screen';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { buildKnowledge } from './knowledge';
import { PresetId, presetModels } from './presets';
import { makeSeed } from './sampleData';
import * as secure from './secure';
import type { AgentConfig } from './semanticLayer';
import { loadData, loadSettings, saveData, saveSettings } from './storage';
import {
  AgentRole, AppData, ChatMessage, ClaudeModelId, CompanyProfile, Interaction, KnowledgeDoc,
  Partner, Reminder, Settings, defaultSettings, newId,
} from './types';
import { nowISO } from './format';

interface StoreValue {
  ready: boolean;
  data: AppData;
  settings: Settings;
  hasApiKey: boolean;

  getPartner: (id?: string) => Partner | undefined;
  addPartner: (p: Partner) => void;
  updatePartner: (p: Partner) => void;
  deletePartner: (id: string) => void;

  addInteraction: (i: Interaction) => void;
  updateInteraction: (i: Interaction) => void;

  addReminder: (r: Reminder) => void;
  addReminders: (r: Reminder[]) => void;
  toggleReminder: (id: string) => void;
  deleteReminder: (id: string) => void;
  replaceAutoReminders: (partnerId: string, next: Reminder[]) => void;

  addChat: (m: ChatMessage) => void;
  clearChat: () => void;

  patchSettings: (patch: Partial<Settings>) => void;
  updateCompany: (c: CompanyProfile) => void;
  setModel: (role: AgentRole, model: ClaudeModelId) => void;
  applyPreset: (id: PresetId) => void;
  addKnowledge: (title: string, content: string) => void;
  removeKnowledge: (id: string) => void;

  saveApiKey: (key: string) => Promise<void>;
  removeApiKey: () => Promise<void>;

  agentConfig: () => AgentConfig | null;
  exportJSON: () => string;
  resetAll: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const EMPTY_DATA: AppData = { partners: [], interactions: [], reminders: [], chat: [] };

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [settings, setSettings] = useState<Settings>(defaultSettings());
  const [hasApiKey, setHasApiKey] = useState(false);
  const apiKeyRef = useRef<string | null>(null);
  const readyRef = useRef(false);

  // Load persisted state once.
  useEffect(() => {
    (async () => {
      const [loadedSettings, loadedData, key] = await Promise.all([loadSettings(), loadData(), secure.loadApiKey()]);
      setSettings(loadedSettings ?? defaultSettings());
      if (loadedData) {
        setData(loadedData);
      } else {
        const seed = makeSeed();
        setData(seed);
        void saveData(seed);
      }
      apiKeyRef.current = key;
      setHasApiKey(!!key && key.trim().length > 0);
      readyRef.current = true;
      setReady(true);
      void SplashScreen.hideAsync().catch(() => {});
    })();
  }, []);

  useEffect(() => {
    if (readyRef.current) void saveData(data);
  }, [data]);

  useEffect(() => {
    if (readyRef.current) void saveSettings(settings);
  }, [settings]);

  // Partners
  const getPartner = useCallback((id?: string) => (id ? data.partners.find((p) => p.id === id) : undefined), [data.partners]);
  const addPartner = useCallback((p: Partner) => setData((d) => ({ ...d, partners: [...d.partners, p] })), []);
  const updatePartner = useCallback((p: Partner) => setData((d) => ({ ...d, partners: d.partners.map((x) => (x.id === p.id ? p : x)) })), []);
  const deletePartner = useCallback((id: string) => setData((d) => ({
    ...d,
    partners: d.partners.filter((p) => p.id !== id),
    interactions: d.interactions.filter((i) => i.partnerId !== id),
    reminders: d.reminders.filter((r) => r.partnerId !== id),
  })), []);

  // Interactions
  const addInteraction = useCallback((i: Interaction) => setData((d) => ({ ...d, interactions: [...d.interactions, i] })), []);
  const updateInteraction = useCallback((i: Interaction) => setData((d) => ({ ...d, interactions: d.interactions.map((x) => (x.id === i.id ? i : x)) })), []);

  // Reminders
  const addReminder = useCallback((r: Reminder) => setData((d) => ({ ...d, reminders: [r, ...d.reminders] })), []);
  const addReminders = useCallback((r: Reminder[]) => setData((d) => ({ ...d, reminders: [...r, ...d.reminders] })), []);
  const toggleReminder = useCallback((id: string) => setData((d) => ({ ...d, reminders: d.reminders.map((r) => (r.id === id ? { ...r, isDone: !r.isDone } : r)) })), []);
  const deleteReminder = useCallback((id: string) => setData((d) => ({ ...d, reminders: d.reminders.filter((r) => r.id !== id) })), []);
  const replaceAutoReminders = useCallback((partnerId: string, next: Reminder[]) => setData((d) => ({
    ...d,
    reminders: [...next, ...d.reminders.filter((r) => !(r.partnerId === partnerId && r.isAuto && !r.isDone))],
  })), []);

  // Chat
  const addChat = useCallback((m: ChatMessage) => setData((d) => ({ ...d, chat: [...d.chat, m] })), []);
  const clearChat = useCallback(() => setData((d) => ({ ...d, chat: [] })), []);

  // Settings
  const patchSettings = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);
  const updateCompany = useCallback((c: CompanyProfile) => setSettings((s) => ({ ...s, company: c })), []);
  const setModel = useCallback((role: AgentRole, model: ClaudeModelId) => setSettings((s) => ({ ...s, models: { ...s.models, [role]: model } })), []);
  const applyPreset = useCallback((id: PresetId) => setSettings((s) => ({ ...s, models: presetModels(id) })), []);
  const addKnowledge = useCallback((title: string, content: string) => setSettings((s) => ({
    ...s,
    knowledge: [{ id: newId(), title: title.trim() || 'Untitled note', content, createdAt: nowISO() }, ...s.knowledge],
  })), []);
  const removeKnowledge = useCallback((id: string) => setSettings((s) => ({ ...s, knowledge: s.knowledge.filter((k) => k.id !== id) })), []);

  // API key
  const saveApiKey = useCallback(async (key: string) => {
    await secure.saveApiKey(key);
    apiKeyRef.current = key.trim();
    setHasApiKey(key.trim().length > 0);
  }, []);
  const removeApiKey = useCallback(async () => {
    await secure.deleteApiKey();
    apiKeyRef.current = null;
    setHasApiKey(false);
  }, []);

  const agentConfig = useCallback((): AgentConfig | null => {
    const key = apiKeyRef.current;
    if (!key || !key.trim()) return null;
    return {
      apiKey: key,
      models: settings.models,
      knowledge: buildKnowledge(settings.company, settings.knowledge),
      defaultCadenceDays: settings.defaultCadenceDays,
    };
  }, [settings]);

  const exportJSON = useCallback(() => JSON.stringify(data, null, 2), [data]);
  const resetAll = useCallback(() => setData(EMPTY_DATA), []);

  const value: StoreValue = {
    ready, data, settings, hasApiKey,
    getPartner, addPartner, updatePartner, deletePartner,
    addInteraction, updateInteraction,
    addReminder, addReminders, toggleReminder, deleteReminder, replaceAutoReminders,
    addChat, clearChat,
    patchSettings, updateCompany, setModel, applyPreset, addKnowledge, removeKnowledge,
    saveApiKey, removeApiKey,
    agentConfig, exportJSON, resetAll,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
