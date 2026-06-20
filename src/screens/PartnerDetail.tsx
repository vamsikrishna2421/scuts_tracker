import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Dimensions, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddPartnerModal } from '../components/AddPartnerModal';
import { InterestRing, Sparkline } from '../components/Gauges';
import { ReminderRow } from '../components/ReminderRow';
import { Avatar, Card, MomentumBadge, Pill, PrimaryButton, SectionHeader, StageBadge, TextField } from '../components/ui';
import { errorMessage } from '../claude';
import { dayTime, isOverdue, nowISO, relative, shortDate } from '../format';
import { useNav } from '../nav';
import { displayTitle, initials, interactionsFor, remindersFor } from '../select';
import { buildStrategy, makeReminders, planFollowUp } from '../semanticLayer';
import { useStore } from '../store';
import { C, S } from '../theme';
import { Interaction, Reminder, newId } from '../types';

const CARD_W = Dimensions.get('window').width - S.screen * 2 - 36;

export default function PartnerDetail({ partnerId }: { partnerId: string }) {
  const store = useStore();
  const { data, getPartner, deletePartner, toggleReminder, addReminder, updatePartner, replaceAutoReminders, agentConfig } = store;
  const { pop, push } = useNav();
  const insets = useSafeAreaInsets();

  const [showEdit, setShowEdit] = useState(false);
  const [newReminder, setNewReminder] = useState('');
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenError, setRegenError] = useState('');

  const partner = getPartner(partnerId);
  if (!partner) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={pop} style={{ padding: S.screen }}><Ionicons name="chevron-back" size={26} color={C.text} /></Pressable>
        <Text style={{ textAlign: 'center', color: C.textDim, marginTop: 40 }}>Owner not found.</Text>
      </View>
    );
  }

  const interactions = interactionsFor(data, partner.id);
  const reminders = remindersFor(data, partner.id);
  const trend = interactions.filter((i) => i.sentiment).map((i) => i.sentiment!.interestScore).reverse();
  const digits = (s: string) => s.replace(/\D/g, '');

  const confirmDelete = () => {
    Alert.alert('Delete this salon owner and all their notes?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deletePartner(partner.id); pop(); } },
    ]);
  };

  const regenerate = async () => {
    const cfg = agentConfig();
    if (!cfg) { setRegenError('Add a Claude API key in Settings.'); return; }
    if (!partner.latestSentiment) return;
    setRegenError('');
    setRegenLoading(true);
    try {
      const history = interactionsFor(data, partner.id);
      const strategy = await buildStrategy(partner, partner.latestSentiment, history, cfg);
      const followUp = await planFollowUp(partner, partner.latestSentiment, strategy, cfg);
      const updated = { ...partner, latestStrategy: strategy, latestFollowUp: followUp, nextFollowUpAt: followUp.nextFollowUpAt };
      updatePartner(updated);
      replaceAutoReminders(partner.id, makeReminders(updated, partner.latestSentiment, strategy, followUp));
    } catch (e) {
      setRegenError(errorMessage(e));
    } finally {
      setRegenLoading(false);
    }
  };

  const addManual = () => {
    const t = newReminder.trim();
    if (!t) return;
    addReminder({ id: newId(), partnerId: partner.id, partnerName: displayTitle(partner), title: t, detail: '', priority: 'medium', type: 'nudge', isDone: false, isAuto: false, createdAt: nowISO() });
    setNewReminder('');
  };

  const s = partner.latestSentiment;
  const strat = partner.latestStrategy;
  const follow = partner.latestFollowUp;

  return (
    <View style={styles.screen}>
      <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={pop} hitSlop={8}><Ionicons name="chevron-back" size={26} color={C.text} /></Pressable>
        <Text style={styles.barTitle} numberOfLines={1}>{displayTitle(partner)}</Text>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Pressable onPress={() => setShowEdit(true)} hitSlop={8}><Ionicons name="create-outline" size={22} color={C.text} /></Pressable>
          <Pressable onPress={confirmDelete} hitSlop={8}><Ionicons name="trash-outline" size={21} color={C.negative} /></Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: S.screen, gap: S.gap, paddingBottom: insets.bottom + 24 }}>
        {/* Header */}
        <Card>
          <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
            <Avatar label={initials(partner)} size={64} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{displayTitle(partner)}</Text>
              {partner.salonName && partner.salonName !== partner.name ? <Text style={styles.sub}>{partner.name}</Text> : null}
              {partner.location ? <Text style={styles.sub}><Ionicons name="location" size={12} color={C.textDim} /> {partner.location}</Text> : null}
            </View>
            <InterestRing score={partner.interestScore} size={66} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
            <StageBadge stage={partner.stage} />
            <MomentumBadge momentum={partner.momentum} />
            <View style={{ flex: 1 }} />
            {partner.nextFollowUpAt ? (
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: isOverdue(partner.nextFollowUpAt) ? C.negative : C.indigo }}>
                <Ionicons name="calendar" size={12} /> {shortDate(partner.nextFollowUpAt)}
              </Text>
            ) : null}
          </View>
          {partner.tags.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>{partner.tags.map((t) => <Pill key={t} label={t} color={C.neutral} />)}</View>
            </ScrollView>
          ) : null}
        </Card>

        {/* Actions */}
        <PrimaryButton title="Log an update" icon="mic" onPress={() => push({ kind: 'log', partnerId: partner.id })} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {partner.phone ? <ContactBtn icon="call" label="Call" url={`tel:${digits(partner.phone)}`} /> : null}
          {partner.phone ? <ContactBtn icon="logo-whatsapp" label="WhatsApp" url={`https://wa.me/${digits(partner.phone)}`} /> : null}
          {partner.email ? <ContactBtn icon="mail" label="Email" url={`mailto:${partner.email}`} /> : null}
        </View>

        {/* Sentiment */}
        {s ? (
          <Card>
            <SectionHeader title="Where they stand" subtitle={`Read ${relative(s.createdAt)}`} />
            <Text style={{ fontSize: 14.5, color: C.text, marginTop: 10 }}>{s.headline}</Text>
            {s.buyingSignals.length ? <Bullets title="Buying signals" items={s.buyingSignals} color={C.positive} /> : null}
            {s.concerns.length ? <Bullets title="Concerns" items={s.concerns} color={C.caution} /> : null}
          </Card>
        ) : null}

        {/* Strategy */}
        <Card>
          <SectionHeader
            title="Strategy"
            right={s ? (
              <Pressable onPress={regenerate} disabled={regenLoading} hitSlop={8}>
                <Text style={{ color: C.indigo, fontWeight: '700', fontSize: 13 }}>{regenLoading ? 'Refreshing…' : 'Refresh'}</Text>
              </Pressable>
            ) : undefined}
          />
          {strat ? (
            <View style={{ marginTop: 10, gap: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: C.indigo }}>{strat.headline}</Text>
              <Text style={{ fontSize: 14, color: C.text, lineHeight: 20 }}>{strat.approach}</Text>
              {strat.talkingPoints.length ? <Bullets title="Talking points" items={strat.talkingPoints} color={C.indigo} /> : null}
              {strat.objectionHandlers.length ? (
                <View style={{ gap: 8 }}>
                  <Text style={styles.subHead}>If they push back</Text>
                  {strat.objectionHandlers.map((h, i) => (
                    <View key={i} style={styles.objection}>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: C.caution }}>“{h.objection}”</Text>
                      <Text style={{ fontSize: 12.5, color: C.textDim, marginTop: 2 }}>{h.response}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {strat.nextBestAction ? (
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                  <Ionicons name="arrow-forward-circle" size={18} color={C.violet} style={{ marginTop: 1 }} />
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: C.text }}>{strat.nextBestAction}</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={{ fontSize: 14, color: C.textDim, marginTop: 10 }}>Log an update to generate a tailored strategy for {partner.name}.</Text>
          )}
          {regenError ? <Text style={{ color: C.negative, fontSize: 12.5, marginTop: 8 }}>{regenError}</Text> : null}
        </Card>

        {/* Follow-up */}
        {follow ? (
          <Card>
            <SectionHeader title="Follow-up plan" />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <Tile icon="megaphone" value={follow.channel} label="Channel" />
              <Tile icon="calendar" value={shortDate(follow.nextFollowUpAt)} label="Next" />
              <Tile icon="repeat" value={`${follow.cadenceDays}d`} label="Cadence" />
            </View>
            {follow.focusPoints.length ? <Bullets title="Raise these points" items={follow.focusPoints} color={C.teal} /> : null}
            {follow.rationale ? <Text style={{ fontSize: 12.5, color: C.textDim, marginTop: 10 }}>{follow.rationale}</Text> : null}
          </Card>
        ) : null}

        {/* Trend */}
        {trend.length >= 2 ? (
          <Card>
            <SectionHeader title="Interest trend" />
            <View style={{ marginTop: 8 }}><Sparkline values={trend} width={CARD_W} height={140} /></View>
          </Card>
        ) : null}

        {/* Focus points */}
        <Card>
          <SectionHeader title="Focus points" />
          <View style={{ height: 6 }} />
          {reminders.length === 0 ? (
            <Text style={{ fontSize: 14, color: C.textDim }}>No focus points yet — they appear automatically after you log an update.</Text>
          ) : (
            reminders.map((r, i) => (
              <View key={r.id}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <ReminderRow reminder={r} showPartner={false} onToggle={toggleReminder} />
              </View>
            ))
          )}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' }}>
            <View style={{ flex: 1 }}><TextField value={newReminder} onChangeText={setNewReminder} placeholder="Add your own focus point…" /></View>
            <Pressable onPress={addManual} disabled={!newReminder.trim()} hitSlop={6}>
              <Ionicons name="add-circle" size={32} color={newReminder.trim() ? C.indigo : C.textFaint} />
            </Pressable>
          </View>
        </Card>

        {/* Timeline */}
        <Card>
          <SectionHeader title="Timeline" subtitle={`${interactions.length} update${interactions.length === 1 ? '' : 's'}`} />
          <View style={{ height: 6 }} />
          {interactions.length === 0 ? (
            <Text style={{ fontSize: 14, color: C.textDim }}>No updates logged yet.</Text>
          ) : (
            interactions.map((it, i) => (
              <View key={it.id}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <InteractionCard interaction={it} />
              </View>
            ))
          )}
        </Card>
      </ScrollView>

      <AddPartnerModal visible={showEdit} onClose={() => setShowEdit(false)} existing={partner} />
    </View>
  );
}

function ContactBtn({ icon, label, url }: { icon: string; label: string; url: string }) {
  return (
    <Pressable onPress={() => void Linking.openURL(url)} style={styles.contact}>
      <Ionicons name={icon as any} size={18} color={C.indigo} />
      <Text style={{ fontSize: 11.5, color: C.indigo, marginTop: 4 }}>{label}</Text>
    </Pressable>
  );
}

function Tile({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <View style={styles.tile}>
      <Ionicons name={icon as any} size={18} color={C.indigo} />
      <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginTop: 4 }} numberOfLines={1}>{value}</Text>
      <Text style={{ fontSize: 11, color: C.textDim }}>{label}</Text>
    </View>
  );
}

function Bullets({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <View style={{ gap: 8, marginTop: 10 }}>
      <Text style={styles.subHead}>{title}</Text>
      {items.map((t, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 9 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, marginTop: 6 }} />
          <Text style={{ flex: 1, fontSize: 14, color: C.text }}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

function InteractionCard({ interaction }: { interaction: Interaction }) {
  const [open, setOpen] = useState(false);
  const hasDetail = interaction.keyPoints.length || interaction.commitments.length || interaction.objections.length || (interaction.summary !== interaction.rawText && interaction.rawText);
  return (
    <View style={{ paddingVertical: 4, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name={interaction.source === 'voice' ? 'mic' : 'document-text'} size={12} color={C.indigo} />
          <Text style={{ fontSize: 11.5, fontWeight: '600', color: C.indigo }}>{interaction.source === 'voice' ? 'Voice note' : 'Typed note'}</Text>
        </View>
        <View style={{ flex: 1 }} />
        {interaction.processingState === 'failed' ? <Ionicons name="warning" size={12} color={C.caution} style={{ marginRight: 6 }} /> : null}
        <Text style={{ fontSize: 11.5, color: C.textFaint }}>{dayTime(interaction.createdAt)}</Text>
      </View>
      <Text style={{ fontSize: 14, color: C.text }}>{interaction.summary || interaction.rawText}</Text>
      {interaction.sentiment ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 11.5, fontWeight: '700', color: C.indigo }}>Interest {interaction.sentiment.interestScore}/100</Text>
          <MomentumBadge momentum={interaction.sentiment.momentum} />
        </View>
      ) : null}
      {open ? (
        <View style={{ gap: 6, marginTop: 2 }}>
          {interaction.keyPoints.length ? <MiniGroup title="Key points" items={interaction.keyPoints} /> : null}
          {interaction.commitments.length ? <MiniGroup title="Commitments" items={interaction.commitments} /> : null}
          {interaction.objections.length ? <MiniGroup title="Objections" items={interaction.objections} /> : null}
          {interaction.summary !== interaction.rawText && interaction.rawText ? (
            <View><Text style={styles.miniHead}>Original note</Text><Text style={{ fontSize: 12.5, color: C.textDim }}>{interaction.rawText}</Text></View>
          ) : null}
        </View>
      ) : null}
      {hasDetail ? (
        <Pressable onPress={() => setOpen((v) => !v)} hitSlop={6}><Text style={{ color: C.indigo, fontSize: 12.5, fontWeight: '700' }}>{open ? 'Show less' : 'Show more'}</Text></Pressable>
      ) : null}
    </View>
  );
}

function MiniGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <View>
      <Text style={styles.miniHead}>{title}</Text>
      {items.map((t, i) => <Text key={i} style={{ fontSize: 12.5, color: C.text }}>• {t}</Text>)}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.screen, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12 },
  barTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: C.text },
  name: { fontSize: 21, fontWeight: '900', color: C.text },
  sub: { fontSize: 13, color: C.textDim, marginTop: 2 },
  subHead: { fontSize: 13.5, fontWeight: '700', color: C.text },
  objection: { backgroundColor: C.elevated, borderRadius: 10, padding: 10 },
  contact: { flex: 1, backgroundColor: C.indigoSoft, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  tile: { flex: 1, backgroundColor: C.elevated, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 4 },
  miniHead: { fontSize: 11.5, fontWeight: '700', color: C.textDim, marginBottom: 2 },
});
