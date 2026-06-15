import React from 'react';
import { CLUB_LIST } from '../data/teams/index.js';
import { CLUB_ISO } from '../data/clubs/index.js';
import { useLang } from '../i18n.jsx';
import Flag from './Flag.jsx';

// 리그(국가) 그룹 — 표시 순서와 라벨
const LEAGUES = [
  { iso: 'gb-eng', key: 'league.eng' },
  { iso: 'es', key: 'league.esp' },
  { iso: 'it', key: 'league.ita' },
  { iso: 'de', key: 'league.ger' },
  { iso: 'fr', key: 'league.fra' },
  { iso: 'pt', key: 'league.por' },
  { iso: 'nl', key: 'league.ned' },
  { iso: 'tr', key: 'league.tur' },
  { iso: 'gb-sct', key: 'league.sco' },
  { iso: 'be', key: 'league.bel' },
];

export default function ClubSelect({ onSelect }) {
  const { t, tn } = useLang();
  return (
    <div>
      <h2>{t('clubselect.title')}</h2>
      <p style={{ color: 'var(--dim)', marginTop: 6 }}>{t('clubselect.desc')}</p>
      {LEAGUES.map(({ iso, key }) => {
        const clubs = CLUB_LIST.filter((c) => CLUB_ISO[c.code] === iso).sort(
          (a, b) => a.ranking - b.ranking
        );
        if (!clubs.length) return null;
        return (
          <div key={iso}>
            <div className="conf-title">{t('select.confCount', { label: t(key), n: clubs.length })}</div>
            <div className="team-grid">
              {clubs.map((club) => (
                <button key={club.code} className="team-card" onClick={() => onSelect(club.code)}>
                  <Flag code={club.code} size={30} />
                  <span>
                    <div className="name">{tn(club)}</div>
                    <div className="meta">{t('common.clubRank', { n: club.ranking })}</div>
                  </span>
                  <span className="ovr">{club.rating}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
