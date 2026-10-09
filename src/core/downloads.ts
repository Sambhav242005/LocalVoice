import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as FS from 'expo-file-system/legacy';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';
import registry from '../data/models.json';
import { canDownload, type Settings } from './domain';

export const models = registry;
export type DownloadState = { status: 'missing' | 'downloading' | 'paused' | 'downloaded' | 'error'; progress: number; message?: string };
const key = 'localvoice.download.v1.';
const root = () => {
  if (Platform.OS === 'web' || !FS.documentDirectory) throw new Error('Model downloads require the Android app. Web is a UI preview.');
  return `${FS.documentDirectory}models/`;
};
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Download failed. Retry when connected.';

export function useModelDownloads(settings: Settings) {
  const [states, setStates] = useState<Record<string, DownloadState>>({});
  const [loaded, setLoaded] = useState(false);
  const [network, setNetwork] = useState<Network.NetworkState>({});
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const busy = useRef<string | null>(null);
  const task = useRef<FS.DownloadResumable | null>(null);
  const stopping = useRef(false);
  const latest = useRef(settings);
  useEffect(() => { latest.current = settings; }, [settings]);
  const update = useCallback((id: string, value: DownloadState) => setStates(old => ({ ...old, [id]: value })), []);
  const pause = useCallback(async () => {
    if (!busy.current) return;
    const id = busy.current;
    stopping.current = true;
    try {
      const snapshot = task.current ? await task.current.pauseAsync() : null;
      if (snapshot) await AsyncStorage.setItem(key + id, JSON.stringify(snapshot));
      setStates(old => ({ ...old, [id]: { ...old[id], status: 'paused', message: 'Paused. Tap Resume to continue.' } }));
    } catch (error) { update(id, { status: 'error', progress: 0, message: errorMessage(error) }); }
  }, [update]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const restored: Record<string, DownloadState> = {};
      try {
        if (Platform.OS !== 'web') {
          for (const model of models) {
            let bytes = 0;
            for (const file of model.files) {
              const info = await FS.getInfoAsync(`${root()}${model.id}/${file.path}`);
              if (info.exists && !info.isDirectory && info.size === file.bytes) bytes += file.bytes;
            }
            const saved = await AsyncStorage.getItem(key + model.id);
            restored[model.id] = { status: bytes === model.bytes ? 'downloaded' : saved ? 'paused' : 'missing', progress: bytes / model.bytes };
          }
        }
      } catch (error) {
        for (const model of models) restored[model.id] = { status: 'error', progress: 0, message: errorMessage(error) };
      }
      if (mounted) { setStates(restored); setLoaded(true); }
    })();
    Network.getNetworkStateAsync().then(value => { if (mounted) setNetwork(value); }).catch(() => {});
    const listener = Network.addNetworkStateListener(value => setNetwork(value));
    const appListener = AppState.addEventListener('change', value => {
      setForeground(value === 'active');
      if (value !== 'active') void pause();
    });
    return () => { mounted = false; listener.remove(); appListener.remove(); void pause(); };
  }, [pause]);

  useEffect(() => {
    if (!canDownload(settings, network.isConnected === true && network.isInternetReachable !== false, network.type ?? '') && busy.current) void pause();
  }, [network, settings, pause]);

  const download = useCallback(async (id: string) => {
    if (busy.current) return;
    const model = models.find(item => item.id === id);
    if (!model) return;
    busy.current = id;
    stopping.current = false;
    update(id, { status: 'downloading', progress: 0 });
    try {
      root();
      if (model.experimental && !latest.current.experimental) throw new Error('Enable experimental KittenTTS assets in Settings first. Android inference is not validated.');
      const currentNetwork = await Network.getNetworkStateAsync();
      if (!canDownload(latest.current, currentNetwork.isConnected === true && currentNetwork.isInternetReachable !== false, currentNetwork.type ?? '')) throw new Error('Download policy requires an internet connection and, when enabled, Wi-Fi.');
      const free = await FS.getFreeDiskStorageAsync();
      // Conservative reserve: the full bundle plus 512 MiB, even on a resume.
      if (free < model.bytes + 512 * 1024 ** 2) throw new Error('Not enough free storage. Free space for this bundle plus 512 MiB, then retry.');
      let completed = 0;
      for (const file of model.files) {
        if (stopping.current) break;
        const uri = `${root()}${model.id}/${file.path}`;
        const info = await FS.getInfoAsync(uri);
        if (info.exists && !info.isDirectory && info.size === file.bytes) { completed += file.bytes; continue; }
        await FS.makeDirectoryAsync(uri.slice(0, uri.lastIndexOf('/')), { intermediates: true });
        const partial = `${uri}.part`;
        const saved = await AsyncStorage.getItem(key + id);
        const snapshot: FS.DownloadPauseState | null = saved ? JSON.parse(saved) : null;
        const resume = snapshot?.url === file.url && snapshot?.fileUri === partial;
        const progress = (value: FS.DownloadProgressData) => update(id, { status: 'downloading', progress: Math.min(1, (completed + value.totalBytesWritten) / model.bytes), message: file.path });
        // Pause/background/policy may change while asynchronous setup is in flight.
        if (stopping.current) break;
        const nextTask = FS.createDownloadResumable(file.url, partial, {}, progress, resume ? snapshot.resumeData : undefined);
        task.current = nextTask;
        const result = resume ? await nextTask.resumeAsync() : await nextTask.downloadAsync();
        task.current = null;
        if (stopping.current || !result) break;
        if (result.status !== 200 && result.status !== 206) throw new Error(`HTTP ${result.status}. Retry the download.`);
        const downloaded = await FS.getInfoAsync(partial);
        if (!downloaded.exists || downloaded.isDirectory || downloaded.size !== file.bytes) {
          await FS.deleteAsync(partial, { idempotent: true });
          await AsyncStorage.removeItem(key + id);
          throw new Error(`Size check failed for ${file.path}. Retry this bundle.`);
        }
        await FS.moveAsync({ from: partial, to: uri });
        await AsyncStorage.removeItem(key + id);
        completed += file.bytes;
        task.current = null;
        update(id, { status: 'downloading', progress: completed / model.bytes });
      }
      if (!stopping.current) update(id, { status: 'downloaded', progress: 1, message: 'Download complete. Tap Load model to verify SHA-256 and initialize the native engine.' });
      else setStates(old => ({ ...old, [id]: { ...old[id], status: 'paused' } }));
    } catch (error) {
      update(id, { status: stopping.current ? 'paused' : 'error', progress: 0, message: errorMessage(error) });
    } finally { busy.current = null; task.current = null; }
  }, [update]);

  useEffect(() => {
    if (!loaded || !foreground || Platform.OS === 'web' || !settings.autoDownload || busy.current || !canDownload(settings, network.isConnected === true && network.isInternetReachable !== false, network.type ?? '')) return;
    const next = models.find(model => (!model.experimental || settings.experimental) && (!states[model.id] || states[model.id].status === 'missing'));
    if (!next) return;
    const timer = setTimeout(() => { void download(next.id); }, 0);
    return () => clearTimeout(timer);
  }, [loaded, foreground, settings, network, states, download]);

  const remove = async (id: string) => {
    if (busy.current) throw new Error('Pause the active download before removing assets.');
    if (!models.some(model => model.id === id)) throw new Error('Unknown model.');
    await FS.deleteAsync(`${root()}${id}`, { idempotent: true });
    await AsyncStorage.removeItem(key + id);
    update(id, { status: 'missing', progress: 0 });
  };
  const activeDownload = Object.keys(states).find(id => states[id].status === 'downloading');
  return { states, loaded, network, download, pause, remove, activeDownload };
}
