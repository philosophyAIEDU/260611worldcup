// 중계 텍스트 생성기 (한국어/영어).
// 골 유형 9종 + 일반 이벤트 + 핵심 선수 특별 텍스트.
// 모든 함수는 lang('ko'|'en')을 받으며, {p}=득점자, {a}=어시스트, {t}=팀명 등을 치환한다.

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 골 유형별 기본 텍스트.
const GOAL_TYPES = {
  ko: {
    counter: [
      '전광석화 같은 역습! {a}의 침투 패스를 받은 {p}, 침착하게 골키퍼를 제치고 마무리! 골!',
      '상대 진영이 텅 빈 사이 {p}가 폭풍처럼 질주! 역습 한 방에 그물이 출렁입니다! 골!',
      '수비에서 공격까지 단 8초! {p}의 역습 마무리, 완벽합니다! 골!',
    ],
    freekick: [
      '{p}의 프리킥! 공이 벽을 넘어 감아져 들어갑니다… 골! 환상적인 궤적!',
      '위험한 위치의 프리킥, {p}가 키커로 나섭니다… 그대로 꽂아 넣습니다! 골!',
    ],
    corner: [
      '코너킥 상황, {a}의 정확한 크로스! {p}가 솟구쳐 올라 헤더! 골!',
      '세트피스 약속된 플레이! 코너킥이 {p}의 머리에 정확히 배달됩니다! 골!',
    ],
    penalty: [
      '페널티킥! {p}가 공을 내려놓습니다… 골키퍼 반대 방향, 침착한 슈팅! 골!',
      '페널티 스팟에 선 {p}, 긴장된 순간… 구석에 정확히 꽂습니다! 골!',
    ],
    solo: [
      '{p}의 개인 돌파! 한 명, 두 명을 제치고… 마무리까지 완벽! 원맨쇼 골!',
      '{p}가 하프라인부터 단독 드리블! 수비진을 농락하며 골망을 흔듭니다! 골!',
    ],
    combo: [
      '아름다운 패스 연계! {a}와 {p}의 2대1 패스, 마지막은 {p}의 마무리! 골!',
      '티키타카가 살아 움직입니다! {a}의 스루패스, {p}의 원터치 슈팅! 골!',
    ],
    longshot: [
      '{p}, 거리가 멀다고 생각했는데… 중거리 대포알 슈팅! 골키퍼 손도 못 씁니다! 골!',
      '25미터 밖에서 때린 {p}의 슈팅이 상단 구석에 작렬! 원더골!',
    ],
    header: [
      '{a}의 측면 크로스, 문전의 {p}가 타이밍 완벽한 헤더! 골!',
      '올려준 공을 {p}가 머리로 꽂아 넣습니다! 교과서적인 헤딩골!',
    ],
    rebound: [
      '골키퍼가 쳐낸 공! 흘러나온 곳에 {p}가 있었습니다! 골!',
      '혼전 상황, 문전 앞 흘러나온 공을 {p}가 놓치지 않습니다! 골!',
    ],
  },
  en: {
    counter: [
      'Lightning counter-attack! {a} threads it through and {p} rounds the keeper to finish! GOAL!',
      'They caught them on the break — {p} races clear and buries it! GOAL!',
      'From defence to attack in eight seconds! A clinical counter finished by {p}! GOAL!',
    ],
    freekick: [
      'Free kick to {p}… it curls up and over the wall and in! GOAL! What a strike!',
      'Dangerous free kick, {p} stands over it… and bends it home! GOAL!',
    ],
    corner: [
      'Corner swung in by {a}, and {p} rises highest to head it home! GOAL!',
      'A trained set-piece routine — the corner is met perfectly by {p}! GOAL!',
    ],
    penalty: [
      'Penalty! {p} places the ball… sends the keeper the wrong way! GOAL!',
      '{p} steps up from the spot… and tucks it into the corner! GOAL!',
    ],
    solo: [
      'Brilliant solo run from {p} — beats one, beats two, and finishes! A one-man GOAL!',
      '{p} carries it from the halfway line, dances past the defence and scores! GOAL!',
    ],
    combo: [
      'Lovely team move! A one-two between {a} and {p}, finished off by {p}! GOAL!',
      'Tiki-taka at its best — {a} slides it through and {p} finishes first time! GOAL!',
    ],
    longshot: [
      '{p} lets fly from distance — an absolute rocket the keeper cannot reach! GOAL!',
      'From 25 yards out {p} finds the top corner! A wonder goal!',
    ],
    header: [
      'Cross from {a}, and {p} times the header to perfection! GOAL!',
      '{p} climbs and powers the header home! A textbook headed GOAL!',
    ],
    rebound: [
      'The keeper parries it — and {p} was there to pounce! GOAL!',
      'Scramble in the box, the loose ball falls to {p} who makes no mistake! GOAL!',
    ],
  },
};

// 핵심 선수 특별 골 텍스트 (한글명을 키로 사용 — 선수 정체성 식별용)
const SPECIAL_GOAL = {
  ko: {
    '리오넬 메시': [
      '🐐 메시! 메시! 마지막 월드컵에서 또 하나의 마법을 그려냅니다! 골!',
      '🐐 38세의 메시가 시간을 거스릅니다! 전성기 그대로의 마무리! 골!',
    ],
    '킬리안 음바페': [
      '🔥 음바페의 폭발적인 스피드! 아무도 그를 막을 수 없습니다! 골!',
      '🔥 우승후보의 에이스 음바페, 괴물 같은 결정력! 골!',
    ],
    '라민 야말': [
      '⭐ 18세 야말! 나이는 숫자일 뿐, 월드컵 무대를 지배합니다! 골!',
      '⭐ 야말의 왼발이 또 한 번 번뜩입니다! 슈퍼스타의 탄생! 골!',
    ],
    '비니시우스 주니오르': [
      '🏆 비니시우스의 현란한 드리블에 이은 마무리! 세계 최고의 윙어! 골!',
      '🏆 삼바 축구의 화신 비니시우스! 경기장이 들썩입니다! 골!',
    ],
    손흥민: [
      '🇰🇷 손흥민! 손흥민! 대한민국의 캡틴이 해냅니다! 골!',
      '🇰🇷 마지막 월드컵에 나선 손흥민의 원더골! 온 국민이 일어섭니다!',
      '🇰🇷 월드클래스 손흥민의 감아차기! 이것이 손흥민 존입니다! 골!',
    ],
    '엘링 홀란': [
      '🇳🇴 골 머신 홀란! 기계처럼 정확한 마무리! 골!',
      '🇳🇴 홀란 앞에 공이 떨어지면 그것은 곧 골입니다! 어김없이 골!',
    ],
    '크리스티아누 호날두': [
      '👑 호날두! 41세 레전드의 마지막 여정에 또 하나의 골이 새겨집니다!',
      '👑 시우우우! 호날두의 트레이드마크 세리머니가 나옵니다! 골!',
    ],
    '루카 모드리치': [
      '🎩 40세 모드리치! 미드필드의 마에스트로가 직접 해결합니다! 골!',
      '🎩 모드리치의 아웃프런트 킥! 세월이 무색한 마법입니다! 골!',
    ],
    '루이스 수아레스': [
      '⚽ 노장 수아레스의 투혼! 골 냄새를 맡는 본능은 여전합니다! 골!',
      '⚽ 수아레스! 우루과이의 검은 늑대가 마지막 이빨을 드러냅니다! 골!',
    ],
  },
  en: {
    '리오넬 메시': [
      '🐐 Messi! Messi! He conjures yet more magic at his final World Cup! GOAL!',
      '🐐 At 38, Messi turns back the clock with a vintage finish! GOAL!',
    ],
    '킬리안 음바페': [
      '🔥 Explosive pace from Mbappe — nobody can stop him! GOAL!',
      '🔥 The favourites\' talisman Mbappe, with monstrous finishing! GOAL!',
    ],
    '라민 야말': [
      '⭐ 18-year-old Yamal! Age is just a number as he rules the World Cup stage! GOAL!',
      '⭐ That magical left foot of Yamal flashes again! A superstar is born! GOAL!',
    ],
    '비니시우스 주니오르': [
      '🏆 Dazzling dribble and finish from Vinicius — the best winger in the world! GOAL!',
      '🏆 Vinicius, the spirit of samba football, sends the stadium wild! GOAL!',
    ],
    손흥민: [
      '🇰🇷 Son! Heung-min Son! The Korea captain delivers! GOAL!',
      '🇰🇷 A wonder goal from Son at his final World Cup — a nation rises to its feet!',
      '🇰🇷 World-class Son curls it in — that\'s the Sonny zone! GOAL!',
    ],
    '엘링 홀란': [
      '🇳🇴 Haaland the goal machine — clinical as ever! GOAL!',
      '🇳🇴 If the ball drops to Haaland, it\'s a goal — and it is again! GOAL!',
    ],
    '크리스티아누 호날두': [
      '👑 Ronaldo! Another goal etched into the final chapter of the 41-year-old legend!',
      '👑 Siuuu! Out comes Ronaldo\'s trademark celebration! GOAL!',
    ],
    '루카 모드리치': [
      '🎩 40-year-old Modric! The midfield maestro settles it himself! GOAL!',
      '🎩 An outside-of-the-boot strike from Modric — ageless magic! GOAL!',
    ],
    '루이스 수아레스': [
      '⚽ Veteran Suarez, all heart — that instinct for goal never fades! GOAL!',
      '⚽ Suarez! Uruguay\'s old wolf bares his teeth one last time! GOAL!',
    ],
  },
};

export function goalText(type, scorerName, assisterName, lang = 'ko') {
  const special = SPECIAL_GOAL[lang]?.[scorerName];
  const base = special && Math.random() < 0.75
    ? pick(special)
    : pick(GOAL_TYPES[lang][type] || GOAL_TYPES[lang].combo);
  const fallbackMate = lang === 'en' ? 'a team-mate' : '동료';
  return base.replaceAll('{p}', scorerName).replaceAll('{a}', assisterName || fallbackMate);
}

const MISC = {
  ko: {
    kickoff: ['1쿼터 시작 휘슬이 울립니다!', '드디어 킥오프! 1쿼터가 시작됩니다.'],
    q1End: ['1쿼터 종료. 짧은 인터벌입니다.'],
    q2Start: ['2쿼터가 시작됩니다!'],
    q2End: ['2쿼터 종료. 하프타임 — 양 팀 라커룸으로 향합니다.'],
    q3Start: ['후반 첫 쿼터, 3쿼터가 시작됩니다!'],
    q3End: ['3쿼터 종료. 마지막 쿼터를 준비합니다.'],
    q4Start: ['운명의 4쿼터가 시작됩니다!'],
    kickoffHalf: ['전반 시작 휘슬이 울립니다!', '드디어 킥오프! 전반전이 시작됩니다.'],
    halftime: ['전반 종료. 하프타임 — 양 팀 라커룸으로 향합니다.'],
    secondHalfStart: ['후반전이 시작됩니다!'],
    fulltime: ['경기 종료 휘슬!'],
    extraStart: ['승부를 가리지 못해 연장전에 돌입합니다!'],
    extraHalf: ['연장 전반 종료.'],
    penaltiesStart: ['연장에서도 승부가 나지 않았습니다. 운명의 승부차기!'],
    chance: [
      '{p}의 슈팅! 아… 골대를 살짝 빗나갑니다!',
      '{p}가 때렸지만 골키퍼 정면! 아쉬운 기회!',
      '결정적 찬스에서 {p}의 슈팅이 크로스바를 강타합니다!',
      '{p}의 헤더, 골문 위로 뜨고 맙니다!',
    ],
    save: [
      '{p}의 강한 슈팅! 그러나 {gk}의 환상적인 선방!',
      '{gk}가 몸을 날려 {p}의 슈팅을 막아냅니다! 슈퍼 세이브!',
    ],
    foul: [
      '{p}의 거친 태클, 주심의 휘슬이 울립니다. 파울.',
      '미드필드에서 {p}의 파울. 분위기가 거칠어집니다.',
    ],
    yellow: [
      '{p}에게 경고! 옐로카드가 나옵니다.',
      '{p}의 전술적 파울, 주심이 주저 없이 옐로카드를 꺼냅니다.',
    ],
    sub: ['{t} 벤치가 움직입니다. {out} 아웃, {in} 인.'],
    pressure: [
      '{t}이(가) 거세게 몰아붙입니다!',
      '{t}의 점유율이 높아지며 경기를 지배하기 시작합니다.',
      '{t} 진영에서 위험한 장면이 계속 만들어집니다.',
    ],
  },
  en: {
    kickoff: ['The first-quarter whistle blows — we are underway!', 'Kick off! Quarter one begins.'],
    q1End: ['End of the first quarter. A short break.'],
    q2Start: ['The second quarter is under way!'],
    q2End: ['End of the second quarter — half time. The teams head for the dressing rooms.'],
    q3Start: ['The third quarter begins!'],
    q3End: ['End of the third quarter. One quarter to go.'],
    q4Start: ['The decisive fourth quarter is under way!'],
    kickoffHalf: ['The first-half whistle blows — we are underway!', 'Kick off! The first half begins.'],
    halftime: ['Half time — the teams head for the dressing rooms.'],
    secondHalfStart: ['The second half is under way!'],
    fulltime: ['The full-time whistle!'],
    extraStart: ['Still level — we go to extra time!'],
    extraHalf: ['End of the first period of extra time.'],
    penaltiesStart: ['Still nothing to separate them after extra time. It comes down to penalties!'],
    chance: [
      'Shot from {p}! Oh… just wide of the post!',
      '{p} strikes it, but straight at the keeper! A chance gone begging!',
      'Golden chance — {p}\'s effort smashes against the crossbar!',
      'Header from {p} sails just over the bar!',
    ],
    save: [
      'Fierce shot from {p}! But what a save from {gk}!',
      '{gk} flies across to deny {p}! A super save!',
    ],
    foul: [
      'Crunching tackle by {p} — the referee blows for a foul.',
      'A foul by {p} in midfield. It\'s getting niggly out there.',
    ],
    yellow: [
      'Booking for {p} — out comes the yellow card.',
      'A tactical foul by {p}, and the referee shows yellow without hesitation.',
    ],
    sub: ['Change for {t}: {out} off, {in} on.'],
    pressure: [
      '{t} are piling on the pressure!',
      '{t} are seeing more of the ball and starting to dominate.',
      'Dangerous moments keep coming in the {t} half.',
    ],
  },
};

export function miscText(key, vars = {}, lang = 'ko') {
  let s = pick(MISC[lang][key]);
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

// 승부차기 결과 한 줄.
export function shootoutLine(teamName, kickerName, ok, hs, as, lang = 'ko') {
  if (lang === 'en') {
    return `${teamName} ${kickerName} ${ok ? 'scores! ⚽' : 'misses… ❌'} (${hs}-${as})`;
  }
  return `${teamName} ${kickerName} ${ok ? '성공! ⚽' : '실축… ❌'} (${hs}-${as})`;
}
