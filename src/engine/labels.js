// 포메이션·성향·팀 전술의 표시 라벨 (한국어/영어). 엔진 로직과 분리해 UI 표시에만 사용.

const FORMATION_LABELS = {
  '4-3-3': { ko: '4-3-3 (공격 축구)', en: '4-3-3 (attacking)' },
  '4-4-2': { ko: '4-4-2 (클래식 밸런스)', en: '4-4-2 (classic balance)' },
  '4-2-3-1': { ko: '4-2-3-1 (중원 장악)', en: '4-2-3-1 (midfield control)' },
  '4-1-4-1': { ko: '4-1-4-1 (안정적 중원)', en: '4-1-4-1 (solid midfield)' },
  '3-4-3': { ko: '3-4-3 (전면 공격)', en: '3-4-3 (all-out attack)' },
  '3-5-2': { ko: '3-5-2 (하이리스크 공격)', en: '3-5-2 (high-risk attack)' },
  '5-3-2': { ko: '5-3-2 (선수비 역습)', en: '5-3-2 (defend & counter)' },
  '5-4-1': { ko: '5-4-1 (초수비/잠그기)', en: '5-4-1 (park the bus)' },
};

const MENTALITY_LABELS = {
  attacking: { ko: '공격적', en: 'Attacking' },
  balanced: { ko: '균형', en: 'Balanced' },
  defensive: { ko: '수비적', en: 'Defensive' },
};

const PLAYSTYLE_LABELS = {
  balanced: { ko: '표준', en: 'Standard' },
  total: { ko: '토탈 사커', en: 'Total Football' },
  tiki: { ko: '티키타카', en: 'Tiki-Taka' },
  counter: { ko: '역습', en: 'Counter-Attack' },
  highpress: { ko: '전방 압박', en: 'High Press' },
  setpiece: { ko: '세트피스', en: 'Set Pieces' },
  longball: { ko: '롱볼/롱스로인', en: 'Long Ball' },
  wing: { ko: '측면 돌파', en: 'Wing Play' },
  catenaccio: { ko: '빗장수비', en: 'Catenaccio' },
  allout: { ko: '막판 파상공세', en: 'All-Out Attack (late)' },
};

export function formationLabel(key, lang = 'ko') {
  return FORMATION_LABELS[key]?.[lang] ?? key;
}

export function mentalityLabel(key, lang = 'ko') {
  return MENTALITY_LABELS[key]?.[lang] ?? key;
}

export function playstyleLabel(key, lang = 'ko') {
  return PLAYSTYLE_LABELS[key]?.[lang] ?? key;
}

// 포지션 표시 라벨. FW는 선발 명단 내 순서로 LFW/CFW/RFW로 세분화한다.
// starters: 선발 11명 배열(lineup 순서 유지), player: 해당 선수 객체.
const FW_LABELS = { 1: ['CFW'], 2: ['LFW', 'RFW'], 3: ['LFW', 'CFW', 'RFW'] };
export function posLabel(player, starters) {
  if (player.position !== 'FW') return player.position;
  const fws = starters.filter((p) => p.position === 'FW');
  const idx = fws.findIndex((p) => p === player || p.name === player.name);
  return FW_LABELS[fws.length]?.[idx] ?? (fws.length > 3 ? 'FW' : 'FW');
}
