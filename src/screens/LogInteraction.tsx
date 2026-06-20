import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddPartnerModal } from '../components/AddPartnerModal';
import { InterestRing } from '../components/Gauges';
import { ReminderRow } from '../components/ReminderRow';
import { Avatar, Card, MomentumBadge, PrimaryButton, SecondaryButton, SectionHeader } from '../components/ui';
import { errorMessage } from '../claude';
import { nowISO, shortDate } from '../format';
import { useNav } from '../nav';
import { displayTitle, initials, interactionsFor } from '../select';
import { analyzeSentiment, buildStrategy, makeReminders, planFollowUp, summarize } from '../semanticLayer';
import { useStore } from '../store';
import { C, S } from '../theme';
import { Interaction, Partner, PipelineStage, ProcessingState, Reminder, newId } from '../types';

const STEPS: ProcessingState[] = ['summarizing', 'analyzing', 'strategizing', 'planning'];
const STEP_LABEL: Record<string, string> = {
  summarizing: 'Summarizing the note',
  analyzing: 'Reading sentiment',
  strategizing: 'Building strategy',
  planning: 'Planning follow-up',
};

interface Outcome { partner: Partner; reminders: Reminder[] }

export default function LogInteraction({ presetPartnerId, onClose }: { presetPartnerId?: string; onClose?: () => void }) {
  const store = useStore();
  const { data, settings, getPartner, agentConfig, addInteraction, updatePartner, replaceAutoReminders, hasApiKey } = store;
  const { push } = useNav();
  const insets = useSafeAreaInsets();

  const [selectedId, setSelectedId] = useState<string | undefined>(presetPartnerId);
  const [note, setNote] = useState('');
  const [baseline, setBaseline] = useState('');
  const [runAnalysis, setRunAnalysis] = useState(settings.autoRun);
  const [showPicker, setShowPicker] = useState(false);

  const [proc, setProc] = useState<ProcessingState | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [procError, setProcError] = useState('');

  // Voice — lazy require so a missing native module never crashes the screen.
  const speech = useVoice();
  useEffect(() => {
    if (speech.transcript) setNote((baseline ? baseline + ' ' : '') + speech.transcript);
  }, [speech.transcript]); // eslint-disable-line react-hooks/exhaustive-deps

  const partner = getPartner(selectedId);
  const canProcess = !!partner && note.trim().length > 0;

  const toggleMic = () => {
    if (speech.recording) speech.stop();
    else { setBaseline(note); speech.start(); }
  };

  const run = async () => {
    if (!partner) return;
    speech.stop();
    const text = note.trim();
    const source = speech.transcript ? 'voice' : 'text';
    setProcError('');
    setOutcome(null);
    setProc('queued');

    let interaction: Interaction = {
      id: newId(), partnerId: partner.id, createdAt: nowISO(), source, rawText: text,
      summary: '', keyPoints: [], commitments: [], objections: [], processingState: 'queued',
    };
    let updated: Partner = { ...partner, lastContactAt: nowISO() };

    const cfg = agentConfig();
    if (!runAnalysis || !cfg) {
      interaction.processingState = 'completed';
      addInteraction(interaction);
      updatePartner(updated);
      if (!cfg) setProcError('Saved your note. Add a Claude API key in Settings to unlock the agents.');
      setOutcome({ partner: updated, reminders: [] });
      setProc('completed');
      return;
    }

    try {
      setProc('summarizing');
      const summary = await summarize(text, partner, cfg);
      interaction = { ...interaction, summary: summary.summary, keyPoints: summary.keyPoints, commitments: summary.commitments, objections: summary.objections };

      setProc('analyzing');
      const sentiment = await analyzeSentiment(text, summary.summary, partner, cfg);
      interaction.sentiment = sentiment;
      updated = { ...updated, interestScore: sentiment.interestScore, momentum: sentiment.momentum, latestSentiment: sentiment };
      if (sentiment.suggestedStage && advanceAllowed(partner.stage, sentiment.suggestedStage)) updated.stage = sentiment.suggestedStage;

      setProc('strategizing');
      const history = interactionsFor(data, partner.id);
      const strategy = await buildStrategy(updated, sentiment, history, cfg);
      updated.latestStrategy = strategy;

      setProc('planning');
      const followUp = await planFollowUp(updated, sentiment, strategy, cfg);
      updated.latestFollowUp = followUp;
      updated.nextFollowUpAt = followUp.nextFollowUpAt;

      interaction.processingState = 'completed';
      const reminders = makeReminders(updated, sentiment, strategy, followUp);
      addInteraction(interaction);
      updatePartner(updated);
      replaceAutoReminders(partner.id, reminders);
      setOutcome({ partner: updated, reminders });
      setProc('completed');
    } catch (e) {
      interaction.processingState = 'failed';
      interaction.errorMessage = errorMessage(e);
      addInteraction(interaction);
      updatePartner(updated);
      setProcError(errorMessage(e));
      setOutcome({ partner: updated, reminders: [] });
      setProc('failed');
    }
  };

  const reset = () => { setProc(null); setOutcome(null); setProcError(''); setNote(''); setBaseline(''); speech.reset(); };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 4 }]}>
      <View style={styles.header}>
        {onClose ? <Pressable onPress={onClose} hitSlop={8}><Ionicons name="chevron-back" size={26} color={C.text} /></Pressable> : null}
        <Text style={styles.h1}>Log an update</Text>
        <View style={{ width: 26 }} />
      </View>

      {proc === null ? (
        <ScrollView contentContainerStyle={{ padding: S.screen, gap: S.gap }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          {/* Partner */}
          <Pressable onPress={() => setShowPicker(true)}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                {partner ? <Avatar label={initials(partner)} size={48} /> : <Ionicons name="person-add" size={34} color={C.indigo} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{partner ? displayTitle(partner) : 'Choose salon owner'}</Text>
                  <Text style={styles.cardSub}>{partner ? partner.name : 'Who is this update about?'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={C.textFaint} />
              </View>
            </Card>
          </Pressable>

          {/* Note */}
          <Card>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Speak or type what happened with the salon owner…"
              placeholderTextColor={C.textFaint}
              multiline
              style={styles.noteInput}
            />
            <View style={{ alignItems: 'center', gap: 8, marginTop: 8 }}>
              <Pressable onPress={toggleMic} style={[styles.mic, { backgroundColor: speech.recording ? C.negative : C.indigo }]}>
                <Ionicons name={speech.recording ? 'stop' : 'mic'} size={28} color={C.white} />
              </Pressable>
              <Text style={{ fontSize: 13, color: speech.recording ? C.negative : C.textDim }}>{speech.recording ? 'Listening… tap to stop' : 'Tap to dictate'}</Text>
              {speech.error ? <Text style={styles.voiceErr}>{speech.error}</Text> : null}
            </View>
          </Card>

          {/* Options */}
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.optTitle}>Run AI analysis now</Text>
                <Text style={styles.optSub}>Summarize, read sentiment, build strategy & follow-up.</Text>
              </View>
              <Switch value={runAnalysis} onValueChange={setRunAnalysis} trackColor={{ true: C.indigo }} />
            </View>
            {runAnalysis && !hasApiKey ? (
              <Text style={styles.warn}>No API key set — the note will be saved without analysis.</Text>
            ) : null}
          </Card>

          <PrimaryButton title={runAnalysis ? 'Process update' : 'Save note'} icon="sparkles" onPress={run} disabled={!canProcess} />
          <View style={{ height: 12 }} />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: S.screen, gap: S.gap }}>
          {proc === 'completed' && outcome && !procError ? (
            <ResultView outcome={outcome} onAnother={reset} onView={() => push({ kind: 'partnerDetail', partnerId: outcome.partner.id })} />
          ) : proc === 'failed' || procError ? (
            <NoticeView message={procError} onAnother={reset} onView={() => outcome && push({ kind: 'partnerDetail', partnerId: outcome.partner.id })} />
          ) : (
            <ProgressView proc={proc} partnerName={partner ? displayTitle(partner) : ''} />
          )}
        </ScrollView>
      )}

      <PartnerPicker
        visible={showPicker}
        selectedId={selectedId}
        onClose={() => setShowPicker(false)}
        onSelect={(id) => { setSelectedId(id); setShowPicker(false); }}
      />
    </View>
  );
}

function ProgressView({ proc, partnerName }: { proc: ProcessingState | null; partnerName: string }) {
  const current = proc ? STEPS.indexOf(proc) : -1;
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <ActivityIndicator color={C.indigo} />
        <Text style={styles.cardTitle}>Working through your note{partnerName ? ` on ${partnerName}` : ''}…</Text>
      </View>
      {STEPS.map((step, i) => {
        const done = proc === 'completed' || i < current;
        const active = i === current;
        return (
          <View key={step} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
            {done ? <Ionicons name="checkmark-circle" size={22} color={C.indigo} />
              : active ? <ActivityIndicator size="small" color={C.indigo} style={{ width: 22 }} />
              : <Ionicons name="ellipse-outline" size={22} color={C.textFaint} />}
            <Text style={{ fontSize: 14.5, fontWeight: active ? '700' : '400', color: active || done ? C.text : C.textDim }}>{STEP_LABEL[step]}</Text>
          </View>
        );
      })}
    </Card>
  );
}

function ResultView({ outcome, onAnother, onView }: { outcome: Outcome; onAnother: () => void; onView: () => void }) {
  const s = outcome.partner.latestSentiment;
  const f = outcome.partner.latestFollowUp;
  return (
    <>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Ionicons name="checkmark-circle" size={20} color={C.positive} />
          <Text style={[styles.cardTitle, { color: C.positive }]}>Analysis complete</Text>
        </View>
        {s ? (
          <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
            <InterestRing score={s.interestScore} size={72} />
            <View style={{ flex: 1, gap: 6 }}>
              <MomentumBadge momentum={s.momentum} />
              <Text style={{ fontSize: 14, color: C.text }}>{s.headline}</Text>
            </View>
          </View>
        ) : null}
        {f ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 }}>
            <Ionicons name="calendar" size={18} color={C.indigo} />
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>Next: {f.channel} {shortDate(f.nextFollowUpAt)}</Text>
              <Text style={{ fontSize: 12, color: C.textDim }}>Every {f.cadenceDays} day{f.cadenceDays === 1 ? '' : 's'}</Text>
            </View>
          </View>
        ) : null}
      </Card>

      {outcome.reminders.length > 0 ? (
        <Card>
          <SectionHeader title="New focus points" subtitle="Added to your Today list" />
          <View style={{ height: 6 }} />
          {outcome.reminders.map((r) => <ReminderRow key={r.id} reminder={r} showPartner={false} />)}
        </Card>
      ) : null}

      <PrimaryButton title="View partner" onPress={onView} />
      <SecondaryButton title="Log another update" onPress={onAnother} />
    </>
  );
}

function NoticeView({ message, onAnother, onView }: { message: string; onAnother: () => void; onView: () => void }) {
  return (
    <>
      <Card>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <Ionicons name="warning" size={36} color={C.caution} />
          <Text style={styles.cardTitle}>Note saved</Text>
          <Text style={{ fontSize: 14, color: C.textDim, textAlign: 'center' }}>{message || 'Something went wrong during analysis, but your note is safe.'}</Text>
        </View>
      </Card>
      <PrimaryButton title="View partner" onPress={onView} />
      <SecondaryButton title="Log another update" onPress={onAnother} />
    </>
  );
}

function PartnerPicker({ visible, selectedId, onClose, onSelect }: { visible: boolean; selectedId?: string; onClose: () => void; onSelect: (id: string) => void }) {
  const { data } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const list = useMemo(() => [...data.partners].sort((a, b) => displayTitle(a).localeCompare(displayTitle(b))), [data.partners]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={styles.pickerBar}>
          <Pressable onPress={onClose} hitSlop={8}><Text style={{ color: C.textDim, fontSize: 15 }}>Cancel</Text></Pressable>
          <Text style={{ fontSize: 16, fontWeight: '800', color: C.text }}>Choose owner</Text>
          <Pressable onPress={() => setShowAdd(true)} hitSlop={8}><Ionicons name="add" size={24} color={C.indigo} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: S.screen, gap: 8 }}>
          {list.map((p) => (
            <Pressable key={p.id} onPress={() => onSelect(p.id)} style={styles.pickRow}>
              <Avatar label={initials(p)} size={38} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>{displayTitle(p)}</Text>
                <Text style={{ fontSize: 12, color: C.textDim }}>{p.name}</Text>
              </View>
              {p.id === selectedId ? <Ionicons name="checkmark" size={20} color={C.indigo} /> : null}
            </Pressable>
          ))}
        </ScrollView>
        <AddPartnerModal visible={showAdd} onClose={() => setShowAdd(false)} onSaved={(p) => { setShowAdd(false); onSelect(p.id); }} />
      </View>
    </Modal>
  );
}

// Voice hook wrapper that degrades gracefully if the native module is unavailable.
function useVoice() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useSpeechRecognizer } = require('../voice') as typeof import('../voice');
    return useSpeechRecognizer();
  } catch {
    return { recording: false, transcript: '', error: null as string | null, start: () => {}, stop: () => {}, reset: () => {}, setTranscript: () => {} };
  }
}

function advanceAllowed(current: PipelineStage, suggested: PipelineStage): boolean {
  if (current === 'partner') return suggested === 'partner';
  if (current === 'lost') return false;
  return true;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.screen, paddingVertical: 8 },
  h1: { fontSize: 18, fontWeight: '800', color: C.text },
  cardTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  cardSub: { fontSize: 13.5, color: C.textDim, marginTop: 1 },
  noteInput: { minHeight: 120, fontSize: 15, color: C.text, textAlignVertical: 'top' },
  mic: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  voiceErr: { fontSize: 12, color: C.negative, textAlign: 'center' },
  optTitle: { fontSize: 14.5, fontWeight: '600', color: C.text },
  optSub: { fontSize: 12.5, color: C.textDim, marginTop: 1 },
  warn: { fontSize: 12, color: C.caution, marginTop: 10 },
  pickerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.screen, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 14, padding: 12 },
});
