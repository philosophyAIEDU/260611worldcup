import { NATIONS, NATION_LIST } from './nations.js';
import { CLUBS, CLUB_LIST } from '../clubs/index.js';

// 팀 코드 → 팀 객체 (국가대표 + 클럽 통합).
// 코드가 고유하므로 TEAMS[code]로 어느 대회의 팀이든 조회할 수 있다.
export const TEAMS = { ...NATIONS, ...CLUBS };

// 월드컵 국가대표 목록 (기존 호환 유지)
export const TEAM_LIST = NATION_LIST;

export { NATION_LIST, CLUB_LIST };
