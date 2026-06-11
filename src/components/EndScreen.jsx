import React from 'react';
import { TEAMS } from '../data/teams/index.js';
import Bracket from './Bracket.jsx';

export default function EndScreen({ game, onRestart }) {
  const champ = game.champion ? TEAMS[game.champion] : null;
  const iWon = game.champion === game.myTeam;
  const me = TEAMS[game.myTeam];

  return (
    <div>
      <div className="banner">
        <div className="trophy">{iWon ? '🏆' : '🎬'}</div>
        {iWon ? (
          <>
            <h2>{me.flag} {me.name}, 2026 월드컵 우승!</h2>
            <p>당신의 지휘 아래 {me.name}이(가) 세계 정상에 올랐습니다. 역사에 남을 여정이었습니다.</p>
          </>
        ) : (
          <>
            <h2>대회 종료</h2>
            <p>
              {champ && <>우승: {champ.flag} {champ.name} · </>}
              {me.flag} {me.name}의 여정: {game.runSummary}
            </p>
          </>
        )}
        <button className="btn big" onClick={onRestart}>새로운 도전 시작</button>
      </div>
      {game.rounds.length > 0 && (
        <div className="panel">
          <h3 style={{ marginBottom: 10 }}>토너먼트 결과</h3>
          <Bracket rounds={game.rounds} myTeam={game.myTeam} />
        </div>
      )}
    </div>
  );
}
