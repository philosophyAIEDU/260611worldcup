// 감독 역할(시즌 내내 적용되는 특성) · 팀 토크(경기 전 동기부여) · 주장(리더십).
// 모두 "선수 컨디션 보정"으로 동작하므로 엔진(전력 계산)에 자연스럽게 반영된다.
// 라벨은 한국어/영어 모두 제공.

// ── 감독 역할 ──────────────────────────────────────────────────────
// effect(player): 해당 선수에게 더할 컨디션 보정값(0~)을 반환.
export const ROLES = {
  allrounder: {
    icon: '🎯',
    ko: { name: '균형의 명장', desc: '모든 선수의 컨디션을 고르게 +3%' },
    en: { name: 'All-Rounder', desc: '+3% condition to every player' },
    effect: () => 0.03,
  },
  motivator: {
    icon: '🔥',
    ko: { name: '동기부여가', desc: '선발 전원 컨디션 +5%, 팀 토크 효과 강화' },
    en: { name: 'Motivator', desc: '+5% to all starters, stronger team talks' },
    effect: () => 0.05,
  },
  starcoach: {
    icon: '⭐',
    ko: { name: '스타 조련사', desc: '스타 플레이어 컨디션 +10% (이변 유발에 강함)' },
    en: { name: 'Star Maker', desc: '+10% to star players (great for upsets)' },
    effect: (p) => (p.isStar ? 0.1 : 0.01),
  },
  defmaster: {
    icon: '🛡️',
    ko: { name: '철벽 수비 전문가', desc: 'GK·수비수 컨디션 +8%' },
    en: { name: 'Defensive Master', desc: '+8% to GK & defenders' },
    effect: (p) => (p.position === 'GK' || p.position === 'DF' ? 0.08 : 0.01),
  },
  atkmaster: {
    icon: '⚡',
    ko: { name: '공격 축구 전문가', desc: '공격수·미드필더 컨디션 +7%' },
    en: { name: 'Attacking Master', desc: '+7% to forwards & midfielders' },
    effect: (p) => (p.position === 'FW' || p.position === 'MF' ? 0.07 : 0.01),
  },
};

export const DEFAULT_ROLE = 'allrounder';

export function roleLabel(roleId, lang = 'ko') {
  const r = ROLES[roleId] || ROLES[DEFAULT_ROLE];
  return `${r.icon} ${r[lang]?.name ?? r.ko.name}`;
}

// ── 팀 토크(경기 전 한마디) ──────────────────────────────────────────
// effect(player): 컨디션 보정값(음수 가능).
export const TEAM_TALKS = {
  none: {
    icon: '🤐',
    ko: { name: '생략', desc: '특별한 주문 없이 경기 시작' },
    en: { name: 'Skip', desc: 'Start without a talk' },
    effect: () => 0,
  },
  fire: {
    icon: '🔥',
    ko: { name: '열정적 격려', desc: '선발 전원 컨디션 +5%' },
    en: { name: 'Fire them up', desc: '+5% to all starters' },
    effect: () => 0.05,
  },
  calm: {
    icon: '🧊',
    ko: { name: '침착하게', desc: '전원 +2%, 안정적인 출발' },
    en: { name: 'Stay calm', desc: '+2% to all, steady start' },
    effect: () => 0.02,
  },
  demand: {
    icon: '😤',
    ko: { name: '강하게 질책', desc: '컨디션 낮은 선수 분발(+8%), 이미 좋은 선수는 부담(-3%)' },
    en: { name: 'Demand more', desc: 'Tired players +8%, in-form players -3%' },
    effect: (p) => (p.condition < 0.8 ? 0.08 : p.condition >= 0.9 ? -0.03 : 0),
  },
  focus: {
    icon: '🎯',
    ko: { name: '전술 집중', desc: '미드필더 +5%, 수비수 +3% (경기 장악)' },
    en: { name: 'Tactical focus', desc: 'Midfielders +5%, defenders +3%' },
    effect: (p) => (p.position === 'MF' ? 0.05 : p.position === 'DF' ? 0.03 : 0),
  },
};

export function talkLabel(talkId, lang = 'ko') {
  const tk = TEAM_TALKS[talkId] || TEAM_TALKS.none;
  return `${tk.icon} ${tk[lang]?.name ?? tk.ko.name}`;
}

const clamp = (v) => Math.max(0.5, Math.min(1, Math.round(v * 100) / 100));

// 베스트11(starters)의 컨디션에 역할 + 팀 토크 + 주장 보정을 적용한
// 새 컨디션 맵을 반환한다. baseConditions는 { [name]: 0.70~1.00 }.
// 동기부여가(motivator)는 팀 토크 효과를 1.5배로 강화한다.
export function applyModifiers(baseConditions, starters, { role, teamTalk, captain } = {}) {
  const roleDef = ROLES[role] || ROLES[DEFAULT_ROLE];
  const talkDef = TEAM_TALKS[teamTalk] || TEAM_TALKS.none;
  const talkBoost = role === 'motivator' ? 1.5 : 1;
  const result = { ...baseConditions };
  for (const p of starters) {
    const base = baseConditions[p.name] ?? 0.85;
    // 팀 토크 effect는 현재 컨디션을 참조하므로 base를 주입한 객체로 평가
    const pForTalk = { ...p, condition: base };
    let cond = base + roleDef.effect(p) + talkDef.effect(pForTalk) * talkBoost;
    if (captain && p.name === captain) cond += 0.06; // 주장 본인
    if (captain) cond += 0.02; // 주장 리더십(팀 전체)
    result[p.name] = clamp(cond);
  }
  return result;
}
