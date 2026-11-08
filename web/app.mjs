import { createModel, step, scenarios } from './model.mjs';
const $ = id => document.getElementById(id);
let state, timer, points, logs;
const metricNames = ['produced','accepted','dropped','received','corrupt','timeouts'];
function stop() { clearInterval(timer); timer = null; }
function render() {
  $('description').textContent = scenarios[state.name].description;
  $('depth').textContent = `${state.queue.length} / 8 slots`;
  $('receiver').textContent = state.name === 'stall' ? 'Stalled' : 'Active';
  $('slots').replaceChildren(...Array.from({ length:8 },(_,i) => {
    const el = document.createElement('span');
    el.className = 'slot' + (state.queue[i] ? ' full' : '');
    el.textContent = state.queue[i] ? `#${state.queue[i].sequence}` : '·';
    el.title = state.queue[i] ? `Packet ${state.queue[i].sequence}` : 'Empty slot';
    return el;
  }));
  $('metrics').replaceChildren(...metricNames.map(name => {
    const el = document.createElement('div'); el.className = 'metric' + (['dropped','corrupt'].includes(name) && state[name] ? ' alert' : '');
    const value = document.createElement('strong'); value.textContent = state[name];
    const label = document.createElement('span'); label.textContent = name[0].toUpperCase() + name.slice(1);
    el.append(value,label); return el;
  }));
  $('line').setAttribute('points',points.join(' '));
  $('clock').textContent = `${Math.min(state.time,2200)} model ms`;
  $('status').textContent = state.complete ? 'Complete' : timer ? 'Running' : state.time ? 'Paused' : 'Ready';
  $('run').textContent = timer ? 'Pause' : state.complete ? 'Run again →' : state.time ? 'Resume →' : 'Run simulation →';
  $('step').disabled = !!timer || state.complete;
  $('log').replaceChildren(...(logs.length ? logs.slice(-100) : ['No received packets yet.']).map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
  $('activity-count').textContent = logs.length ? `(${logs.length} received)` : '';
}
function reset() { stop(); state = createModel($('scenario').value); points = ['0,90']; logs = []; render(); }
function advance() {
  const time = state.time; step(state);
  points.push(`${Math.min(time,2200)/2200*880},${90-state.queue.length/8*85}`);
  logs.push(...state.events.map(event => `${time} ms · ${event}`));
  if (state.complete) stop(); render();
}
$('run').addEventListener('click',() => {
  if (timer) { stop(); render(); return; }
  if (state.complete) reset();
  timer = setInterval(advance,20); render();
});
$('step').addEventListener('click',advance);
$('reset').addEventListener('click',reset);
$('scenario').addEventListener('change',reset);
$('download').addEventListener('click',() => {
  const data = { kind:'javascript-model', nativeFreeRTOS:false, ...state };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)], { type:'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = `browser-model-${state.name}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
});
reset();
try {
  const results = await Promise.all(Object.keys(scenarios).map(async name => {
    const response = await fetch(`results/${name}.json`);
    if (!response.ok) throw new Error('Result unavailable');
    return response.json();
  }));
  $('native').replaceChildren(...results.map(result => {
    const tr = document.createElement('tr');
    for (const value of [scenarios[result.scenario].title,result.accepted,result.dropped,result.received,result.corrupt,result.pass ? 'Passed' : 'Failed']) {
      const td = document.createElement('td'); td.textContent = value; tr.append(td);
    }
    return tr;
  }));
} catch {
  $('native').replaceChildren(); const tr = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = 6; td.textContent = 'Recorded results could not be loaded. See the results folder in the source repository.'; tr.append(td); $('native').append(tr);
}
