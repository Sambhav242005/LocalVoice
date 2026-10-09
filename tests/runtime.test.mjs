import test from 'node:test';
import assert from 'node:assert/strict';
import { RuntimeController } from '../src/core/runtime-controller.ts';

test('integrity failure prevents native initialization', async () => {
  const states = [];
  const runtime = new RuntimeController(state => states.push(state.status));
  let initialized = false;
  await assert.rejects(runtime.load(async () => { throw new Error('SHA mismatch'); }, async () => { initialized = true; }), /SHA mismatch/);
  assert.equal(initialized, false);
  assert.deepEqual(states, ['verifying', 'error']);
});

test('failed warmup releases candidate and permits a real retry', async () => {
  const states = [];
  const runtime = new RuntimeController(state => states.push(state.status));
  let released = 0;
  await assert.rejects(runtime.load(async () => {}, async () => ({ warmup: async () => { throw new Error('Unsupported model'); }, release: async () => { released++; } })), /Unsupported model/);
  assert.equal(released, 1);
  assert.equal(states.includes('ready'), false);
  await runtime.load(async () => {}, async () => ({ warmup: async () => {}, release: async () => { released++; } }));
  assert.equal(states.at(-1), 'ready');
  await runtime.unload();
  assert.equal(released, 2);
  assert.equal(states.at(-1), 'unloaded');
});

test('concurrent loading and premature unload cannot race native initialization', async () => {
  let resume;
  const gate = new Promise(resolve => { resume = resolve; });
  const runtime = new RuntimeController(() => {});
  const loading = runtime.load(() => gate, async () => ({ release: async () => {} }));
  await assert.rejects(runtime.load(async () => {}, async () => ({ release: async () => {} })), /Unload/);
  await assert.rejects(runtime.unload(), /Wait/);
  resume();
  await loading;
  await runtime.unload();
});

test('a session without an inference test is loaded, never ready', async () => {
  let last;
  const runtime = new RuntimeController(state => { last = state.status; });
  await runtime.load(async () => {}, async () => ({ release: async () => {} }));
  assert.equal(last, 'loaded');
});

test('failed cleanup retains the handle and blocks replacement until unload succeeds', async () => {
  let state;
  let failRelease = true;
  const runtime = new RuntimeController(value => { state = value; });
  await assert.rejects(runtime.load(async () => {}, async () => ({ warmup: async () => { throw new Error('Warmup failed'); }, release: async () => { if (failRelease) throw new Error('Release failed'); } })));
  assert.equal(state.resident, true);
  await assert.rejects(runtime.load(async () => {}, async () => ({ release: async () => {} })), /Unload/);
  failRelease = false;
  await runtime.unload();
  assert.equal(state.status, 'unloaded');
});
