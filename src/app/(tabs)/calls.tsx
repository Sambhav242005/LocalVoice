import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../../core/store';
import { Conversation } from '../../components/Conversation';
import { Button, Panel, Screen, Section, Txt, styles, useTheme } from '../../components/ui';
export default function Calls() {
  const theme = useTheme();
  const { active, calls, startDemo, ready, incoming, simulateIncoming } = useStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const history = calls.filter(call => call.status !== 'active' && (filter === 'all' || call.status === filter) && `${call.name} ${call.summary ?? ''} ${call.messages.map(message => message.text).join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  return <Screen title="Conversations" subtitle="See what the caller said and how each demo ended.">
    {active ? <Conversation call={active} /> : <Panel><Txt kind="title">No active call</Txt><Txt color={theme.muted}>Real incoming calls require the planned VoIP integration.</Txt><Button label="Start a demo call" icon="call-outline" disabled={!ready} onPress={() => startDemo()} /><Button label="Simulate incoming call" secondary disabled={!ready || !!incoming} onPress={simulateIncoming} /></Panel>}
    <Section title="Call history">
      <TextInput accessibilityLabel="Search call history" value={query} onChangeText={setQuery} placeholder="Search transcripts and recaps" placeholderTextColor={theme.muted} style={[styles.input, { color: theme.text, borderColor: theme.outline, backgroundColor: theme.surface }]} />
      <View style={{ gap: 8, flexDirection: 'row', flexWrap: 'wrap' }}>{['all', 'completed', 'stopped'].map(value => <Button key={value} label={value === 'all' ? 'All calls' : value === 'completed' ? 'Completed' : 'Stopped'} selected={filter === value} secondary={filter !== value} onPress={() => setFilter(value)} />)}</View>
      {!history.length ? <Panel><Txt>{calls.length ? 'No calls match these filters.' : 'Your call history starts here.'}</Txt></Panel> : history.map(call => <Panel key={call.id}><Txt kind="title">{call.name}</Txt><Txt kind="small" color={theme.muted}>{new Date(call.startedAt).toLocaleString()} · {call.status} · Demo</Txt><Txt>{call.summary}</Txt><Button label="Open transcript and recap" secondary onPress={() => router.push({ pathname: '/call/[id]', params: { id: call.id } })} /></Panel>)}
    </Section>
  </Screen>;
}
