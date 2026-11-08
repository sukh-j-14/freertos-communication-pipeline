import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createModel, step, run, scenarios } from '../web/model.mjs';
for (const name of Object.keys(scenarios)) test(name + ': bounded queue and accounting at every step', () => {
  const s = createModel(name);
  while (!s.complete) {
    step(s);
    assert.ok(s.queue.length <= 8);
    assert.equal(s.produced, s.accepted + s.dropped);
    assert.equal(s.accepted, s.received + s.queue.length);
    assert.ok(s.queue.every((p,i,a) => i === 0 || p.sequence > a[i-1].sequence));
  }
  assert.equal(s.produced, name === 'empty' ? 0 : 100);
  assert.equal(s.corrupt, name === 'corrupt' ? 1 : 0);
  if (name === 'stall' || name === 'overload') { assert.equal(s.accepted,8); assert.equal(s.dropped,92); }
  else { assert.equal(s.dropped,0); assert.ok(s.timeouts > 0); }
  assert.equal(s.received, name === 'stall' ? 0 : s.accepted);
});
test('reject invalid scenario and keep runs isolated', () => {
  assert.throws(() => createModel('bad'));
  assert.throws(() => createModel('__proto__'));
  assert.deepEqual(run('normal'),run('normal'));
  const s = run('stall'); const before = structuredClone(s); step(s); assert.deepEqual(s,before);
});
