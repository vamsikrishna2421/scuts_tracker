import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { errorMessage } from '../claude';
import { Card, EmptyState, PrimaryButton, SecondaryButton, SectionHeader } from '../components/ui';
import {
  buildFinanceRecords, extractFinances, forPeriod, guessPeriod, inr, matchPartner, monthLabel,
  netMarginPct, periodsOf, prevPeriod, readSheet, totals,
} from '../finance';
import { nowISO } from '../format';
import { useNav } from '../nav';
import { financeBrief } from '../semanticLayer';
import { useStore } from '../store';
import { C, S } from '../theme';
import type { ParsedFinance } from '../finance';
import type { SalonFinance } from '../types';

const CHART_W = Dimensions.get('window').width - S.screen * 2 - 36;

export default function Business() {
  const { data, importFinances, agentConfig } = useStore();
  const { push } = useNav();
  const insets = useSafeAreaInsets();

  const periods = useMemo(() => periodsOf(data.finances), [data.finances]);
  const [period, setPeriod] = useState<string | null>(null);
  const active = period && periods.includes(period) ? period : periods[periods.length - 1] ?? null;

  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ period: string; rows: ParsedFinance[] } | null>(null);

  const records = active ? forPeriod(data.finances, active) : [];
  const sorted = useMemo(() => [...records].sort((a, b) => b.netProfit - a.netProfit), [records]);
  const t = totals(records);
  const prev = active ? totals(forPeriod(data.finances, prevPeriod(active))) : null;
  const hasPrev = !!prev && prev.salons > 0;

  const pickFile = async () => {
    setError('');
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (res.canceled) return;
      const file = res.assets[0];
      if (!file) return;
      setImporting(true);
      const grid = await readSheet(file.uri, file.name || 'sheet.csv');
      const rows = extractFinances(grid);
      if (!rows.length) throw new Error('No salon rows found in that file.');
      setPreview({ period: guessPeriod(file.name || ''), rows });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setImporting(false);
    }
  };

  const confirmImport = () => {
    if (!preview) return;
    importFinances(preview.period, buildFinanceRecords(preview.period, preview.rows, nowISO()));
    setPeriod(preview.period);
    setPreview(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: S.screen, paddingTop: insets.top + 6, gap: S.gap, paddingBottom: insets.bottom + 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.h1}>Business</Text>
          <View style={{ flex: 1 }} />
          <SecondaryButton title={importing ? 'Reading…' : 'Import month'} icon="cloud-upload" onPress={pickFile} disabled={importing} />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!active ? (
          <Card>
            <EmptyState icon="bar-chart" title="No financials yet" text="Import a month's profit breakdown (CSV or Excel) to see revenue, profit and per-salon analytics." />
          </Card>
        ) : (
          <>
            {/* Month selector */}
            {periods.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {periods.map((p) => {
                    const on = p === active;
                    return (
                      <Pressable key={p} onPress={() => setPeriod(p)} style={[styles.chip, on && { backgroundColor: C.indigo, borderColor: C.indigo }]}>
                        <Text style={[styles.chipText, on && { color: C.white }]}>{monthLabel(p)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            ) : null}

            {/* KPIs */}
            <View style={{ flexDirection: 'row', gap: S.gap }}>
              <Kpi label="Net profit" value={inr(t.netProfit)} delta={hasPrev ? pct(t.netProfit, prev!.netProfit) : undefined} good tint={C.positive} />
              <Kpi label="Revenue (paid)" value={inr(t.paidValue)} delta={hasPrev ? pct(t.paidValue, prev!.paidValue) : undefined} good tint={C.indigo} />
            </View>
            <View style={{ flexDirection: 'row', gap: S.gap }}>
              <Kpi label="Bookings" value={String(Math.round(t.bookings))} delta={hasPrev ? pct(t.bookings, prev!.bookings) : undefined} good tint={C.violet} />
              <Kpi label="Net margin" value={`${netMarginPct(t).toFixed(1)}%`} tint={C.teal} sub={`${t.salons} salons`} />
            </View>

            {/* Trend */}
            {periods.length > 1 ? (
              <Card>
                <SectionHeader title="Net profit by month" />
                <View style={{ marginTop: 10, alignItems: 'center' }}>
                  <MonthlyBars data={periods.map((p) => ({ label: monthLabel(p).split(' ')[0], value: totals(forPeriod(data.finances, p)).netProfit }))} width={CHART_W} />
                </View>
              </Card>
            ) : null}

            {/* AI insight */}
            <FinanceInsight period={active} records={records} prevRecords={active ? forPeriod(data.finances, prevPeriod(active)) : []} agentConfig={agentConfig} />

            {/* Top performers */}
            <Card>
              <SectionHeader title="Top performers" subtitle="Most net profit this month" />
              <View style={{ height: 6 }} />
              {sorted.slice(0, 5).map((r, i) => <SalonRow key={r.id} rank={i + 1} rec={r} push={push} partners={data.partners} />)}
            </Card>

            {/* Needs attention */}
            {sorted.some((r) => r.netProfit <= 0) ? (
              <Card>
                <SectionHeader title="Needs attention" subtitle="Loss-making or break-even" />
                <View style={{ height: 6 }} />
                {sorted.filter((r) => r.netProfit <= 0).map((r) => <SalonRow key={r.id} rec={r} push={push} partners={data.partners} />)}
              </Card>
            ) : null}

            {/* All salons */}
            <Card>
              <SectionHeader title="All salons" subtitle={`${records.length} this month`} />
              <View style={{ height: 6 }} />
              {sorted.map((r) => <SalonRow key={r.id} rec={r} push={push} partners={data.partners} />)}
            </Card>
          </>
        )}
      </ScrollView>

      <ImportPreview preview={preview} onCancel={() => setPreview(null)} onConfirm={confirmImport} onShift={(p) => setPreview((cur) => (cur ? { ...cur, period: p } : cur))} />
    </View>
  );
}

function pct(now: number, before: number): number {
  if (!before) return now > 0 ? 100 : 0;
  return ((now - before) / Math.abs(before)) * 100;
}

function Kpi({ label, value, delta, good, sub, tint }: { label: string; value: string; delta?: number; good?: boolean; sub?: string; tint: string }) {
  const up = (delta ?? 0) >= 0;
  return (
    <View style={[styles.kpi, { flex: 1 }]}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color: tint }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {delta !== undefined ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Ionicons name={up ? 'arrow-up' : 'arrow-down'} size={12} color={up === !!good ? C.positive : C.negative} />
          <Text style={{ fontSize: 11.5, fontWeight: '700', color: up === !!good ? C.positive : C.negative }}>{Math.abs(delta).toFixed(0)}% vs last</Text>
        </View>
      ) : sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
    </View>
  );
}

function SalonRow({ rec, rank, push, partners }: { rec: SalonFinance; rank?: number; push: ReturnType<typeof useNav>['push']; partners: ReturnType<typeof useStore>['data']['partners'] }) {
  const partner = matchPartner(rec.salon, partners);
  const loss = rec.netProfit < 0;
  const body = (
    <View style={styles.salonRow}>
      {rank ? <Text style={styles.rank}>{rank}</Text> : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.salonName} numberOfLines={1}>{rec.salon}</Text>
        <Text style={styles.salonSub}>{Math.round(rec.bookings)} bookings · {inr(rec.paidValue)}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 14.5, fontWeight: '800', color: loss ? C.negative : C.positive }}>{inr(rec.netProfit)}</Text>
        {partner ? <Ionicons name="chevron-forward" size={14} color={C.textFaint} /> : null}
      </View>
    </View>
  );
  return partner ? <Pressable onPress={() => push({ kind: 'partnerDetail', partnerId: partner.id })}>{body}</Pressable> : body;
}

function FinanceInsight({ period, records, prevRecords, agentConfig }: {
  period: string; records: SalonFinance[]; prevRecords: SalonFinance[]; agentConfig: ReturnType<typeof useStore>['agentConfig'];
}) {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');

  const run = async () => {
    const cfg = agentConfig();
    if (!cfg) { setErr('Add a Claude API key in Settings to generate insights.'); return; }
    setErr(''); setLoading(true);
    try {
      setText(await financeBrief(snapshot(period, records, prevRecords), cfg));
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <SectionHeader title="AI insight" subtitle="What the numbers say, and what to do" right={<Ionicons name="sparkles" size={18} color={C.violet} />} />
      {text ? <Text style={{ fontSize: 14, color: C.text, lineHeight: 21, marginTop: 10 }}>{text}</Text> : null}
      {err ? <Text style={[styles.error, { marginTop: 8 }]}>{err}</Text> : null}
      <View style={{ marginTop: 12 }}>
        {loading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><ActivityIndicator color={C.indigo} /><Text style={{ color: C.textDim, fontSize: 13 }}>Analyzing the month…</Text></View>
        ) : (
          <SecondaryButton title={text ? 'Regenerate' : 'Generate insight'} icon="sparkles" onPress={run} tint={C.violet} />
        )}
      </View>
    </Card>
  );
}

function snapshot(period: string, records: SalonFinance[], prev: SalonFinance[]): string {
  const t = totals(records); const p = totals(prev);
  const lines = [`Month: ${monthLabel(period)}.`];
  lines.push(`This month: ${t.salons} salons, ${Math.round(t.bookings)} bookings, revenue ₹${Math.round(t.paidValue)}, net profit ₹${Math.round(t.netProfit)} (net margin ${netMarginPct(t).toFixed(1)}%).`);
  if (p.salons) lines.push(`Previous month: ${p.salons} salons, ${Math.round(p.bookings)} bookings, revenue ₹${Math.round(p.paidValue)}, net profit ₹${Math.round(p.netProfit)}.`);
  lines.push('Per-salon this month (salon | bookings | revenue | net profit):');
  for (const r of [...records].sort((a, b) => b.netProfit - a.netProfit)) {
    lines.push(`${r.salon} | ${Math.round(r.bookings)} | ₹${Math.round(r.paidValue)} | ₹${Math.round(r.netProfit)}`);
  }
  return lines.join('\n');
}

function MonthlyBars({ data, width, height = 140 }: { data: { label: string; value: number }[]; width: number; height?: number }) {
  if (!data.length || width <= 0) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const top = 22, bottom = 22, h = height - top - bottom;
  const slot = width / data.length;
  const bw = Math.min(48, slot * 0.5);
  return (
    <Svg width={width} height={height}>
      {data.map((d, i) => {
        const bh = Math.max(2, (d.value / max) * h);
        const x = slot * i + slot / 2 - bw / 2;
        const y = top + (h - bh);
        return (
          <React.Fragment key={i}>
            <SvgText x={slot * i + slot / 2} y={y - 6} fontSize={10.5} fontWeight="700" fill={C.text} textAnchor="middle">{inr(d.value)}</SvgText>
            <Rect x={x} y={y} width={bw} height={bh} rx={6} fill={C.indigo} />
            <SvgText x={slot * i + slot / 2} y={height - 6} fontSize={10.5} fill={C.textDim} textAnchor="middle">{d.label}</SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

function ImportPreview({ preview, onCancel, onConfirm, onShift }: {
  preview: { period: string; rows: ParsedFinance[] } | null; onCancel: () => void; onConfirm: () => void; onShift: (p: string) => void;
}) {
  const net = preview ? preview.rows.reduce((s, r) => s + r.netProfit, 0) : 0;
  return (
    <Modal visible={!!preview} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={styles.modalBar}>
          <Pressable onPress={onCancel} hitSlop={8}><Text style={{ color: C.textDim, fontSize: 15 }}>Cancel</Text></Pressable>
          <Text style={{ fontSize: 16, fontWeight: '800', color: C.text }}>Import month</Text>
          <View style={{ width: 50 }} />
        </View>
        {preview ? (
          <ScrollView contentContainerStyle={{ padding: S.screen, gap: S.gap }}>
            <Card>
              <Text style={styles.fieldLabel}>WHICH MONTH IS THIS?</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                <Pressable onPress={() => onShift(prevPeriod(preview.period))} hitSlop={8}><Ionicons name="chevron-back-circle" size={34} color={C.indigo} /></Pressable>
                <Text style={{ fontSize: 22, fontWeight: '900', color: C.text }}>{monthLabel(preview.period)}</Text>
                <Pressable onPress={() => onShift(nextPeriod(preview.period))} hitSlop={8}><Ionicons name="chevron-forward-circle" size={34} color={C.indigo} /></Pressable>
              </View>
            </Card>
            <Card>
              <SectionHeader title="Preview" subtitle={`${preview.rows.length} salons · net profit ${inr(net)}`} />
              <View style={{ height: 8 }} />
              {[...preview.rows].sort((a, b) => b.netProfit - a.netProfit).slice(0, 6).map((r) => (
                <View key={r.salon} style={styles.salonRow}>
                  <Text style={[styles.salonName, { flex: 1 }]} numberOfLines={1}>{r.salon}</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: r.netProfit < 0 ? C.negative : C.positive }}>{inr(r.netProfit)}</Text>
                </View>
              ))}
              {preview.rows.length > 6 ? <Text style={{ fontSize: 12.5, color: C.textDim, marginTop: 6 }}>+ {preview.rows.length - 6} more</Text> : null}
            </Card>
            <Text style={{ fontSize: 12.5, color: C.textDim }}>Importing replaces any existing data for {monthLabel(preview.period)}. It syncs to everyone on the team.</Text>
            <PrimaryButton title={`Import ${monthLabel(preview.period)}`} icon="checkmark" onPress={onConfirm} />
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
}

function nextPeriod(period: string): string {
  let [y, m] = period.split('-').map(Number);
  m += 1; if (m > 12) { m = 1; y += 1; }
  return `${y}-${String(m).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  h1: { fontSize: 32, fontWeight: '900', color: C.text },
  error: { color: C.negative, fontSize: 13 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  chipText: { fontSize: 13, fontWeight: '700', color: C.text },
  kpi: { backgroundColor: C.card, borderRadius: 18, padding: 16, gap: 4 },
  kpiLabel: { fontSize: 12.5, color: C.textDim, fontWeight: '600' },
  kpiValue: { fontSize: 24, fontWeight: '900' },
  kpiSub: { fontSize: 11.5, color: C.textFaint },
  salonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  rank: { width: 18, fontSize: 13, fontWeight: '800', color: C.textFaint, textAlign: 'center' },
  salonName: { fontSize: 14.5, fontWeight: '600', color: C.text },
  salonSub: { fontSize: 12, color: C.textDim, marginTop: 1 },
  modalBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.screen, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  fieldLabel: { fontSize: 12.5, fontWeight: '700', color: C.textDim, textTransform: 'uppercase', letterSpacing: 0.4 },
});
