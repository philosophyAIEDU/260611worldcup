import React, { useMemo, useState } from 'react';
import { TEAMS } from '../data/teams/index.js';
import { useLang } from '../i18n.jsx';
import Flag from './Flag.jsx';

// 모든 경기 결과(groupResults + rounds)에서 득점·어시스트 집계.
// 각 항목: { teamCode, name, nameEn, count }
function tally(game) {
  const goals = {};
  const assists = {};

  const add = (map, entry) => {
    const key = `${entry.team}::${entry.name}`;
    if (!map[key]) map[key] = { teamCode: entry.team, name: entry.name, nameEn: entry.nameEn || entry.name, count: 0 };
    map[key].count++;
  };

  const processResult = (r) => {
    (r.scorers || []).forEach((s) => add(goals, s));
    (r.assisters || []).forEach((a) => add(assists, a));
  };

  Object.values(game.groupResults || {}).forEach((arr) => arr.forEach(processResult));
  (game.rounds || []).forEach((round) =>
    (round.matches || []).forEach((m) => m.result && processResult(m.result))
  );

  const rankList = (map) => {
    const sorted = Object.values(map).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    let lastCount = null;
    let lastRank = 0;
    return sorted.map((entry, i) => {
      const rank = entry.count === lastCount ? lastRank : i + 1; // 공동 순위
      lastCount = entry.count;
      lastRank = rank;
      return { ...entry, rank };
    });
  };

  return { goals: rankList(goals), assists: rankList(assists) };
}

const TABS = ['goals', 'assists'];
const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function StatsView({ game }) {
  const { t, lang } = useLang();
  const [tab, setTab] = useState('goals');
  const { goals, assists } = useMemo(() => tally(game), [game]);
  const list = (tab === 'goals' ? goals : assists).slice(0, 30);

  const teamName = (code) => (lang === 'en' ? TEAMS[code]?.nameEn : TEAMS[code]?.name) || '';
  const playerDisplay = (entry) => {
    const p = TEAMS[entry.teamCode]?.players.find((pl) => pl.name === entry.name);
    return lang === 'en' ? (p?.nameEn || entry.nameEn) : (p?.name || entry.name);
  };
  const isStar = (entry) => !!TEAMS[entry.teamCode]?.players.find((pl) => pl.name === entry.name)?.isStar;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map((k) => (
          <button key={k} className={`chip ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
            {t(`stats.tab.${k}`)}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="hint" style={{ textAlign: 'center', padding: '24px 0' }}>{t('stats.noData')}</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th className="num" style={{ width: 40 }}>#</th>
                <th>{t('stats.h.player')}</th>
                <th>{t('stats.h.team')}</th>
                <th className="num">{tab === 'goals' ? t('stats.h.goals') : t('stats.h.assists')}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((entry) => (
                <tr key={`${entry.teamCode}-${entry.name}`} style={entry.rank <= 3 ? { fontWeight: 700 } : undefined}>
                  <td className="num" style={{ color: entry.rank === 1 ? 'var(--gold)' : entry.rank <= 3 ? 'var(--green)' : 'var(--dim)' }}>
                    {MEDAL[entry.rank] || entry.rank}
                  </td>
                  <td>
                    {playerDisplay(entry)}
                    {isStar(entry) && <span className="star"> ★</span>}
                  </td>
                  <td style={{ color: 'var(--dim)', whiteSpace: 'nowrap' }}>
                    <Flag code={entry.teamCode} size={14} /> {teamName(entry.teamCode)}
                  </td>
                  <td className="num" style={{ fontWeight: 800, fontSize: '1.05rem' }}>{entry.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
