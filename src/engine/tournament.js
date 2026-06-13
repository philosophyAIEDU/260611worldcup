// 대회 진행 로직: 그룹 일정, 순위 계산, 3위 팀 선별, 토너먼트 대진.

import { GROUPS, GROUP_KEYS } from '../data/groups.js';

// 그룹별 3라운드 일정 (표준 로테이션)
export function groupFixtures(groupKey) {
  const [a, b, c, d] = GROUPS[groupKey];
  return [
    [{ home: a, away: b }, { home: c, away: d }],
    [{ home: a, away: c }, { home: d, away: b }],
    [{ home: d, away: a }, { home: b, away: c }],
  ];
}

export function emptyStandingRow(code) {
  return { code, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
}

// groupResults: { A: [{home, away, homeGoals, awayGoals}], ... }
export function computeStandings(groupResults) {
  const standings = {};
  for (const g of GROUP_KEYS) {
    const rows = Object.fromEntries(GROUPS[g].map((c) => [c, emptyStandingRow(c)]));
    for (const m of groupResults[g] || []) {
      const h = rows[m.home];
      const a = rows[m.away];
      h.played++; a.played++;
      h.gf += m.homeGoals; h.ga += m.awayGoals;
      a.gf += m.awayGoals; a.ga += m.homeGoals;
      if (m.homeGoals > m.awayGoals) { h.won++; a.lost++; h.pts += 3; }
      else if (m.homeGoals < m.awayGoals) { a.won++; h.lost++; a.pts += 3; }
      else { h.drawn++; a.drawn++; h.pts++; a.pts++; }
    }
    for (const r of Object.values(rows)) r.gd = r.gf - r.ga;
    standings[g] = Object.values(rows).sort(
      (x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || x.code.localeCompare(y.code)
    );
  }
  return standings;
}

const tierSort = (x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || x.code.localeCompare(y.code);

// 32강 진출팀: 각 조 1·2위 24팀 + 3위 중 상위 8팀
export function qualifiedTeams(standings) {
  const winners = [];
  const runners = [];
  const thirds = [];
  for (const g of GROUP_KEYS) {
    winners.push({ ...standings[g][0], group: g });
    runners.push({ ...standings[g][1], group: g });
    thirds.push({ ...standings[g][2], group: g });
  }
  winners.sort(tierSort);
  runners.sort(tierSort);
  thirds.sort(tierSort);
  return { winners, runners, bestThirds: thirds.slice(0, 8), allThirds: thirds };
}

// 32강 대진: 시드 1~16 vs 시드 32~17, 같은 조 재대결은 인접 경기와 스왑으로 회피
export function buildRoundOf32(standings) {
  const { winners, runners, bestThirds } = qualifiedTeams(standings);
  const seeds = [...winners, ...runners, ...bestThirds];
  const high = seeds.slice(0, 16);
  const low = seeds.slice(16, 32).reverse();
  for (let i = 0; i < 16; i++) {
    if (high[i].group === low[i].group) {
      const j = (i + 1) % 16;
      [low[i], low[j]] = [low[j], low[i]];
    }
  }
  return high.map((h, i) => ({ home: h.code, away: low[i].code, result: null }));
}

// 라운드 식별 키 (표시 문자열은 i18n에서 round.* 로 번역)
export const ROUND_NAMES = ['R32', 'R16', 'QF', 'SF', 'F'];

// 직전 라운드 승자들로 다음 라운드 대진 생성
export function nextRound(matches) {
  const next = [];
  for (let i = 0; i < matches.length; i += 2) {
    next.push({ home: matches[i].result.winner, away: matches[i + 1].result.winner, result: null });
  }
  return next;
}
