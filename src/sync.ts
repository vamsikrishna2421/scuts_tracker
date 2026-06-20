import type { Session } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';
import type { CompanyProfile, Interaction, KnowledgeDoc, Partner, Reminder, SalonFinance } from './types';

export type SyncStatus = 'off' | 'connecting' | 'syncing' | 'synced' | 'error';
export type EntityTable = 'partners' | 'interactions' | 'reminders' | 'knowledge' | 'finances';
export const ENTITY_TABLES: EntityTable[] = ['partners', 'interactions', 'reminders', 'knowledge', 'finances'];

/** A row as it lives in Supabase: the full object lives in `data`, plus tombstone metadata. */
export interface Row {
  id: string;
  data: any;
  deleted: boolean;
}

export interface PulledWorkspace {
  partners: Partner[];
  interactions: Interaction[];
  reminders: Reminder[];
  knowledge: KnowledgeDoc[];
  finances: SalonFinance[];
  company: CompanyProfile | null;
}

function client() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function getSession(): Promise<Session | null> {
  return (await client().auth.getSession()).data.session;
}

export function onAuthChange(cb: (s: Session | null) => void) {
  return client().auth.onAuthStateChange((_event, session) => cb(session));
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await client().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

export async function signUp(email: string, password: string, name: string): Promise<void> {
  const { error } = await client().auth.signUp({
    email: email.trim(),
    password,
    options: { data: { name: name.trim() } },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await client().auth.signOut();
}

/** Realtime must carry the user's token so it passes row-level security. */
export function setRealtimeAuth(token: string): void {
  client().realtime.setAuth(token);
}

// ── Pull ────────────────────────────────────────────────────────────────────--
export async function pullAll(): Promise<PulledWorkspace> {
  const c = client();
  const [p, i, r, k, f, w] = await Promise.all([
    c.from('partners').select('id,data,deleted'),
    c.from('interactions').select('id,data,deleted'),
    c.from('reminders').select('id,data,deleted'),
    c.from('knowledge').select('id,data,deleted'),
    c.from('finances').select('id,data,deleted'),
    c.from('workspace').select('company').eq('id', 'default').maybeSingle(),
  ]);
  const err = p.error || i.error || r.error || k.error || f.error || w.error;
  if (err) throw err;
  const live = <T,>(rows: Row[] | null): T[] => (rows ?? []).filter((x) => !x.deleted).map((x) => x.data as T);
  return {
    partners: live<Partner>(p.data as Row[]),
    interactions: live<Interaction>(i.data as Row[]),
    reminders: live<Reminder>(r.data as Row[]),
    knowledge: live<KnowledgeDoc>(k.data as Row[]),
    finances: live<SalonFinance>(f.data as Row[]),
    company: (w.data?.company as CompanyProfile) ?? null,
  };
}

// ── Push ──────────────────────────────────────────────────────────────────────
export async function pushUpserts(table: EntityTable, items: { id: string }[]): Promise<void> {
  if (!items.length) return;
  const now = new Date().toISOString();
  const rows = items.map((it) => ({ id: it.id, data: it, deleted: false, updated_at: now }));
  const { error } = await client().from(table).upsert(rows);
  if (error) throw error;
}

export async function pushDeletes(table: EntityTable, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const now = new Date().toISOString();
  const rows = ids.map((id) => ({ id, data: {}, deleted: true, updated_at: now }));
  const { error } = await client().from(table).upsert(rows);
  if (error) throw error;
}

export async function pushCompany(company: CompanyProfile): Promise<void> {
  const { error } = await client()
    .from('workspace')
    .upsert({ id: 'default', company, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// ── Realtime ───────────────────────────────────────────────────────────────--
export function subscribeWorkspace(
  onEntity: (table: EntityTable, row: Row) => void,
  onCompany: (company: CompanyProfile | null) => void,
): () => void {
  const c = client();
  const ch = c.channel('scuts-workspace');
  for (const t of ENTITY_TABLES) {
    ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, (payload) => {
      const row = (payload.new ?? payload.old) as Row;
      if (row?.id) onEntity(t, row);
    });
  }
  ch.on('postgres_changes', { event: '*', schema: 'public', table: 'workspace' }, (payload) => {
    onCompany(((payload.new as any)?.company as CompanyProfile) ?? null);
  });
  ch.subscribe();
  return () => {
    void c.removeChannel(ch);
  };
}

// ── Storage: original uploaded files ───────────────────────────────────────────
const BUCKET = 'documents';
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Decode base64 to bytes without relying on atob (not available in RN). */
function base64ToBytes(b64: string): Uint8Array {
  const s = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const rem = s.length % 4;
  const main = s.length - rem;
  const out: number[] = [];
  for (let p = 0; p < main; p += 4) {
    const a = B64.indexOf(s[p]), b = B64.indexOf(s[p + 1]), c = B64.indexOf(s[p + 2]), d = B64.indexOf(s[p + 3]);
    out.push((a << 2) | (b >> 4), ((b & 15) << 4) | (c >> 2), ((c & 3) << 6) | d);
  }
  if (rem === 2) {
    const a = B64.indexOf(s[main]), b = B64.indexOf(s[main + 1]);
    out.push((a << 2) | (b >> 4));
  } else if (rem === 3) {
    const a = B64.indexOf(s[main]), b = B64.indexOf(s[main + 1]), c = B64.indexOf(s[main + 2]);
    out.push((a << 2) | (b >> 4), ((b & 15) << 4) | (c >> 2));
  }
  return new Uint8Array(out);
}

export async function uploadOriginal(localUri: string, path: string, contentType: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
  const bytes = base64ToBytes(base64);
  const { error } = await client().storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true });
  if (error) throw error;
  return path;
}

/** A short-lived URL the device can open to view/download the original file. */
export async function signedUrl(path: string): Promise<string> {
  const { data, error } = await client().storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
