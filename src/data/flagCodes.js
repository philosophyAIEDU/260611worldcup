// 팀 코드(FIFA 3자리) → flag-icons ISO 코드 매핑
import { CLUB_ISO } from './clubs/index.js';

export const FLAG_ISO = {
  FRA: 'fr', ESP: 'es', ENG: 'gb-eng', POR: 'pt', NED: 'nl', BEL: 'be', GER: 'de', CRO: 'hr',
  SUI: 'ch', NOR: 'no', AUT: 'at', SCO: 'gb-sct', TUR: 'tr', CZE: 'cz', BIH: 'ba', SWE: 'se',
  ARG: 'ar', BRA: 'br', COL: 'co', URU: 'uy', ECU: 'ec', PAR: 'py',
  USA: 'us', MEX: 'mx', CAN: 'ca', PAN: 'pa', HAI: 'ht', CUW: 'cw',
  MAR: 'ma', SEN: 'sn', EGY: 'eg', ALG: 'dz', GHA: 'gh', CIV: 'ci', TUN: 'tn', RSA: 'za',
  CPV: 'cv', COD: 'cd',
  JPN: 'jp', KOR: 'kr', AUS: 'au', IRN: 'ir', KSA: 'sa', IRQ: 'iq', QAT: 'qa', JOR: 'jo',
  UZB: 'uz', NZL: 'nz',
  // 챔피언스리그 클럽 — 소속 국가 국기를 크레스트 대용으로 사용
  ...CLUB_ISO,
};
