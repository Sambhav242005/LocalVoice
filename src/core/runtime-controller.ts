export type RuntimeStatus = 'unloaded' | 'verifying' | 'loading' | 'warming' | 'ready' | 'loaded' | 'unloading' | 'error';
export type RuntimeState = { status: RuntimeStatus; message: string; progress?: number; elapsedMs?: number; pssMiB?: number; resident?: boolean };
export type LoadedEngine = { warmup?: () => Promise<void>; release: () => Promise<void> };
export class RuntimeController {
  private engine: LoadedEngine | undefined;
  private busy = false;
  private publish: (state: RuntimeState) => void;
  constructor(publish: (state: RuntimeState) => void) { this.publish = publish; }
  async load(verify: () => Promise<void>, initialize: () => Promise<LoadedEngine>, now = Date.now) {
    if (this.busy || this.engine) throw new Error('Unload the current model before loading again.');
    this.busy = true;
    const started = now();
    let candidate: LoadedEngine | undefined;
    try {
      this.publish({ status: 'verifying', message: 'Checking every file with SHA-256…', progress: 0 });
      await verify();
      this.publish({ status: 'loading', message: 'Preparing the native model context…' });
      candidate = await initialize();
      if (candidate.warmup) {
        this.publish({ status: 'warming', message: 'Running a short inference test…' });
        await candidate.warmup();
      }
      this.engine = candidate;
      this.publish({ status: candidate.warmup ? 'ready' : 'loaded', message: candidate.warmup ? 'Model loaded successfully. Inference test passed.' : 'ONNX sessions loaded. Speech decoding is not connected yet.', elapsedMs: now() - started, resident: true });
    } catch (error) {
      try { await candidate?.release(); } catch { this.engine = candidate; }
      this.publish({ status: 'error', message: (error instanceof Error ? error.message : 'Native loading failed.') + (this.engine ? ' Memory release failed; tap Unload before retrying.' : ''), resident: !!this.engine });
      throw error;
    } finally { this.busy = false; }
  }
  async unload() {
    if (this.busy) throw new Error('Wait for the current loading operation to finish.');
    this.busy = true;
    try {
      this.publish({ status: 'unloading', message: 'Releasing native memory…' });
      await this.engine?.release();
      this.engine = undefined;
      this.publish({ status: 'unloaded', message: 'Unloaded. Downloaded files are kept.' });
    } catch (error) {
      this.publish({ status: 'error', message: 'Memory release failed. Retry Unload or restart the app.', resident: !!this.engine });
      throw error;
    } finally { this.busy = false; }
  }
}
