import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { defaults, incomingDeadline, demoReply, finishCall, stopAndFinish, type Call, type Settings } from './domain';
import { useModelDownloads } from './downloads';
import { useModelRuntime } from './runtime';
import { usePcRuntime } from './pc-runtime';

function useStoreValue() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [calls, setCalls] = useState<Call[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNoticeText] = useState('');
  const [noticeKind, setNoticeKind] = useState<'info' | 'error'>('info');
  const setNotice = useCallback((message: string, kind: 'info' | 'error' = 'info') => { setNoticeText(message); setNoticeKind(kind); }, []);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const callsRef = useRef(calls);
  useEffect(() => { callsRef.current = calls; }, [calls]);
  const ending = useRef(false);
  const [incoming, setIncoming] = useState<{ deadline?: number; settings: Settings } | null>(null);
  const incomingRef = useRef<typeof incoming>(null);
  const storageQueue = useRef(Promise.resolve());
  const downloads = useModelDownloads({ ...settings, autoDownload: ready && settings.executionHost === 'mobile' && settings.autoDownload });
  const runtime = useModelRuntime(setNotice);
  const pc = usePcRuntime(settings, ready && settings.executionHost === 'pc', setNotice);
  const autoLoadAttempted = useRef(false);
  useEffect(() => {
    if (!ready || settings.executionHost !== 'mobile' || !settings.autoLoadLfm || !runtime.available || runtime.busy || downloads.activeDownload || downloads.states.llm?.status !== 'downloaded' || autoLoadAttempted.current) return;
    if (runtime.states.llm?.status === 'ready') return;
    autoLoadAttempted.current = true;
    void runtime.load('llm').catch(error => setNotice(error instanceof Error ? error.message : 'Automatic loading failed. Retry from Models.', 'error'));
  }, [ready, settings.executionHost, settings.autoLoadLfm, runtime, downloads.activeDownload, downloads.states.llm?.status, setNotice]);
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem('localvoice.state.v1').then(raw => {
      if (!mounted) return;
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.version !== 1 || !Array.isArray(saved.calls)) throw new Error('Unsupported saved history format.');
        setSettings({ ...defaults, ...saved.settings });
        setCalls(saved.calls.map((call: Call) => call.status === 'active' ? finishCall(call, true, Date.now()) : call));
      }
      setReady(true);
    }).catch(() => { if (mounted) { setLoadFailed(true); setNotice('Saved data could not be read. Retry loading. If the problem persists, recover or clear the app’s saved data through device settings.', 'error'); } });
    return () => { mounted = false; void Speech.stop(); };
  }, [loadAttempt, setNotice]);
  useEffect(() => {
    if (!ready) return;
    const data = JSON.stringify({ version: 1, settings, calls });
    storageQueue.current = storageQueue.current.then(() => AsyncStorage.setItem('localvoice.state.v1', data)).catch(() => setNotice('Changes could not be saved. Check available storage.', 'error'));
  }, [settings, calls, ready, setNotice]);
  const active = calls.find(call => call.status === 'active');
  const activeStart = active?.startedAt;
  useEffect(() => {
    if (activeStart === undefined) return;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [activeStart]);
  const startDemo = (callSettings: Settings = settings) => {
    if (incomingRef.current || callsRef.current.some(call => call.status === 'active') || !ready) return;
    const now = Date.now();
    const call: Call = { id: `demo-${now}`, name: 'Demo caller', startedAt: now, status: 'active', demo: true, settings: { ...callSettings }, messages: [{ role: 'agent', text: callSettings.language === 'hi-IN' ? 'नमस्ते। यह एक डेमो AI कॉल है।' : 'Hello. This is a demo AI call. How can I help?', at: now }] };
    callsRef.current = [call, ...callsRef.current];
    setCalls(callsRef.current);
    setClock(now);
  };
  const dismissIncoming = (message: string) => {
    if (!incomingRef.current) return;
    incomingRef.current = null;
    setIncoming(null);
    setNotice(message);
  };
  const approveIncoming = () => {
    const pending = incomingRef.current;
    if (!pending) return;
    incomingRef.current = null;
    setIncoming(null);
    startDemo(pending.settings);
  };
  const simulateIncoming = () => {
    if (!ready || incomingRef.current || callsRef.current.some(call => call.status === 'active')) return;
    const pending = { settings: { ...settings }, deadline: incomingDeadline(settings, Date.now()) };
    incomingRef.current = pending;
    setIncoming(pending);
    setClock(Date.now());
  };
  useEffect(() => {
    if (!incoming) return;
    const timer = setInterval(() => {
      setClock(Date.now());
      if (incomingRef.current?.deadline !== undefined && Date.now() >= incomingRef.current.deadline) approveIncoming();
    }, 250);
    const listener = AppState.addEventListener('change', state => {
      if (state !== 'active') dismissIncoming('Incoming demo cancelled when the app left the foreground. Real background calling is pending.');
    });
    return () => { clearInterval(timer); listener.remove(); };
    // Incoming policy is captured when the demo rings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming]);
  const send = (text: string) => {
    const current = callsRef.current.find(call => call.status === 'active');
    if (!current || ending.current || !text.trim()) return;
    const now = Date.now();
    const reply = demoReply(text.trim(), current.settings.language);
    const next = callsRef.current.map(call => call.id === current.id ? { ...call, messages: [...call.messages, { role: 'caller' as const, text: text.trim(), at: now }, { role: 'agent' as const, text: reply, at: now + 1 }] } : call);
    callsRef.current = next;
    setCalls(next);
    if (settings.speak && settings.executionHost === 'mobile') {
      if (settings.voiceEngine === 'kitten') setNotice('KittenTTS is selected but its Android decoder is unavailable. This reply uses system speech.');
      Speech.speak(reply, { language: current.settings.language, onError: () => setNotice('System speech failed. Check the installed language voice.', 'error') });
    }
  };
  const end = async (stopped: boolean) => {
    if (ending.current) return;
    const current = callsRef.current.find(call => call.status === 'active');
    if (!current) return;
    ending.current = true;
    try {
      const finished = await stopAndFinish(current, stopped, async () => { await runtime.stop(); await Speech.stop(); }, Date.now);
      const next = callsRef.current.map(call => call.id === current.id ? finished : call);
      callsRef.current = next;
      setCalls(next);
    } catch { setNotice('Speech could not be stopped. The call remains active; tap End call now to retry.', 'error'); }
    finally { ending.current = false; }
  };
  const retryLoad = () => { setLoadFailed(false); setNotice('Retrying saved data…'); setLoadAttempt(value => value + 1); };
  const changeExecutionHost = async (host: Settings['executionHost']) => {
    if (host === settings.executionHost) return;
    if (runtime.busy || pc.busy) throw new Error('Stop the current inference or wait for loading before changing the AI host.');
    if (host === 'pc') {
      await downloads.pause();
      await runtime.stop();
      for (const id of ['llm', 'asr']) if (runtime.states[id] && runtime.states[id].status !== 'unloaded') await runtime.unload(id);
      await Speech.stop();
    } else if (pc.connected) {
      await pc.stop();
    }
    setSettings(old => ({ ...old, executionHost: host }));
  };
  return { settings, setSettings, calls, ready, notice, noticeKind, setNotice, loadFailed, retryLoad, active, clock, startDemo, send, end, downloads, runtime, pc, changeExecutionHost, incoming, simulateIncoming, approveIncoming, dismissIncoming };
}
type Store = ReturnType<typeof useStoreValue>;
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: React.ReactNode }) { return <Context.Provider value={useStoreValue()}>{children}</Context.Provider>; }
export function useStore() { const value = useContext(Context); if (!value) throw new Error('Missing StoreProvider'); return value; }
