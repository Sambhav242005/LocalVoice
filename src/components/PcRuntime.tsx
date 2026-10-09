import React, { useState } from 'react';
import { TextInput } from 'react-native';
import { useStore } from '../core/store';
import { Button, Panel, Row, Txt, styles, useTheme } from './ui';

export function PcRuntime() {
  const theme = useTheme();
  const { settings, setSettings, pc, setNotice } = useStore();
  const [prompt, setPrompt] = useState('Say hello in one short sentence.');
  const run = (action: () => Promise<unknown>) => { void action().catch(error => setNotice(error instanceof Error ? error.message : 'PC request failed.', 'error')); };
  const field = [styles.input, { color: theme.text, borderColor: theme.outline }];
  return <>
    <Panel><Txt kind="title">Your PC runs the AI</Txt><Txt>The mobile app controls and monitors it. Models download and load on the PC. No phone inference runs in this mode.</Txt>
      <Txt>PC address</Txt><TextInput accessibilityLabel="PC address" autoCapitalize="none" autoCorrect={false} value={settings.pcUrl} onChangeText={pcUrl => setSettings(old => ({ ...old, pcUrl }))} style={field} />
      <Txt>Pairing token</Txt><TextInput accessibilityLabel="PC pairing token" secureTextEntry autoCapitalize="none" autoCorrect={false} value={settings.pcToken} onChangeText={pcToken => setSettings(old => ({ ...old, pcToken }))} style={field} />
      <Txt kind="small">Start npm run pc:start on your PC. The token is in .localvoice-pc/pairing-token.txt. Use 127.0.0.1 with USB reverse, or 10.0.2.2 in the Android emulator.</Txt>
      <Button label="Check PC connection" secondary onPress={() => run(pc.refresh)} />
      <Row title="PC connection" value={pc.connected ? 'Connected' : 'Disconnected'} description={pc.error || 'Local service only. No cloud AI provider.'} />
      {pc.status?.lastInferenceMs !== undefined && <Row title="Last PC inference" value={`${pc.status.lastInferenceMs} ms`} description="One measured request; not a benchmark average." />}
    </Panel>
    {(['llm', 'asr', 'tts'] as const).map(id => <Panel key={id}><Txt kind="title">{id === 'llm' ? 'LFM · PC conversation' : id === 'asr' ? 'Nemotron · PC transcription' : 'KittenTTS · PC speech'}</Txt><Row title="PC engine" value={pc.states[id]?.status ?? 'Unknown'} description={pc.states[id]?.message ?? 'Connect to check PC memory and model status.'} />{typeof pc.states[id]?.progress === 'number' && <Txt kind="small">{Math.round((pc.states[id].progress ?? 0) * 100)}% of assets</Txt>}
      <Button label="Download and load on PC" disabled={!pc.connected || pc.busy || ['loaded', 'ready'].includes(pc.states[id]?.status ?? '')} onPress={() => run(() => pc.load(id))} />
    </Panel>)}
    <Panel><Txt kind="title">Test PC inference</Txt><Txt>Real PC model output. Scripted demo calls remain separate.</Txt><TextInput accessibilityLabel="PC model test prompt" value={prompt} onChangeText={setPrompt} multiline style={field} /><Button label="Generate on PC" disabled={pc.busy || pc.states.llm?.status !== 'ready' || !prompt.trim()} onPress={() => run(() => pc.test(prompt.trim(), settings.instructions))} /><Button label="Preview KittenTTS on PC speaker" secondary disabled={pc.busy || !['ready', 'loaded'].includes(pc.states.tts?.status ?? '') || !prompt.trim()} onPress={() => run(() => pc.previewVoice(prompt.trim()))} />{!!pc.answer && <Txt selectable>{pc.answer}</Txt>}<Button label="Run synthetic PC voice test" secondary disabled={pc.busy || !["llm", "asr", "tts"].every(id => ["ready", "loaded"].includes(pc.states[id]?.status ?? ""))} onPress={() => run(pc.pipelineTest)} /><Txt kind="small">KittenTTS creates a test utterance, Nemotron transcribes it, LFM replies, and KittenTTS speaks on the PC. This is a synthetic audio test, not a call.</Txt><Button label="Stop PC AI and release models" danger disabled={!pc.connected} onPress={() => run(pc.stop)} /><Txt kind="small">Stop terminates PC inference processes and stops PC playback. Reload the models before another test.</Txt></Panel>
    <Panel><Txt kind="title">Bluetooth test status</Txt><Row title="Virtual headset advertising" value={pc.status?.bluetooth?.advertising ? 'Yes' : 'Not running'} /><Row title="HFP connection" value={pc.status?.bluetooth?.hfpConnected ? 'Connected' : 'Not connected'} /><Row title="SCO audio link" value={pc.status?.bluetooth?.scoConnected ? 'Connected' : 'Not validated'} /><Row title="Received SCO packet bytes" value={`${pc.status?.bluetooth?.receivedAudioBytes ?? 0} bytes`} /><Txt>Received SCO packets are not yet validated as usable speech PCM. Emulator tests are synthetic. Physical phone SIM call audio is not validated; automatic takeover stays disconnected.</Txt>{!!pc.status?.bluetooth?.error && <Txt color={theme.error}>{pc.status.bluetooth.error}</Txt>}</Panel>
  </>;
}
