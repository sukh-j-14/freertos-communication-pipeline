export const scenarios = {
  normal: { title: 'Normal traffic', description: 'A packet every 20 model milliseconds; the receiver keeps up.', total:100, interval:20, service:10 },
  overload: { title: 'Burst overload', description: '100 packets arrive together. Eight fit; the rest are dropped.', total:100, interval:0, service:30 },
  stall: { title: 'Stalled receiver', description: 'The receiver is stopped. The queue fills and holds eight packets.', total:100, interval:0, service:Infinity },
  empty: { title: 'Empty input', description: 'No packets arrive. Receive waits expire while the queue stays empty.', total:0, interval:20, service:10 },
  corrupt: { title: 'Checksum fault', description: 'Packet 50 has a deliberately damaged checksum. The receiver detects it.', total:100, interval:20, service:10 }
};
const checksum = sequence => (sequence ^ 0xA5A55A5A) >>> 0;
export function createModel(name) {
  if (!Object.hasOwn(scenarios, name)) throw new Error('Unknown scenario');
  return { name, time:0, queue:[], produced:0, accepted:0, dropped:0, received:0, corrupt:0, timeouts:0, maxDepth:0, nextReceive:0, nextTimeout:50, complete:false, events:[] };
}
export function step(s) {
  if (s.complete) return s;
  const config = scenarios[s.name];
  s.events = [];
  while (s.produced < config.total && (config.interval === 0 || s.time >= s.produced * config.interval)) {
    const sequence = s.produced++;
    const p = { sequence, checksum:checksum(sequence) ^ (s.name === 'corrupt' && sequence === 50 ? 1 : 0) };
    if (s.queue.length < 8) { s.queue.push(p); s.accepted++; s.maxDepth = Math.max(s.maxDepth,s.queue.length); }
    else s.dropped++;
  }
  if (s.name !== 'stall' && s.time >= s.nextReceive) {
    if (s.queue.length) {
      const p = s.queue.shift();
      s.received++;
      const damaged = (p.checksum >>> 0) !== checksum(p.sequence);
      if (damaged) s.corrupt++;
      s.events.push(`Received #${p.sequence}${damaged ? ' — checksum error detected' : ''}`);
      s.nextReceive = s.time + config.service;
      s.nextTimeout = s.nextReceive + 50;
    } else if (s.time >= s.nextTimeout) { s.timeouts++; s.nextTimeout = s.time + 50; }
  }
  // Fixed 2.2 s model window includes an idle timeout after normal traffic.
  s.complete = s.time >= 2200;
  s.time += 10;
  return s;
}
export function run(name) { const s = createModel(name); while (!s.complete) step(s); return s; }
