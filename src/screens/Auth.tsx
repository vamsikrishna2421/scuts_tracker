import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton, TextField } from '../components/ui';
import { useStore } from '../store';
import { C, S } from '../theme';
import { Logo } from './Onboarding';

function friendlyAuthError(e: unknown): string {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  if (msg.includes('invalid login')) return 'Wrong email or password.';
  if (msg.includes('already registered') || msg.includes('already been registered')) return 'That email already has an account — switch to Sign in.';
  if (msg.includes('confirm') || msg.includes('not confirmed')) return 'Email confirmation is on — ask Vamsi to turn it off in Supabase, then try again.';
  if (msg.includes('password')) return 'Password must be at least 6 characters.';
  if (msg.includes('network') || msg.includes('fetch')) return 'No connection. Check your internet and try again.';
  return e instanceof Error ? e.message : 'Something went wrong. Try again.';
}

export default function Auth() {
  const { signIn, signUp } = useStore();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const signUpMode = mode === 'up';
  const canSubmit = email.trim().length > 3 && password.length >= 6 && (!signUpMode || name.trim().length > 0);

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError('');
    try {
      if (signUpMode) await signUp(email, password, name);
      else await signIn(email, password);
      // On success the auth listener swaps this screen out automatically.
    } catch (e) {
      setError(friendlyAuthError(e));
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center', gap: 14 }}>
          <Logo />
          <Text style={styles.title}>Scuts Tracker</Text>
          <Text style={styles.subtitle}>
            {signUpMode ? 'Create your account — your team shares one live workspace.' : 'Sign in to your shared Scuts workspace.'}
          </Text>
        </View>

        <View style={{ gap: 12, marginTop: 36 }}>
          {signUpMode ? (
            <TextField value={name} onChangeText={setName} placeholder="Your name (e.g. Abhishek)" autoCapitalize="words" />
          ) : null}
          <TextField
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <TextField
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            autoCapitalize="none"
            textContentType={signUpMode ? 'newPassword' : 'password'}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={{ marginTop: 6 }}>
            {busy ? (
              <View style={styles.busy}><ActivityIndicator color={C.white} /></View>
            ) : (
              <PrimaryButton title={signUpMode ? 'Create account' : 'Sign in'} onPress={submit} disabled={!canSubmit} />
            )}
          </View>
        </View>

        <View style={{ flex: 1 }} />
        <Pressable onPress={() => { setMode(signUpMode ? 'in' : 'up'); setError(''); }} hitSlop={8} style={{ marginTop: 28 }}>
          <Text style={styles.switch}>
            {signUpMode ? 'Already have an account? ' : "First time here? "}
            <Text style={{ color: C.indigo, fontWeight: '800' }}>{signUpMode ? 'Sign in' : 'Create one'}</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: S.screen },
  title: { fontSize: 30, fontWeight: '900', color: C.text, marginTop: 4 },
  subtitle: { fontSize: 15, color: C.textDim, textAlign: 'center', paddingHorizontal: 12 },
  error: { color: C.negative, fontSize: 13.5, textAlign: 'center', marginTop: 2 },
  busy: { backgroundColor: C.indigo, borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  switch: { fontSize: 14.5, color: C.textDim, textAlign: 'center' },
});
