import test from 'node:test';
import assert from 'node:assert/strict';
import { canDownload, incomingDeadline, defaults, finishCall, stopAndFinish, summarize } from '../src/core/domain.ts';
test('Wi-Fi policy blocks cellular and disconnected networks', () => {
  assert.equal(canDownload({ wifiOnly: true }, true, 'CELLULAR'), false);
  assert.equal(canDownload({ wifiOnly: true }, false, 'WIFI'), false);
  assert.equal(canDownload({ wifiOnly: true }, true, 'WIFI'), true);
  assert.equal(canDownload({ wifiOnly: false }, true, 'CELLULAR'), true);
});
test('stopping preserves transcript, creates recap, and is idempotent', () => {
  const call = { id: 'test', name: 'Demo', startedAt: 1, status: 'active', messages: [{ role: 'caller', text: 'Please call me tomorrow', at: 2 }], demo: true, settings: defaults };
  const stopped = finishCall(call, true, 3);
  assert.equal(stopped.status, 'stopped');
  assert.equal(stopped.endedAt, 3);
  assert.match(stopped.summary, /tomorrow/);
  assert.match(stopped.summary, /not been assessed/);
  assert.deepEqual(stopped.messages, call.messages);
  assert.equal(finishCall(stopped, false, 9), stopped);
});
test('empty call does not invent a caller intent', () => {
  assert.equal(summarize([], true), 'Stopped by owner before the caller spoke.');
});
test('failed playback cancellation cannot finalize the call', async () => {
  const call = { id: 'stop-failed', name: 'Demo', startedAt: 1, status: 'active', messages: [], demo: true, settings: defaults };
  await assert.rejects(stopAndFinish(call, true, async () => { throw new Error('Audio still active'); }, () => 9), /Audio still active/);
  assert.equal(call.status, 'active');
  const finished = await stopAndFinish(call, true, async () => {}, () => 10);
  assert.equal(finished.status, 'stopped');
  assert.equal(finished.endedAt, 10);
});

test('manual approval never schedules takeover; unanswered mode uses bounded delay', () => {
  assert.equal(incomingDeadline({ answerMode: 'manual', answerDelay: 10 }, 1000), undefined);
  assert.equal(incomingDeadline({ answerMode: 'unanswered', answerDelay: 30 }, 1000), 31000);
  assert.equal(incomingDeadline({ answerMode: 'unanswered', answerDelay: -1 }, 1000), 21000);
});