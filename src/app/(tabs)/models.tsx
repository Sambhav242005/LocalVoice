import React, { useState } from 'react';
import { Platform, Switch, TextInput, View } from 'react-native';
import { useStore } from '../../core/store';
import { models } from '../../core/downloads';
import { Button, Panel, Row, Screen, Txt, useTheme } from '../../components/ui';
import { PcRuntime } from '../../components/PcRuntime';
export default function Models() {
  const theme = useTheme();
  const { downloads, settings, setSettings, setNotice, runtime } = useStore();
  const [prompt, setPrompt] = useState('Say hello in one short sentence.');
  const run = (action: () => Promise<void>) => { void action().catch(error => setNotice(error instanceof Error ? error.message : 'Action failed.', 'error')); };
  if (settings.executionHost === 'pc') return <Screen title="PC model runtime" subtitle="Your computer hosts the models. This device is the remote dashboard."><PcRuntime /></Screen>;
  return <Screen title="Model library" subtitle="Download pinned assets. Native runtime readiness is a separate step.">
    <Panel><Txt kind="title">{settings.autoDownload ? 'Automatic download mode is on' : 'Choose when to download'}</Txt><Txt color={theme.muted}>Downloads run one bundle at a time while the app is open. Interrupted downloads can be resumed. KittenTTS requires experimental opt-in.</Txt><Button label={settings.autoDownload ? 'Disable automatic downloads' : 'Enable automatic downloads'} secondary disabled={Platform.OS === 'web'} onPress={() => setSettings(old => ({ ...old, autoDownload: !old.autoDownload }))} /></Panel>
    {Platform.OS === 'web' && <Panel><Txt>Web preview: download controls are available in the Android app.</Txt></Panel>}
    {!runtime.available && <Panel><Txt kind="title">Native engines need a development build</Txt><Txt>Expo Go can download files. Install the LocalVoice development APK to verify and load them into native memory.</Txt></Panel>}
    <Panel><Txt kind="title">Load LFM automatically</Txt><Txt>After downloading, verify and load LFM when this app opens. One automatic attempt per app session; failures require manual retry. Unloading turns this option off.</Txt><Switch accessibilityLabel="Load LFM automatically" value={settings.autoLoadLfm} disabled={!runtime.available} onValueChange={value => setSettings(old => ({ ...old, autoLoadLfm: value }))} style={{ minWidth: 48, minHeight: 48 }} /></Panel>
    {models.map(model => {
      const state = downloads.states[model.id] ?? { status: 'missing', progress: 0 };
      const downloading = state.status === 'downloading';
      const engine = runtime.states[model.id];
      const resident = engine && (engine.resident || (engine.status !== 'unloaded' && engine.status !== 'error'));
      return <Panel key={model.id}>
        <Txt kind="title">{model.name}</Txt><Txt color={theme.muted}>{model.role}</Txt>
        <Row title="Bundle size" value={`${(model.bytes / 1024 ** 3).toFixed(2)} GiB`} description={`${model.files.length} files · revision ${model.revision.slice(0, 8)}`} />
        <Row title="Asset status" value={state.status} description="All files are checked with native streaming SHA-256 before loading." />
        {state.progress > 0 && <><View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(state.progress * 100) }} style={{ height: 8, backgroundColor: theme.tinted, borderRadius: 4, overflow: 'hidden' }}><View style={{ height: 8, width: `${Math.round(state.progress * 100)}%`, backgroundColor: theme.primary }} /></View><Txt kind="small">{Math.round(state.progress * 100)}% of bundle</Txt></>}
        {!!state.message && <Txt kind="small" color={state.status === 'error' ? theme.error : theme.muted}>{state.message}</Txt>}
        {model.experimental && <Txt kind="small" color={theme.muted}>C++ bundle is larger than the optimized Python weights in the supplied brief. Android decoder compatibility remains unvalidated.</Txt>}
        {state.status !== 'downloaded' ? <Button label={downloading ? 'Pause download' : state.status === 'paused' ? 'Resume download' : state.status === 'error' ? 'Retry download' : 'Download assets'} icon={downloading ? 'pause-outline' : 'download-outline'} disabled={!downloads.loaded || Platform.OS === 'web' || runtime.busy || (!downloading && !!downloads.activeDownload) || (model.experimental && !settings.experimental)} onPress={() => run(() => downloading ? downloads.pause() : downloads.download(model.id))} /> : <Button label="Remove downloaded assets" secondary disabled={!!downloads.activeDownload || runtime.busy || !!resident} onPress={() => { setSettings(old => ({ ...old, autoDownload: false })); run(() => downloads.remove(model.id)); }} />}
        <Row title="Native runtime" value={model.id === 'tts' ? 'Unsupported' : engine?.status ?? 'unloaded'} description={model.id === 'tts' ? 'KittenTTS needs an Android decoder port. System speech remains available.' : engine?.message ?? 'Load explicitly after downloading. Files are verified on every load.'} />
        {engine?.progress !== undefined && <Txt kind="small">{Math.round(engine.progress * 100)}% of current stage</Txt>}
        {engine?.elapsedMs !== undefined && <Txt kind="small">Load and check time: {(engine.elapsedMs / 1000).toFixed(1)} seconds</Txt>}
        {engine?.pssMiB !== undefined && <Txt kind="small">App memory after load: {engine.pssMiB.toFixed(0)} MiB PSS (entire process)</Txt>}
        {model.id !== 'tts' && <><Button label={engine?.status === 'error' ? 'Retry loading model' : 'Load model'} disabled={!runtime.available || runtime.busy || !!resident || state.status !== 'downloaded' || !!downloads.activeDownload} onPress={() => run(() => runtime.load(model.id))} /><Button label="Unload model" secondary disabled={!runtime.available || runtime.busy || !engine || engine.status === 'unloaded'} onPress={() => { if (model.id === 'llm') setSettings(old => ({ ...old, autoLoadLfm: false })); run(() => runtime.unload(model.id)); }} /></>}
      </Panel>;
    })}
    <Panel><Txt kind="title">Local LFM test</Txt><Txt>Real model output, separate from scripted demo calls. Replies do not perform actions.</Txt><TextInput accessibilityLabel="Model test prompt" value={prompt} onChangeText={setPrompt} multiline style={{ color: theme.text, borderColor: theme.outline, borderWidth: 1, borderRadius: 12, padding: 16, minHeight: 80 }} /><Button label="Generate a test reply" disabled={runtime.busy || runtime.states.llm?.status !== 'ready' || !prompt.trim()} onPress={() => run(() => runtime.test(prompt.trim(), settings.instructions))} />{runtime.busy && <Button label="Stop generation" danger onPress={() => run(runtime.stop)} />}{!!runtime.answer && <Txt selectable>{runtime.answer}</Txt>}</Panel>
  </Screen>;
}
