import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavProvider, TabKey, useNav } from './src/nav';
import Chat from './src/screens/Chat';
import Dashboard from './src/screens/Dashboard';
import LogInteraction from './src/screens/LogInteraction';
import Onboarding from './src/screens/Onboarding';
import Partners from './src/screens/Partners';
import PartnerDetail from './src/screens/PartnerDetail';
import Settings from './src/screens/Settings';
import { StoreProvider, useStore } from './src/store';
import { C } from './src/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <StoreProvider>
        <NavProvider>
          <Root />
        </NavProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}

function Root() {
  const { ready, settings } = useStore();
  if (!ready) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  if (!settings.onboardingComplete) return <Onboarding />;
  return <Shell />;
}

function Shell() {
  const { tab, stack, pop } = useNav();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1 }}>
        {tab === 'today' && <Dashboard />}
        {tab === 'partners' && <Partners />}
        {tab === 'log' && <LogInteraction />}
        {tab === 'assistant' && <Chat />}
        {tab === 'settings' && <Settings />}
      </View>
      <TabBar />
      {stack.map((s, i) => (
        <View key={i} style={StyleSheet.absoluteFill}>
          {s.kind === 'partnerDetail' ? <PartnerDetail partnerId={s.partnerId} /> : null}
          {s.kind === 'log' ? <LogInteraction presetPartnerId={s.partnerId} onClose={pop} /> : null}
        </View>
      ))}
    </View>
  );
}

const TABS: { key: TabKey; icon: string; label: string }[] = [
  { key: 'today', icon: 'sunny', label: 'Today' },
  { key: 'partners', icon: 'people', label: 'Partners' },
  { key: 'log', icon: 'mic-circle', label: 'Log' },
  { key: 'assistant', icon: 'sparkles', label: 'Assistant' },
  { key: 'settings', icon: 'settings', label: 'Settings' },
];

function TabBar() {
  const { tab, setTab } = useNav();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 10 }]}>
      {TABS.map((it) => {
        const on = tab === it.key;
        const big = it.key === 'log';
        return (
          <Pressable key={it.key} onPress={() => setTab(it.key)} style={styles.tabItem} hitSlop={4}>
            <Ionicons name={it.icon as any} size={big ? 28 : 23} color={on ? C.indigo : C.textFaint} />
            <Text style={[styles.tabLabel, { color: on ? C.indigo : C.textFaint }]}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    paddingTop: 8,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 2 },
  tabLabel: { fontSize: 10.5, fontWeight: '600' },
});
