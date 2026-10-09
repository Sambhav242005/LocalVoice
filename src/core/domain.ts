export type Language = 'en-IN' | 'hi-IN';
export type Message = { role: 'caller' | 'agent'; text: string; at: number };
export type Call = { id: string; name: string; startedAt: number; endedAt?: number; status: 'active' | 'completed' | 'stopped'; messages: Message[]; summary?: string; demo: true; settings: Settings };
export type Settings = { theme: 'light' | 'dark' | 'system'; language: Language; detail: 'simple' | 'detailed'; autoDownload: boolean; autoLoadLfm: boolean; wifiOnly: boolean; experimental: boolean; speak: boolean; voiceEngine: 'system' | 'kitten'; answerMode: 'manual' | 'unanswered'; answerDelay: number; instructions: string };
export const defaults: Settings = { theme: 'light', language: 'en-IN', detail: 'simple', autoDownload: false, autoLoadLfm: false, wifiOnly: true, experimental: false, speak: false, voiceEngine: 'system', answerMode: 'manual', answerDelay: 20, instructions: 'Be brief and helpful. Identify yourself as an AI assistant. Never promise actions you cannot perform.' };
export function summarize(messages: Message[], stopped: boolean): string {
  const caller = messages.filter(message => message.role === 'caller');
  if (!caller.length) return stopped ? 'Stopped by owner before the caller spoke.' : 'Call ended without a caller message.';
  const excerpt = caller.map(message => message.text.trim().replace(/[.!?]+$/, '')).filter(Boolean).join(' / ').slice(0, 500);
  return `${stopped ? 'Stopped by owner.' : 'Completed.'} Caller discussed: ${excerpt}. Follow-up has not been assessed by an AI model.`;
}
export function finishCall(call: Call, stopped: boolean, now: number): Call {
  if (call.status !== 'active') return call;
  return { ...call, endedAt: now, status: stopped ? 'stopped' : 'completed', summary: summarize(call.messages, stopped) };
}
export async function stopAndFinish(call: Call, stopped: boolean, stop: () => Promise<void>, now: () => number): Promise<Call> {
  await stop();
  return finishCall(call, stopped, now());
}
export function canDownload(policy: Pick<Settings, 'wifiOnly'>, connected: boolean, type: string): boolean {
  return connected && (!policy.wifiOnly || type === 'WIFI');
}
export function demoReply(text: string, language: Language): string {
  if (language === 'hi-IN') return 'मैं एक डेमो AI सहायक हूँ। मैंने आपका संदेश दर्ज किया है। असली मॉडल अभी जुड़ा नहीं है।';
  return `This is a demo assistant. I recorded your message about “${text.slice(0, 100)}”. Local model inference is not connected yet.`;
}
export function incomingDeadline(settings: Pick<Settings, 'answerMode' | 'answerDelay'>, now: number): number | undefined {
  return settings.answerMode === 'unanswered' ? now + (Number.isFinite(settings.answerDelay) && [10, 20, 30, 45].includes(settings.answerDelay) ? settings.answerDelay : 20) * 1000 : undefined;
}
