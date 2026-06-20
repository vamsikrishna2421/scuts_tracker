import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { C, R, S, shadow, momentumMeta, priorityMeta, stageMeta } from '../theme';
import type { Momentum, PipelineStage, Priority } from '../types';

export function Icon({ name, size = 18, color = C.text }: { name: string; size?: number; color?: string }) {
  return <Ionicons name={name as any} size={size} color={color} />;
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PrimaryButton({ title, onPress, icon, disabled }: { title: string; onPress: () => void; icon?: string; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.primaryBtn, disabled && { opacity: 0.45 }, pressed && !disabled && { opacity: 0.88 }]}
    >
      {icon ? <Ionicons name={icon as any} size={18} color={C.white} style={{ marginRight: 8 }} /> : null}
      <Text style={styles.primaryText}>{title}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ title, onPress, icon, disabled, tint = C.indigo }: { title: string; onPress: () => void; icon?: string; disabled?: boolean; tint?: string }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.secondaryBtn, { backgroundColor: tint + '1F' }, disabled && { opacity: 0.45 }, pressed && { opacity: 0.7 }]}
    >
      {icon ? <Ionicons name={icon as any} size={17} color={tint} style={{ marginRight: 6 }} /> : null}
      <Text style={[styles.secondaryText, { color: tint }]}>{title}</Text>
    </Pressable>
  );
}

export function SectionHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Pill({ label, color, icon }: { label: string; color: string; icon?: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: color + '24' }]}>
      {icon ? <Ionicons name={icon as any} size={11} color={color} style={{ marginRight: 4 }} /> : null}
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function StageBadge({ stage }: { stage: PipelineStage }) {
  const m = stageMeta(stage);
  return <Pill label={m.label} color={m.color} icon={m.icon} />;
}

export function MomentumBadge({ momentum }: { momentum: Momentum }) {
  const m = momentumMeta(momentum);
  return <Pill label={m.label} color={m.color} icon={m.icon} />;
}

export function PriorityDot({ priority }: { priority: Priority }) {
  return <View style={[styles.dot, { backgroundColor: priorityMeta(priority).color }]} />;
}

export function Avatar({ label, size = 46 }: { label: string; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ color: C.white, fontWeight: '800', fontSize: size * 0.38 }}>{label}</Text>
    </View>
  );
}

export function StatTile({ value, label, icon, tint = C.indigo }: { value: string; label: string; icon?: string; tint?: string }) {
  return (
    <View style={[styles.card, { flex: 1, padding: 14 }]}>
      {icon ? <Ionicons name={icon as any} size={18} color={tint} style={{ marginBottom: 6 }} /> : null}
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export function TextField(props: TextInputProps & { containerStyle?: StyleProp<ViewStyle> }) {
  const { containerStyle, style, ...rest } = props;
  return (
    <View style={[styles.field, containerStyle]}>
      <TextInput placeholderTextColor={C.textFaint} style={[styles.fieldInput, style]} {...rest} />
    </View>
  );
}

export function EmptyState({ icon, title, text }: { icon: string; title: string; text?: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon as any} size={42} color={C.textFaint} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {text ? <Text style={styles.emptyText}>{text}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: R.card, padding: 18, ...shadow },
  primaryBtn: { backgroundColor: C.indigo, borderRadius: R.control, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: C.white, fontWeight: '700', fontSize: 16 },
  secondaryBtn: { borderRadius: R.control, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontWeight: '700', fontSize: 16 },
  sectionRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: C.text },
  sectionSub: { fontSize: 13.5, color: C.textDim, marginTop: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 4, borderRadius: R.pill, alignSelf: 'flex-start' },
  pillText: { fontSize: 11.5, fontWeight: '700' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  avatar: { backgroundColor: C.indigo, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: C.text },
  statLabel: { fontSize: 12, color: C.textDim, marginTop: 2 },
  field: { backgroundColor: C.elevated, borderRadius: R.control, borderWidth: 1, borderColor: C.border },
  fieldInput: { paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginTop: 6 },
  emptyText: { fontSize: 14, color: C.textDim, textAlign: 'center', paddingHorizontal: 30 },
});
