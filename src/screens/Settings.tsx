import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiKeyEditor } from '../components/ApiKeyEditor';
import { Card, PrimaryButton, SecondaryButton, SectionHeader, TextField } from '../components/ui';
import { Logo } from './Onboarding';
import { matchedPreset, PRESETS } from '../presets';
import { useStore } from '../store';
import { C, MODELS, R, S, agentMeta, modelMeta } from '../theme';
import { AGENT_ROLES, AgentRole, ClaudeModelId, CompanyProfile, Founder, newId } from '../types';

export default function Settings() {
  const store = useStore();
  const { settings, hasApiKey, setModel, applyPreset, patchSettings, removeKnowledge, exportJSON, resetAll } = store;
  const insets = useSafeAreaInsets();
  const [showCompany, setShowCompany] = useState(false);
  const [showKnowledge, setShowKnowledge] = useState(false);

  const preset = matchedPreset(settings.models);

  const onReset = () => {
    Alert.alert('Clear all partners, notes and reminders?', 'Your API key and company profile are kept.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear everything', style: 'destructive', onPress: resetAll },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: S.screen, paddingTop: insets.top + 6, gap: S.gap }}>
      <Text style={styles.h1}>Settings</Text>

      {/* Claude API */}
      <Card>
        <SectionHeader title="Claude API key" subtitle={hasApiKey ? 'Connected' : 'Not set'} />
        <View style={{ height: 12 }} />
        <ApiKeyEditor />
      </Card>

      {/* Intelligence */}
      <Card>
        <SectionHeader title="Intelligence & models" subtitle="Pick which model powers each agent" />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {PRESETS.map((p) => (
            <Pressable key={p.id} onPress={() => applyPreset(p.id)} style={[styles.preset, preset === p.id && { backgroundColor: C.indigo }]}>
              <Text style={[styles.presetText, preset === p.id && { color: C.white }]}>{p.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.presetDetail}>{(PRESETS.find((p) => p.id === preset)?.detail) ?? 'Custom — each agent set individually.'}</Text>
        <View style={{ height: 8 }} />
        {AGENT_ROLES.map((role) => (
          <View key={role} style={styles.agentRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Ionicons name={agentMeta(role).icon as any} size={16} color={C.indigo} />
              <Text style={styles.agentName}>{agentMeta(role).name}</Text>
            </View>
            <ModelPicker value={settings.models[role]} onChange={(m) => setModel(role, m)} />
          </View>
        ))}
      </Card>

      {/* Knowledge */}
      <Card>
        <SectionHeader title="What the agents learn from" subtitle="The more you tell it, the sharper its help" />
        <View style={{ height: 10 }} />
        <Row icon="business" tint={C.teal} title="Company profile" value={settings.company.name} onPress={() => setShowCompany(true)} />
        <View style={styles.divider} />
        <Row icon="library" tint={C.amber} title="Knowledge base" value={`${settings.knowledge.length} doc${settings.knowledge.length === 1 ? '' : 's'}`} onPress={() => setShowKnowledge(true)} />
      </Card>

      {/* Preferences */}
      <Card>
        <SectionHeader title="Preferences" />
        <View style={{ height: 8 }} />
        <View style={styles.prefRow}>
          <Text style={styles.prefText}>Auto-run analysis on new notes</Text>
          <Switch value={settings.autoRun} onValueChange={(v) => patchSettings({ autoRun: v })} trackColor={{ true: C.indigo }} />
        </View>
        <View style={styles.divider} />
        <View style={styles.prefRow}>
          <Text style={styles.prefText}>Default follow-up cadence</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Pressable onPress={() => patchSettings({ defaultCadenceDays: Math.max(1, settings.defaultCadenceDays - 1) })} hitSlop={8}><Ionicons name="remove-circle" size={26} color={C.indigo} /></Pressable>
            <Text style={{ fontSize: 15, fontWeight: '700', color: C.text, minWidth: 48, textAlign: 'center' }}>{settings.defaultCadenceDays}d</Text>
            <Pressable onPress={() => patchSettings({ defaultCadenceDays: Math.min(30, settings.defaultCadenceDays + 1) })} hitSlop={8}><Ionicons name="add-circle" size={26} color={C.indigo} /></Pressable>
          </View>
        </View>
      </Card>

      {/* Data */}
      <Card>
        <SectionHeader title="Data" />
        <View style={{ height: 8 }} />
        <Row icon="share-outline" tint={C.indigo} title="Export all data (JSON)" onPress={() => void Share.share({ message: exportJSON() })} />
        <View style={styles.divider} />
        <Row icon="trash-outline" tint={C.negative} title="Clear all partners & notes" onPress={onReset} danger />
      </Card>

      {/* About */}
      <View style={{ alignItems: 'center', gap: 8, paddingVertical: 16 }}>
        <Logo size={52} />
        <Text style={{ fontSize: 16, fontWeight: '800', color: C.text }}>Scuts Tracker</Text>
        <Text style={{ fontSize: 12, color: C.textDim }}>Version 1.0.0</Text>
        <Text style={{ fontSize: 12, color: C.textDim, textAlign: 'center', paddingHorizontal: 24 }}>
          Built for {settings.company.founders.map((f) => f.name).join(' & ') || 'Scuts'} — transparent, better-reviewed, fairly-priced salon experiences.
        </Text>
      </View>
      <View style={{ height: 12 }} />

      <CompanyModal visible={showCompany} onClose={() => setShowCompany(false)} />
      <KnowledgeModal visible={showKnowledge} onClose={() => setShowKnowledge(false)} />
    </ScrollView>
  );
}

function ModelPicker({ value, onChange }: { value: ClaudeModelId; onChange: (m: ClaudeModelId) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {MODELS.map((m) => {
        const on = value === m;
        return (
          <Pressable key={m} onPress={() => onChange(m)} style={[styles.seg, on && { backgroundColor: C.indigo, borderColor: C.indigo }]}>
            <Text style={[styles.segText, on && { color: C.white }]}>{modelMeta(m).label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Row({ icon, tint, title, value, onPress, danger }: { icon: string; tint: string; title: string; value?: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: tint }]}><Ionicons name={icon as any} size={16} color={C.white} /></View>
      <Text style={[styles.rowTitle, danger && { color: C.negative }]}>{title}</Text>
      <View style={{ flex: 1 }} />
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={C.textFaint} style={{ marginLeft: 6 }} />
    </Pressable>
  );
}

// MARK: Company modal
function CompanyModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { settings, updateCompany } = useStore();
  const c = settings.company;
  const [name, setName] = useState(c.name);
  const [tagline, setTagline] = useState(c.tagline);
  const [about, setAbout] = useState(c.about);
  const [values, setValues] = useState(c.valueProps.join('\n'));
  const [diffs, setDiffs] = useState(c.differentiators.join('\n'));
  const [pricing, setPricing] = useState(c.pricingNotes);
  const [target, setTarget] = useState(c.targetCustomer);
  const [founders, setFounders] = useState<Founder[]>(c.founders);

  const lines = (t: string) => t.split('\n').map((x) => x.trim()).filter(Boolean);
  const save = () => {
    const next: CompanyProfile = { name, tagline, about, valueProps: lines(values), differentiators: lines(diffs), pricingNotes: pricing, targetCustomer: target, founders };
    updateCompany(next);
    onClose();
  };

  return (
    <ModalShell visible={visible} title="Company profile" onClose={onClose} onSave={save}>
      <Field label="Name"><TextField value={name} onChangeText={setName} /></Field>
      <Field label="Tagline"><TextField value={tagline} onChangeText={setTagline} multiline /></Field>
      <Field label="About"><TextField value={about} onChangeText={setAbout} multiline style={{ minHeight: 90, textAlignVertical: 'top' }} /></Field>
      <Field label="Value to the salon (one per line)"><TextField value={values} onChangeText={setValues} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} /></Field>
      <Field label="Differentiators (one per line)"><TextField value={diffs} onChangeText={setDiffs} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} /></Field>
      <Field label="Pricing stance"><TextField value={pricing} onChangeText={setPricing} multiline /></Field>
      <Field label="Target salon owner"><TextField value={target} onChangeText={setTarget} multiline /></Field>
      <Field label="Founders">
        {founders.map((f, i) => (
          <View key={f.id} style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <View style={{ flex: 1 }}><TextField value={f.name} onChangeText={(v) => setFounders((arr) => arr.map((x, j) => (j === i ? { ...x, name: v } : x)))} placeholder="Name" /></View>
            <View style={{ flex: 1 }}><TextField value={f.role} onChangeText={(v) => setFounders((arr) => arr.map((x, j) => (j === i ? { ...x, role: v } : x)))} placeholder="Role" /></View>
            <Pressable onPress={() => setFounders((arr) => arr.filter((_, j) => j !== i))} hitSlop={6}><Ionicons name="remove-circle" size={26} color={C.negative} /></Pressable>
          </View>
        ))}
        <Pressable onPress={() => setFounders((arr) => [...arr, { id: newId(), name: '', role: 'Co-founder' }])} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <Ionicons name="add" size={18} color={C.indigo} /><Text style={{ color: C.indigo, fontWeight: '700' }}>Add founder</Text>
        </Pressable>
      </Field>
    </ModalShell>
  );
}

// MARK: Knowledge modal
function KnowledgeModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { settings, addKnowledge, removeKnowledge } = useStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [importError, setImportError] = useState('');

  const add = () => {
    if (!content.trim()) return;
    addKnowledge(title, content);
    setTitle('');
    setContent('');
  };

  const attach = async () => {
    setImportError('');
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (res.canceled) return;
      const file = res.assets[0];
      if (!file) return;
      const lower = (file.name || '').toLowerCase();
      if (lower.endsWith('.pdf') || lower.endsWith('.doc') || lower.endsWith('.docx') || (file.mimeType || '').includes('pdf')) {
        setImportError('PDF / Word import isn’t supported yet — open the file, copy the text, and paste it above.');
        return;
      }
      const text = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
      if (!text.trim()) { setImportError('That file looks empty.'); return; }
      addKnowledge((file.name || 'Uploaded note').replace(/\.[^.]+$/, ''), text);
    } catch {
      setImportError('Couldn’t read that file as text. Try a .txt or .md file, or paste the content above.');
    }
  };

  return (
    <ModalShell visible={visible} title="Knowledge base" onClose={onClose}>
      <Text style={{ fontSize: 13.5, color: C.textDim }}>
        Paste anything that helps the agents understand Scuts — a pitch script, FAQ, pricing sheet, objection-handling notes, or success stories.
      </Text>
      <Field label="Add a note">
        <TextField value={title} onChangeText={setTitle} placeholder="Title (e.g. Objection-handling playbook)" />
        <TextField value={content} onChangeText={setContent} placeholder="Paste content…" multiline style={{ minHeight: 110, textAlignVertical: 'top', marginTop: 8 }} />
        <View style={{ marginTop: 10 }}><PrimaryButton title="Add to knowledge" icon="add" onPress={add} disabled={!content.trim()} /></View>
        <View style={{ marginTop: 8 }}><SecondaryButton title="Attach a text file (.txt, .md, .csv)" icon="document-attach" onPress={attach} /></View>
        {importError ? <Text style={{ color: C.negative, fontSize: 12.5, marginTop: 6 }}>{importError}</Text> : null}
      </Field>
      {settings.knowledge.length > 0 ? (
        <Field label="Saved">
          {settings.knowledge.map((doc) => (
            <View key={doc.id} style={styles.docRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '600', color: C.text }}>{doc.title}</Text>
                <Text style={{ fontSize: 12, color: C.textDim }} numberOfLines={2}>{doc.content.slice(0, 120)}</Text>
              </View>
              <Pressable onPress={() => removeKnowledge(doc.id)} hitSlop={6}><Ionicons name="trash" size={18} color={C.negative} /></Pressable>
            </View>
          ))}
        </Field>
      ) : null}
    </ModalShell>
  );
}

function ModalShell({ visible, title, onClose, onSave, children }: { visible: boolean; title: string; onClose: () => void; onSave?: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={styles.modalBar}>
          <Pressable onPress={onClose} hitSlop={8}><Text style={{ color: C.textDim, fontSize: 15 }}>{onSave ? 'Cancel' : 'Done'}</Text></Pressable>
          <Text style={{ fontSize: 16, fontWeight: '800', color: C.text }}>{title}</Text>
          {onSave ? <Pressable onPress={onSave} hitSlop={8}><Text style={{ color: C.indigo, fontWeight: '800', fontSize: 15 }}>Save</Text></Pressable> : <View style={{ width: 40 }} />}
        </View>
        <ScrollView contentContainerStyle={{ padding: S.screen, gap: 14 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>{children}</ScrollView>
      </View>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  h1: { fontSize: 32, fontWeight: '900', color: C.text },
  preset: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: C.elevated, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  presetText: { fontSize: 13, fontWeight: '700', color: C.text },
  presetDetail: { fontSize: 12, color: C.textDim, marginTop: 8 },
  agentRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border },
  agentName: { fontSize: 14.5, fontWeight: '600', color: C.text },
  seg: { flex: 1, paddingVertical: 8, borderRadius: 9, borderWidth: 1, borderColor: C.border, backgroundColor: C.elevated, alignItems: 'center' },
  segText: { fontSize: 12, fontWeight: '700', color: C.textDim },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  rowIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowTitle: { fontSize: 15, color: C.text },
  rowValue: { fontSize: 14, color: C.textDim },
  divider: { height: 1, backgroundColor: C.border },
  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  prefText: { fontSize: 15, color: C.text, flex: 1 },
  modalBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.screen, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  fieldLabel: { fontSize: 12.5, fontWeight: '700', color: C.textDim, textTransform: 'uppercase', letterSpacing: 0.4 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 12, padding: 12 },
});
