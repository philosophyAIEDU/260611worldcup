// 경기 시뮬레이션 엔진 — 분 단위 실시간 진행.
// FIFA 랭킹 기반 팀 능력치 + 당일 컨디션(0.70~1.00) + 스타 폼 + 전술/포메이션.
// createMatch()가 반환하는 객체를 advance()로 한 분씩 진행시키며,
// 사용자 측은 경기 중 makeSub()/setMentality()로 개입할 수 있다.

import { goalText, miscText, shootoutLine } from './commentary.js';
import { playerName, teamName } from '../i18n.jsx';

const rand = () => Math.random();
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

function weightedPick(items, weightFn) {
  const weights = items.map((x) => Math.max(0.1, weightFn(x)));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// ── 전술 정의 ────────────────────────────────────────────────────
// atk: 자기 팀 득점 확률 배수, def: 상대 팀 득점 확률 배수(낮을수록 수비적)
export const FORMATIONS = {
  '4-3-3': { DF: 4, MF: 3, FW: 3, atk: 1.05, def: 1.0, label: '4-3-3 (공격 축구)' },
  '4-4-2': { DF: 4, MF: 4, FW: 2, atk: 1.0, def: 0.97, label: '4-4-2 (클래식 밸런스)' },
  '4-2-3-1': { DF: 4, MF: 5, FW: 1, atk: 0.95, def: 0.92, label: '4-2-3-1 (중원 장악)' },
  '3-5-2': { DF: 3, MF: 5, FW: 2, atk: 1.08, def: 1.08, label: '3-5-2 (하이리스크 공격)' },
  '5-3-2': { DF: 5, MF: 3, FW: 2, atk: 0.9, def: 0.87, label: '5-3-2 (선수비 역습)' },
};

export const MENTALITIES = {
  attacking: { atk: 1.22, def: 1.18, label: '공격적' },
  balanced: { atk: 1.0, def: 1.0, label: '균형' },
  defensive: { atk: 0.8, def: 0.84, label: '수비적' },
};

export const MAX_SUBS = 5;

// ── 컨디션 & 라인업 ──────────────────────────────────────────────
export function rollConditions(team) {
  return Object.fromEntries(
    team.players.map((p) => [p.name, Math.round((0.7 + rand() * 0.3) * 100) / 100])
  );
}

// 포메이션에 맞춰 (능력치×컨디션) 최상위 선수로 베스트11 자동 선발 → 이름 배열
export function autoLineup(squad, formation) {
  const f = FORMATIONS[formation];
  const best = (pos, n) =>
    squad
      .filter((p) => p.position === pos)
      .sort((a, b) => b.overall * b.condition - a.overall * a.condition)
      .slice(0, n);
  return [...best('GK', 1), ...best('DF', f.DF), ...best('MF', f.MF), ...best('FW', f.FW)].map(
    (p) => p.name
  );
}

function buildSide(team, setup = {}) {
  const conditions = setup.conditions || rollConditions(team);
  const squad = team.players.map((p) => ({ ...p, condition: conditions[p.name] ?? 0.85 }));
  const formation = setup.formation || pick(['4-3-3', '4-4-2', '4-2-3-1']);
  const lineupNames = setup.lineup || autoLineup(squad, formation);
  const eleven = lineupNames.map((n) => squad.find((p) => p.name === n)).filter(Boolean);
  const bench = squad.filter((p) => !eleven.includes(p));

  const side = {
    team,
    squad,
    eleven,
    bench,
    formation,
    mentality: setup.mentality || 'balanced',
    manual: !!setup.manual,
    subsUsed: 0,
    upsetBonus: 0,
  };
  recalcStrength(side);
  return side;
}

function recalcStrength(side) {
  const avg = side.eleven.reduce((s, p) => s + p.overall * p.condition, 0) / side.eleven.length;
  let strength = side.team.rating * 0.6 + avg * 0.4;
  const stars = side.eleven.filter((p) => p.isStar);
  const hotStar = stars.reduce((b, p) => (p.condition > (b?.condition ?? 0) ? p : b), null);
  if (hotStar && hotStar.condition >= 0.9) strength += 6 * (hotStar.condition - 0.9) * 10 + 2;
  else if (hotStar && hotStar.condition >= 0.82) strength += 1.5;
  side.hotStar = hotStar;
  side.strength = strength + side.upsetBonus;
}

// 업셋 메커니즘: 랭킹 20위 이상 차이 + 약팀 스타 컨디션 0.90 이상 → 약팀 전력 보정
function applyUpset(home, away) {
  const diff = home.team.ranking - away.team.ranking;
  const boost = (weak, strong) => {
    if (weak.hotStar && weak.hotStar.condition >= 0.9) {
      weak.upsetBonus = Math.min(6, (strong.strength - weak.strength) * 0.35 + 1.5);
      recalcStrength(weak);
    }
  };
  if (diff >= 20) boost(home, away);
  else if (diff <= -20) boost(away, home);
}

// ── 이벤트 생성 헬퍼 ─────────────────────────────────────────────
const GOAL_TYPE_KEYS = ['counter', 'freekick', 'corner', 'penalty', 'solo', 'combo', 'longshot', 'header', 'rebound'];

function pickGoalType() {
  const weights = { combo: 22, counter: 16, solo: 13, header: 12, corner: 10, longshot: 9, rebound: 8, freekick: 6, penalty: 4 };
  return weightedPick(GOAL_TYPE_KEYS.map((k) => ({ k })), (o) => weights[o.k]).k;
}

function pickScorer(side, type) {
  const pool = side.eleven.filter((p) => p.position !== 'GK');
  const posWeight = { FW: 5, MF: 2.2, DF: type === 'corner' || type === 'header' ? 2 : 0.5 };
  return weightedPick(pool, (p) => (posWeight[p.position] || 1) * (p.shooting / 50) * p.condition * (p.isStar ? 1.6 : 1));
}

function pickAssister(side, scorer) {
  if (rand() < 0.18) return null;
  const pool = side.eleven.filter((p) => p !== scorer && p.position !== 'GK');
  return weightedPick(pool, (p) => (p.passing / 50) * p.condition * (p.position === 'MF' ? 1.6 : 1));
}

const pickOutfielder = (side) => pick(side.eleven.filter((p) => p.position !== 'GK'));

// ── 경기 객체 ────────────────────────────────────────────────────
// opts: { knockout, homeSetup, awaySetup }
// setup: { conditions, lineup, formation, mentality, manual }
export function createMatch(homeTeam, awayTeam, opts = {}) {
  const lang = opts.lang || 'ko';
  const nm = (p) => playerName(p, lang);
  const tnm = (t) => teamName(t, lang);
  const home = buildSide(homeTeam, opts.homeSetup);
  const away = buildSide(awayTeam, opts.awaySetup);
  applyUpset(home, away);

  const m = {
    homeTeam,
    awayTeam,
    home,
    away,
    knockout: !!opts.knockout,
    minute: 0,
    finished: false,
    extraTime: false,
    hg: 0,
    ag: 0,
    events: [],
    scorers: [],
    shootout: null,
  };

  const push = (out, minute, type, side, text) => {
    const ev = { minute, type, side, text, score: [m.hg, m.ag] };
    m.events.push(ev);
    out.push(ev);
  };

  const goalProb = (atkSide, defSide) => {
    const total = home.strength + away.strength;
    const edge = (atkSide.strength - defSide.strength) / total;
    const p =
      (2.6 / 90) * (0.5 + edge * 2.6) *
      FORMATIONS[atkSide.formation].atk * MENTALITIES[atkSide.mentality].atk *
      FORMATIONS[defSide.formation].def * MENTALITIES[defSide.mentality].def;
    return Math.max(0.004, p);
  };

  const simMinute = (minute, out) => {
    for (const [sideKey, sd, opp] of [['home', home, away], ['away', away, home]]) {
      const r = rand();
      if (r < goalProb(sd, opp)) {
        const type = pickGoalType();
        const scorer = pickScorer(sd, type);
        const assister = type === 'penalty' || type === 'freekick' || type === 'solo' ? null : pickAssister(sd, scorer);
        if (sideKey === 'home') m.hg++; else m.ag++;
        m.scorers.push({ minute, side: sideKey, name: scorer.name, team: sd.team.code });
        push(out, minute, 'goal', sideKey,
          `${goalText(type, nm(scorer), assister ? nm(assister) : null, lang)} ⚽ ${tnm(homeTeam)} ${m.hg}-${m.ag} ${tnm(awayTeam)}`);
      } else if (r < 0.045) {
        const p = pickOutfielder(sd);
        if (rand() < 0.5) push(out, minute, 'chance', sideKey, miscText('chance', { p: nm(p) }, lang));
        else push(out, minute, 'save', sideKey, miscText('save', { p: nm(p), gk: nm(opp.eleven[0]) }, lang));
      } else if (r < 0.065) {
        const p = pickOutfielder(sd);
        if (rand() < 0.3) push(out, minute, 'yellow', sideKey, miscText('yellow', { p: nm(p) }, lang));
        else push(out, minute, 'foul', sideKey, miscText('foul', { p: nm(p) }, lang));
      } else if (r < 0.072) {
        push(out, minute, 'pressure', sideKey, miscText('pressure', { t: tnm(sd.team) }, lang));
      }
    }
    // AI 측 자동 교체
    if (minute >= 60 && minute <= 82 && rand() < 0.035) {
      const sd = rand() < 0.5 ? home : away;
      if (!sd.manual && sd.subsUsed < MAX_SUBS) {
        const out2 = pickOutfielder(sd);
        const sub = sd.bench.find((b) => b.position === out2.position);
        if (sub) doSub(sd, out2, sub, minute, out);
      }
    }
  };

  const doSub = (sd, outP, inP, minute, out) => {
    sd.eleven[sd.eleven.indexOf(outP)] = inP;
    sd.bench.splice(sd.bench.indexOf(inP), 1);
    sd.bench.push(outP);
    sd.subsUsed++;
    recalcStrength(sd);
    push(out, minute, 'sub', sd === home ? 'home' : 'away',
      miscText('sub', { t: tnm(sd.team), out: nm(outP), in: nm(inP) }, lang));
  };

  // 한 분 진행. 이번 호출에서 생성된 이벤트 배열 반환.
  m.advance = () => {
    if (m.finished) return [];
    const out = [];
    if (m.minute === 0) push(out, 0, 'info', null, miscText('kickoff', {}, lang));
    m.minute++;
    // 4쿼터 진행: Q1 1-23, Q2 24-45(하프타임), Q3 46-68, Q4 69-90
    if (m.minute === 24) push(out, 24, 'info', null, miscText('q2Start', {}, lang));
    if (m.minute === 46) push(out, 46, 'info', null, miscText('q3Start', {}, lang));
    if (m.minute === 69) push(out, 69, 'info', null, miscText('q4Start', {}, lang));
    simMinute(m.minute, out);

    if (m.minute === 23) push(out, 23, 'info', null, miscText('q1End', {}, lang));
    if (m.minute === 45) push(out, 45, 'info', null, miscText('q2End', {}, lang));
    if (m.minute === 68) push(out, 68, 'info', null, miscText('q3End', {}, lang));
    if (m.minute === 90) {
      if (!m.knockout || m.hg !== m.ag) {
        push(out, 90, 'end', null, miscText('fulltime', {}, lang));
        m.finished = true;
      } else {
        m.extraTime = true;
        push(out, 90, 'info', null, miscText('extraStart', {}, lang));
      }
    }
    if (m.minute === 105 && m.extraTime) push(out, 105, 'info', null, miscText('extraHalf', {}, lang));
    if (m.minute === 120) {
      if (m.hg === m.ag) {
        push(out, 120, 'info', null, miscText('penaltiesStart', {}, lang));
        m.shootout = simulateShootout(home, away, lang);
        for (const line of m.shootout.log) push(out, 120, 'shootout', null, line);
      }
      push(out, 120, 'end', null, miscText('fulltime', {}, lang));
      m.finished = true;
    }
    return out;
  };

  // 사용자 교체. 성공 시 true.
  m.makeSub = (sideKey, outName, inName) => {
    const sd = sideKey === 'home' ? home : away;
    if (sd.subsUsed >= MAX_SUBS || m.finished) return false;
    const outP = sd.eleven.find((p) => p.name === outName);
    const inP = sd.bench.find((p) => p.name === inName);
    if (!outP || !inP || outP.position !== inP.position) return false;
    const out = [];
    doSub(sd, outP, inP, Math.max(1, m.minute), out);
    return out;
  };

  m.setMentality = (sideKey, mentality) => {
    const sd = sideKey === 'home' ? home : away;
    if (MENTALITIES[mentality]) sd.mentality = mentality;
  };

  // 경기 중 포메이션(전술 형태) 변경 — 같은 11명으로 공/수 균형만 바뀐다.
  m.setFormation = (sideKey, formation) => {
    const sd = sideKey === 'home' ? home : away;
    if (FORMATIONS[formation]) {
      sd.formation = formation;
      recalcStrength(sd);
    }
  };

  m.result = () => {
    let winner = null;
    if (m.hg > m.ag) winner = homeTeam.code;
    else if (m.ag > m.hg) winner = awayTeam.code;
    else if (m.shootout)
      winner = m.shootout.homeScore > m.shootout.awayScore ? homeTeam.code : awayTeam.code;
    return {
      home: homeTeam.code,
      away: awayTeam.code,
      homeGoals: m.hg,
      awayGoals: m.ag,
      events: m.events,
      scorers: m.scorers,
      extraTime: m.extraTime,
      shootout: m.shootout,
      winner,
      upset:
        (winner === homeTeam.code && homeTeam.ranking - awayTeam.ranking >= 20) ||
        (winner === awayTeam.code && awayTeam.ranking - homeTeam.ranking >= 20),
    };
  };

  return m;
}

// AI vs AI 경기를 끝까지 즉시 진행
export function simulateMatch(homeTeam, awayTeam, opts = {}) {
  const m = createMatch(homeTeam, awayTeam, opts);
  while (!m.finished) m.advance();
  return m.result();
}

// ── 승부차기: 키커의 슈팅 능력치 기반 성공 확률 ──────────────────
function simulateShootout(home, away, lang = 'ko') {
  const kickers = (sd) =>
    sd.eleven.filter((p) => p.position !== 'GK').sort((a, b) => b.shooting - a.shooting);
  const hk = kickers(home);
  const ak = kickers(away);
  const log = [];
  let hs = 0;
  let as = 0;

  const kick = (p, gk) => {
    const prob = Math.min(0.92, 0.55 + (p.shooting * p.condition) / 250 - (gk.overall - 75) / 400);
    return rand() < prob;
  };

  const doKick = (sd, kicker, oppGk) => {
    const ok = kick(kicker, oppGk);
    if (sd === home) { if (ok) hs++; } else if (ok) as++;
    log.push(shootoutLine(teamName(sd.team, lang), playerName(kicker, lang), ok, hs, as, lang));
  };

  let settled = false;
  for (let i = 0; i < 5 && !settled; i++) {
    doKick(home, hk[i % hk.length], away.eleven[0]);
    if (hs > as + (5 - i) || as > hs + (5 - i - 1)) { settled = true; break; }
    doKick(away, ak[i % ak.length], home.eleven[0]);
    if (hs > as + (5 - i - 1) || as > hs + (5 - i - 1)) { settled = true; break; }
  }
  let round = 5;
  while (hs === as) {
    doKick(home, hk[round % hk.length], away.eleven[0]);
    doKick(away, ak[round % ak.length], home.eleven[0]);
    round++;
  }
  return { homeScore: hs, awayScore: as, log };
}
