import React from 'react';
import { TEAMS } from '../data/teams/index.js';
import Flag from './Flag.jsx';

const POS_ORDER = { GK: 0, DF: 1, MF: 2, FW: 3 };

export default function SquadView({ teamCode, onConfirm, onBack }) {
  const team = TEAMS[teamCode];
  const players = [...team.players].sort(
    (a, b) => POS_ORDER[a.position] - POS_ORDER[b.position] || b.overall - a.overall
  );

  return (
    <div>
      <h2>
        <Flag code={team.code} size={26} /> {team.name} 스쿼드
        <span className="badge">FIFA 랭킹 {team.ranking}위</span>
        <span className="badge">팀 능력치 {team.rating}</span>
      </h2>
      <div className="panel" style={{ marginTop: 14 }}>
        <table>
          <thead>
            <tr>
              <th>포지션</th><th>이름</th><th>소속</th>
              <th className="num">종합</th><th className="num">속도</th>
              <th className="num">슈팅</th><th className="num">패스</th>
              <th className="num">수비</th><th className="num">체력</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.nameEn + p.name}>
                <td className={`pos-${p.position}`}>{p.position}</td>
                <td>
                  {p.name}
                  {p.isStar && <span className="star" title="스타플레이어"> ★</span>}
                  {p.isLegend && <span title="레전드"> 👑</span>}
                </td>
                <td style={{ color: 'var(--dim)' }}>{p.club}</td>
                <td className="num" style={{ fontWeight: 700 }}>{p.overall}</td>
                <td className="num">{p.pace}</td>
                <td className="num">{p.shooting}</td>
                <td className="num">{p.passing}</td>
                <td className="num">{p.defending}</td>
                <td className="num">{p.stamina}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="match-actions">
        <button className="btn ghost" onClick={onBack}>다른 팀 보기</button>
        <button className="btn big" onClick={onConfirm}>이 팀으로 월드컵 도전 🏆</button>
      </div>
    </div>
  );
}
