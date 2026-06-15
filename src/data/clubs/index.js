// 챔피언스리그 클럽 데이터.
// 실제 선수(국가대표 데이터의 club 필드)를 클럽별로 모아 스쿼드를 구성하고,
// 부족한 포지션은 가공 선수로 보강해 월드컵과 동일한 엔진에서 바로 쓸 수 있게 한다.
import { NATION_LIST } from '../teams/nations.js';
import { P, T } from '../playerFactory.js';
import { FIRST_NAMES, LAST_NAMES } from './names.js';

// ── 클럽 정의 ─────────────────────────────────────────────────────
// [코드, 한글명, 영문명, 국가ISO, club문자열(데이터 매칭용), 전력, 시드랭킹]
const CLUB_DEFS = [
  ['RMA', '레알 마드리드', 'Real Madrid', 'es', '레알 마드리드', 96, 1],
  ['MCI', '맨체스터 시티', 'Manchester City', 'gb-eng', '맨체스터 시티', 95, 2],
  ['PSG', '파리 생제르맹', 'Paris Saint-Germain', 'fr', '파리 생제르맹', 95, 3],
  ['FCB', '바르셀로나', 'Barcelona', 'es', '바르셀로나', 93, 4],
  ['BAY', '바이에른 뮌헨', 'Bayern Munich', 'de', '바이에른 뮌헨', 93, 5],
  ['ARS', '아스널', 'Arsenal', 'gb-eng', '아스널', 92, 6],
  ['LIV', '리버풀', 'Liverpool', 'gb-eng', '리버풀', 92, 7],
  ['INT', '인테르', 'Inter', 'it', '인테르', 89, 8],
  ['CHE', '첼시', 'Chelsea', 'gb-eng', '첼시', 88, 9],
  ['NAP', '나폴리', 'Napoli', 'it', '나폴리', 87, 10],
  ['ATM', '아틀레티코 마드리드', 'Atletico Madrid', 'es', '아틀레티코 마드리드', 87, 11],
  ['MIL', 'AC 밀란', 'AC Milan', 'it', 'AC 밀란', 86, 12],
  ['JUV', '유벤투스', 'Juventus', 'it', '유벤투스', 86, 13],
  ['BVB', '도르트문트', 'Borussia Dortmund', 'de', '도르트문트', 86, 14],
  ['LEV', '바이어 레버쿠젠', 'Bayer Leverkusen', 'de', '바이어 레버쿠젠', 86, 15],
  ['TOT', '토트넘', 'Tottenham Hotspur', 'gb-eng', '토트넘', 85, 16],
  ['ATA', '아탈란타', 'Atalanta', 'it', '아탈란타', 85, 17],
  ['NEW', '뉴캐슬 유나이티드', 'Newcastle United', 'gb-eng', '뉴캐슬 유나이티드', 84, 18],
  ['AVL', '아스턴 빌라', 'Aston Villa', 'gb-eng', '아스턴 빌라', 84, 19],
  ['OM', '마르세유', 'Marseille', 'fr', '마르세유', 84, 20],
  ['RBL', 'RB 라이프치히', 'RB Leipzig', 'de', 'RB 라이프치히', 84, 21],
  ['SPO', '스포르팅', 'Sporting CP', 'pt', '스포르팅', 84, 22],
  ['BEN', '벤피카', 'Benfica', 'pt', '벤피카', 84, 23],
  ['GAL', '갈라타사라이', 'Galatasaray', 'tr', '갈라타사라이', 84, 24],
  ['ATH', '아틀레틱 빌바오', 'Athletic Bilbao', 'es', '아틀레틱 빌바오', 83, 25],
  ['MON', 'AS 모나코', 'AS Monaco', 'fr', 'AS 모나코', 83, 26],
  ['FCP', '포르투', 'Porto', 'pt', '포르투', 83, 27],
  ['PSV', 'PSV 에인트호번', 'PSV Eindhoven', 'nl', 'PSV 에인트호번', 83, 28],
  ['FEY', '페예노르트', 'Feyenoord', 'nl', '페예노르트', 83, 29],
  ['AJA', '아약스', 'Ajax', 'nl', '아약스', 82, 30],
  ['CEL', '셀틱', 'Celtic', 'gb-sct', '셀틱', 82, 31],
  ['BRU', '클뤼프 브뤼허', 'Club Brugge', 'be', '클뤼프 브뤼허', 82, 32],
];

// 챔피언스리그 조 (8개 조 × 4팀) — 같은 조 내 같은 리그가 겹치지 않도록 배정
export const UCL_GROUPS = {
  A: ['RMA', 'MIL', 'NEW', 'PSV'],
  B: ['MCI', 'NAP', 'OM', 'FCP'],
  C: ['PSG', 'CHE', 'SPO', 'AJA'],
  D: ['FCB', 'JUV', 'RBL', 'CEL'],
  E: ['BAY', 'ATM', 'AVL', 'FEY'],
  F: ['ARS', 'BVB', 'BEN', 'MON'],
  G: ['LIV', 'LEV', 'ATA', 'ATH'],
  H: ['INT', 'TOT', 'GAL', 'BRU'],
};

// ── 스쿼드 빌더 ───────────────────────────────────────────────────
// 클럽별로 데이터에 존재하는 실제 선수를 모은다.
const realByClub = {};
for (const team of NATION_LIST) {
  for (const p of team.players) {
    (realByClub[p.club] ||= []).push({ ...p });
  }
}

// 목표 포지션 구성 (총 22명). 실제 선수로 먼저 채우고 모자라면 가공 선수로 보강.
const TARGET = { GK: 3, DF: 7, MF: 7, FW: 5 };

// 결정론적 의사난수 (코드+인덱스 시드)
function seeded(code, i) {
  let h = i * 2654435761;
  for (let k = 0; k < code.length; k++) h = (h * 31 + code.charCodeAt(k)) >>> 0;
  return ((h >>> 0) % 1000) / 1000;
}

// 포지션별 능력치 프로필 (가공 선수)
function genStats(pos, ovr, r) {
  const j = (base, spread) => Math.max(35, Math.min(94, Math.round(base + (r - 0.5) * spread)));
  switch (pos) {
    case 'GK': return { pace: j(50, 10), shooting: j(22, 8), passing: j(68, 12), defending: j(ovr - 2, 8), stamina: j(80, 8) };
    case 'DF': return { pace: j(ovr - 4, 14), shooting: j(45, 14), passing: j(ovr - 6, 12), defending: j(ovr, 8), stamina: j(ovr - 2, 8) };
    case 'MF': return { pace: j(ovr - 6, 14), shooting: j(ovr - 8, 14), passing: j(ovr, 8), defending: j(ovr - 8, 16), stamina: j(ovr, 8) };
    default: return { pace: j(ovr, 12), shooting: j(ovr, 8), passing: j(ovr - 8, 14), defending: j(40, 14), stamina: j(ovr - 4, 10) };
  }
}

let fillerCounter = 0;
function genPlayer(clubCode, clubKo, pos, ovr) {
  const r = seeded(clubCode + pos, fillerCounter++);
  const fn = FIRST_NAMES[Math.floor(r * FIRST_NAMES.length) % FIRST_NAMES.length];
  const ln = LAST_NAMES[Math.floor(seeded(clubCode + pos + 'L', fillerCounter) * LAST_NAMES.length) % LAST_NAMES.length];
  const s = genStats(pos, ovr, r);
  return P(`${fn[0]} ${ln[0]}`, `${fn[1]} ${ln[1]}`, pos, ovr, s.pace, s.shooting, s.passing, s.defending, s.stamina, clubKo);
}

function buildClub(def) {
  const [code, ko, en, iso, clubStr, rating, ranking] = def;
  const real = (realByClub[clubStr] || []).slice().sort((a, b) => b.overall - a.overall);
  const byPos = { GK: [], DF: [], MF: [], FW: [] };
  for (const p of real) if (byPos[p.position]) byPos[p.position].push(p);

  const squad = [];
  for (const pos of ['GK', 'DF', 'MF', 'FW']) {
    const have = byPos[pos];
    squad.push(...have);
    // 부족분 보강 — 가공 선수 능력치는 클럽 전력 기반(주전보다 낮게)
    for (let i = have.length; i < TARGET[pos]; i++) {
      const ovr = Math.max(60, rating - 6 - i * 2 - (pos === 'GK' ? 2 : 0));
      squad.push(genPlayer(code, ko, pos, ovr));
    }
  }
  return T(code, ko, en, '⚽', 'UEFA', ranking, rating, squad);
}

export const CLUB_LIST = CLUB_DEFS.map(buildClub);
export const CLUBS = Object.fromEntries(CLUB_LIST.map((c) => [c.code, c]));

// 클럽 코드 → 국가 ISO (국기 표시용)
export const CLUB_ISO = Object.fromEntries(CLUB_DEFS.map((d) => [d[0], d[3]]));
