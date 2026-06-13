import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TEAMS } from '../data/teams/index.js';
import { MENTALITIES, MAX_SUBS } from '../engine/matchEngine.js';
import { mentalityLabel } from '../engine/labels.js';
import { useLang } from '../i18n.jsx';
import Flag from './Flag.jsx';
import CoachChat from './CoachChat.jsx';

function condClass(c) {
  if (c >= 0.9) return 'cond-hot';
  if (c >= 0.8) return 'cond-ok';
  return 'cond-low';
}

// 실시간 경기 화면. match: createMatch()가 반환한 라이브 경기 객체.
export default function MatchView({ match, mySide, roundLabel, onFinish }) {
  const { t, tn, pn, lang } = useLang();
  const [, force] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [benchOpen, setBenchOpen] = useState(false);
  const [pickedOut, setPickedOut] = useState(null);
  const matchRef = useRef(match);

  const m = matchRef.current;
  const done = m.finished;

  useEffect(() => {
    if (done || paused || benchOpen) return undefined;
    const iv = setInterval(() => {
      m.advance();
      force((x) => x + 1);
    }, speed === 1 ? 110 : 35);
    return () => clearInterval(iv);
  }, [done, paused, benchOpen, speed, m]);

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
        ? `[Our tactics] ${mine.formation}, ${mentalityLabel(mine.mentality, 'en')}, subs ${mine.subsUsed}/${MAX_SUBS}`
        : `[우리 전술] 포메이션 ${mine.formation}, 성향 ${mentalityLabel(mine.mentality, 'ko')}, 교체 ${mine.subsUsed}/${MAX_SUBS} 사용`,
      `${en ? '[On the pitch]' : '[필드 위 11명]'} ${mine.eleven.map((p) => `${p.position} ${pn(p)}(${p.overall}/${Math.round(p.condition * 100)}%)`).join(', ')}`,
      `${en ? '[Bench]' : '[벤치]'} ${mine.bench.map((p) => `${p.position} ${pn(p)}(${p.overall}/${Math.round(p.condition * 100)}%)`).join(', ')}`,
      en
        ? 'You can advise on substitutions, mentality changes (attacking/balanced/defensive) and game management.'
        : '교체 추천, 성향 변경(공격적/균형/수비적), 시간 관리 등을 조언할 수 있다.',
    ].join('\n');
  }, [benchOpen, m.minute, lang]); // 패널 열 때 기준으로 갱신

  const clockText = done
    ? result.upset ? t('match.endUpset') : t('match.end')
    : m.minute > 90 ? t('match.extra', { n: m.minute }) : `${m.minute}'`;

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

        <div className="feed">
          {[...m.events].reverse().map((ev, i) => (
            <div key={m.events.length - i} className={`ev ${ev.type}`}>
              <span className="min">{ev.type === 'shootout' ? 'PSO' : `${ev.minute}'`}</span>
              {ev.text}
            </div>
          ))}
        </div>

        <div className="match-actions">
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
                  <button
                    key={p.name}
                    className={`p-row ${pickedOut === p.name ? 'selected' : ''}`}
                    onClick={() => setPickedOut(pickedOut === p.name ? null : p.name)}
                  >
                    <span className={`pos-chip pos-${p.position}`}>{p.position}</span>
                    <span className="p-name">{pn(p)}{p.isStar && <span className="star"> ★</span>}</span>
                    <span className="p-ovr">{p.overall}</span>
                    <span className={`p-cond ${condClass(p.condition)}`}>{Math.round(p.condition * 100)}%</span>
                  </button>
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
                    <button
                      key={p.name}
                      className={`p-row ${dimmed ? 'dimmed' : ''}`}
                      disabled={dimmed}
                      onClick={() => doSub(p.name)}
                    >
                      <span className={`pos-chip pos-${p.position}`}>{p.position}</span>
                      <span className="p-name">{pn(p)}{p.isStar && <span className="star"> ★</span>}</span>
                      <span className="p-ovr">{p.overall}</span>
                      <span className={`p-cond ${condClass(p.condition)}`}>{Math.round(p.condition * 100)}%</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <CoachChat context={coachContext} />
          </div>
        </div>
      )}
    </div>
  );
}
