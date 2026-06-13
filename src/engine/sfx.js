// 효과음 — Web Audio API로 합성한다(에셋 파일 불필요, 오프라인 동작).
// 브라우저 자동재생 정책상 AudioContext는 사용자 제스처 이후에만 소리가 난다.
// 경기 화면까지 오는 동안 버튼 클릭이 있으므로 resume()이 허용된다.

const STORAGE_KEY = 'tactix2026-sfx';
let ctx = null;
let master = null;
let enabled = loadEnabled();

function loadEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function isSfxOn() {
  return enabled;
}

export function setSfxOn(v) {
  enabled = !!v;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    /* 무시 */
  }
}

// AudioContext 지연 생성 + 재개. 사용 불가 환경이면 null.
function ac() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noiseBuffer(c, dur) {
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

// 심판 휘슬 1회 — 두 개의 고음 + 워블(LFO) + 약간의 공기 노이즈.
function blow(start, dur, vol = 0.3) {
  const c = ctx;
  const o1 = c.createOscillator();
  o1.type = 'triangle';
  o1.frequency.value = 2350;
  const o2 = c.createOscillator();
  o2.type = 'triangle';
  o2.frequency.value = 2800;
  const lfo = c.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 16;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 55;
  lfo.connect(lfoGain);
  lfoGain.connect(o1.frequency);
  lfoGain.connect(o2.frequency);

  const g = c.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.015);
  g.gain.setValueAtTime(vol, start + Math.max(0.02, dur - 0.04));
  g.gain.linearRampToValueAtTime(0, start + dur);

  const n = c.createBufferSource();
  n.buffer = noiseBuffer(c, dur);
  const nf = c.createBiquadFilter();
  nf.type = 'bandpass';
  nf.frequency.value = 2500;
  nf.Q.value = 0.8;
  const ng = c.createGain();
  ng.gain.value = vol * 0.12;
  n.connect(nf);
  nf.connect(ng);
  ng.connect(master);

  o1.connect(g);
  o2.connect(g);
  g.connect(master);

  o1.start(start);
  o2.start(start);
  lfo.start(start);
  n.start(start);
  o1.stop(start + dur);
  o2.stop(start + dur);
  lfo.stop(start + dur);
  n.stop(start + dur);
}

// 관중 함성 — 밴드패스를 통과시킨 노이즈를 부풀렸다 줄인다.
function crowd(start, dur, vol, freq) {
  const c = ctx;
  const n = c.createBufferSource();
  n.buffer = noiseBuffer(c, dur);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = 0.6;
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 300;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + dur * 0.18);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  n.connect(bp);
  bp.connect(hp);
  hp.connect(g);
  g.connect(master);
  n.start(start);
  n.stop(start + dur);
}

export function playWhistle() {
  if (!enabled || !ac()) return;
  blow(ctx.currentTime, 0.42);
}

// 경기 종료 — 길게 세 번.
export function playFinalWhistle() {
  if (!enabled || !ac()) return;
  const t = ctx.currentTime;
  blow(t, 0.2);
  blow(t + 0.26, 0.2);
  blow(t + 0.52, 0.6);
}

export function playFoul() {
  if (!enabled || !ac()) return;
  blow(ctx.currentTime, 0.16);
}

// 경고(옐로카드) — 짧게 한 번 + 단호하게 한 번.
export function playCard() {
  if (!enabled || !ac()) return;
  const t = ctx.currentTime;
  blow(t, 0.12);
  blow(t + 0.18, 0.24);
}

// 금관(브라스) 한 음 — 팡파레/세리머니용.
function brass(start, freq, dur, vol) {
  const c = ctx;
  const o1 = c.createOscillator();
  o1.type = 'sawtooth';
  o1.frequency.value = freq;
  const o2 = c.createOscillator();
  o2.type = 'square';
  o2.frequency.value = freq;
  const o2g = c.createGain();
  o2g.gain.value = 0.3;
  const g = c.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.03);
  g.gain.setValueAtTime(vol, start + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0008, start + dur);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3200;
  o1.connect(g);
  o2.connect(o2g);
  o2g.connect(g);
  g.connect(lp);
  lp.connect(master);
  o1.start(start);
  o2.start(start);
  o1.stop(start + dur);
  o2.stop(start + dur);
}

// 저음 임팩트(쿵).
function thump(start) {
  const c = ctx;
  const o = c.createOscillator();
  o.type = 'sine';
  const g = c.createGain();
  o.frequency.setValueAtTime(150, start);
  o.frequency.exponentialRampToValueAtTime(55, start + 0.4);
  g.gain.setValueAtTime(0.5, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
  o.connect(g);
  g.connect(master);
  o.start(start);
  o.stop(start + 0.5);
}

// 골! — 함성(저+고) + 저음 임팩트 + 상승 경적 화음 + 관중 앰비언스 부풀림.
export function playGoal() {
  if (!enabled || !ac()) return;
  const t = ctx.currentTime;
  crowd(t, 2.0, 0.55, 900);
  crowd(t + 0.05, 1.4, 0.3, 1700);
  swellAmbience();
  thump(t);
  const notes = [330, 440, 550];
  for (const f of notes) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    const g = ctx.createGain();
    const s = t + 0.05;
    o.frequency.setValueAtTime(f, s);
    o.frequency.linearRampToValueAtTime(f * 1.03, s + 0.5);
    g.gain.setValueAtTime(0, s);
    g.gain.linearRampToValueAtTime(0.12, s + 0.06);
    g.gain.setValueAtTime(0.12, s + 0.45);
    g.gain.linearRampToValueAtTime(0, s + 0.7);
    o.connect(g);
    g.connect(master);
    o.start(s);
    o.stop(s + 0.72);
  }
}

// 우승 세리머니 — 팡파레(상승 후 화음) + 대형 함성.
export function playCeremony() {
  if (!enabled || !ac()) return;
  const t = ctx.currentTime;
  crowd(t, 2.8, 0.5, 800);
  crowd(t + 0.1, 2.2, 0.32, 1700);
  thump(t + 0.05);
  const seq = [[523.25, 0.0], [659.25, 0.16], [783.99, 0.32], [1046.5, 0.48]];
  for (const [f, dt] of seq) brass(t + dt, f, 0.22, 0.16);
  for (const f of [523.25, 659.25, 783.99, 1046.5]) brass(t + 0.66, f, 1.0, 0.1);
}

// ── 관중 앰비언스(경기 중 배경 소음) ───────────────────────────────
let ambienceNode = null;
let ambienceGain = null;

export function startAmbience() {
  if (!enabled || !ac()) return;
  if (ambienceNode) return;
  const c = ctx;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 2);
  src.loop = true;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 700;
  lp.Q.value = 0.3;
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 120;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.linearRampToValueAtTime(0.06, c.currentTime + 1.5);
  src.connect(lp);
  lp.connect(hp);
  hp.connect(g);
  g.connect(master);
  src.start();
  ambienceNode = src;
  ambienceGain = g;
}

export function stopAmbience() {
  if (!ambienceNode || !ctx) return;
  const node = ambienceNode;
  try {
    ambienceGain.gain.cancelScheduledValues(ctx.currentTime);
    ambienceGain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
  } catch {
    /* 무시 */
  }
  setTimeout(() => {
    try {
      node.stop();
    } catch {
      /* 무시 */
    }
  }, 1200);
  ambienceNode = null;
  ambienceGain = null;
}

// 골 등 큰 장면에서 앰비언스를 잠깐 끌어올렸다 가라앉힘.
function swellAmbience() {
  if (!ambienceGain || !ctx) return;
  const t = ctx.currentTime;
  ambienceGain.gain.cancelScheduledValues(t);
  ambienceGain.gain.setValueAtTime(Math.max(0.0001, ambienceGain.gain.value), t);
  ambienceGain.gain.linearRampToValueAtTime(0.2, t + 0.12);
  ambienceGain.gain.setTargetAtTime(0.06, t + 0.35, 1.2);
}

// 선방/위기 — 짧고 낮은 함성.
export function playSave() {
  if (!enabled || !ac()) return;
  crowd(ctx.currentTime, 0.6, 0.18, 500);
}

// 경기 이벤트 타입 → 효과음 매핑.
export function playEventSound(ev) {
  if (!enabled || !ev) return;
  switch (ev.type) {
    case 'goal':
      playGoal();
      break;
    case 'end':
      playFinalWhistle();
      break;
    case 'info': // 킥오프 · 쿼터 시작/종료 · 연장/승부차기 안내
      playWhistle();
      break;
    case 'yellow':
      playCard();
      break;
    case 'foul':
      playFoul();
      break;
    case 'save':
      playSave();
      break;
    default:
      break;
  }
}
