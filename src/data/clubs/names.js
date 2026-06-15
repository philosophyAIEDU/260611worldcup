// 클럽 스쿼드 보강용 가공(필러) 선수 이름 풀.
// 국가대표 데이터에서 추출한 실제 선수로 채운 뒤, 부족한 포지션을 이 풀의 이름으로 보강한다.
// 코드/인덱스로 결정론적으로 뽑아 매번 동일한 선수가 생성되도록 한다.

export const FIRST_NAMES = [
  ['루카스', 'Lucas'], ['마르코', 'Marco'], ['디에고', 'Diego'], ['안드레', 'Andre'],
  ['파블로', 'Pablo'], ['마티아스', 'Matias'], ['토마스', 'Tomas'], ['니콜라스', 'Nicolas'],
  ['다니엘', 'Daniel'], ['가브리엘', 'Gabriel'], ['세르히오', 'Sergio'], ['알렉스', 'Alex'],
  ['브루노', 'Bruno'], ['후안', 'Juan'], ['엔초', 'Enzo'], ['레오', 'Leo'],
  ['막스', 'Max'], ['얀', 'Jan'], ['핀', 'Finn'], ['루벤', 'Ruben'],
  ['마르탱', 'Martin'], ['클레망', 'Clement'], ['테오', 'Theo'], ['위고', 'Hugo'],
  ['스테판', 'Stefan'], ['루카', 'Luka'], ['이반', 'Ivan'], ['미르코', 'Mirko'],
  ['에밀', 'Emil'], ['오스카르', 'Oscar'], ['빅토르', 'Viktor'], ['필립', 'Filip'],
];

export const LAST_NAMES = [
  ['실바', 'Silva'], ['페레이라', 'Pereira'], ['로페스', 'Lopez'], ['가르시아', 'Garcia'],
  ['모레노', 'Moreno'], ['로시', 'Rossi'], ['콘티', 'Conti'], ['페라리', 'Ferrari'],
  ['뮐러', 'Muller'], ['바그너', 'Wagner'], ['슈미트', 'Schmidt'], ['베버', 'Weber'],
  ['뒤랑', 'Durand'], ['모로', 'Moreau'], ['르페브르', 'Lefevre'], ['지라르', 'Girard'],
  ['스미스', 'Smith'], ['브라운', 'Brown'], ['클라크', 'Clarke'], ['워커', 'Walker'],
  ['더용', 'de Jong'], ['바커르', 'Bakker'], ['피서르', 'Visser'], ['멀더르', 'Mulder'],
  ['노바크', 'Novak'], ['호르바트', 'Horvat'], ['코바치', 'Kovac'], ['마르코비치', 'Markovic'],
  ['얀센', 'Jansen'], ['닐손', 'Nilsson'], ['린드', 'Lind'], ['아흐메드', 'Ahmed'],
];
