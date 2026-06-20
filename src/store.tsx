import type { Session } from '@supabase/supabase-js';
import * as SplashScreen from 'expo-splash-screen';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ImportedDoc } from './docimport';
import { buildKnowledge } from './knowledge';
import { PresetId, presetModels } from './presets';
import { makeSeed } from './sampleData';
import * as secure from './secure';
import type { AgentConfig } from './semanticLayer';
import { loadData, loadSettings, saveData, saveSettings } from './storage';
import { isSupabaseConfigured } from './supabase';
import * as sync from './sync';
import {
  AgentRole, AppData, ChatMessage, ClaudeModelId, CompanyProfile, Interaction, KnowledgeDoc,
  Partner, Reminder, SalonFinance, Settings, defaultSettings, newId,
} from './types';
import { nowISO } from './format';

interface StoreValue {
  ready: boolean;
  data: AppData;
  settings: Settings;
  hasApiKey: boolean;

  // Cloud sync / accounts
  cloudEnabled: boolean;
  authReady: boolean;
  session: Session | null;
  userName: string | null;
  syncStatus: sync.SyncStatus;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;

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
  addKnowledgeFile: (doc: ImportedDoc) => Promise<void>;
  removeKnowledge: (id: string) => void;
  openOriginal: (doc: KnowledgeDoc) => Promise<string>;

  importFinances: (period: string, records: SalonFinance[]) => void;

  saveApiKey: (key: string) => Promise<void>;
  removeApiKey: () => Promise<void>;

  agentConfig: () => AgentConfig | null;
  exportJSON: () => string;
  resetAll: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const EMPTY_DATA: AppData = { partners: [], interactions: [], reminders: [], chat: [], finances: [] };
type EntityHashes = Record<sync.EntityTable, Record<string, string>>;
const emptyHashes = (): EntityHashes => ({ partners: {}, interactions: {}, reminders: {}, knowledge: {}, finances: {} });

function upsertById<T extends { id: string }>(arr: T[], obj: T): T[] {
  return arr.some((x) => x.id === obj.id) ? arr.map((x) => (x.id === obj.id ? obj : x)) : [obj, ...arr];
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [settings, setSettings] = useState<Settings>(defaultSettings());
  const [hasApiKey, setHasApiKey] = useState(false);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [syncStatus, setSyncStatus] = useState<sync.SyncStatus>(isSupabaseConfigured ? 'connecting' : 'off');

  const apiKeyRef = useRef<string | null>(null);
  const readyRef = useRef(false);
  const settingsRef = useRef(settings);
  const userNameRef = useRef<string | null>(null);

  // Sync bookkeeping
  const pushEnabledRef = useRef(false);
  const pushedRef = useRef<EntityHashes>(emptyHashes());
  const companyHashRef = useRef<string | null>(null);
  const unsubRealtimeRef = useRef<(() => void) | null>(null);
  const authSubRef = useRef<{ unsubscribe: () => void } | null>(null);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const withAuthor = useCallback(<T extends { addedBy?: string }>(o: T): T =>
    o.addedBy || !userNameRef.current ? o : { ...o, addedBy: userNameRef.current }, []);

  // ── Bootstrap: load local cache first, then connect cloud ──────────────────
  useEffect(() => {
    (async () => {
      const [loadedSettings, loadedData, key] = await Promise.all([loadSettings(), loadData(), secure.loadApiKey()]);
      const initial = loadedSettings ?? defaultSettings();
      setSettings(initial);
      settingsRef.current = initial;
      if (loadedData) {
        setData(loadedData);
      } else if (!isSupabaseConfigured) {
        const seed = makeSeed();
        setData(seed);
        void saveData(seed);
      }
      apiKeyRef.current = key;
      setHasApiKey(!!key && key.trim().length > 0);
      readyRef.current = true;
      setReady(true);
      void SplashScreen.hideAsync().catch(() => {});

      if (isSupabaseConfigured) {
        try {
          await applySession(await sync.getSession());
        } catch {
          setSyncStatus('error');
        }
        setAuthReady(true);
        const { data: authSub } = sync.onAuthChange((s) => { void applySession(s); });
        authSubRef.current = authSub.subscription;
      }
    })();
    return () => {
      authSubRef.current?.unsubscribe();
      unsubRealtimeRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cloud sync engine ──────────────────────────────────────────────────────
  async function applySession(sess: Session | null) {
    setSession(sess);
    if (sess) {
      userNameRef.current = (sess.user.user_metadata?.name as string) || sess.user.email || null;
      sync.setRealtimeAuth(sess.access_token);
      if (!pushEnabledRef.current) await runInitialSync();
    } else {
      userNameRef.current = null;
      pushEnabledRef.current = false;
      unsubRealtimeRef.current?.();
      unsubRealtimeRef.current = null;
      pushedRef.current = emptyHashes();
      companyHashRef.current = null;
      setSyncStatus('off');
    }
  }

  async function runInitialSync() {
    setSyncStatus('connecting');
    const remote = await sync.pullAll();
    // The cloud is the source of truth for the shared workspace.
    setData((d) => ({ ...d, partners: remote.partners, interactions: remote.interactions, reminders: remote.reminders, finances: remote.finances }));
    setSettings((s) => ({ ...s, knowledge: remote.knowledge, ...(remote.company ? { company: remote.company } : {}) }));

    const hashes = emptyHashes();
    const seed = (t: sync.EntityTable, items: { id: string }[]) => items.forEach((it) => { hashes[t][it.id] = JSON.stringify(it); });
    seed('partners', remote.partners);
    seed('interactions', remote.interactions);
    seed('reminders', remote.reminders);
    seed('knowledge', remote.knowledge);
    seed('finances', remote.finances);
    pushedRef.current = hashes;

    if (remote.company) {
      companyHashRef.current = JSON.stringify(remote.company);
    } else {
      // First device online — seed the shared company profile from this device.
      const local = settingsRef.current.company;
      await sync.pushCompany(local);
      companyHashRef.current = JSON.stringify(local);
    }

    pushEnabledRef.current = true;
    unsubRealtimeRef.current?.();
    unsubRealtimeRef.current = sync.subscribeWorkspace(handleRemoteEntity, handleRemoteCompany);
    setSyncStatus('synced');
  }

  function handleRemoteEntity(table: sync.EntityTable, row: sync.Row) {
    const apply = (list: any[]) => (row.deleted ? list.filter((x) => x.id !== row.id) : upsertById(list, row.data));
    if (row.deleted) delete pushedRef.current[table][row.id];
    else pushedRef.current[table][row.id] = JSON.stringify(row.data);
    if (table === 'knowledge') setSettings((s) => ({ ...s, knowledge: apply(s.knowledge) }));
    else setData((d) => ({ ...d, [table]: apply(d[table]) }));
  }

  function handleRemoteCompany(company: CompanyProfile | null) {
    if (!company) return;
    companyHashRef.current = JSON.stringify(company);
    setSettings((s) => ({ ...s, company }));
  }

  async function flushPush(d: AppData, s: Settings) {
    const collections: Record<sync.EntityTable, { id: string }[]> = {
      partners: d.partners, interactions: d.interactions, reminders: d.reminders, knowledge: s.knowledge, finances: d.finances,
    };
    try {
      setSyncStatus('syncing');
      for (const t of sync.ENTITY_TABLES) {
        const seen = pushedRef.current[t];
        const currentIds = new Set<string>();
        const upserts: { id: string }[] = [];
        for (const it of collections[t]) {
          currentIds.add(it.id);
          const j = JSON.stringify(it);
          if (seen[it.id] !== j) upserts.push(it);
        }
        const deletes = Object.keys(seen).filter((id) => !currentIds.has(id));
        await sync.pushUpserts(t, upserts);
        upserts.forEach((it) => { seen[it.id] = JSON.stringify(it); });
        await sync.pushDeletes(t, deletes);
        deletes.forEach((id) => { delete seen[id]; });
      }
      const cj = JSON.stringify(s.company);
      if (companyHashRef.current !== cj) { await sync.pushCompany(s.company); companyHashRef.current = cj; }
      setSyncStatus('synced');
    } catch {
      setSyncStatus('error');
    }
  }

  // Persist locally + push deltas to the cloud whenever state changes.
  useEffect(() => {
    if (!readyRef.current) return;
    void saveData(data);
    if (pushEnabledRef.current) {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
      pushTimerRef.current = setTimeout(() => void flushPush(data, settingsRef.current), 350);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    if (!readyRef.current) return;
    void saveSettings(settings);
    if (pushEnabledRef.current) {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
      pushTimerRef.current = setTimeout(() => void flushPush(data, settings), 350);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const signIn = useCallback((email: string, password: string) => sync.signIn(email, password), []);
  const signUp = useCallback((email: string, password: string, name: string) => sync.signUp(email, password, name), []);
  const signOut = useCallback(() => sync.signOut(), []);

  // Partners
  const getPartner = useCallback((id?: string) => (id ? data.partners.find((p) => p.id === id) : undefined), [data.partners]);
  const addPartner = useCallback((p: Partner) => setData((d) => ({ ...d, partners: [...d.partners, withAuthor(p)] })), [withAuthor]);
  const updatePartner = useCallback((p: Partner) => setData((d) => ({ ...d, partners: d.partners.map((x) => (x.id === p.id ? p : x)) })), []);
  const deletePartner = useCallback((id: string) => setData((d) => ({
    ...d,
    partners: d.partners.filter((p) => p.id !== id),
    interactions: d.interactions.filter((i) => i.partnerId !== id),
    reminders: d.reminders.filter((r) => r.partnerId !== id),
  })), []);

  // Interactions
  const addInteraction = useCallback((i: Interaction) => setData((d) => ({ ...d, interactions: [...d.interactions, withAuthor(i)] })), [withAuthor]);
  const updateInteraction = useCallback((i: Interaction) => setData((d) => ({ ...d, interactions: d.interactions.map((x) => (x.id === i.id ? i : x)) })), []);

  // Reminders
  const addReminder = useCallback((r: Reminder) => setData((d) => ({ ...d, reminders: [withAuthor(r), ...d.reminders] })), [withAuthor]);
  const addReminders = useCallback((r: Reminder[]) => setData((d) => ({ ...d, reminders: [...r.map(withAuthor), ...d.reminders] })), [withAuthor]);
  const toggleReminder = useCallback((id: string) => setData((d) => ({ ...d, reminders: d.reminders.map((r) => (r.id === id ? { ...r, isDone: !r.isDone } : r)) })), []);
  const deleteReminder = useCallback((id: string) => setData((d) => ({ ...d, reminders: d.reminders.filter((r) => r.id !== id) })), []);
  const replaceAutoReminders = useCallback((partnerId: string, next: Reminder[]) => setData((d) => ({
    ...d,
    reminders: [...next.map(withAuthor), ...d.reminders.filter((r) => !(r.partnerId === partnerId && r.isAuto && !r.isDone))],
  })), [withAuthor]);

  // Chat (stays on-device — it's a personal assistant scratchpad, not shared)
  const addChat = useCallback((m: ChatMessage) => setData((d) => ({ ...d, chat: [...d.chat, m] })), []);
  const clearChat = useCallback(() => setData((d) => ({ ...d, chat: [] })), []);

  // Settings (knowledge + company sync; the rest stay on-device)
  const patchSettings = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);
  const updateCompany = useCallback((c: CompanyProfile) => setSettings((s) => ({ ...s, company: c })), []);
  const setModel = useCallback((role: AgentRole, model: ClaudeModelId) => setSettings((s) => ({ ...s, models: { ...s.models, [role]: model } })), []);
  const applyPreset = useCallback((id: PresetId) => setSettings((s) => ({ ...s, models: presetModels(id) })), []);
  const addKnowledge = useCallback((title: string, content: string) => setSettings((s) => ({
    ...s,
    knowledge: [{ id: newId(), title: title.trim() || 'Untitled note', content, createdAt: nowISO(), addedBy: userNameRef.current ?? undefined }, ...s.knowledge],
  })), []);
  const addKnowledgeFile = useCallback(async (doc: ImportedDoc) => {
    const id = newId();
    let fileName: string | undefined, filePath: string | undefined, mimeType: string | undefined;
    if (doc.original && isSupabaseConfigured && session) {
      try {
        const safe = doc.original.fileName.replace(/[^\w.\-]+/g, '_');
        const path = `${session.user.id}/${id}-${safe}`;
        await sync.uploadOriginal(doc.original.localUri, path, doc.original.mimeType);
        fileName = doc.original.fileName;
        filePath = path;
        mimeType = doc.original.mimeType;
      } catch {
        // Original upload is best-effort — the extracted text still syncs.
      }
    }
    setSettings((s) => ({
      ...s,
      knowledge: [{ id, title: doc.title.trim() || 'Untitled note', content: doc.content, createdAt: nowISO(), addedBy: userNameRef.current ?? undefined, fileName, filePath, mimeType }, ...s.knowledge],
    }));
  }, [session]);
  const removeKnowledge = useCallback((id: string) => setSettings((s) => ({ ...s, knowledge: s.knowledge.filter((k) => k.id !== id) })), []);
  // Replace a whole month's salon financials in one shot (re-import overwrites that period).
  const importFinances = useCallback((period: string, records: SalonFinance[]) => setData((d) => ({
    ...d,
    finances: [...records.map(withAuthor), ...d.finances.filter((f) => f.period !== period)],
  })), [withAuthor]);
  const openOriginal = useCallback((doc: KnowledgeDoc) => {
    if (!doc.filePath) throw new Error('No original file for this note.');
    return sync.signedUrl(doc.filePath);
  }, []);

  // API key (per-device, never synced)
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
  const resetAll = useCallback(() => setData((d) => ({ ...EMPTY_DATA, chat: d.chat, finances: d.finances })), []);

  const value: StoreValue = {
    ready, data, settings, hasApiKey,
    cloudEnabled: isSupabaseConfigured, authReady, session, userName: userNameRef.current, syncStatus,
    signIn, signUp, signOut,
    getPartner, addPartner, updatePartner, deletePartner,
    addInteraction, updateInteraction,
    addReminder, addReminders, toggleReminder, deleteReminder, replaceAutoReminders,
    addChat, clearChat,
    patchSettings, updateCompany, setModel, applyPreset, addKnowledge, addKnowledgeFile, removeKnowledge, openOriginal,
    importFinances,
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
