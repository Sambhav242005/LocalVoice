import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { StoreProvider, useStore } from '../core/store';
import { Button, Txt, formatDuration, useTheme } from '../components/ui';
function Shell() {
  const theme = useTheme();
  const { active, clock, end, incoming, approveIncoming, dismissIncoming, settings, pc, setNotice } = useStore();
  const pcResident = Object.values(pc.states).some(model => ['ready', 'loaded', 'loading'].includes(model.status));
  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'bottom']}>
    <StatusBar style={theme.dark ? 'light' : 'dark'} />
    {settings.executionHost === 'pc' && pc.connected && (pc.busy || pcResident) && <View style={{ padding: 12, gap: 8, backgroundColor: theme.tinted }}><Txt kind="small">PC AI · {pc.busy ? 'Processing' : 'Models in memory'}</Txt><Button label="Stop PC AI" danger icon="stop-circle-outline" onPress={() => { void pc.stop().catch(error => setNotice(error instanceof Error ? error.message : 'PC stop failed. Retry.', 'error')); }} /></View>}
    {incoming && <View style={{ padding: 12, gap: 8, backgroundColor: theme.tinted }}>
      <Txt>Incoming demo call</Txt>
      <Txt kind="small">{incoming.deadline ? `AI answers in ${Math.max(0, Math.ceil((incoming.deadline - clock) / 1000))} seconds unless you answer or decline.` : 'AI waits for your approval.'}</Txt>
      <Button label="Let AI answer demo" onPress={approveIncoming} />
      <View style={{ flexDirection: 'row', gap: 8 }}><Button label="Answer myself" secondary onPress={() => dismissIncoming('You answered the simulated call. No AI session started.')} /><Button label="Decline" danger onPress={() => dismissIncoming('Incoming demo declined. AI takeover cancelled.')} /></View>
    </View>}
    {active && <View style={{ padding: 12, gap: 10, backgroundColor: theme.tinted }}>
      <Txt>Demo call active · {formatDuration(clock - active.startedAt)}</Txt>
      <Button label="End call now" danger icon="call" onPress={() => { void end(true); }} />
    </View>}
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }} />
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export default function Layout() { return <SafeAreaProvider><StoreProvider><Shell /></StoreProvider></SafeAreaProvider>; }
