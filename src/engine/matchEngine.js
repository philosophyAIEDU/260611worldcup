// 경기 시뮬레이션 엔진.
// FIFA 랭킹 기반 팀 능력치 + 당일 컨디션(0.70~1.00) + 스타 폼 보너스 → 분 단위 이벤트 생성.

import { goalText, miscText } from './commentary.js';

const rand = () => Math.random();
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

function weightedPick(players, weightFn) {
  const weights = players.map((p) => Math.max(0.1, weightFn(p)));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < players.length; i++) {
    r -= weights[i];
    if (r <= 0) return players[i];
  }
  return players[players.length - 1];
}

// 경기 출전 명단 구성: 컨디션 부여 후 포지션별 베스트11 선발
export function prepareSide(team) {
  const squad = team.players.map((p) => ({
    ...p,
    condition: Math.round((0.7 + rand() * 0.3) * 100) / 100,
  }));
  const byPos = (pos, n) =>
    squad
      .filter((p) => p.position === pos)
      .sort((a, b) => b.overall * b.condition - a.overall * a.condition)
      .slice(0, n);
  const eleven = [...byPos('GK', 1), ...byPos('DF', 4), ...byPos('MF', 3), ...byPos('FW', 3)];
  const bench = squad.filter((p) => !eleven.includes(p));

  // 팀 전력 = 팀 능력치 60% + 베스트11 (능력치×컨디션) 평균 40%
  const elevenAvg = eleven.reduce((s, p) => s + p.overall * p.condition, 0) / eleven.length;
  let strength = team.rating * 0.6 + elevenAvg * 0.4;

  // 스타 폼 보너스: 컨디션 좋은 스타플레이어가 전력을 끌어올린다
  const stars = eleven.filter((p) => p.isStar);
  const hotStar = stars.reduce((best, p) => (p.condition > (best?.condition ?? 0) ? p : best), null);
  if (hotStar && hotStar.condition >= 0.9) strength += 6 * (hotStar.condition - 0.9) * 10 + 2;
  else if (hotStar && hotStar.condition >= 0.82) strength += 1.5;

  return { team, eleven, bench, strength, hotStar, stars };
}

// 업셋 메커니즘: 랭킹 20위 이상 차이 + 약팀 스타 컨디션 0.90 이상 → 약팀 전력 대폭 보정
function applyUpset(home, away) {
  const diff = home.team.ranking - away.team.ranking; // 양수면 home이 약팀
  const tryBoost = (weak, strong) => {
    if (weak.hotStar && weak.hotStar.condition >= 0.9) {
      weak.strength += Math.min(6, (strong.strength - weak.strength) * 0.35 + 1.5);
      weak.upsetMode = true;
    }
  };
  if (diff >= 20) tryBoost(home, away);
  else if (diff <= -20) tryBoost(away, home);
}

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
  const pool = side.eleven.filter((p) => p !== scorer && p.position !== 'GK');
  if (rand() < 0.18) return null; // 단독 골
  return weightedPick(pool, (p) => (p.passing / 50) * p.condition * (p.position === 'MF' ? 1.6 : 1));
}

function pickOutfielder(side) {
  return pick(side.eleven.filter((p) => p.position !== 'GK'));
}

// 90분(연장 시 120분) 경기 시뮬레이션. knockout=true면 무승부 시 연장+승부차기.
export function simulateMatch(homeTeam, awayTeam, { knockout = false } = {}) {
  const home = prepareSide(homeTeam);
  const away = prepareSide(awayTeam);
  applyUpset(home, away);

  const events = [];
  let hg = 0;
  let ag = 0;
  const scorers = [];

  const push = (minute, type, side, text) =>
    events.push({ minute, type, side, text, score: [hg, ag] });

  // 분당 골 기대치: 총 ~2.6골/90분을 전력비로 배분
  const total = home.strength + away.strength;
  const edge = (home.strength - away.strength) / total; // -? ~ +?
  const homeGoalP = (2.6 / 90) * (0.5 + edge * 2.6) ;
  const awayGoalP = (2.6 / 90) * (0.5 - edge * 2.6);

  const simMinute = (minute) => {
    for (const [side, sd, gp] of [['home', home, homeGoalP], ['away', away, awayGoalP]]) {
      const opp = side === 'home' ? away : home;
      const r = rand();
      if (r < Math.max(0.004, gp)) {
        const type = pickGoalType();
        const scorer = pickScorer(sd, type);
        const assister = type === 'penalty' || type === 'freekick' || type === 'solo' ? null : pickAssister(sd, scorer);
        if (side === 'home') hg++; else ag++;
        scorers.push({ minute, side, name: scorer.name, team: sd.team.code });
        push(minute, 'goal', side,
          `${goalText(type, scorer, assister)} ${sd.team.flag} ${homeTeam.name} ${hg}-${ag} ${awayTeam.name}`);
      } else if (r < 0.045) {
        const p = pickOutfielder(sd);
        if (rand() < 0.5) push(minute, 'chance', side, miscText('chance', { p: p.name }));
        else push(minute, 'save', side, miscText('save', { p: p.name, gk: opp.eleven[0].name }));
      } else if (r < 0.065) {
        const p = pickOutfielder(sd);
        if (rand() < 0.3) push(minute, 'yellow', side, miscText('yellow', { p: p.name }));
        else push(minute, 'foul', side, miscText('foul', { p: p.name }));
      } else if (r < 0.072) {
        push(minute, 'pressure', side, miscText('pressure', { t: sd.team.name }));
      }
    }
    // 교체 (60~80분 사이 가끔)
    if (minute >= 60 && minute <= 82 && rand() < 0.035) {
      const sd = rand() < 0.5 ? home : away;
      const out = pickOutfielder(sd);
      const sub = sd.bench.find((b) => b.position === out.position);
      if (sub) {
        sd.eleven[sd.eleven.indexOf(out)] = sub;
        sd.bench.splice(sd.bench.indexOf(sub), 1);
        push(minute, 'sub', sd === home ? 'home' : 'away', miscText('sub', { t: sd.team.name, out: out.name, in: sub.name }));
      }
    }
  };

  push(0, 'info', null, miscText('kickoff'));
  for (let m = 1; m <= 45; m++) simMinute(m);
  push(45, 'info', null, miscText('halftime'));
  push(46, 'info', null, miscText('secondHalf'));
  for (let m = 46; m <= 90; m++) simMinute(m);

  let extraTime = false;
  let shootout = null;

  if (knockout && hg === ag) {
    extraTime = true;
    push(90, 'info', null, miscText('extraStart'));
    for (let m = 91; m <= 105; m++) simMinute(m);
    push(105, 'info', null, miscText('extraHalf'));
    for (let m = 106; m <= 120; m++) simMinute(m);
    if (hg === ag) {
      push(120, 'info', null, miscText('penaltiesStart'));
      shootout = simulateShootout(home, away);
    }
  }
  push(extraTime ? 120 : 90, 'end', null, miscText('fulltime'));

  let winner = null;
  if (hg > ag) winner = homeTeam.code;
  else if (ag > hg) winner = awayTeam.code;
  else if (shootout) winner = shootout.homeScore > shootout.awayScore ? homeTeam.code : awayTeam.code;

  return {
    home: homeTeam.code,
    away: awayTeam.code,
    homeGoals: hg,
    awayGoals: ag,
    events,
    scorers,
    extraTime,
    shootout,
    winner,
    upset:
      (winner === homeTeam.code && homeTeam.ranking - awayTeam.ranking >= 20) ||
      (winner === awayTeam.code && awayTeam.ranking - homeTeam.ranking >= 20),
  };
}

// 승부차기: 키커의 슈팅/종합 능력치 기반 성공 확률 (약 65~90%)
function simulateShootout(home, away) {
  const kickers = (sd) =>
    sd.eleven
      .filter((p) => p.position !== 'GK')
      .sort((a, b) => b.shooting - a.shooting);
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
    log.push(`${sd.team.flag} ${kicker.name} ${ok ? '성공! ⚽' : '실축… ❌'} (${hs}-${as})`);
  };

  // 기본 5라운드 (조기 확정 시 종료)
  let settled = false;
  for (let i = 0; i < 5 && !settled; i++) {
    doKick(home, hk[i % hk.length], away.eleven[0]);
    if (hs > as + (5 - i) || as > hs + (5 - i - 1)) { settled = true; break; }
    doKick(away, ak[i % ak.length], home.eleven[0]);
    if (hs > as + (5 - i - 1) || as > hs + (5 - i - 1)) { settled = true; break; }
  }

  // 서든데스
  let round = 5;
  while (hs === as) {
    doKick(home, hk[round % hk.length], away.eleven[0]);
    doKick(away, ak[round % ak.length], home.eleven[0]);
    round++;
  }

  return { homeScore: hs, awayScore: as, log };
}
