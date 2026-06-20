import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { dueLabel, isOverdue } from '../format';
import { C, reminderTypeMeta } from '../theme';
import type { Reminder } from '../types';
import { PriorityDot } from './ui';

export function ReminderRow({ reminder, showPartner = true, onToggle }: { reminder: Reminder; showPartner?: boolean; onToggle?: (id: string) => void }) {
  const meta = reminderTypeMeta(reminder.type);
  const overdue = isOverdue(reminder.dueDate) && !reminder.isDone;
  return (
    <View style={styles.row}>
      {onToggle ? (
        <Pressable onPress={() => onToggle(reminder.id)} hitSlop={8} style={{ paddingTop: 1 }}>
          <Ionicons
            name={reminder.isDone ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={reminder.isDone ? C.positive : C.textFaint}
          />
        </Pressable>
      ) : (
        <View style={[styles.typeIcon, { backgroundColor: meta.color + '22' }]}>
          <Ionicons name={meta.icon as any} size={14} color={meta.color} />
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text style={[styles.title, reminder.isDone && styles.done]}>{reminder.title}</Text>
        {reminder.detail ? <Text style={styles.detail} numberOfLines={2}>{reminder.detail}</Text> : null}
        <View style={styles.metaRow}>
          <Meta icon={meta.icon} color={meta.color} text={meta.label} />
          {showPartner && reminder.partnerName ? <Meta icon="person" color={C.textDim} text={reminder.partnerName} /> : null}
          {reminder.dueDate ? <Meta icon="calendar" color={overdue ? C.negative : C.textDim} text={dueLabel(reminder.dueDate, overdue)} /> : null}
        </View>
      </View>

      <PriorityDot priority={reminder.priority} />
    </View>
  );
}

function Meta({ icon, color, text }: { icon: string; color: string; text: string }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon as any} size={11} color={color} />
      <Text style={[styles.metaText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, paddingVertical: 6, alignItems: 'flex-start' },
  typeIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '600', color: C.text },
  done: { textDecorationLine: 'line-through', color: C.textDim },
  detail: { fontSize: 12.5, color: C.textDim, marginTop: 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, fontWeight: '500' },
});
