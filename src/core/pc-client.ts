export type PcModelState = { status: string; message: string; progress?: number; elapsedMs?: number };
export type PcStatus = { version: 1; host: 'pc'; models: Record<string, PcModelState>; busy: boolean; lastInferenceMs?: number; callAudio: string; realCalls: false; bluetooth?: { advertising?: boolean; hfpConnected?: boolean; scoConnected?: boolean; receivedAudioBytes?: number; pcmValidated?: boolean; realCallValidated?: boolean; error?: string } };

export function pcAddress(value: string): string {
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Enter a PC base URL such as http://127.0.0.1:8090.');
  if (!['127.0.0.1', 'localhost', '10.0.2.2'].includes(url.hostname)) throw new Error('Use localhost through USB reverse, or 10.0.2.2 for the Android emulator.');
  return url.origin;
}

export async function pcRequest<T>(address: string, token: string, path: string, body?: object, signal?: AbortSignal): Promise<T> {
  if (!token.trim()) throw new Error('Enter the pairing token from .localvoice-pc/pairing-token.txt.');
  const response = await fetch(`${pcAddress(address)}${path}`, { method: body === undefined ? 'GET' : 'POST', signal, headers: { Authorization: `Bearer ${token.trim()}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : `PC service returned HTTP ${response.status}.`);
  return result as T;
}
