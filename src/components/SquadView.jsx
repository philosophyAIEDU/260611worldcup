import React from 'react';
import { TEAMS } from '../data/teams/index.js';
import { useLang } from '../i18n.jsx';
import Flag from './Flag.jsx';

const POS_ORDER = { GK: 0, DF: 1, MF: 2, FW: 3 };

export default function SquadView({ teamCode, onConfirm, onBack }) {
  const { t, tn, pn, cn } = useLang();
  const team = TEAMS[teamCode];
  const players = [...team.players].sort(
    (a, b) => POS_ORDER[a.position] - POS_ORDER[b.position] || b.overall - a.overall
  );

  return (
    <div>
      <h2>
        <Flag code={team.code} size={26} /> {t('squad.title', { team: tn(team) })}
        <span className="badge">{t('common.fifaRank', { n: team.ranking })}</span>
        <span className="badge">{t('squad.teamRating', { n: team.rating })}</span>
      </h2>
      <div className="panel" style={{ marginTop: 14 }}>
        <table>
          <thead>
            <tr>
              <th>{t('squad.h.pos')}</th><th>{t('squad.h.name')}</th><th>{t('squad.h.club')}</th>
              <th className="num">{t('squad.h.ovr')}</th><th className="num">{t('squad.h.pace')}</th>
              <th className="num">{t('squad.h.shooting')}</th><th className="num">{t('squad.h.passing')}</th>
              <th className="num">{t('squad.h.defending')}</th><th className="num">{t('squad.h.stamina')}</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.nameEn + p.name}>
                <td className={`pos-${p.position}`}>{p.position}</td>
                <td>
                  {pn(p)}
                  {p.isStar && <span className="star" title={t('squad.star')}> ★</span>}
                  {p.isLegend && <span title={t('squad.legend')}> 👑</span>}
                </td>
                <td style={{ color: 'var(--dim)' }}>{cn(p.club)}</td>
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
        <button className="btn ghost" onClick={onBack}>{t('squad.other')}</button>
        <button className="btn big" onClick={onConfirm}>{t('squad.confirm')}</button>
      </div>
    </div>
  );
}
