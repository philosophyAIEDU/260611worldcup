// 데이터 파일 공용 팩토리 — 모든 팀 데이터 파일은 이 두 함수만 사용해 작성한다.

// P(한글명, 영문명, 포지션, 종합, 속도, 슈팅, 패스, 수비, 체력, 소속클럽, { star, legend })
export function P(name, nameEn, position, overall, pace, shooting, passing, defending, stamina, club, flags = {}) {
  return {
    name,
    nameEn,
    position,
    overall,
    pace,
    shooting,
    passing,
    defending,
    stamina,
    club,
    isStar: !!flags.star,
    isLegend: !!flags.legend,
  };
}

// T(코드, 한글명, 영문명, 국기이모지, 대륙연맹, FIFA랭킹, 팀능력치, 선수26명)
export function T(code, name, nameEn, flag, confederation, ranking, rating, players) {
  return { code, name, nameEn, flag, confederation, ranking, rating, players };
}
