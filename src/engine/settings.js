// 사용자 환경설정(게임 속도 · 쿼터 휴식)을 localStorage에 저장/불러오기.
// 경기마다 기억되어 다음 경기에도 같은 설정이 적용된다.

const SPEED_KEY = 'tactix2026-speed';
const QREST_KEY = 'tactix2026-quarter-rest';

// 게임 속도 단계. mult가 클수록 1분이 빨리 지나간다(기준 220ms / mult).
export const SPEEDS = [
  { id: 'slow', mult: 0.5 },
  { id: 'normal', mult: 1 },
  { id: 'fast', mult: 2 },
  { id: 'turbo', mult: 4 },
];

const BASE_INTERVAL = 220;

export function speedInterval(id) {
  const s = SPEEDS.find((x) => x.id === id) || SPEEDS[1];
  return Math.round(BASE_INTERVAL / s.mult);
}

export function getSpeed() {
  try {
    const v = localStorage.getItem(SPEED_KEY);
    return SPEEDS.some((s) => s.id === v) ? v : 'normal';
  } catch {
    return 'normal';
  }
}

export function setSpeed(id) {
  try { localStorage.setItem(SPEED_KEY, id); } catch { /* ignore */ }
}

// 쿼터 종료 시 휴식(자동 일시정지). 기본값 true(휴식함).
export function getQuarterRest() {
  try {
    const v = localStorage.getItem(QREST_KEY);
    return v === null ? true : v === '1';
  } catch {
    return true;
  }
}

export function setQuarterRest(on) {
  try { localStorage.setItem(QREST_KEY, on ? '1' : '0'); } catch { /* ignore */ }
}
