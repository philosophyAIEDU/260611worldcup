import React from 'react';
import { TEAMS } from '../data/teams/index.js';
import { useLang } from '../i18n.jsx';
import Flag from './Flag.jsx';

export default function Standings({ rows, myTeam, highlightQualified }) {
  const { t, tn } = useLang();
  return (
    <div className="table-scroll">
    <table>
      <thead>
        <tr>
          <th>#</th><th>{t('standings.team')}</th><th className="num">{t('standings.played')}</th>
          <th className="num">{t('standings.won')}</th><th className="num">{t('standings.drawn')}</th>
          <th className="num">{t('standings.lost')}</th><th className="num">{t('standings.gd')}</th>
          <th className="num">{t('standings.pts')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const team = TEAMS[r.code];
          return (
            <tr
              key={r.code}
              className={`${r.code === myTeam ? 'me' : ''} ${highlightQualified && i < 2 ? 'qualified' : ''}`}
            >
              <td>{i + 1}</td>
              <td><Flag code={team.code} size={15} /> {tn(team)}</td>
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
    </div>
  );
}
