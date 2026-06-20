import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { complete, errorMessage } from '../claude';
import * as secure from '../secure';
import { useStore } from '../store';
import { C, R } from '../theme';
import { Icon, PrimaryButton, SecondaryButton } from './ui';

type Status = { kind: 'idle' | 'testing' | 'ok' | 'err'; msg?: string };

export function ApiKeyEditor() {
  const { hasApiKey, saveApiKey, removeApiKey } = useStore();
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const trimmed = draft.trim();

  const onSave = async () => {
    if (!trimmed) return;
    await saveApiKey(trimmed);
    setDraft('');
    setStatus({ kind: 'idle' });
  };

  const onTest = async () => {
    let key = trimmed;
    if (key) {
      await saveApiKey(key);
      setDraft('');
    } else {
      key = (await secure.loadApiKey()) ?? '';
    }
    if (!key) {
      setStatus({ kind: 'err', msg: 'Enter a key first.' });
      return;
    }
    setStatus({ kind: 'testing' });
    try {
      await complete({ apiKey: key, model: 'claude-haiku-4-5', system: 'Reply with the single word: OK.', messages: [{ role: 'user', content: 'ping' }], maxTokens: 5 });
      setStatus({ kind: 'ok' });
    } catch (e) {
      setStatus({ kind: 'err', msg: errorMessage(e) });
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.statusRow}>
        <Icon name={hasApiKey ? 'checkmark-circle' : 'key'} color={hasApiKey ? C.positive : C.textDim} size={18} />
        <Text style={styles.statusText}>{hasApiKey ? 'A Claude API key is set.' : 'No API key yet.'}</Text>
        <View style={{ flex: 1 }} />
        {hasApiKey ? (
          <Pressable onPress={() => { void removeApiKey(); setStatus({ kind: 'idle' }); }} hitSlop={8}>
            <Text style={styles.remove}>Remove</Text>
          </Pressable>
        ) : null}
      </View>

      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder="sk-ant-api03-…"
        placeholderTextColor={C.textFaint}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <PrimaryButton title={hasApiKey ? 'Update key' : 'Save key'} onPress={onSave} disabled={!trimmed} />
        </View>
        <View style={{ width: 120 }}>
          <SecondaryButton title={status.kind === 'testing' ? 'Testing…' : 'Test'} onPress={onTest} disabled={status.kind === 'testing'} />
        </View>
      </View>

      {status.kind === 'ok' ? <Text style={[styles.result, { color: C.positive }]}>✓ Connected to Claude successfully.</Text> : null}
      {status.kind === 'err' ? <Text style={[styles.result, { color: C.negative }]}>{status.msg}</Text> : null}

      <Pressable onPress={() => void Linking.openURL('https://console.anthropic.com/settings/keys')} hitSlop={6}>
        <Text style={styles.link}>Get a key from console.anthropic.com ↗</Text>
      </Pressable>
      <Text style={styles.note}>Your key is stored only in this device's Keychain — never in the app's data file or in code.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { fontSize: 14.5, fontWeight: '600', color: C.text },
  remove: { color: C.negative, fontWeight: '700', fontSize: 13 },
  input: { backgroundColor: C.elevated, borderRadius: R.control, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text },
  result: { fontSize: 13, fontWeight: '600' },
  link: { color: C.indigo, fontSize: 13, fontWeight: '600' },
  note: { fontSize: 11.5, color: C.textFaint },
});
