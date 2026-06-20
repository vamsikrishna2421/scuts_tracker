import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { nowISO } from '../format';
import { useStore } from '../store';
import { ALL_STAGES, C, R, S, stageMeta } from '../theme';
import { newId, Partner, PipelineStage } from '../types';
import { TextField } from './ui';

export function AddPartnerModal({ visible, onClose, existing, onSaved }: {
  visible: boolean;
  onClose: () => void;
  existing?: Partner;
  onSaved?: (p: Partner) => void;
}) {
  const { addPartner, updatePartner } = useStore();
  const [name, setName] = useState(existing?.name ?? '');
  const [salon, setSalon] = useState(existing?.salonName ?? '');
  const [location, setLocation] = useState(existing?.location ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [stage, setStage] = useState<PipelineStage>(existing?.stage ?? 'prospect');
  const [tags, setTags] = useState((existing?.tags ?? []).join(', '));
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const save = () => {
    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (existing) {
      const updated: Partner = { ...existing, name, salonName: salon, location, phone, email, stage, tags: tagList, notes };
      updatePartner(updated);
      onSaved?.(updated);
    } else {
      const p: Partner = {
        id: newId(), name, salonName: salon, location, phone, email, stage, tags: tagList, notes,
        interestScore: 50, momentum: 'steady', createdAt: nowISO(),
      };
      addPartner(p);
      onSaved?.(p);
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modal}>
        <View style={styles.bar}>
          <Pressable onPress={onClose} hitSlop={8}><Text style={styles.cancel}>Cancel</Text></Pressable>
          <Text style={styles.barTitle}>{existing ? 'Edit owner' : 'New salon owner'}</Text>
          <Pressable onPress={save} disabled={!name.trim()} hitSlop={8}>
            <Text style={[styles.save, !name.trim() && { opacity: 0.4 }]}>Save</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: S.screen, gap: 14 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <Group label="Salon owner">
            <TextField value={name} onChangeText={setName} placeholder="Owner name" />
            <TextField value={salon} onChangeText={setSalon} placeholder="Salon name" />
            <TextField value={location} onChangeText={setLocation} placeholder="Location (area, city)" />
          </Group>
          <Group label="Contact">
            <TextField value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" />
            <TextField value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          </Group>
          <Group label="Pipeline stage">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {ALL_STAGES.map((s) => {
                const m = stageMeta(s);
                const on = s === stage;
                return (
                  <Pressable key={s} onPress={() => setStage(s)} style={[styles.stageChip, { backgroundColor: on ? m.color : m.color + '1A' }]}>
                    <Text style={{ color: on ? C.white : m.color, fontWeight: '700', fontSize: 12.5 }}>{m.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Group>
          <Group label="Tags">
            <TextField value={tags} onChangeText={setTags} placeholder="Comma separated, e.g. Premium, Referral" />
          </Group>
          <Group label="Notes">
            <TextField value={notes} onChangeText={setNotes} placeholder="Anything worth remembering…" multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />
          </Group>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.groupLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: C.bg },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.screen, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  barTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  cancel: { color: C.textDim, fontSize: 15 },
  save: { color: C.indigo, fontWeight: '800', fontSize: 15 },
  groupLabel: { fontSize: 12.5, fontWeight: '700', color: C.textDim, textTransform: 'uppercase', letterSpacing: 0.4 },
  stageChip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: R.pill },
});
