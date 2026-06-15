// 대회 정의 — 월드컵 / 챔피언스리그. 두 대회 모두 동일한 엔진/화면을 공유한다.
import { GROUPS as WC_GROUPS } from './groups.js';
import { UCL_GROUPS } from './clubs/index.js';

// format:
//  advancePerGroup: 각 조에서 자동 진출하는 팀 수
//  bestThirds: 3위 와일드카드 진출 수 (월드컵 전용)
//  rounds: 토너먼트 라운드 키 배열 (round.* 로 번역)
//  rankKey: 랭킹 라벨 i18n 키 (국가=FIFA랭킹, 클럽=클럽랭킹)
export const COMPETITIONS = {
  wc: {
    id: 'wc',
    nameKey: 'comp.wc',
    groups: WC_GROUPS,
    pickerKey: 'nation',
    format: { advancePerGroup: 2, bestThirds: 8, rounds: ['R32', 'R16', 'QF', 'SF', 'F'], rankKey: 'common.fifaRank' },
  },
  ucl: {
    id: 'ucl',
    nameKey: 'comp.ucl',
    groups: UCL_GROUPS,
    pickerKey: 'club',
    format: { advancePerGroup: 2, bestThirds: 0, rounds: ['R16', 'QF', 'SF', 'F'], rankKey: 'common.clubRank' },
  },
};

export const DEFAULT_COMP = 'wc';
