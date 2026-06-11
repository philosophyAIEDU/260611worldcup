// localStorage 저장/불러오기

const KEY = 'tactix2026-save';

export function saveGame(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    // 저장 공간 부족 등은 게임 진행에 치명적이지 않으므로 무시
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function clearGame() {
  localStorage.removeItem(KEY);
}
