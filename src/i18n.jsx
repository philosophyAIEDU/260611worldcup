// 다국어(한국어/영어) 지원 — 언어 컨텍스트, 번역 사전, 팀/선수명 헬퍼.
import React, { createContext, useContext, useEffect, useState } from 'react';
import { clubName } from './data/clubNames.js';

const LANG_KEY = 'tactix2026-lang';

export function getStoredLang() {
  try {
    return localStorage.getItem(LANG_KEY) || '';
  } catch {
    return '';
  }
}

function storeLang(l) {
  try {
    if (l) localStorage.setItem(LANG_KEY, l);
  } catch {
    /* ignore */
  }
}

// ── 번역 사전 ──────────────────────────────────────────────────────
// 값은 문자열 또는 vars를 받는 함수. {var} 자리표시자는 자동 치환된다.
const STRINGS = {
  'app.sub': { ko: '2026 FIFA 북중미 월드컵 시뮬레이터', en: '2026 FIFA World Cup Simulator' },
  'app.subUcl': { ko: 'UEFA 챔피언스리그 시뮬레이터', en: 'UEFA Champions League Simulator' },

  // 대회 선택
  'compselect.title': { ko: '대회를 선택하세요', en: 'Choose your competition' },
  'compselect.subtitle': {
    ko: '두 대회 모두 같은 감독 모드로 즐길 수 있습니다. 선택은 저장되며 홈에서 언제든 바꿀 수 있어요.',
    en: 'Both run on the same manager mode. Your choice is saved and you can switch any time from home.',
  },
  'comp.wc': { ko: 'FIFA 월드컵 2026', en: 'FIFA World Cup 2026' },
  'comp.ucl': { ko: 'UEFA 챔피언스리그', en: 'UEFA Champions League' },
  'comp.wcDesc': { ko: '48개국 · 국가대표 토너먼트', en: '48 nations · national teams' },
  'comp.uclDesc': { ko: '유럽 32개 클럽 · 클럽 토너먼트', en: '32 European clubs · club football' },
  'home.changeComp': { ko: '⇄ 다른 대회 선택', en: '⇄ Change competition' },
  'music.play': { ko: '배경음악 재생', en: 'Play background music' },
  'music.pause': { ko: '배경음악 정지', en: 'Pause background music' },
  'music.track': { ko: ({ n }) => `배경음악 ${n}번`, en: ({ n }) => `Track ${n}` },
  'music.bg': { ko: '배경음악', en: 'Background Music' },
  'music.playShort': { ko: '재생', en: 'Play' },
  'music.pauseShort': { ko: '정지', en: 'Pause' },
  'music.trackShort': { ko: ({ n }) => `곡 ${n}`, en: ({ n }) => `Song ${n}` },

  // 언어 선택 화면
  'lang.title': { ko: '언어를 선택하세요', en: 'Choose your language' },
  'lang.subtitle': {
    ko: '같은 게임, 언어만 다릅니다. 선택은 저장되며 상단바에서 언제든 바꿀 수 있어요.',
    en: 'Same game in both — only the language differs. You can switch any time from the top bar.',
  },
  'lang.ko': { ko: '한국어', en: '한국어 (Korean)' },
  'lang.en': { ko: 'English (영어)', en: 'English' },
  'lang.koDesc': { ko: '한국어로 플레이', en: 'Play in Korean' },
  'lang.enDesc': { ko: '영어로 플레이', en: 'Play in English' },
  'lang.switch': { ko: '언어', en: 'Language' },

  // 홈
  'home.tagline': {
    ko: '48개국, 104경기, 단 하나의 트로피.\n선발·전술·교체까지, 당신이 감독입니다.',
    en: '48 nations, 104 matches, one trophy.\nLineups, tactics, substitutions — you are the manager.',
  },
  'home.taglineUcl': {
    ko: '유럽 최강 32개 클럽, 단 하나의 빅이어.\n선발·전술·교체까지, 당신이 감독입니다.',
    en: "Europe's 32 elite clubs, one Big Ear trophy.\nLineups, tactics, substitutions — you are the manager.",
  },
  'home.new': { ko: '새 게임 시작', en: 'New Game' },
  'home.resume': { ko: '이어하기', en: 'Continue' },

  // 공통
  'common.vs': { ko: 'VS', en: 'VS' },
  'common.back': { ko: '← 돌아가기', en: '← Back' },
  'common.toHome': { ko: '처음으로', en: 'Home' },
  'common.eliminated': { ko: '탈락', en: 'Eliminated' },
  'common.tournament': { ko: '토너먼트', en: 'Knockout' },
  'common.fifaRank': { ko: ({ n }) => `FIFA 랭킹 ${n}위`, en: ({ n }) => `FIFA Rank #${n}` },
  'common.clubRank': { ko: ({ n }) => `클럽 랭킹 ${n}위`, en: ({ n }) => `Club Rank #${n}` },

  // 팀 선택
  'select.title': { ko: '국가 선택', en: 'Choose Your Nation' },
  'select.desc': {
    ko: '2026 북중미 월드컵 본선 48개국 중 당신이 이끌 팀을 선택하세요.',
    en: 'Pick one of the 48 nations at the 2026 World Cup to lead.',
  },
  'select.confCount': { ko: ({ label, n }) => `${label} · ${n}개국`, en: ({ label, n }) => `${label} · ${n} teams` },

  // 클럽 선택 (챔피언스리그)
  'clubselect.title': { ko: '클럽 선택', en: 'Choose Your Club' },
  'clubselect.desc': {
    ko: '챔피언스리그에 출전하는 유럽 32개 클럽 중 당신이 이끌 팀을 선택하세요.',
    en: 'Pick one of the 32 European clubs in the Champions League to lead.',
  },
  'league.eng': { ko: '잉글랜드 (프리미어리그)', en: 'England (Premier League)' },
  'league.esp': { ko: '스페인 (라리가)', en: 'Spain (LaLiga)' },
  'league.ita': { ko: '이탈리아 (세리에 A)', en: 'Italy (Serie A)' },
  'league.ger': { ko: '독일 (분데스리가)', en: 'Germany (Bundesliga)' },
  'league.fra': { ko: '프랑스 (리그 1)', en: 'France (Ligue 1)' },
  'league.por': { ko: '포르투갈 (프리메이라 리가)', en: 'Portugal (Primeira Liga)' },
  'league.ned': { ko: '네덜란드 (에레디비시)', en: 'Netherlands (Eredivisie)' },
  'league.tur': { ko: '튀르키예 (쉬페르리그)', en: 'Türkiye (Süper Lig)' },
  'league.sco': { ko: '스코틀랜드 (프리미어십)', en: 'Scotland (Premiership)' },
  'league.bel': { ko: '벨기에 (프로 리그)', en: 'Belgium (Pro League)' },

  // 대륙 연맹
  'conf.UEFA': { ko: '유럽 (UEFA)', en: 'Europe (UEFA)' },
  'conf.CONMEBOL': { ko: '남미 (CONMEBOL)', en: 'South America (CONMEBOL)' },
  'conf.CONCACAF': { ko: '북중미카리브 (CONCACAF)', en: 'North & Central America (CONCACAF)' },
  'conf.CAF': { ko: '아프리카 (CAF)', en: 'Africa (CAF)' },
  'conf.AFC': { ko: '아시아 (AFC)', en: 'Asia (AFC)' },
  'conf.OFC': { ko: '오세아니아 (OFC)', en: 'Oceania (OFC)' },

  // 스쿼드
  'squad.title': { ko: ({ team }) => `${team} 스쿼드`, en: ({ team }) => `${team} Squad` },
  'squad.teamRating': { ko: ({ n }) => `팀 능력치 ${n}`, en: ({ n }) => `Team Rating ${n}` },
  'squad.h.pos': { ko: '포지션', en: 'Pos' },
  'squad.h.name': { ko: '이름', en: 'Name' },
  'squad.h.club': { ko: '소속', en: 'Club' },
  'squad.h.ovr': { ko: '종합', en: 'OVR' },
  'squad.h.pace': { ko: '속도', en: 'PAC' },
  'squad.h.shooting': { ko: '슈팅', en: 'SHO' },
  'squad.h.passing': { ko: '패스', en: 'PAS' },
  'squad.h.defending': { ko: '수비', en: 'DEF' },
  'squad.h.stamina': { ko: '체력', en: 'STA' },
  'squad.star': { ko: '스타플레이어', en: 'Star player' },
  'squad.legend': { ko: '레전드', en: 'Legend' },
  'squad.other': { ko: '다른 팀 보기', en: 'View other teams' },
  'squad.confirm': { ko: '이 팀으로 월드컵 도전 🏆', en: 'Take this team to the World Cup 🏆' },
  'squad.confirmClub': { ko: '이 클럽으로 챔피언스리그 도전 🏆', en: 'Take this club to the Champions League 🏆' },

  // 허브
  'hub.groupBadge': { ko: ({ g, n }) => `조별리그 ${g}조 · ${n}차전`, en: ({ g, n }) => `Group ${g} · Matchday ${n}` },
  'hub.groupStandings': { ko: ({ g }) => `${g}조 순위`, en: ({ g }) => `Group ${g} Standings` },
  'hub.bracket': { ko: '토너먼트 대진표', en: 'Knockout Bracket' },
  'hub.showAll': { ko: '전체 조 순위 보기', en: 'Show all groups' },
  'hub.hideAll': { ko: '전체 조 순위 접기', en: 'Hide all groups' },
  'hub.groupShort': { ko: ({ g }) => `${g}조`, en: ({ g }) => `Group ${g}` },
  'hub.eliminatedMsg': {
    ko: ({ me, summary }) => `${me}의 여정은 여기까지입니다 — ${summary}. 남은 대회를 지켜보시겠습니까?`,
    en: ({ me, summary }) => `${me}'s journey ends here — ${summary}. Watch the rest of the tournament?`,
  },
  'hub.autoSim': { ko: '남은 대회 자동 진행 ⏩', en: 'Auto-play remaining matches ⏩' },
  'hub.stats': { ko: '📊 득점·어시스트 순위', en: '📊 Scorers & Assists' },
  'stats.tab.goals': { ko: '⚽ 득점 순위', en: '⚽ Top Scorers' },
  'stats.tab.assists': { ko: '🎯 어시스트 순위', en: '🎯 Top Assists' },
  'stats.h.player': { ko: '선수', en: 'Player' },
  'stats.h.team': { ko: '팀', en: 'Team' },
  'stats.h.goals': { ko: '득점', en: 'Goals' },
  'stats.h.assists': { ko: '어시스트', en: 'Assists' },
  'stats.noData': { ko: '아직 데이터가 없습니다. 경기를 진행하면 여기에 표시됩니다.', en: 'No data yet — play some matches first.' },

  // 다음 경기
  'fixture.next': { ko: ({ label }) => `다음 경기 · ${label}`, en: ({ label }) => `Next Match · ${label}` },
  'fixture.meta': {
    ko: ({ hr, hrt, ar, art }) => `FIFA 랭킹 ${hr}위 (전력 ${hrt}) vs ${ar}위 (전력 ${art})`,
    en: ({ hr, hrt, ar, art }) => `FIFA #${hr} (rating ${hrt}) vs #${ar} (rating ${art})`,
  },
  'fixture.metaClub': {
    ko: ({ hr, hrt, ar, art }) => `클럽 랭킹 ${hr}위 (전력 ${hrt}) vs ${ar}위 (전력 ${art})`,
    en: ({ hr, hrt, ar, art }) => `Club #${hr} (rating ${hrt}) vs #${ar} (rating ${art})`,
  },
  'fixture.prep': { ko: '📋 경기 준비 (선발·전술)', en: '📋 Prepare Match (lineup & tactics)' },

  // 조별 결과
  'results.line': { ko: ({ n }) => `${n}차전`, en: ({ n }) => `MD${n}` },
  'results.upset': { ko: '🚨 이변!', en: '🚨 Upset!' },

  // 라벨
  'label.group': { ko: ({ g, n }) => `조별리그 ${g}조 ${n}차전`, en: ({ g, n }) => `Group ${g} · Matchday ${n}` },
  'label.ko': { ko: ({ round }) => `토너먼트 ${round}`, en: ({ round }) => `Knockout · ${round}` },
  'label.prep': { ko: ({ label }) => `${label} · 경기 준비`, en: ({ label }) => `${label} · Match Prep` },

  // 라운드 이름
  'round.R32': { ko: '32강', en: 'Round of 32' },
  'round.R16': { ko: '16강', en: 'Round of 16' },
  'round.QF': { ko: '8강', en: 'Quarter-finals' },
  'round.SF': { ko: '준결승', en: 'Semi-finals' },
  'round.F': { ko: '결승', en: 'Final' },

  // 결과 요약
  'summary.group': { ko: ({ g, pos }) => `조별리그 ${g}조 ${pos}위 탈락`, en: ({ g, pos }) => `Eliminated — ${pos}${ord(pos)} in Group ${g}` },
  'summary.ko': { ko: ({ round }) => `${round} 탈락`, en: ({ round }) => `Eliminated in the ${round}` },
  'summary.champion': { ko: '우승', en: 'Champions' },

  // 라인업 화면
  'lineup.board': { ko: '전술 보드', en: 'Tactics Board' },
  'lineup.formation': { ko: '포메이션', en: 'Formation' },
  'lineup.mentality': { ko: '성향', en: 'Mentality' },
  'lineup.playstyle': { ko: '팀 전술', en: 'Team Tactic' },
  'lineup.reset': { ko: '↺ 추천 선발로 초기화', en: '↺ Reset to suggested XI' },
  'lineup.hintPicked': {
    ko: ({ p }) => `${p} 선수와 교체할 벤치의 동일 포지션 선수를 선택하세요.`,
    en: ({ p }) => `Pick a bench player in the same position to swap with ${p}.`,
  },
  'lineup.hintDefault': {
    ko: '선발 선수를 클릭한 뒤 벤치 선수를 클릭하면 교체됩니다. 오늘 컨디션(%)을 확인하세요!',
    en: 'Click a starter, then a bench player to swap them. Check today\'s condition (%)!',
  },
  'lineup.startingXI': { ko: '선발 XI', en: 'Starting XI' },
  'lineup.bench': { ko: ({ n }) => `벤치 (${n}명)`, en: ({ n }) => `Bench (${n})` },
  'lineup.kickoff': { ko: '⚽ 킥오프', en: '⚽ Kick Off' },

  // 경기 화면
  'match.endUpset': { ko: '경기 종료 · 🚨 대이변!', en: 'Full Time · 🚨 Huge Upset!' },
  'match.end': { ko: '경기 종료', en: 'Full Time' },
  'match.extra': { ko: ({ n }) => `연장 ${n}'`, en: ({ n }) => `ET ${n}'` },
  'match.shootout': { ko: ({ h, a }) => `승부차기 ${h} - ${a}`, en: ({ h, a }) => `Penalties ${h} - ${a}` },
  'match.resume': { ko: '▶ 재개', en: '▶ Resume' },
  'match.pause': { ko: '⏸ 일시정지', en: '⏸ Pause' },
  'match.fast': { ko: '⏩ 배속', en: '⏩ Fast' },
  'match.normal': { ko: '▶ 보통 속도', en: '▶ Normal' },
  'match.instructions': { ko: ({ n }) => `🧠 작전 지시 (${n}회 교체 가능)`, en: ({ n }) => `🧠 Instructions (${n} subs left)` },
  'match.skip': { ko: '결과 바로 보기', en: 'Skip to result' },
  'match.sfxOn': { ko: '🔊 효과음', en: '🔊 Sound' },
  'match.sfxOff': { ko: '🔇 효과음', en: '🔇 Muted' },
  'match.continue': { ko: '계속 →', en: 'Continue →' },
  'match.opsTitle': { ko: ({ n }) => `🧠 작전 지시 — ${n}분`, en: ({ n }) => `🧠 Touchline Instructions — ${n}'` },
  'match.close': { ko: '닫기 ✕ (경기 재개)', en: 'Close ✕ (resume)' },
  'match.subsUsed': { ko: ({ a, b }) => `교체 ${a}/${b}`, en: ({ a, b }) => `Subs ${a}/${b}` },
  'match.opsHintPicked': {
    ko: ({ p }) => `${p} → 벤치의 동일 포지션 선수를 선택하면 교체됩니다.`,
    en: ({ p }) => `${p} → pick a same-position bench player to sub.`,
  },
  'match.opsHintDefault': {
    ko: '빼고 싶은 필드 위 선수를 먼저 선택하세요.',
    en: 'First select an on-pitch player to take off.',
  },
  'match.onPitch': { ko: '필드 위 11명', en: 'On the Pitch (XI)' },
  'match.benchTitle': { ko: '벤치', en: 'Bench' },

  // 순위표
  'standings.team': { ko: '팀', en: 'Team' },
  'standings.played': { ko: '경기', en: 'P' },
  'standings.won': { ko: '승', en: 'W' },
  'standings.drawn': { ko: '무', en: 'D' },
  'standings.lost': { ko: '패', en: 'L' },
  'standings.gd': { ko: '득실', en: 'GD' },
  'standings.pts': { ko: '승점', en: 'Pts' },

  // 종료 화면
  'end.championTitle': { ko: ({ me }) => `${me}, 2026 월드컵 우승!`, en: ({ me }) => `${me} — 2026 World Cup Champions!` },
  'end.championDesc': {
    ko: ({ me }) => `당신의 지휘 아래 ${me}이(가) 세계 정상에 올랐습니다. 역사에 남을 여정이었습니다.`,
    en: ({ me }) => `Under your command, ${me} reached the summit of world football. A journey for the history books.`,
  },
  'end.championTitleUcl': { ko: ({ me }) => `${me}, 챔피언스리그 우승!`, en: ({ me }) => `${me} — Champions League Winners!` },
  'end.championDescUcl': {
    ko: ({ me }) => `당신의 지휘 아래 ${me}이(가) 유럽 정상에 올랐습니다. 빅이어가 당신의 것입니다.`,
    en: ({ me }) => `Under your command, ${me} conquered Europe. The Big Ear is yours.`,
  },
  'end.over': { ko: '대회 종료', en: 'Tournament Over' },
  'end.summary': {
    ko: ({ champ, me, summary }) => `우승: ${champ} · ${me}의 여정: ${summary}`,
    en: ({ champ, me, summary }) => `Champions: ${champ} · ${me}'s run: ${summary}`,
  },
  'end.restart': { ko: '새로운 도전 시작', en: 'Start a New Challenge' },
  'end.results': { ko: '토너먼트 결과', en: 'Tournament Results' },

  // AI 수석코치
  'coach.title': { ko: '🎙️ AI 수석코치', en: '🎙️ AI Assistant Coach' },
  'coach.changeKey': { ko: 'API 키 변경', en: 'Change API key' },
  'coach.keyIntro': {
    ko: '전술 상담을 위해 Google Gemini API 키를 입력하세요. 키는 이 브라우저(localStorage)에만 저장되며 외부로 전송되지 않습니다.',
    en: 'Enter your Google Gemini API key for tactical advice. The key is stored only in this browser (localStorage) and never sent anywhere else.',
  },
  'coach.keyPlaceholder': { ko: 'Gemini API 키 (AIza…)', en: 'Gemini API key (AIza…)' },
  'coach.save': { ko: '저장', en: 'Save' },
  'coach.keyHint': {
    ko: '키 발급: Google AI Studio (aistudio.google.com) → Get API key · 사용 모델: gemini-3.1-flash-lite',
    en: 'Get a key: Google AI Studio (aistudio.google.com) → Get API key · Model: gemini-3.1-flash-lite',
  },
  'coach.empty': {
    ko: '상대 분석, 포메이션 추천, 선발 명단 고민… 무엇이든 물어보세요. 코치는 현재 경기 상황과 양 팀 정보를 알고 있습니다.',
    en: 'Opponent analysis, formation ideas, lineup decisions… ask anything. The coach knows the current match and both teams.',
  },
  'coach.thinking': { ko: '전술 보드를 살펴보는 중…', en: 'Studying the tactics board…' },
  'coach.ask': { ko: '코치에게 질문하기…', en: 'Ask the coach…' },
  'coach.send': { ko: '전송', en: 'Send' },
  'coach.error': { ko: ({ m }) => `코치 연결 실패: ${m}`, en: ({ m }) => `Coach connection failed: ${m}` },
  // AI 수석코치 빠른 질문
  'coach.q.scout': { ko: '📊 상대 분석 리포트', en: '📊 Scout the opponent' },
  'coach.q.predict': { ko: '🔮 스코어 예측', en: '🔮 Predict the score' },
  'coach.q.plan': { ko: '🧩 추천 전술', en: '🧩 Suggest a game plan' },
  'coach.p.scout': {
    ko: 'Give me a short scouting report on our opponent: their main threats and one weakness we can exploit.',
    en: 'Give me a short scouting report on our opponent: their main threats and one weakness we can exploit.',
  },
  'coach.p.predict': {
    ko: 'Predict a likely scoreline for this match and explain briefly why.',
    en: 'Predict a likely scoreline for this match and explain briefly why.',
  },
  'coach.p.plan': {
    ko: 'Suggest the best formation and mentality for this match, with a one-line reason for each.',
    en: 'Suggest the best formation and mentality for this match, with a one-line reason for each.',
  },

  // 선수와 대화 (Gemini 페르소나)
  'player.title': { ko: '💬 선수와 대화', en: '💬 Talk to player' },
  'player.intro': {
    ko: '이 선수에게 오늘 컨디션이나 각오를 물어보세요. 선수가 직접 1인칭으로 답합니다.',
    en: 'Ask this player how they feel today or about their mindset — they answer in person.',
  },
  'player.ask': { ko: '선수에게 말 걸기…', en: 'Talk to the player…' },
  'player.thinking': { ko: '(선수가 생각하는 중…)', en: '(the player is thinking…)' },
  'player.cond': { ko: ({ n }) => `오늘 컨디션 ${n}%`, en: ({ n }) => `Today's condition ${n}%` },
  'player.close': { ko: '닫기 ✕', en: 'Close ✕' },
  'player.talkTitle': { ko: '선수와 대화하기', en: 'Talk to this player' },
  'player.q.cond': { ko: '오늘 컨디션 어때요?', en: 'How do you feel today?' },
  'player.q.mind': { ko: '이 경기 각오는?', en: 'Mindset for this match?' },
  'player.q.ready': { ko: '선발 준비 됐나요?', en: 'Ready to start?' },
  'player.p.cond': {
    ko: '오늘 몸 상태가 어때요? 컨디션을 솔직하게 말해줘요.',
    en: 'How is your body feeling today? Tell me honestly about your condition.',
  },
  'player.p.mind': {
    ko: '이번 경기에 대한 각오 한마디 해줘요.',
    en: "What's your mindset going into this match?",
  },
  'player.p.ready': {
    ko: '선발로 뛸 준비가 됐나요?',
    en: 'Are you ready to start this match?',
  },

  // 영어 학습 코치 (Gemini)
  'learn.title': { ko: '📚 AI 영어 코치', en: '📚 AI English Coach' },
  'learn.panelHint': {
    ko: '월드컵을 즐기며 축구 영어를 배워보세요. Gemini가 단어·표현을 가르치고, 당신의 영어를 교정해 줍니다.',
    en: 'Learn football English while you play. Gemini teaches words & phrases and gently corrects your English.',
  },
  'learn.intro': {
    ko: '아래 버튼으로 시작하거나, 영어로 자유롭게 말해보세요. 코치가 친절하게 교정하고 더 자연스러운 표현을 알려줍니다.',
    en: 'Use the buttons below, or just write in English. Your coach will correct you and suggest more natural phrasing.',
  },
  'learn.ask': { ko: '영어로 연습해 보세요…', en: 'Practice in English…' },
  'learn.thinking': { ko: '영어 코치가 생각하는 중…', en: 'Your English coach is thinking…' },
  'learn.q.word': { ko: '⚽ 축구 영어 단어 알려줘', en: '⚽ Teach me a football word' },
  'learn.q.quiz': { ko: '📝 단어 퀴즈 5문제', en: '📝 Quiz me (5 questions)' },
  'learn.q.offside': { ko: '🟨 오프사이드를 쉬운 영어로', en: '🟨 Explain offside in simple English' },
  'learn.q.commentary': { ko: '🎙️ 중계 표현 가르쳐줘', en: '🎙️ Teach me commentary phrases' },
  'learn.p.word': {
    ko: 'Teach me one useful football English word or phrase. Give the meaning, a Korean translation, and an example sentence.',
    en: 'Teach me one useful football English word or phrase. Give the meaning and an example sentence.',
  },
  'learn.p.quiz': {
    ko: 'Give me a 5-question multiple-choice vocabulary quiz about football English. Wait for my answers, then grade them.',
    en: 'Give me a 5-question multiple-choice vocabulary quiz about football English. Wait for my answers, then grade them.',
  },
  'learn.p.offside': {
    ko: 'Explain the offside rule in simple English (CEFR A2-B1). Then give the key vocabulary with Korean translations.',
    en: 'Explain the offside rule in simple English (CEFR A2-B1), then list the key vocabulary.',
  },
  'learn.p.commentary': {
    ko: 'Teach me 5 common live football commentary phrases in English, with what they mean and when commentators say them.',
    en: 'Teach me 5 common live football commentary phrases in English, with meanings and when commentators say them.',
  },

  // 감독 역할 선택 화면
  'role.title': { ko: '감독 역할을 선택하세요', en: 'Choose your manager role' },
  'role.subtitle': {
    ko: '역할에 따라 매 경기 선수들의 컨디션 보정이 달라집니다. 당신의 스타일을 골라 대회 전체에 적용하세요.',
    en: 'Each role gives a different condition bonus to your players every match. Pick your style for the whole tournament.',
  },
  'role.badge': { ko: ({ name }) => `역할: ${name}`, en: ({ name }) => `Role: ${name}` },

  // 팀 토크 (경기 전 동기부여)
  'talk.title': { ko: '🎙️ 감독의 팀 토크', en: '🎙️ Team Talk' },
  'talk.hint': {
    ko: '킥오프 전 한마디로 선수단의 분위기를 끌어올리세요. 선택에 따라 선발진의 컨디션이 달라집니다.',
    en: 'Lift the dressing room before kickoff. Your choice changes your starters\' condition.',
  },

  // 주장
  'lineup.captain': { ko: '주장 (C)', en: 'Captain (C)' },
  'lineup.captainHint': {
    ko: '주장은 컨디션 +6%, 팀 전체에 리더십 +2% 보너스를 줍니다.',
    en: 'The captain gets +6% condition and gives the whole team +2% leadership.',
  },

  // 경기 속도 / 쿼터 휴식
  'speed.label': { ko: '속도', en: 'Speed' },
  'speed.slow': { ko: '🐢 느리게', en: '🐢 Slow' },
  'speed.normal': { ko: '▶ 보통', en: '▶ Normal' },
  'speed.fast': { ko: '⏩ 빠르게', en: '⏩ Fast' },
  'speed.turbo': { ko: '⚡ 매우 빠르게', en: '⚡ Turbo' },
  'match.restOn': { ko: '⏸ 쿼터 휴식 ON', en: '⏸ Breaks ON' },
  'match.restOff': { ko: '⏭ 쿼터 휴식 OFF', en: '⏭ Breaks OFF' },
  'match.skipBreaks': { ko: '⏭ 이후 휴식 없이 진행', en: '⏭ Skip remaining breaks' },
};

function ord(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

// 게임 진행 결과(runResult 구조체)를 현재 언어 문자열로 변환.
// runResult: { type: 'group', g, pos } | { type: 'ko', round } | { type: 'champion' }
export function runSummaryText(t, runResult) {
  if (!runResult) return '';
  if (runResult.type === 'champion') return t('summary.champion');
  if (runResult.type === 'group') return t('summary.group', { g: runResult.g, pos: runResult.pos });
  if (runResult.type === 'ko') return t('summary.ko', { round: t(`round.${runResult.round}`) });
  return '';
}

export function translate(lang, key, vars = {}) {
  const entry = STRINGS[key];
  if (!entry) return key;
  let s = entry[lang] ?? entry.ko ?? key;
  if (typeof s === 'function') return s(vars);
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

// 팀/선수 이름을 현재 언어로 반환
export function teamName(team, lang) {
  if (!team) return '';
  return lang === 'en' ? team.nameEn || team.name : team.name;
}
export function playerName(p, lang) {
  if (!p) return '';
  return lang === 'en' ? p.nameEn || p.name : p.name;
}

// ── 컨텍스트 ───────────────────────────────────────────────────────
const LangContext = createContext({ lang: 'ko', setLang: () => {}, chosen: false });

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => getStoredLang() || 'ko');
  const [chosen, setChosen] = useState(() => !!getStoredLang());

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l) => {
    setLangState(l);
    setChosen(true);
    storeLang(l);
  };

  const t = (key, vars) => translate(lang, key, vars);
  const tn = (team) => teamName(team, lang);
  const pn = (p) => playerName(p, lang);
  const cn = (club) => clubName(club, lang);

  return (
    <LangContext.Provider value={{ lang, setLang, chosen, t, tn, pn, cn }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
