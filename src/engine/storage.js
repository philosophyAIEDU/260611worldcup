// localStorage 저장/불러오기 (대회별로 분리 저장)

const keyFor = (comp) => `tactix2026-save-${comp || 'wc'}`;

export function saveGame(state) {
  try {
    localStorage.setItem(keyFor(state.comp), JSON.stringify(state));
  } catch (e) {
    // 저장 공간 부족 등은 게임 진행에 치명적이지 않으므로 무시
  }
}

export function loadGame(comp) {
  try {
    const raw = localStorage.getItem(keyFor(comp));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function clearGame(comp) {
  localStorage.removeItem(keyFor(comp));
}
