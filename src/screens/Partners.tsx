import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddPartnerModal } from '../components/AddPartnerModal';
import { InterestBar } from '../components/Gauges';
import { Avatar, Card, EmptyState, MomentumBadge, StageBadge, TextField } from '../components/ui';
import { isOverdue, shortDate } from '../format';
import { useNav } from '../nav';
import { displayTitle, initials, subtitle } from '../select';
import { useStore } from '../store';
import { ALL_STAGES, C, R, S, stageMeta } from '../theme';
import type { Partner, PipelineStage } from '../types';

export default function Partners() {
  const { data } = useStore();
  const { push } = useNav();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<PipelineStage | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const list = useMemo(() => {
    let l = data.partners;
    if (filter) l = l.filter((p) => p.stage === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      l = l.filter((p) => p.name.toLowerCase().includes(q) || p.salonName.toLowerCase().includes(q) || p.location.toLowerCase().includes(q));
    }
    return [...l].sort((a, b) => {
      const an = a.nextFollowUpAt ? new Date(a.nextFollowUpAt).getTime() : Infinity;
      const bn = b.nextFollowUpAt ? new Date(b.nextFollowUpAt).getTime() : Infinity;
      if (an !== bn) return an - bn;
      return b.interestScore - a.interestScore;
    });
  }, [data.partners, filter, search]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ padding: S.screen, paddingTop: insets.top + 6, gap: 12 }} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.h1}>Partners</Text>
          <Pressable onPress={() => setShowAdd(true)} style={styles.addBtn} hitSlop={8}>
            <Ionicons name="add" size={22} color={C.white} />
          </Pressable>
        </View>

        <TextField value={search} onChangeText={setSearch} placeholder="Search owners or salons" />

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <FilterChip label="All" active={filter === null} onPress={() => setFilter(null)} color={C.indigo} />
            {ALL_STAGES.map((s) => (
              <FilterChip key={s} label={stageMeta(s).label} color={stageMeta(s).color} active={filter === s} onPress={() => setFilter(filter === s ? null : s)} />
            ))}
          </View>
        </ScrollView>

        {list.length === 0 ? (
          <EmptyState icon="people" title="No salon owners" text={search ? `No matches for "${search}".` : 'Add your first salon owner to start building the pipeline.'} />
        ) : (
          list.map((p) => (
            <Pressable key={p.id} onPress={() => push({ kind: 'partnerDetail', partnerId: p.id })}>
              <Card><PartnerRow partner={p} /></Card>
            </Pressable>
          ))
        )}
        <View style={{ height: 8 }} />
      </ScrollView>

      <AddPartnerModal visible={showAdd} onClose={() => setShowAdd(false)} />
    </View>
  );
}

function PartnerRow({ partner }: { partner: Partner }) {
  const overdue = isOverdue(partner.nextFollowUpAt);
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <Avatar label={initials(partner)} size={48} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.name} numberOfLines={1}>{displayTitle(partner)}</Text>
          <View style={{ flex: 1 }} />
          <StageBadge stage={partner.stage} />
        </View>
        {subtitle(partner) ? <Text style={styles.sub} numberOfLines={1}>{subtitle(partner)}</Text> : null}
        <InterestBar score={partner.interestScore} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MomentumBadge momentum={partner.momentum} />
          <View style={{ flex: 1 }} />
          {partner.nextFollowUpAt ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Ionicons name="calendar" size={11} color={overdue ? C.negative : C.textFaint} />
              <Text style={{ fontSize: 11.5, color: overdue ? C.negative : C.textFaint }}>{shortDate(partner.nextFollowUpAt)}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function FilterChip({ label, color, active, onPress }: { label: string; color: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.filterChip, { backgroundColor: active ? color : color + '1A' }]}>
      <Text style={{ color: active ? C.white : color, fontWeight: '700', fontSize: 12.5 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center' },
  h1: { fontSize: 32, fontWeight: '900', color: C.text, flex: 1 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.indigo, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16.5, fontWeight: '800', color: C.text },
  sub: { fontSize: 12.5, color: C.textDim },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill },
});
