import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TEAMS } from '../data/teams/index.js';
import { FORMATIONS, MENTALITIES, PLAYSTYLES, MAX_SUBS } from '../engine/matchEngine.js';
import { formationLabel, mentalityLabel, playstyleLabel, posLabel } from '../engine/labels.js';
import { useLang } from '../i18n.jsx';
import Flag from './Flag.jsx';
import CoachChat from './CoachChat.jsx';
import PlayerChat from './PlayerChat.jsx';
import { isSfxOn, setSfxOn, playEventSound, playFinalWhistle, startAmbience, stopAmbience } from '../engine/sfx.js';
import { askCoach, getApiKey } from '../engine/aiCoach.js';

function condClass(c) {
  if (c >= 0.9) return 'cond-hot';
  if (c >= 0.8) return 'cond-ok';
  return 'cond-low';
}

// 분 → 쿼터 (1-23 Q1, 24-45 Q2, 46-68 Q3, 69-90 Q4)
function quarterOf(minute) {
  if (minute <= 23) return 1;
  if (minute <= 45) return 2;
  if (minute <= 68) return 3;
  return 4;
}

// 실시간 경기 화면. match: createMatch()가 반환한 라이브 경기 객체.
export default function MatchView({ match, mySide, roundLabel, onFinish }) {
  const { t, tn, pn, lang } = useLang();
  const [, force] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [benchOpen, setBenchOpen] = useState(false);
  const [pickedOut, setPickedOut] = useState(null);
  const [chatPlayer, setChatPlayer] = useState(null);
  const [sfxOn, setSfx] = useState(isSfxOn());
  const [quarterMsg, setQuarterMsg] = useState(null); // { q, text }
  const quartersFired = useRef(new Set());
  const [dangerAlert, setDangerAlert] = useState(null);
  const recentGoalsRef = useRef({ home: 0, away: 0, lastMin: 0 });
  const [subAlert, setSubAlert] = useState(null);
  const subAlertFired = useRef(new Set());
  const [penaltyAdvice, setPenaltyAdvice] = useState(null);
  const penaltyFired = useRef(false);
  const [postMatch, setPostMatch] = useState(null); // { summary, mvpName, interview }
  const postMatchFired = useRef(false);
  const matchRef = useRef(match);
  const seenEvents = useRef(match.events.length);

  const m = matchRef.current;
  const done = m.finished;

  // 새로 생긴 경기 이벤트마다 효과음 재생. 대량 추가(결과 바로 보기/승부차기)는 휘슬만.
  useEffect(() => {
    const evs = m.events;
    if (seenEvents.current >= evs.length) return;
    const fresh = evs.slice(seenEvents.current);
    seenEvents.current = evs.length;
    if (fresh.length > 4) {
      if (fresh.some((e) => e.type === 'end')) playFinalWhistle();
    } else {
      fresh.forEach(playEventSound);
    }
  });

  // 경기 진행 중 관중 앰비언스 루프. 종료/음소거 시 정지.
  useEffect(() => {
    if (!done && sfxOn) startAmbience();
    else stopAmbience();
    return () => stopAmbience();
  }, [done, sfxOn]);

  useEffect(() => {
    if (done || paused || benchOpen) return undefined;
    const iv = setInterval(() => {
      m.advance();
      force((x) => x + 1);
      // 쿼터 종료 AI 분석 (Q1=23', Q2=45', Q3=68', Q4=90')
      const QUARTER_MINS = { 1: 23, 2: 45, 3: 68, 4: 90 };
      if (mine) {
        const key = getApiKey();
        if (key) {
          for (const [q, endMin] of Object.entries(QUARTER_MINS)) {
            if (m.minute === endMin && !quartersFired.current.has(q)) {
              quartersFired.current.add(q);
              const myGoals = mySide === 'home' ? m.hg : m.ag;
              const oppGoals = mySide === 'home' ? m.ag : m.hg;
              const opp = mySide === 'home' ? TEAMS[m.awayTeam.code] : TEAMS[m.homeTeam.code];
              const en = lang === 'en';
              const qLabel = en ? `Q${q} end (${endMin}')` : `${q}쿼터 종료 (${endMin}분)`;
              const ctx = en
                ? `You are a football AI coach. ${qLabel}. Score: ${myGoals}-${oppGoals} vs ${opp.nameEn || opp.name}. Formation: ${mine.formation}, mentality: ${mentalityLabel(mine.mentality,'en')}, subs used: ${mine.subsUsed}/${MAX_SUBS}. Give 2 sharp tactical tips for the next quarter in plain text, max 55 words.`
                : `당신은 축구 AI 코치다. ${qLabel}. 스코어 ${myGoals}-${oppGoals} (상대: ${opp.name}). 포메이션: ${mine.formation}, 성향: ${mentalityLabel(mine.mentality,'ko')}, 교체 ${mine.subsUsed}/${MAX_SUBS}. 다음 쿼터 전술 조언 2가지를 간결한 한국어로.`;
              const qNum = Number(q);
              askCoach(key, ctx, [{ role: 'user', text: en ? `Q${q} advice?` : `${q}쿼터 조언?` }])
                .then((msg) => setQuarterMsg({ q: qNum, text: msg }))
                .catch(() => {});
              break;
            }
          }
        }
      }
      // 위기 감지: 상대가 최근 10분 이내에 2골 이상 → 위기 경보
      if (mine && !dangerAlert) {
        const myGoals = mySide === 'home' ? m.hg : m.ag;
        const oppGoals = mySide === 'home' ? m.ag : m.hg;
        const prev = recentGoalsRef.current;
        if (prev.lastMin > 0 && m.minute - prev.lastMin <= 10) {
          const oppScored = oppGoals - (mySide === 'home' ? prev.away : prev.home);
          if (oppScored >= 2) {
            const en = lang === 'en';
            setDangerAlert(en ? `⚠️ Opponent scored ${oppScored} goals in 10 minutes! Consider switching to more attacking mentality or making substitutions.` : `⚠️ 상대가 10분 내에 ${oppScored}골을 넣었습니다! 성향을 공격적으로 바꾸거나 교체를 고려하세요.`);
          }
        }
        recentGoalsRef.current = { home: m.hg, away: m.ag, lastMin: m.minute };
      }
      // 교체 추천: 70분 이후 컨디션 낮은 선수 감지
      if (mine && m.minute >= 70 && mine.subsUsed < MAX_SUBS) {
        const tired = mine.eleven.find(
          (p) => p.position !== 'GK' && p.condition < 0.75 && !subAlertFired.current.has(p.name)
        );
        if (tired) {
          const sub = mine.bench.find((b) => b.position === tired.position);
          if (sub) {
            subAlertFired.current.add(tired.name);
            const en = lang === 'en';
            setSubAlert(en
              ? `🔄 ${pn(tired)} (${Math.round(tired.condition * 100)}% condition) looks tired — consider substituting with ${pn(sub)}.`
              : `🔄 ${pn(tired)} 컨디션이 ${Math.round(tired.condition * 100)}%로 저하됐습니다. 벤치의 ${pn(sub)}(으)로 교체를 고려하세요.`
            );
          }
        }
      }
      // 승부차기 전 AI 심리전 조언 (90분 무승부 knockout 경기)
      if (mine && !penaltyFired.current && m.minute >= 90 && m.hg === m.ag && m.knockout) {
        penaltyFired.current = true;
        const key = getApiKey();
        if (key) {
          const opp = mySide === 'home' ? TEAMS[m.awayTeam.code] : TEAMS[m.homeTeam.code];
          const en = lang === 'en';
          const ctx = en
            ? `You are a football AI coach. The match is tied after 90 minutes and heading to extra time / penalties. Opponent: ${opp.nameEn || opp.name} (FIFA #${opp.ranking}). Give 2 sharp psychological & tactical tips for extra time or penalty shootout. Plain text, max 60 words.`
            : `당신은 축구 AI 코치다. 90분 무승부, 연장 또는 승부차기로 향한다. 상대: ${opp.name}(FIFA ${opp.ranking}위). 승부차기·연장 대비 심리전 & 전술 조언 2가지를 간결한 한국어로.`;
          askCoach(key, ctx, [{ role: 'user', text: en ? 'Penalty/ET advice?' : '승부차기·연장 조언?' }])
            .then((msg) => setPenaltyAdvice(msg))
            .catch(() => {});
        }
      }
    }, speed === 1 ? 220 : 70);
    return () => clearInterval(iv);
  }, [done, paused, benchOpen, speed, m, lang, mine, mySide]);

  // 경기 종료 후 AI 총평 + MVP 인터뷰 자동 생성
  useEffect(() => {
    if (!done || postMatchFired.current || !mySide) return;
    const key = getApiKey();
    if (!key) return;
    postMatchFired.current = true;
    const myGoals = mySide === 'home' ? m.hg : m.ag;
    const oppGoals = mySide === 'home' ? m.ag : m.hg;
    const opp = mySide === 'home' ? TEAMS[m.awayTeam.code] : TEAMS[m.homeTeam.code];
    const mine2 = m[mySide];
    // MVP 선정: 우리 팀 득점자 중 최다골, 없으면 선발 최고 OVR
    const myScorers = m.scorers.filter((s) => s.side === mySide);
    let mvpName = null; let mvpNameEn = null;
    if (myScorers.length > 0) {
      const counts = {};
      myScorers.forEach((s) => { counts[s.name] = (counts[s.name] || 0) + 1; });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      const p = mine2.eleven.find((x) => x.name === top) || mine2.bench.find((x) => x.name === top);
      if (p) { mvpName = p.name; mvpNameEn = p.nameEn; }
    }
    if (!mvpName) {
      const best = [...mine2.eleven].sort((a, b) => b.overall - a.overall)[0];
      if (best) { mvpName = best.name; mvpNameEn = best.nameEn; }
    }
    const en = lang === 'en';
    const mvpDisplay = en ? (mvpNameEn || mvpName) : mvpName;
    const summaryCtx = en
      ? `You are a football AI analyst. The match just ended: ${tn(mine2.team)} ${myGoals} - ${oppGoals} ${tn(opp)}. In 2-3 sentences, summarize the match tactically and name ${mvpDisplay} as your MVP with one reason. Plain text only.`
      : `당신은 축구 AI 분석가다. 방금 경기가 끝났다: ${tn(mine2.team)} ${myGoals} - ${oppGoals} ${tn(opp)}. 경기를 전술적으로 2~3문장 요약하고, MVP로 ${mvpDisplay}을(를) 선정한 이유를 한 문장으로 밝혀라. 평문으로.`;
    const interviewCtx = en
      ? `You ARE ${mvpDisplay}, a football player who just played for ${tn(mine2.team)} in a ${myGoals}-${oppGoals} match vs ${tn(opp)} at the 2026 World Cup. Stay fully in character. Answer the post-match interview question in 2-3 natural sentences as the player.`
      : `너는 2026 월드컵에서 ${tn(mine2.team)} 소속으로 ${tn(opp)}와의 ${myGoals}-${oppGoals} 경기를 뛴 ${mvpDisplay} 선수다. 완전히 1인칭으로 캐릭터를 유지하라. 경기 후 인터뷰 질문에 2~3문장으로 자연스럽게 답하라.`;
    const interviewQ = en ? 'How do you feel about your performance today?' : '오늘 경기 소감이 어떠세요?';

    Promise.all([
      askCoach(key, summaryCtx, [{ role: 'user', text: en ? 'Match summary?' : '경기 총평?' }]),
      askCoach(key, interviewCtx, [{ role: 'user', text: interviewQ }]),
    ]).then(([summary, interview]) => {
      setPostMatch({ summary, mvpName: mvpDisplay, interview });
    }).catch(() => {});
  }, [done]);

  const skip = () => {
    while (!m.finished) m.advance();
    force((x) => x + 1);
  };

  const home = TEAMS[m.homeTeam.code];
  const away = TEAMS[m.awayTeam.code];
  const mine = mySide ? m[mySide] : null;
  const result = done ? m.result() : null;

  const doSub = (inName) => {
    if (!pickedOut) return;
    m.makeSub(mySide, pickedOut, inName);
    setPickedOut(null);
    force((x) => x + 1);
  };

  const coachContext = useMemo(() => {
    if (!mine) return '';
    const myGoals = mySide === 'home' ? m.hg : m.ag;
    const oppGoals = mySide === 'home' ? m.ag : m.hg;
    const opp = mySide === 'home' ? away : home;
    const en = lang === 'en';
    return [
      en
        ? `You are the AI assistant coach of ${tn(mine.team)} in the football game "TACTIX 2026". It is a touchline timeout during the match. Advise the manager in concise, practical English.`
        : `당신은 축구 게임 "TACTIX 2026"에서 ${tn(mine.team)} 대표팀의 AI 수석코치다. 경기 중 작전타임이다. 감독(사용자)에게 한국어로 간결하고 실전적으로 조언하라.`,
      en
        ? `[Situation] ${roundLabel}, ${m.minute}', score ${tn(mine.team)} ${myGoals} - ${oppGoals} ${tn(opp)}`
        : `[상황] ${roundLabel}, 현재 ${m.minute}분, 스코어 ${tn(mine.team)} ${myGoals} - ${oppGoals} ${tn(opp)}`,
      en
        ? `[Our tactics] ${mine.formation}, ${mentalityLabel(mine.mentality, 'en')}, ${playstyleLabel(mine.playstyle, 'en')}, subs ${mine.subsUsed}/${MAX_SUBS}`
        : `[우리 전술] 포메이션 ${mine.formation}, 성향 ${mentalityLabel(mine.mentality, 'ko')}, 팀전술 ${playstyleLabel(mine.playstyle, 'ko')}, 교체 ${mine.subsUsed}/${MAX_SUBS} 사용`,
      `${en ? '[On the pitch]' : '[필드 위 11명]'} ${mine.eleven.map((p) => `${p.position} ${pn(p)}(${p.overall}/${Math.round(p.condition * 100)}%)`).join(', ')}`,
      `${en ? '[Bench]' : '[벤치]'} ${mine.bench.map((p) => `${p.position} ${pn(p)}(${p.overall}/${Math.round(p.condition * 100)}%)`).join(', ')}`,
      en
        ? 'You can advise on substitutions, mentality changes (attacking/balanced/defensive) and game management.'
        : '교체 추천, 성향 변경(공격적/균형/수비적), 시간 관리 등을 조언할 수 있다.',
    ].join('\n');
  }, [benchOpen, m.minute, lang]); // 패널 열 때 기준으로 갱신

  // 쿼터별 골 통계 (경기 종료 후 표시)
  const quarterStats = useMemo(() => {
    const qs = [
      { label: 'Q1', range: [1, 23] }, { label: 'Q2', range: [24, 45] },
      { label: 'Q3', range: [46, 68] }, { label: 'Q4', range: [69, 120] },
    ];
    return qs.map(({ label, range: [lo, hi] }) => {
      const evs = m.events.filter((e) => e.minute >= lo && e.minute <= hi);
      const hg = evs.filter((e) => e.type === 'goal' && e.side === 'home').length;
      const ag = evs.filter((e) => e.type === 'goal' && e.side === 'away').length;
      const hc = evs.filter((e) => (e.type === 'chance' || e.type === 'save') && e.side === 'home').length;
      const ac = evs.filter((e) => (e.type === 'chance' || e.type === 'save') && e.side === 'away').length;
      return { label, hg, ag, hc, ac };
    });
  }, [done, m.events.length]);

  // 최근 20개 이벤트 기준 모멘텀 계산 (goal=3, chance/save=2, pressure=1)
  const momentum = useMemo(() => {
    const recent = m.events.slice(-20);
    let h = 0; let a = 0;
    recent.forEach((ev) => {
      const w = ev.type === 'goal' ? 3 : (ev.type === 'chance' || ev.type === 'save') ? 2 : ev.type === 'pressure' ? 1 : 0;
      if (ev.side === 'home') h += w; else a += w;
    });
    const total = h + a;
    return total === 0 ? 50 : Math.round((h / total) * 100);
  }, [m.events.length]);

  const clockText = done
    ? result.upset ? t('match.endUpset') : t('match.end')
    : m.minute > 90
      ? t('match.extra', { n: m.minute })
      : `Q${quarterOf(m.minute)} · ${m.minute}'`;

  return (
    <div>
      <div className="panel">
        <div className="matchup-label">{roundLabel}</div>
        <div className="scoreboard">
          <span><Flag code={home.code} size={30} /> {tn(home)}</span>
          <span className="score">{m.hg} - {m.ag}</span>
          <span>{tn(away)} <Flag code={away.code} size={30} /></span>
        </div>
        {m.shootout && done && (
          <div className="pso-line">{t('match.shootout', { h: m.shootout.homeScore, a: m.shootout.awayScore })}</div>
        )}
        <div className="clock">{clockText}</div>

        {!done && m.minute > 0 && (
          <div className="momentum-wrap">
            <span className="momentum-label">{tn(home)}</span>
            <div className="momentum-bar">
              <div className="momentum-fill home" style={{ width: `${momentum}%` }} />
              <div className="momentum-fill away" style={{ width: `${100 - momentum}%` }} />
            </div>
            <span className="momentum-label">{tn(away)}</span>
          </div>
        )}

        {quarterMsg && (
          <div className="halftime-ai">
            <span className="halftime-ai-title">
              🎙️ {lang === 'en' ? `Q${quarterMsg.q} AI Coaching` : `AI ${quarterMsg.q}쿼터 코칭`}
            </span>
            <p>{quarterMsg.text}</p>
            <button className="link-btn" onClick={() => setQuarterMsg(null)}>✕</button>
          </div>
        )}
        {dangerAlert && (
          <div className="halftime-ai danger-alert">
            <p>{dangerAlert}</p>
            <button className="link-btn" onClick={() => setDangerAlert(null)}>✕</button>
          </div>
        )}
        {subAlert && (
          <div className="halftime-ai sub-alert">
            <p>{subAlert}</p>
            <button className="link-btn" onClick={() => setSubAlert(null)}>✕</button>
          </div>
        )}
        {penaltyAdvice && (
          <div className="halftime-ai penalty-alert">
            <span className="halftime-ai-title">⚡ {lang === 'en' ? 'Penalty / Extra Time Strategy' : '승부차기·연장 전략'}</span>
            <p>{penaltyAdvice}</p>
            <button className="link-btn" onClick={() => setPenaltyAdvice(null)}>✕</button>
          </div>
        )}

        <div className="feed">
          {[...m.events].reverse().map((ev, i) => (
            <div key={m.events.length - i} className={`ev ${ev.type}`}>
              <span className="min">{ev.type === 'shootout' ? 'PSO' : `${ev.minute}'`}</span>
              {ev.text}
            </div>
          ))}
        </div>

        <div className="match-actions">
          <button
            className="btn ghost"
            onClick={() => { const v = !sfxOn; setSfx(v); setSfxOn(v); }}
            title={t(sfxOn ? 'match.sfxOn' : 'match.sfxOff')}
          >
            {t(sfxOn ? 'match.sfxOn' : 'match.sfxOff')}
          </button>
          {!done && (
            <>
              <button className="btn ghost" onClick={() => setPaused((p) => !p)}>
                {paused ? t('match.resume') : t('match.pause')}
              </button>
              <button className="btn ghost" onClick={() => setSpeed(speed === 1 ? 3 : 1)}>
                {speed === 1 ? t('match.fast') : t('match.normal')}
              </button>
              {mine && (
                <button className="btn" onClick={() => setBenchOpen(true)}>
                  {t('match.instructions', { n: MAX_SUBS - mine.subsUsed })}
                </button>
              )}
              <button className="btn ghost" onClick={skip}>{t('match.skip')}</button>
            </>
          )}
          {done && <button className="btn big" onClick={() => onFinish(result)}>{t('match.continue')}</button>}
        </div>

        {done && (
          <div className="quarter-chart">
            <div className="quarter-chart-title">{lang === 'en' ? '📊 Quarter Stats' : '📊 쿼터별 통계'}</div>
            <div className="quarter-chart-grid">
              {quarterStats.map(({ label, hg, ag, hc, ac }) => (
                <div key={label} className="quarter-col">
                  <div className="quarter-label">{label}</div>
                  <div className="quarter-goals">{hg} : {ag}</div>
                  <div className="quarter-chances">{lang === 'en' ? `${hc}ch / ${ac}ch` : `찬스 ${hc}/${ac}`}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {done && postMatch && (
          <div className="post-match-panel">
            <div className="post-match-summary">
              <span className="halftime-ai-title">📋 {lang === 'en' ? 'Match Report' : 'AI 경기 총평'}</span>
              <p>{postMatch.summary}</p>
            </div>
            <div className="mvp-interview">
              <span className="mvp-badge">🏅 MVP · {postMatch.mvpName}</span>
              <p className="mvp-quote">"{postMatch.interview}"</p>
            </div>
          </div>
        )}
        {done && !postMatch && mySide && getApiKey() && (
          <div className="halftime-ai" style={{ textAlign: 'center', color: 'var(--dim)' }}>
            <p>🎙️ {lang === 'en' ? 'Generating match report & MVP interview…' : 'AI 경기 총평 & MVP 인터뷰 생성 중…'}</p>
          </div>
        )}
      </div>

      {benchOpen && mine && (
        <div className="panel bench-panel">
          <div className="coach-head">
            <span>{t('match.opsTitle', { n: m.minute })}</span>
            <button className="link-btn" onClick={() => { setBenchOpen(false); setPickedOut(null); }}>
              {t('match.close')}
            </button>
          </div>

          <div className="tactic-row">
            <span className="tactic-title">{t('lineup.formation')}</span>
            {Object.keys(FORMATIONS).map((f) => (
              <button
                key={f}
                className={`chip ${mine.formation === f ? 'active' : ''}`}
                title={formationLabel(f, lang)}
                onClick={() => { m.setFormation(mySide, f); force((x) => x + 1); }}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="tactic-row">
            <span className="tactic-title">{t('lineup.mentality')}</span>
            {Object.keys(MENTALITIES).map((k) => (
              <button
                key={k}
                className={`chip ${mine.mentality === k ? 'active' : ''}`}
                onClick={() => { m.setMentality(mySide, k); force((x) => x + 1); }}
              >
                {mentalityLabel(k, lang)}
              </button>
            ))}
            <span className="badge">{t('match.subsUsed', { a: mine.subsUsed, b: MAX_SUBS })}</span>
          </div>
          <div className="tactic-row">
            <span className="tactic-title">{t('lineup.playstyle')}</span>
            {Object.keys(PLAYSTYLES).map((k) => (
              <button
                key={k}
                className={`chip ${mine.playstyle === k ? 'active' : ''}`}
                onClick={() => { m.setPlaystyle(mySide, k); force((x) => x + 1); }}
              >
                {playstyleLabel(k, lang)}
              </button>
            ))}
          </div>

          <p className="hint">
            {pickedOut
              ? t('match.opsHintPicked', { p: pn(mine.eleven.find((x) => x.name === pickedOut)) })
              : t('match.opsHintDefault')}
          </p>

          <div className="grid2">
            <div>
              <h3>{t('match.onPitch')}</h3>
              <div className="p-list">
                {mine.eleven.map((p) => (
                  <div className="p-row-wrap" key={p.name}>
                    <button
                      className={`p-row ${pickedOut === p.name ? 'selected' : ''}`}
                      onClick={() => setPickedOut(pickedOut === p.name ? null : p.name)}
                    >
                      <span className={`pos-chip pos-${p.position}`}>{posLabel(p, mine.eleven)}</span>
                      <span className="p-name">{pn(p)}{p.isStar && <span className="star"> ★</span>}</span>
                      <span className="p-ovr">{p.overall}</span>
                      <span className={`p-cond ${condClass(p.condition)}`}>{Math.round(p.condition * 100)}%</span>
                    </button>
                    <button className="p-chat-btn" title={t('player.talkTitle')} onClick={() => setChatPlayer(p)}>💬</button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3>{t('match.benchTitle')}</h3>
              <div className="p-list">
                {mine.bench.map((p) => {
                  const pickedP = pickedOut ? mine.eleven.find((x) => x.name === pickedOut) : null;
                  const dimmed = mine.subsUsed >= MAX_SUBS || (pickedP && p.position !== pickedP.position);
                  return (
                    <div className={`p-row-wrap ${dimmed ? 'dimmed' : ''}`} key={p.name}>
                      <button
                        className="p-row"
                        disabled={dimmed}
                        onClick={() => doSub(p.name)}
                      >
                        <span className={`pos-chip pos-${p.position}`}>{p.position}</span>
                        <span className="p-name">{pn(p)}{p.isStar && <span className="star"> ★</span>}</span>
                        <span className="p-ovr">{p.overall}</span>
                        <span className={`p-cond ${condClass(p.condition)}`}>{Math.round(p.condition * 100)}%</span>
                      </button>
                      <button className="p-chat-btn" title={t('player.talkTitle')} onClick={() => setChatPlayer(p)}>💬</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <CoachChat
              context={coachContext}
              quickPrompts={[
                { label: t('coach.q.plan'), prompt: t('coach.p.plan') },
                { label: t('coach.q.scout'), prompt: t('coach.p.scout') },
              ]}
            />
          </div>
        </div>
      )}

      {chatPlayer && mine && (
        <PlayerChat
          player={chatPlayer}
          team={mine.team}
          opp={mySide === 'home' ? away : home}
          label={roundLabel}
          onClose={() => setChatPlayer(null)}
        />
      )}
    </div>
  );
}
