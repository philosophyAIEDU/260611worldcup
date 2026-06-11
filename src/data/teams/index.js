import { UEFA_TOP } from './uefaTop.js';
import { UEFA_REST } from './uefaRest.js';
import { AMERICAS } from './americas.js';
import { AFRICA } from './africa.js';
import { ASIA_OCEANIA } from './asiaOceania.js';

const ALL = [...UEFA_TOP, ...UEFA_REST, ...AMERICAS, ...AFRICA, ...ASIA_OCEANIA];

// 팀 코드 → 팀 객체
export const TEAMS = Object.fromEntries(ALL.map((t) => [t.code, t]));

export const TEAM_LIST = ALL;
