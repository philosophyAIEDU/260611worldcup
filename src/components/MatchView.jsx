import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TEAMS } from '../data/teams/index.js';
import { MENTALITIES, MAX_SUBS } from '../engine/matchEngine.js';
import Flag from './Flag.jsx';
import CoachChat from './CoachChat.jsx';

function condClass(c) {
  if (c >= 0.9) return 'cond-hot';
  if (c >= 0.8) return 'cond-ok';
  return 'cond-low';
}

// 실시간 경기 화면. match: createMatch()가 반환한 라이브 경기 객체.
export default function MatchView({ match, mySide, roundLabel, onFinish }) {
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
    return [
      `당신은 축구 게임 "TACTIX 2026"에서 ${mine.team.name} 대표팀의 AI 수석코치다. 경기 중 작전타임이다. 감독(사용자)에게 한국어로 간결하고 실전적으로 조언하라.`,
      `[상황] ${roundLabel}, 현재 ${m.minute}분, 스코어 ${mine.team.name} ${myGoals} - ${oppGoals} ${opp.name}`,
      `[우리 전술] 포메이션 ${mine.formation}, 성향 ${MENTALITIES[mine.mentality].label}, 교체 ${mine.subsUsed}/${MAX_SUBS} 사용`,
      `[필드 위 11명] ${mine.eleven.map((p) => `${p.position} ${p.name}(${p.overall}/${Math.round(p.condition * 100)}%)`).join(', ')}`,
      `[벤치] ${mine.bench.map((p) => `${p.position} ${p.name}(${p.overall}/${Math.round(p.condition * 100)}%)`).join(', ')}`,
      '교체 추천, 성향 변경(공격적/균형/수비적), 시간 관리 등을 조언할 수 있다.',
    ].join('\n');
  }, [benchOpen, m.minute]); // 패널 열 때 기준으로 갱신

  const clockText = done
    ? result.upset ? '경기 종료 · 🚨 대이변!' : '경기 종료'
    : m.minute > 90 ? `연장 ${m.minute}'` : `${m.minute}'`;

  return (
    <div>
      <div className="panel">
        <div className="matchup-label">{roundLabel}</div>
        <div className="scoreboard">
          <span><Flag code={home.code} size={30} /> {home.name}</span>
          <span className="score">{m.hg} - {m.ag}</span>
          <span>{away.name} <Flag code={away.code} size={30} /></span>
        </div>
        {m.shootout && done && (
          <div className="pso-line">승부차기 {m.shootout.homeScore} - {m.shootout.awayScore}</div>
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
                {paused ? '▶ 재개' : '⏸ 일시정지'}
              </button>
              <button className="btn ghost" onClick={() => setSpeed(speed === 1 ? 3 : 1)}>
                {speed === 1 ? '⏩ 배속' : '▶ 보통 속도'}
              </button>
              {mine && (
                <button className="btn" onClick={() => setBenchOpen(true)}>
                  🧠 작전 지시 ({MAX_SUBS - mine.subsUsed}회 교체 가능)
                </button>
              )}
              <button className="btn ghost" onClick={skip}>결과 바로 보기</button>
            </>
          )}
          {done && <button className="btn big" onClick={() => onFinish(result)}>계속 →</button>}
        </div>
      </div>

      {benchOpen && mine && (
        <div className="panel bench-panel">
          <div className="coach-head">
            <span>🧠 작전 지시 — {m.minute}분</span>
            <button className="link-btn" onClick={() => { setBenchOpen(false); setPickedOut(null); }}>
              닫기 ✕ (경기 재개)
            </button>
          </div>

          <div className="tactic-row">
            <span className="tactic-title">성향</span>
            {Object.entries(MENTALITIES).map(([k, v]) => (
              <button
                key={k}
                className={`chip ${mine.mentality === k ? 'active' : ''}`}
                onClick={() => { m.setMentality(mySide, k); force((x) => x + 1); }}
              >
                {v.label}
              </button>
            ))}
            <span className="badge">교체 {mine.subsUsed}/{MAX_SUBS}</span>
          </div>

          <p className="hint">
            {pickedOut
              ? `${pickedOut} → 벤치의 동일 포지션 선수를 선택하면 교체됩니다.`
              : '빼고 싶은 필드 위 선수를 먼저 선택하세요.'}
          </p>

          <div className="grid2">
            <div>
              <h3>필드 위 11명</h3>
              <div className="p-list">
                {mine.eleven.map((p) => (
                  <button
                    key={p.name}
                    className={`p-row ${pickedOut === p.name ? 'selected' : ''}`}
                    onClick={() => setPickedOut(pickedOut === p.name ? null : p.name)}
                  >
                    <span className={`pos-chip pos-${p.position}`}>{p.position}</span>
                    <span className="p-name">{p.name}{p.isStar && <span className="star"> ★</span>}</span>
                    <span className="p-ovr">{p.overall}</span>
                    <span className={`p-cond ${condClass(p.condition)}`}>{Math.round(p.condition * 100)}%</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3>벤치</h3>
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
                      <span className="p-name">{p.name}{p.isStar && <span className="star"> ★</span>}</span>
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
