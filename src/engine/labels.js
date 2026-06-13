// 포메이션·성향의 표시 라벨 (한국어/영어). 엔진 로직과 분리해 UI 표시에만 사용.

const FORMATION_LABELS = {
  '4-3-3': { ko: '4-3-3 (공격 축구)', en: '4-3-3 (attacking)' },
  '4-4-2': { ko: '4-4-2 (클래식 밸런스)', en: '4-4-2 (classic balance)' },
  '4-2-3-1': { ko: '4-2-3-1 (중원 장악)', en: '4-2-3-1 (midfield control)' },
  '3-5-2': { ko: '3-5-2 (하이리스크 공격)', en: '3-5-2 (high-risk attack)' },
  '5-3-2': { ko: '5-3-2 (선수비 역습)', en: '5-3-2 (defend & counter)' },
};

const MENTALITY_LABELS = {
  attacking: { ko: '공격적', en: 'Attacking' },
  balanced: { ko: '균형', en: 'Balanced' },
  defensive: { ko: '수비적', en: 'Defensive' },
};

export function formationLabel(key, lang = 'ko') {
  return FORMATION_LABELS[key]?.[lang] ?? key;
}

export function mentalityLabel(key, lang = 'ko') {
  return MENTALITY_LABELS[key]?.[lang] ?? key;
}
