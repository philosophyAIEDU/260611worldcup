// 국가대표팀 데이터 집계 (월드컵). 클럽 데이터가 이 목록의 선수들을 재사용하므로
// 순환 참조를 피하기 위해 index.js와 분리한다.
import { UEFA_TOP } from './uefaTop.js';
import { UEFA_REST } from './uefaRest.js';
import { AMERICAS } from './americas.js';
import { AFRICA } from './africa.js';
import { ASIA_OCEANIA } from './asiaOceania.js';

export const NATION_LIST = [...UEFA_TOP, ...UEFA_REST, ...AMERICAS, ...AFRICA, ...ASIA_OCEANIA];

// 팀 코드 → 팀 객체
export const NATIONS = Object.fromEntries(NATION_LIST.map((t) => [t.code, t]));
