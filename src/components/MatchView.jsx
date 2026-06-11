import React, { useEffect, useState } from 'react';
import { TEAMS } from '../data/teams/index.js';

// 시뮬레이션 결과(이벤트 전체)를 받아 분 단위로 리플레이하는 라이브 중계 화면
export default function MatchView({ result, roundLabel, onFinish }) {
  const home = TEAMS[result.home];
  const away = TEAMS[result.away];
  const maxMinute = result.extraTime ? 120 : 90;
  const soTotal = result.shootout ? result.shootout.log.length : 0;

  const [minute, setMinute] = useState(0);
  const [soCount, setSoCount] = useState(0);

  const playDone = minute >= maxMinute;
  const allDone = playDone && soCount >= soTotal;

  useEffect(() => {
    if (allDone) return undefined;
    const iv = setInterval(
      () => {
        if (!playDone) setMinute((m) => Math.min(maxMinute, m + 1));
        else setSoCount((c) => Math.min(soTotal, c + 1));
      },
      playDone ? 700 : 110
    );
    return () => clearInterval(iv);
  }, [playDone, allDone, maxMinute, soTotal]);

  const skip = () => {
    setMinute(maxMinute);
    setSoCount(soTotal);
  };

  const visible = result.events.filter(
    (e) => e.minute <= minute && (e.type !== 'end' || allDone)
  );
  const hg = result.scorers.filter((s) => s.side === 'home' && s.minute <= minute).length;
  const ag = result.scorers.filter((s) => s.side === 'away' && s.minute <= minute).length;
  const soVisible = result.shootout && playDone ? result.shootout.log.slice(0, soCount) : [];

  const feedItems = [
    ...soVisible.map((t, i) => ({ key: `so${i}`, cls: 'shootout', min: 'PSO', text: t })).reverse(),
    ...visible
      .map((e, i) => ({ key: `e${i}`, cls: e.type, min: `${e.minute}'`, text: e.text }))
      .reverse(),
  ];

  return (
    <div>
      <div className="panel">
        <div style={{ textAlign: 'center', color: 'var(--dim)', fontSize: '0.85rem' }}>{roundLabel}</div>
        <div className="scoreboard">
          <span>{home.flag} {home.name}</span>
          <span className="score">{hg} - {ag}</span>
          <span>{away.name} {away.flag}</span>
        </div>
        {result.shootout && allDone && (
          <div style={{ textAlign: 'center', color: 'var(--gold)', fontWeight: 700 }}>
            승부차기 {result.shootout.homeScore} - {result.shootout.awayScore}
          </div>
        )}
        <div className="clock">
          {allDone ? (result.upset ? '경기 종료 · 🚨 대이변!' : '경기 종료') : playDone ? '승부차기 진행 중…' : `${minute}'`}
        </div>
        <div className="feed">
          {feedItems.map((it) => (
            <div key={it.key} className={`ev ${it.cls}`}>
              <span className="min">{it.min}</span>
              {it.text}
            </div>
          ))}
        </div>
        <div className="match-actions">
          {!allDone && <button className="btn ghost" onClick={skip}>⏩ 결과 바로 보기</button>}
          {allDone && <button className="btn big" onClick={() => onFinish(result)}>계속 →</button>}
        </div>
      </div>
    </div>
  );
}
