import React from 'react';
import { TEAM_LIST } from '../data/teams/index.js';
import Flag from './Flag.jsx';

const CONF_ORDER = [
  ['UEFA', '유럽 (UEFA)'],
  ['CONMEBOL', '남미 (CONMEBOL)'],
  ['CONCACAF', '북중미카리브 (CONCACAF)'],
  ['CAF', '아프리카 (CAF)'],
  ['AFC', '아시아 (AFC)'],
  ['OFC', '오세아니아 (OFC)'],
];

export default function TeamSelect({ onSelect }) {
  return (
    <div>
      <h2>국가 선택</h2>
      <p style={{ color: 'var(--dim)', marginTop: 6 }}>
        2026 북중미 월드컵 본선 48개국 중 당신이 이끌 팀을 선택하세요.
      </p>
      {CONF_ORDER.map(([conf, label]) => {
        const teams = TEAM_LIST.filter((t) => t.confederation === conf).sort(
          (a, b) => a.ranking - b.ranking
        );
        return (
          <div key={conf}>
            <div className="conf-title">{label} · {teams.length}개국</div>
            <div className="team-grid">
              {teams.map((t) => (
                <button key={t.code} className="team-card" onClick={() => onSelect(t.code)}>
                  <Flag code={t.code} size={30} />
                  <span>
                    <div className="name">{t.name}</div>
                    <div className="meta">FIFA 랭킹 {t.ranking}위</div>
                  </span>
                  <span className="ovr">{t.rating}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
