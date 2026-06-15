// 대회 진행 로직: 그룹 일정, 순위 계산, 진출팀 선별, 토너먼트 대진.
// 월드컵(12조 → 32강)과 챔피언스리그(8조 → 16강)를 동일한 함수로 처리한다.
// groups: { A: [code,code,code,code], ... } 형태를 인자로 받는다.

// 그룹별 3라운드 일정 (표준 로테이션)
export function groupFixtures(groups, groupKey) {
  const [a, b, c, d] = groups[groupKey];
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
export function computeStandings(groups, groupResults) {
  const standings = {};
  for (const g of Object.keys(groups)) {
    const rows = Object.fromEntries(groups[g].map((c) => [c, emptyStandingRow(c)]));
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

// 진출팀: 각 조 상위 advancePerGroup팀 + (월드컵) 3위 중 상위 bestThirds팀
export function qualifiedTeams(groups, standings, format) {
  const bestThirds = format?.bestThirds || 0;
  const winners = [];
  const runners = [];
  const thirds = [];
  for (const g of Object.keys(groups)) {
    winners.push({ ...standings[g][0], group: g });
    runners.push({ ...standings[g][1], group: g });
    if (standings[g][2]) thirds.push({ ...standings[g][2], group: g });
  }
  winners.sort(tierSort);
  runners.sort(tierSort);
  thirds.sort(tierSort);
  return { winners, runners, bestThirds: thirds.slice(0, bestThirds), allThirds: thirds };
}

// 토너먼트 1라운드 대진: 상위 시드 vs 하위 시드, 같은 조 재대결은 인접 경기와 스왑으로 회피
export function buildFirstRound(groups, standings, format) {
  const { winners, runners, bestThirds } = qualifiedTeams(groups, standings, format);
  const seeds = [...winners, ...runners, ...bestThirds];
  const half = seeds.length / 2;
  const high = seeds.slice(0, half);
  const low = seeds.slice(half).reverse();
  for (let i = 0; i < half; i++) {
    if (high[i].group === low[i].group) {
      const j = (i + 1) % half;
      [low[i], low[j]] = [low[j], low[i]];
    }
  }
  return high.map((h, i) => ({ home: h.code, away: low[i].code, result: null }));
}

// 직전 라운드 승자들로 다음 라운드 대진 생성
export function nextRound(matches) {
  const next = [];
  for (let i = 0; i < matches.length; i += 2) {
    next.push({ home: matches[i].result.winner, away: matches[i + 1].result.winner, result: null });
  }
  return next;
}
