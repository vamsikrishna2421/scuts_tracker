import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InterestBar, PipelineStrip } from '../components/Gauges';
import { ReminderRow } from '../components/ReminderRow';
import { Card, MomentumBadge, SectionHeader, StatTile } from '../components/ui';
import { errorMessage } from '../claude';
import { relative } from '../format';
import { useNav } from '../nav';
import {
  activePartners, averageInterest, coolingPartners, countForStage, displayTitle, initials,
  overdueCount, recentInteractions, risingPartners, signedCount, todayFocus,
} from '../select';
import { dailyBrief, pipelineSnapshot } from '../semanticLayer';
import { useStore } from '../store';
import { ACTIVE_STAGES, C, S } from '../theme';
import type { Partner } from '../types';

export default function Dashboard() {
  const store = useStore();
  const { data, settings, agentConfig, toggleReminder } = store;
  const { push } = useNav();
  const insets = useSafeAreaInsets();

  const [brief, setBrief] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefErr, setBriefErr] = useState('');

  const focus = todayFocus(data);
  const overdue = overdueCount(data);

  const greeting = () => {
    const h = new Date().getHours();
    const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    const names = settings.company.founders.map((f) => f.name).slice(0, 2);
    const who = names.length ? `, ${names.join(' & ')}` : '';
    return `${part}${who}. Tap below for your strategic brief across every salon owner.`;
  };

  const generate = async () => {
    const cfg = agentConfig();
    if (!cfg) { setBriefErr('Add a Claude API key in Settings to generate your brief.'); return; }
    setBriefErr('');
    setBriefLoading(true);
    try {
      setBrief(await dailyBrief(pipelineSnapshot(data.partners, focus), cfg));
    } catch (e) {
      setBriefErr(errorMessage(e));
    } finally {
      setBriefLoading(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: S.screen, paddingTop: insets.top + 6, gap: S.gap }}>
      <Text style={styles.h1}>Today</Text>

      {/* Daily brief */}
      <View style={styles.brief}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="sunny" size={18} color={C.white} />
          <Text style={styles.briefTitle}>Daily brief</Text>
          <View style={{ flex: 1 }} />
          {brief ? (
            <Pressable onPress={generate} hitSlop={8}><Ionicons name="refresh" size={18} color="rgba(255,255,255,0.9)" /></Pressable>
          ) : null}
        </View>
        {briefLoading ? (
          <Text style={styles.briefBody}>Reading your whole pipeline…</Text>
        ) : brief ? (
          <Text style={styles.briefBody}>{brief}</Text>
        ) : (
          <>
            <Text style={styles.briefBody}>{greeting()}</Text>
            <Pressable onPress={generate} style={styles.briefBtn}>
              <Ionicons name="sparkles" size={16} color={C.indigo} />
              <Text style={styles.briefBtnText}>Generate today's brief</Text>
            </Pressable>
          </>
        )}
        {briefErr ? <Text style={styles.briefErr}>{briefErr}</Text> : null}
      </View>

      {/* Stats */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatTile value={`${activePartners(data).length}`} label="Active deals" icon="people" tint={C.indigo} />
        <StatTile value={`${averageInterest(data)}`} label="Avg interest" icon="heart" tint={C.teal} />
        <StatTile value={`${overdue}`} label="Overdue" icon="alert-circle" tint={overdue > 0 ? C.negative : C.positive} />
      </View>

      {/* Pipeline */}
      <Card>
        <SectionHeader title="Pipeline" subtitle={`${signedCount(data)} signed · ${activePartners(data).length} in play`} />
        <View style={{ height: 12 }} />
        <PipelineStrip counts={ACTIVE_STAGES.map((stage) => ({ stage, count: countForStage(data, stage) }))} />
      </Card>

      {/* Focus */}
      <Card>
        <SectionHeader title="Today's focus" subtitle={focus.length ? `${focus.length} point${focus.length === 1 ? '' : 's'} need you` : 'All clear'} />
        <View style={{ height: 6 }} />
        {focus.length === 0 ? (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 4 }}>
            <Ionicons name="checkmark-circle" size={18} color={C.positive} />
            <Text style={{ color: C.textDim, flex: 1 }}>Nothing due. Log an update to generate new focus points.</Text>
          </View>
        ) : (
          focus.slice(0, 6).map((r, i) => (
            <View key={r.id}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <Pressable onPress={() => r.partnerId && push({ kind: 'partnerDetail', partnerId: r.partnerId })}>
                <ReminderRow reminder={r} onToggle={toggleReminder} />
              </Pressable>
            </View>
          ))
        )}
      </Card>

      {/* Momentum */}
      {risingPartners(data).length + coolingPartners(data).length > 0 ? (
        <Card>
          <SectionHeader title="Momentum" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {[...risingPartners(data).slice(0, 4), ...coolingPartners(data).slice(0, 4)].map((p) => (
                <MomentumChip key={p.id} partner={p} onPress={() => push({ kind: 'partnerDetail', partnerId: p.id })} />
              ))}
            </View>
          </ScrollView>
        </Card>
      ) : null}

      {/* Recent */}
      {data.interactions.length > 0 ? (
        <Card>
          <SectionHeader title="Recent activity" />
          <View style={{ height: 6 }} />
          {recentInteractions(data).slice(0, 5).map((it, i) => {
            const p = store.getPartner(it.partnerId);
            return (
              <View key={it.id}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <Pressable onPress={() => push({ kind: 'partnerDetail', partnerId: it.partnerId })} style={styles.activity}>
                  <View style={styles.activityIcon}>
                    <Ionicons name={it.source === 'voice' ? 'mic' : 'document-text'} size={14} color={C.indigo} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row' }}>
                      <Text style={styles.activityName}>{p ? displayTitle(p) : 'Unknown'}</Text>
                      <View style={{ flex: 1 }} />
                      <Text style={styles.activityTime}>{relative(it.createdAt)}</Text>
                    </View>
                    <Text style={styles.activitySummary} numberOfLines={2}>{it.summary || it.rawText}</Text>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </Card>
      ) : null}

      <View style={{ height: 8 }} />
    </ScrollView>
  );
}

function MomentumChip({ partner, onPress }: { partner: Partner; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.momentum}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={styles.momentumAvatar}><Text style={{ color: C.white, fontWeight: '800', fontSize: 13 }}>{initials(partner)}</Text></View>
        <MomentumBadge momentum={partner.momentum} />
      </View>
      <Text style={styles.momentumName} numberOfLines={1}>{displayTitle(partner)}</Text>
      <InterestBar score={partner.interestScore} />
      <Text style={styles.momentumMeta}>{partner.interestScore}/100</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  h1: { fontSize: 32, fontWeight: '900', color: C.text },
  brief: { backgroundColor: C.indigo, borderRadius: 22, padding: 18, gap: 10 },
  briefTitle: { color: C.white, fontWeight: '800', fontSize: 16, marginLeft: 8 },
  briefBody: { color: C.white, fontSize: 14.5, lineHeight: 21 },
  briefBtn: { backgroundColor: C.white, borderRadius: 12, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 2 },
  briefBtnText: { color: C.indigo, fontWeight: '700', fontSize: 14.5 },
  briefErr: { color: C.white, fontSize: 12.5 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 4 },
  activity: { flexDirection: 'row', gap: 12, paddingVertical: 4 },
  activityIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.indigoSoft, alignItems: 'center', justifyContent: 'center' },
  activityName: { fontSize: 14.5, fontWeight: '700', color: C.text },
  activityTime: { fontSize: 11.5, color: C.textFaint },
  activitySummary: { fontSize: 13, color: C.textDim, marginTop: 1 },
  momentum: { width: 168, backgroundColor: C.elevated, borderRadius: 14, padding: 12, gap: 8, borderWidth: 1, borderColor: C.border },
  momentumAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.indigo, alignItems: 'center', justifyContent: 'center' },
  momentumName: { fontSize: 14, fontWeight: '700', color: C.text },
  momentumMeta: { fontSize: 11.5, color: C.textDim },
});
