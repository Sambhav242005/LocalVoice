import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../../core/store';
import { models } from '../../core/downloads';
import { Button, Panel, Row, Screen, Section, Txt, useTheme } from '../../components/ui';
export default function Overview() {
  const theme = useTheme();
  const { active, calls, ready, startDemo, downloads, settings, runtime } = useStore();
  const ended = calls.filter(call => call.status !== 'active');
  return <Screen title="LocalVoice" subtitle="Your assistant, with you in control.">
    <Panel style={{ backgroundColor: theme.header }}>
      <Txt kind="title" color="#FFFFFF">{active ? 'A demo conversation is in progress' : 'Ready to explore your call flow'}</Txt>
      <Txt color="#DCF2EC">Demo calls use scripted replies. Test local LFM inference from Models. VoIP is not connected.</Txt>
      <Button label={active ? 'Open active call' : ready ? 'Start a demo call' : 'Loading local settings…'} disabled={!ready} icon="call-outline" onPress={() => { if (!active) startDemo(); router.push('/calls'); }} />
    </Panel>
    <Section title="Monitor">
      <Panel>
        <Row title="Call controller" value={active ? 'Demo active' : 'Idle'} description="Stop any demo from the persistent call bar." />
        <Row title="Call history" value={`${ended.length} completed`} description="Transcripts and local recaps stay on this device." />
        <Row title="Download connection" value={downloads.network.type ?? 'Checking'} description={settings.wifiOnly ? 'Wi-Fi only policy enabled' : 'Wi-Fi or mobile data allowed'} />
        {settings.detail === 'detailed' && <><Row title="Transcript entries" value={String(calls.reduce((sum, call) => sum + call.messages.length, 0))} /><Row title="ASR / first token / first audio" value="Not measured" description="Requires the native model pipeline and a device benchmark." /><Row title="Memory / temperature / battery draw" value="Not measured" description="Android telemetry integration is planned." /></>}
        <Button label="Customize monitoring" secondary icon="options-outline" onPress={() => router.push('/settings')} />
      </Panel>
    </Section>
    <Section title="Voice pipeline">
      <Panel>{models.map(model => <Row key={model.id} title={model.name} value={runtime.states[model.id]?.status ?? (downloads.states[model.id]?.status === 'downloaded' ? 'Assets downloaded' : 'Assets needed')} description={runtime.states[model.id]?.message ?? (model.id === 'tts' ? 'Android decoder port pending.' : 'Download, then explicitly load the native engine.')} />)}<Button label="Manage models and memory" secondary onPress={() => router.push('/models')} /></Panel>
    </Section>
    <Section title="Recent conversations">
      {!calls.length ? <Panel><Txt>No calls yet</Txt><Txt color={theme.muted}>Start a demo to try the transcript, stop control and call recap.</Txt></Panel> : calls.slice(0, 3).map(call => <Panel key={call.id}><View style={{ gap: 4 }}><Txt kind="title">{call.name}</Txt><Txt kind="small" color={theme.muted}>{new Date(call.startedAt).toLocaleString()} · {call.status} · Demo</Txt></View><Txt>{call.summary ?? 'Conversation in progress.'}</Txt><Button label="View conversation" secondary onPress={() => router.push({ pathname: '/call/[id]', params: { id: call.id } })} /></Panel>)}
    </Section>
  </Screen>;
}
