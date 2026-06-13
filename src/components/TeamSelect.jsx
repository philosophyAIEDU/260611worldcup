import React from 'react';
import { TEAM_LIST } from '../data/teams/index.js';
import { useLang } from '../i18n.jsx';
import Flag from './Flag.jsx';

const CONF_ORDER = ['UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC'];

export default function TeamSelect({ onSelect }) {
  const { t, tn } = useLang();
  return (
    <div>
      <h2>{t('select.title')}</h2>
      <p style={{ color: 'var(--dim)', marginTop: 6 }}>{t('select.desc')}</p>
      {CONF_ORDER.map((conf) => {
        const teams = TEAM_LIST.filter((t2) => t2.confederation === conf).sort(
          (a, b) => a.ranking - b.ranking
        );
        return (
          <div key={conf}>
            <div className="conf-title">{t('select.confCount', { label: t(`conf.${conf}`), n: teams.length })}</div>
            <div className="team-grid">
              {teams.map((team) => (
                <button key={team.code} className="team-card" onClick={() => onSelect(team.code)}>
                  <Flag code={team.code} size={30} />
                  <span>
                    <div className="name">{tn(team)}</div>
                    <div className="meta">{t('common.fifaRank', { n: team.ranking })}</div>
                  </span>
                  <span className="ovr">{team.rating}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
