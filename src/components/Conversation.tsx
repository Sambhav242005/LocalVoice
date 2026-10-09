import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import { useStore } from '../core/store';
import type { Call } from '../core/domain';
import { Button, Panel, Section, Txt, formatDuration, styles, useTheme } from './ui';
export function Conversation({ call }: { call: Call }) {
  const theme = useTheme();
  const { send, end, clock } = useStore();
  const [draft, setDraft] = useState('');
  const live = call.status === 'active';
  return <>
    <Panel><Txt kind="title">{call.name}</Txt><Txt color={theme.muted}>Demo · {call.status} · {formatDuration((call.endedAt ?? clock) - call.startedAt)}</Txt><Txt kind="small" color={theme.muted}>Language: {call.settings.language}. Settings captured when this call started.</Txt>
      {live && <Button label="Complete demo call" secondary onPress={() => { void end(false); }} />}
    </Panel>
    <Section title="Transcript">
      {call.messages.map((message, index) => <Panel key={`${message.at}-${index}`} style={{ backgroundColor: message.role === 'agent' ? theme.tinted : theme.surface }}><Txt kind="small" color={theme.primary}>{message.role === 'agent' ? 'Demo assistant' : 'Caller'} · {formatDuration(message.at - call.startedAt)}</Txt><Txt>{message.text}</Txt></Panel>)}
    </Section>
    {live ? <Panel><Txt kind="title">Try a caller message</Txt><Txt color={theme.muted}>Typed messages exercise the call flow. Responses are scripted demo text.</Txt><TextInput accessibilityLabel="Caller message" value={draft} onChangeText={setDraft} multiline maxLength={2000} placeholder="What would the caller say?" placeholderTextColor={theme.muted} style={[styles.input, { color: theme.text, borderColor: theme.outline, backgroundColor: theme.surface }]} /><View style={{ gap: 8 }}><Button label="Send caller message" disabled={!draft.trim()} onPress={() => { send(draft); setDraft(''); }} /><Button label="End call now" danger onPress={() => { void end(true); }} /></View></Panel> : <Section title="Call recap"><Panel><Txt>{call.summary}</Txt><Txt kind="small" color={theme.muted}>Transcript-based local recap. AI intent, action items and quality scoring are planned with LFM integration.</Txt></Panel></Section>}
  </>;
}
