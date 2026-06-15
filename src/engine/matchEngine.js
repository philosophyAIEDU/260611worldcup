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
  '4-1-4-1': { DF: 4, MF: 5, FW: 1, atk: 0.93, def: 0.88, label: '4-1-4-1 (안정적 중원)' },
  '3-4-3': { DF: 3, MF: 4, FW: 3, atk: 1.12, def: 1.1, label: '3-4-3 (전면 공격)' },
  '3-5-2': { DF: 3, MF: 5, FW: 2, atk: 1.08, def: 1.08, label: '3-5-2 (하이리스크 공격)' },
  '5-3-2': { DF: 5, MF: 3, FW: 2, atk: 0.9, def: 0.87, label: '5-3-2 (선수비 역습)' },
  '5-4-1': { DF: 5, MF: 4, FW: 1, atk: 0.82, def: 0.8, label: '5-4-1 (초수비/잠그기)' },
};

export const MENTALITIES = {
  attacking: { atk: 1.22, def: 1.18, label: '공격적' },
  balanced: { atk: 1.0, def: 1.0, label: '균형' },
  defensive: { atk: 0.8, def: 0.84, label: '수비적' },
};

// ── 팀 전술(플레이스타일) ─────────────────────────────────────────
// atk/def: 득실 확률 배수. bias: 골 유형별 가중치 배수(세트피스·역습 등 색깔 부여).
// 골 유형 키: counter, freekick, corner, penalty, solo, combo, longshot, header, rebound
export const PLAYSTYLES = {
  balanced: { atk: 1.0, def: 1.0, bias: {} },
  total: { atk: 1.12, def: 1.06, bias: { combo: 1.7, solo: 1.4, longshot: 1.2 } }, // 토탈 사커
  tiki: { atk: 1.05, def: 0.92, bias: { combo: 2.1, solo: 1.2 } }, // 티키타카(점유율)
  counter: { atk: 1.07, def: 0.9, bias: { counter: 2.6, longshot: 1.3 } }, // 역습
  highpress: { atk: 1.09, def: 0.96, bias: { counter: 1.7, rebound: 1.6, combo: 1.2 } }, // 전방 압박
  setpiece: { atk: 1.05, def: 1.0, bias: { freekick: 2.6, corner: 2.3, header: 1.9, penalty: 1.3 } }, // 세트피스
  longball: { atk: 1.04, def: 1.0, bias: { header: 2.2, corner: 1.8, rebound: 1.6, longshot: 1.2 } }, // 롱볼/롱스로인
  wing: { atk: 1.06, def: 1.0, bias: { header: 1.8, corner: 1.5, combo: 1.3 } }, // 측면 돌파/크로스
  catenaccio: { atk: 0.86, def: 0.82, bias: { counter: 2.0, longshot: 1.2 } }, // 빗장수비
  // 파상공세: 기본도 공격적, Q4(69분~) 이후 추가 보정(goalProb에서 처리)
  allout: { atk: 1.25, def: 1.32, bias: { combo: 1.6, header: 1.5, corner: 1.4, longshot: 1.2, counter: 0.4 } }, // 파상공세
};

// 국가대표별 기본 색깔(감독이 바꿀 수 있음). 없으면 balanced.
export const TEAM_PLAYSTYLE = {
  NED: 'total', BRA: 'total',
  ESP: 'tiki', CRO: 'tiki', POR: 'wing',
  FRA: 'counter', BEL: 'counter', SEN: 'counter', MAR: 'counter', POL: 'counter',
  GER: 'highpress', JPN: 'highpress', KOR: 'highpress', USA: 'highpress',
  ENG: 'setpiece', DEN: 'setpiece',
  NOR: 'longball', SWE: 'longball', AUS: 'longball', NZL: 'longball',
  MEX: 'wing', NGA: 'wing', SRB: 'wing', COL: 'wing', CIV: 'wing',
  ITA: 'catenaccio', URU: 'catenaccio', IRN: 'catenaccio', GRE: 'catenaccio',
  ARG: 'tiki', SUI: 'balanced',
};

export function defaultPlaystyle(code) {
  return TEAM_PLAYSTYLE[code] || 'balanced';
}

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
    playstyle: PLAYSTYLES[setup.playstyle] ? setup.playstyle : defaultPlaystyle(team.code),
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

function pickGoalType(side) {
  const weights = { combo: 22, counter: 16, solo: 13, header: 12, corner: 10, longshot: 9, rebound: 8, freekick: 6, penalty: 4 };
  const bias = (side && PLAYSTYLES[side.playstyle]?.bias) || {};
  return weightedPick(GOAL_TYPE_KEYS.map((k) => ({ k })), (o) => weights[o.k] * (bias[o.k] || 1)).k;
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
    assisters: [],
    shootout: null,
  };

  const push = (out, minute, type, side, text) => {
    const ev = { minute, type, side, text, score: [m.hg, m.ag] };
    m.events.push(ev);
    out.push(ev);
  };

  const goalProb = (atkSide, defSide, minute = 0) => {
    const total = home.strength + away.strength;
    const edge = (atkSide.strength - defSide.strength) / total;
    let p =
      (2.6 / 90) * (0.5 + edge * 2.6) *
      FORMATIONS[atkSide.formation].atk * MENTALITIES[atkSide.mentality].atk * PLAYSTYLES[atkSide.playstyle].atk *
      FORMATIONS[defSide.formation].def * MENTALITIES[defSide.mentality].def * PLAYSTYLES[defSide.playstyle].def;
    // 파상공세: Q4(69분~) 막판 총공세. 늦을수록 강해짐(최대 +60%).
    if (atkSide.playstyle === 'allout' && minute >= 69) {
      p *= 1 + Math.min(0.6, ((minute - 68) / 22) * 0.6);
    }
    // 상대가 파상공세로 올라오면 뒷공간이 비어 우리 득점 기회도 늘어남.
    if (defSide.playstyle === 'allout' && minute >= 69) {
      p *= 1.18;
    }
    return Math.max(0.004, p);
  };

  const simMinute = (minute, out) => {
    for (const [sideKey, sd, opp] of [['home', home, away], ['away', away, home]]) {
      const r = rand();
      if (r < goalProb(sd, opp, minute)) {
        const type = pickGoalType(sd);
        const scorer = pickScorer(sd, type);
        const assister = type === 'penalty' || type === 'freekick' || type === 'solo' ? null : pickAssister(sd, scorer);
        if (sideKey === 'home') m.hg++; else m.ag++;
        m.scorers.push({ minute, side: sideKey, name: scorer.name, nameEn: scorer.nameEn, team: sd.team.code });
        if (assister) m.assisters.push({ minute, side: sideKey, name: assister.name, nameEn: assister.nameEn, team: sd.team.code });
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

  m.setPlaystyle = (sideKey, playstyle) => {
    const sd = sideKey === 'home' ? home : away;
    if (PLAYSTYLES[playstyle]) sd.playstyle = playstyle;
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
      assisters: m.assisters,
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

// ── 경기 통계 & 선수 평점 ────────────────────────────────────────
// 한쪽 팀의 누적 통계(슈팅/유효슈팅/파울/경고)를 이벤트 로그에서 집계.
export function teamStats(events, side) {
  const ev = events.filter((e) => e.side === side);
  const goals = ev.filter((e) => e.type === 'goal').length;
  const chances = ev.filter((e) => e.type === 'chance').length;
  const saves = ev.filter((e) => e.type === 'save').length;
  const fouls = ev.filter((e) => e.type === 'foul').length;
  const yellows = ev.filter((e) => e.type === 'yellow').length;
  const pressure = ev.filter((e) => e.type === 'pressure').length;
  return {
    goals,
    shots: goals + chances + saves,
    onTarget: goals + saves,
    fouls: fouls + yellows,
    yellows,
    // 공격 활동량(점유율 추정에 사용)
    attackWeight: goals * 3 + chances * 2 + saves * 2 + pressure,
  };
}

// 양 팀 점유율(%) 추정 — 공격 활동량 비율. 합이 0이면 50:50.
export function possession(events) {
  const h = teamStats(events, 'home').attackWeight;
  const a = teamStats(events, 'away').attackWeight;
  const total = h + a;
  if (total === 0) return { home: 50, away: 50 };
  const home = Math.round((h / total) * 100);
  return { home, away: 100 - home };
}

// 선수 평점(6.0~10.0). 득점/도움/실점/포지션/컨디션 기반의 결정론적 계산.
// side: 경기 종료 시점의 한쪽(eleven/bench/team), scorers/assisters: 전체 기록.
export function playerRatings(side, scorers, assisters, goalsConceded) {
  const myCode = side.team.code;
  const goalsBy = {}; const assistsBy = {};
  scorers.filter((s) => s.team === myCode).forEach((s) => { goalsBy[s.name] = (goalsBy[s.name] || 0) + 1; });
  assisters.filter((s) => s.team === myCode).forEach((s) => { assistsBy[s.name] = (assistsBy[s.name] || 0) + 1; });

  // 경기에 관여한 선수: 현재 11명 + 득점/도움 기록자(교체로 빠졌어도 평점)
  const played = new Map();
  side.eleven.forEach((p) => played.set(p.name, p));
  side.bench.forEach((p) => {
    if (goalsBy[p.name] || assistsBy[p.name]) played.set(p.name, p);
  });

  const ratings = [];
  for (const p of played.values()) {
    let r = 6.4;
    const g = goalsBy[p.name] || 0;
    const a = assistsBy[p.name] || 0;
    r += g * 1.25 + a * 0.85;
    // 컨디션 보정
    r += (p.condition - 0.85) * 1.2;
    // 포지션별 실점 영향(GK/DF는 클린시트 보너스/실점 페널티)
    if (p.position === 'GK') {
      r += 0.3;
      if (goalsConceded === 0) r += 1.1;
      else r -= goalsConceded * 0.32;
    } else if (p.position === 'DF') {
      if (goalsConceded === 0) r += 0.6;
      else r -= goalsConceded * 0.14;
    }
    // 스타는 약간의 기대 보정(활약 없으면 살짝 감점, 활약하면 가점)
    if (p.isStar) r += (g + a > 0) ? 0.2 : -0.15;
    r = Math.max(5.5, Math.min(10, Math.round(r * 10) / 10));
    ratings.push({ name: p.name, nameEn: p.nameEn, position: p.position, overall: p.overall, isStar: p.isStar, goals: g, assists: a, rating: r });
  }
  // 평점 내림차순
  ratings.sort((x, y) => y.rating - x.rating || (y.goals + y.assists) - (x.goals + x.assists));
  return ratings;
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
