import React, { useMemo, useState } from 'react';
import { TEAMS } from '../data/teams/index.js';
import { useLang } from '../i18n.jsx';
import Flag from './Flag.jsx';

// 모든 경기 결과(groupResults + rounds)에서 득점·어시스트 집계
function tally(game, playerName) {
  const goals = {};
  const assists = {};

  const add = (map, entry) => {
    const key = `${entry.team}::${entry.name}`;
    if (!map[key]) map[key] = { team: entry.team, name: entry.name, nameEn: entry.nameEn || entry.name, count: 0 };
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

  const rank = (map) =>
    Object.values(map)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .map((entry) => {
        const team = TEAMS[entry.team];
        const player = team?.players.find((p) => p.name === entry.name);
        return { ...entry, displayName: playerName(player || { name: entry.name, nameEn: entry.nameEn }, null), team };
      });

  return { goals: rank(goals), assists: rank(assists) };
}

const TABS = ['goals', 'assists'];

export default function StatsView({ game }) {
  const { t, pn, lang } = useLang();
  const [tab, setTab] = useState('goals');

  const playerName = (p) => {
    if (!p) return '?';
    return lang === 'en' ? (p.nameEn || p.name) : p.name;
  };

  const { goals, assists } = useMemo(() => tally(game, playerName), [game, lang]);

  const list = tab === 'goals' ? goals : assists;

  if (list.length === 0) {
    return (
      <div className="panel">
        <p className="hint" style={{ textAlign: 'center', padding: '24px 0' }}>
          {t('stats.noData')}
        </p>
      </div>
    );
  }

  // 공동 순위 계산
  const withRank = list.map((entry, i, arr) => ({
    ...entry,
    rank: i > 0 && arr[i - 1].count === entry.count ? arr[i - 1]._rank : i + 1,
  })).map((e, i, arr) => ({ ...e, _rank: e.rank }));

  return (
    <div className="panel">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {TABS.map((k) => (
          <button key={k} className={`chip ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
            {t(`stats.tab.${k}`)}
          </button>
        ))}
      </div>

      <table>
        <thead>
          <tr>
            <th className="num" style={{ width: 36 }}>#</th>
            <th>{t('stats.h.player')}</th>
            <th>{t('stats.h.team')}</th>
            <th className="num">{tab === 'goals' ? t('stats.h.goals') : t('stats.h.assists')}</th>
          </tr>
        </thead>
        <tbody>
          {withRank.slice(0, 30).map((entry, i, arr) => {
            const rank = i === 0 ? 1 : (arr[i - 1].count === entry.count ? arr[i - 1]._rank : i + 1);
            return (
              <tr key={`${entry.team}-${entry.name}`} style={rank <= 3 ? { fontWeight: 700 } : {}}>
                <td className="num" style={{ color: rank === 1 ? 'var(--gold)' : rank <= 3 ? 'var(--green)' : 'var(--dim)' }}>
                  {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                </td>
                <td>
                  {entry.displayName}
                  {(() => {
                    const team = entry.team;
                    const player = TEAMS[team]?.players.find((p) => p.name === entry.name);
                    return player?.isStar ? <span className="star"> ★</span> : null;
                  })()}
                </td>
                <td style={{ color: 'var(--dim)' }}>
                  {entry.team && <><Flag code={entry.team} size={14} /> {lang === 'en' ? (entry.team ? TEAMS[entry.team]?.nameEn : '') : (TEAMS[entry.team]?.name || '')}</>}
                </td>
                <td className="num" style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                  {entry.count}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
