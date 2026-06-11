import React from 'react';
import { TEAMS } from '../data/teams/index.js';
import Flag from './Flag.jsx';

export default function Standings({ rows, myTeam, highlightQualified }) {
  return (
    <table>
      <thead>
        <tr>
          <th>#</th><th>팀</th><th className="num">경기</th><th className="num">승</th>
          <th className="num">무</th><th className="num">패</th><th className="num">득실</th>
          <th className="num">승점</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const t = TEAMS[r.code];
          return (
            <tr
              key={r.code}
              className={`${r.code === myTeam ? 'me' : ''} ${highlightQualified && i < 2 ? 'qualified' : ''}`}
            >
              <td>{i + 1}</td>
              <td><Flag code={t.code} size={15} /> {t.name}</td>
              <td className="num">{r.played}</td>
              <td className="num">{r.won}</td>
              <td className="num">{r.drawn}</td>
              <td className="num">{r.lost}</td>
              <td className="num">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
              <td className="num" style={{ fontWeight: 700 }}>{r.pts}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
