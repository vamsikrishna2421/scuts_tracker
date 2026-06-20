import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from './Onboarding';
import { errorMessage } from '../claude';
import { nowISO } from '../format';
import { todayFocus } from '../select';
import { chatReply, pipelineSnapshot } from '../semanticLayer';
import { useStore } from '../store';
import { C, S } from '../theme';
import { ChatMessage, newId } from '../types';

const SUGGESTIONS = [
  'What should I focus on today?',
  'How do I win over a hesitant salon owner?',
  'Summarize my pipeline in 3 lines',
  'Draft a WhatsApp follow-up for my warmest lead',
];

export default function Chat() {
  const { data, agentConfig, addChat, clearChat } = useStore();
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || loading) return;
    const cfg = agentConfig();
    if (!cfg) { setError('Add a Claude API key in Settings to chat with your assistant.'); return; }
    setError('');
    setInput('');

    const userMsg: ChatMessage = { id: newId(), role: 'user', text, createdAt: nowISO() };
    addChat(userMsg);
    setLoading(true);

    const history = [...data.chat, userMsg].map((m) => ({ role: m.role, content: m.text }));
    const snapshot = pipelineSnapshot(data.partners, todayFocus(data));
    try {
      const reply = await chatReply(history, snapshot, cfg);
      addChat({ id: newId(), role: 'assistant', text: reply, createdAt: nowISO() });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
      <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
        <Text style={styles.h1}>Assistant</Text>
        {data.chat.length > 0 ? (
          <Pressable onPress={clearChat} hitSlop={8}><Ionicons name="trash-outline" size={20} color={C.textDim} /></Pressable>
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: S.screen, gap: 12, flexGrow: 1 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {data.chat.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 40, gap: 16 }}>
            <Logo size={60} />
            <Text style={{ fontSize: 22, fontWeight: '900', color: C.text }}>Talk it through</Text>
            <Text style={{ fontSize: 14.5, color: C.textDim, textAlign: 'center' }}>
              Your strategic partner for the whole Scuts pipeline. Ask about any salon owner, plan your day, or prep for a tough conversation.
            </Text>
            <View style={{ gap: 10, width: '100%', marginTop: 8 }}>
              {SUGGESTIONS.map((p) => (
                <Pressable key={p} onPress={() => send(p)} style={styles.suggestion}>
                  <Ionicons name="sparkles" size={16} color={C.violet} />
                  <Text style={{ flex: 1, fontSize: 14.5, color: C.text }}>{p}</Text>
                  <Ionicons name="arrow-forward" size={14} color={C.textFaint} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          data.chat.map((m) => <Bubble key={m.id} message={m} />)
        )}
        {loading ? (
          <View style={[styles.bubble, styles.assistant]}>
            <ActivityIndicator size="small" color={C.indigo} />
          </View>
        ) : null}
      </ScrollView>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={[styles.inputBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 10 }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask your assistant…"
          placeholderTextColor={C.textFaint}
          style={styles.input}
          multiline
        />
        <Pressable onPress={() => send()} disabled={!input.trim() || loading} hitSlop={6}>
          <Ionicons name="arrow-up-circle" size={36} color={input.trim() && !loading ? C.indigo : C.textFaint} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <View style={{ flexDirection: 'row', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <View style={[styles.bubble, isUser ? styles.user : styles.assistant]}>
        <Text style={{ fontSize: 14.5, lineHeight: 21, color: isUser ? C.white : C.text }} selectable>{message.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.screen, paddingBottom: 8 },
  h1: { fontSize: 24, fontWeight: '900', color: C.text },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  user: { backgroundColor: C.indigo, borderBottomRightRadius: 5 },
  assistant: { backgroundColor: C.card, borderBottomLeftRadius: 5 },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 14, padding: 14 },
  error: { color: C.negative, fontSize: 12.5, paddingHorizontal: S.screen, paddingTop: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: S.screen, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg },
  input: { flex: 1, backgroundColor: C.card, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: C.text, maxHeight: 120 },
});
