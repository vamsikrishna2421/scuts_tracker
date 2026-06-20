import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiKeyEditor } from '../components/ApiKeyEditor';
import { Card, PrimaryButton, SecondaryButton } from '../components/ui';
import { useStore } from '../store';
import { C, R, S } from '../theme';

export function Logo({ size = 88 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.26, backgroundColor: C.indigo, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: C.white, fontWeight: '900', fontSize: size * 0.52 }}>S</Text>
    </View>
  );
}

export default function Onboarding() {
  const { hasApiKey, patchSettings, settings } = useStore();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);

  const founders = settings.company.founders.map((f) => f.name);
  const welcomeLine =
    founders.length >= 2 ? `Welcome, ${founders[0]} & ${founders[1]}. Let's grow Scuts.` :
    founders.length === 1 ? `Welcome, ${founders[0]}. Let's grow Scuts.` : "Let's grow the Scuts pipeline.";

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      {step === 0 && (
        <View style={styles.center}>
          <Logo />
          <Text style={styles.title}>Scuts Tracker</Text>
          <Text style={styles.subtitle}>Your intelligent partner for growing salon partnerships.</Text>
          <View style={{ gap: 14, marginTop: 28, width: '100%' }}>
            <Feature icon="mic" tint={C.indigo} title="Log by voice or text" detail="Capture every salon-owner conversation in seconds." />
            <Feature icon="sparkles" tint={C.violet} title="AI reads the room" detail="Sentiment, strategy and objection handling — automatically." />
            <Feature icon="checkbox" tint={C.teal} title="Daily focus points" detail="Exactly who to follow up with, when, and on what." />
          </View>
          <View style={{ flex: 1 }} />
          <PrimaryButton title="Get started" onPress={() => setStep(1)} />
        </View>
      )}

      {step === 1 && (
        <View style={{ flex: 1 }}>
          <Text style={styles.stepKicker}>Step 1 of 2</Text>
          <Text style={styles.stepTitle}>Connect Claude</Text>
          <Text style={styles.stepSub}>Scuts Tracker uses your own Claude API key to power its intelligence. Paste it below — you can change it any time in Settings.</Text>
          <ScrollView style={{ flex: 1, marginTop: 12 }} keyboardShouldPersistTaps="handled">
            <Card><ApiKeyEditor /></Card>
          </ScrollView>
          <View style={{ gap: 10 }}>
            <PrimaryButton title={hasApiKey ? 'Continue' : 'Continue without a key'} onPress={() => setStep(2)} />
            <SecondaryButton title="Back" onPress={() => setStep(0)} tint={C.textDim} />
          </View>
        </View>
      )}

      {step === 2 && (
        <View style={styles.center}>
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: C.indigo, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={48} color={C.white} />
          </View>
          <Text style={styles.title}>You're all set</Text>
          <Text style={styles.subtitle}>{welcomeLine}</Text>
          <View style={{ gap: 12, marginTop: 28, width: '100%' }}>
            <Tip text="Tap the Log tab, pick a salon owner, and hold to record an update." />
            <Tip text="Watch the agents summarize, read sentiment, and plan your follow-up." />
            <Tip text="Your Today screen fills with strategic focus points." />
          </View>
          <View style={{ flex: 1 }} />
          <PrimaryButton title="Start tracking" onPress={() => patchSettings({ onboardingComplete: true })} />
        </View>
      )}
    </View>
  );
}

function Feature({ icon, tint, title, detail }: { icon: string; tint: string; title: string; detail: string }) {
  return (
    <View style={styles.feature}>
      <View style={[styles.featureIcon, { backgroundColor: tint + '22' }]}>
        <Ionicons name={icon as any} size={20} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDetail}>{detail}</Text>
      </View>
    </View>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Ionicons name="sparkles" size={16} color={C.violet} style={{ marginTop: 2 }} />
      <Text style={{ flex: 1, fontSize: 14.5, color: C.text }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, paddingHorizontal: S.screen },
  center: { flex: 1, alignItems: 'center', paddingTop: 30 },
  title: { fontSize: 30, fontWeight: '900', color: C.text, marginTop: 18 },
  subtitle: { fontSize: 16, color: C.textDim, textAlign: 'center', marginTop: 6 },
  stepKicker: { color: C.indigo, fontWeight: '800', fontSize: 12.5, marginTop: 8 },
  stepTitle: { fontSize: 30, fontWeight: '900', color: C.text, marginTop: 6 },
  stepSub: { fontSize: 14.5, color: C.textDim, marginTop: 6 },
  feature: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  featureIcon: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  featureDetail: { fontSize: 13.5, color: C.textDim, marginTop: 1 },
});
