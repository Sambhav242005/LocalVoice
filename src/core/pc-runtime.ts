import { useCallback, useEffect, useRef, useState } from 'react';
import type { Settings } from './domain';
import { pcRequest, type PcStatus } from './pc-client';

export function usePcRuntime(settings: Settings, enabled: boolean, notify: (message: string, kind?: 'info' | 'error') => void) {
  const [status, setStatus] = useState<PcStatus | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState('');
  const task = useRef<AbortController | null>(null);
  const previous = useRef<Record<string, string>>({});
  const epoch = useRef(0);
  const request = useCallback(<T,>(path: string, body?: object, signal?: AbortSignal) => pcRequest<T>(settings.pcUrl, settings.pcToken, path, body, signal), [settings.pcUrl, settings.pcToken]);
  const refresh = useCallback(async () => {
    const revision = epoch.current;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const next = await request<PcStatus>('/status', undefined, controller.signal);
      if (revision !== epoch.current) return;
      if (next.version !== 1 || next.host !== 'pc' || !next.models) throw new Error('Incompatible PC service.');
      setStatus(next); setError('');
      for (const [id, model] of Object.entries(next.models)) {
        if (model.status === 'loaded' && previous.current[id] !== 'loaded') notify(`${id === 'asr' ? 'Nemotron' : id === 'tts' ? 'KittenTTS' : 'LFM'} loaded into PC memory. An inference test is still required.`);
        if (model.status === 'ready' && previous.current[id] !== 'ready') notify(`${id === 'llm' ? 'LFM' : id === 'asr' ? 'Nemotron' : 'KittenTTS'} is ready on your PC. Inference test passed.`);
        previous.current[id] = model.status;
      }
    } catch (cause) {
      if (revision === epoch.current) { setStatus(null); setError(cause instanceof Error ? cause.message : 'PC disconnected.'); }
      throw cause;
    } finally { clearTimeout(timer); }
  }, [request, notify]);
  useEffect(() => {
    epoch.current++;
    previous.current = {};
    const reset = setTimeout(() => { setStatus(null); setError(''); setAnswer(''); if (enabled && settings.pcToken) void refresh().catch(() => {}); }, 0);
    if (!enabled || !settings.pcToken) return () => clearTimeout(reset);
    const timer = setInterval(() => { void refresh().catch(() => {}); }, 2000);
    // This ref is a request-generation counter, not a rendered DOM node.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { epoch.current++; clearTimeout(reset); clearInterval(timer); task.current?.abort(); };
  }, [enabled, settings.pcToken, refresh]);
  const run = async (action: (signal: AbortSignal) => Promise<void>) => {
    if (task.current) throw new Error('Wait for the current PC request.');
    const controller = new AbortController();
    task.current = controller; setBusy(true);
    const revision = epoch.current;
    const timer = setTimeout(() => controller.abort(), 180000);
    try { await action(controller.signal); }
    finally { clearTimeout(timer); if (task.current === controller) task.current = null; setBusy(false); if (revision === epoch.current) void refresh().catch(() => {}); }
  };
  const load = (id: string) => run(async signal => { await request('/models/' + id + '/load', {}, signal); });
  const test = (text: string, instructions: string) => run(async signal => {
    setAnswer('');
    const result = await request<{ text: string }>('/chat', { text, instructions }, signal);
    if (!signal.aborted) setAnswer(result.text);
  });
  const previewVoice = (text: string) => run(async signal => {
    await request('/synthesize', { text, language: settings.language, play: true }, signal);
    notify('KittenTTS generated audio on the PC. Playback was requested on the PC speaker.');
  });
  const pipelineTest = () => run(async signal => {
    setAnswer('');
    const result = await request<{ transcript: string; reply: string; elapsedMs: number }>('/pipeline-test', { text: settings.language === 'hi-IN' ? 'नमस्ते, आप कौन हैं?' : 'Hello, please tell me who you are.', language: settings.language, instructions: settings.instructions, play: true }, signal);
    if (!signal.aborted) setAnswer(`Synthetic PC voice test\nTranscribed: ${result.transcript}\nLFM reply: ${result.reply}\nTotal: ${result.elapsedMs} ms. Audio plays on PC.`);
  });
  const stop = async () => {
    task.current?.abort();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try { await request('/stop', {}, controller.signal); setAnswer(''); await refresh(); }
    finally { clearTimeout(timer); }
  };
  return { status, error, connected: !!status, states: status?.models ?? {}, busy: busy || !!status?.busy, answer, refresh, load, test, previewVoice, pipelineTest, stop };
}
