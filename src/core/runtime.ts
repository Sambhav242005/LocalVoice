import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, ToastAndroid } from 'react-native';
import { NativeModule, requireOptionalNativeModule } from 'expo';
import * as FS from 'expo-file-system/legacy';
import type { LlamaContext } from 'llama.rn';
import { models } from './downloads';
import { RuntimeController, type RuntimeState } from './runtime-controller';

type Verification = { id: string; file: string; progress: number };
declare class RuntimeNative extends NativeModule<{ onVerification: (event: Verification) => void }> {
  verifyBundle(id: string, files: string): Promise<boolean>;
  loadAsr(paths: string[]): Promise<{ inputs: string[]; outputs: string[] }[]>;
  unloadAsr(): Promise<void>;
  memory(): Promise<{ pssMiB: number }>;
}
const native = Platform.OS === 'android' ? requireOptionalNativeModule<RuntimeNative>('LocalVoiceRuntime') : null;
export function useModelRuntime(notify: (message: string, kind?: 'info' | 'error') => void) {
  const [states, setStates] = useState<Record<string, RuntimeState>>({});
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState('');
  const operation = useRef(false);
  const context = useRef<LlamaContext | null>(null);
  const controllers = useRef<Record<string, RuntimeController>>({});
  const available = !!native;
  const stateUpdate = (id: string, value: RuntimeState) => setStates(old => ({ ...old, [id]: value }));
  const controller = (id: string) => controllers.current[id] ??= new RuntimeController(value => stateUpdate(id, value));
  useEffect(() => {
    const listener = native?.addListener('onVerification', event => setStates(old => old[event.id]?.status === 'verifying' ? ({ ...old, [event.id]: { ...old[event.id], message: `Checking ${event.file}`, progress: event.progress } }) : old));
    return () => { listener?.remove(); void context.current?.release(); void native?.unloadAsr(); };
  }, []);
  const run = async (action: () => Promise<void>) => {
    if (operation.current) throw new Error('Wait for the current native operation to finish.');
    operation.current = true;
    setBusy(true);
    try { await action(); }
    finally { operation.current = false; setBusy(false); }
  };
  const load = async (id: string) => run(async () => {
    if (!native || !FS.documentDirectory) throw new Error('Install the LocalVoice development APK. Expo Go does not contain the AI engines.');
    const model = models.find(item => item.id === id);
    if (!model || id === 'tts') throw new Error('KittenTTS Android decoder is not supported yet. Use system speech.');
    const files = model.files.map(file => ({ ...file, uri: `${FS.documentDirectory}models/${id}/${file.path}` }));
    await controller(id).load(async () => {
      if (!await native.verifyBundle(id, JSON.stringify(files))) throw new Error('Verification did not complete.');
    }, async () => {
      if (id === 'asr') {
        await native.loadAsr(files.filter(file => file.path.endsWith('.onnx')).map(file => file.uri));
        return { release: () => native.unloadAsr() };
      }
      // Load from the bundled module graph only after confirming a development runtime.
      // This keeps Expo Go usable and avoids a second Metro request during model loading.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { initLlama } = require('llama.rn') as typeof import('llama.rn');
      const loaded = await initLlama({ model: files[0].uri, n_ctx: 2048, n_batch: 128, n_threads: 2, n_gpu_layers: 0, use_mmap: true, use_mlock: false }, progress => stateUpdate(id, { status: 'loading', message: 'Opening LFM with llama.cpp (CPU)…', progress: progress / 100 }));
      context.current = loaded;
      return {
        warmup: async () => {
          const result = await loaded.completion({ prompt: 'Hello', n_predict: 4, temperature: 0 });
          if (!result.text.trim()) throw new Error('Warm-up returned no text. The model is not ready.');
        },
        release: async () => { await loaded.stopCompletion(); await loaded.release(); context.current = null; },
      };
    });
    try {
      const memory = await native.memory();
      setStates(old => ({ ...old, [id]: { ...old[id], pssMiB: memory.pssMiB } }));
    } catch { /* A telemetry failure does not invalidate successful native initialization. */ }
    const message = id === 'llm' ? 'LFM loaded successfully. The inference test passed.' : 'Nemotron ONNX sessions loaded. Speech decoding is still pending.';
    notify(message);
    ToastAndroid.show(message, ToastAndroid.LONG);
    AccessibilityInfo.announceForAccessibility(message);
  });
  const unload = (id: string) => run(async () => { await controller(id).unload(); if (id === 'llm') setAnswer(''); });
  const test = (prompt: string, instructions: string) => run(async () => {
    if (!context.current || states.llm?.status !== 'ready') throw new Error('Load LFM successfully before testing.');
    setAnswer('');
    const result = await context.current.completion({ messages: [{ role: 'system', content: instructions }, { role: 'user', content: prompt }], n_predict: 96, temperature: 0.2, jinja: true, enable_thinking: false, reasoning_format: 'auto' }, data => { if (data.content !== undefined) setAnswer(data.content); });
    if (!result.content.trim()) throw new Error('Generation ended before a final reply. Retry with a shorter prompt.');
    setAnswer(result.content);
  });
  const stop = async () => { await context.current?.stopCompletion(); };
  return { states, available, busy, load, unload, test, stop, answer };
}
