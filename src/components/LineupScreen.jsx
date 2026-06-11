import React, { useMemo, useState } from 'react';
import { TEAMS } from '../data/teams/index.js';
import { FORMATIONS, MENTALITIES, autoLineup } from '../engine/matchEngine.js';
import Flag from './Flag.jsx';
import CoachChat from './CoachChat.jsx';

const POS_ORDER = { GK: 0, DF: 1, MF: 2, FW: 3 };

function condClass(c) {
  if (c >= 0.9) return 'cond-hot';
  if (c >= 0.8) return 'cond-ok';
  return 'cond-low';
}

function PlayerRow({ p, selected, dimmed, onClick }) {
  return (
    <button
      className={`p-row ${selected ? 'selected' : ''} ${dimmed ? 'dimmed' : ''}`}
      onClick={onClick}
      disabled={dimmed}
    >
      <span className={`pos-chip pos-${p.position}`}>{p.position}</span>
      <span className="p-name">
        {p.name}
        {p.isStar && <span className="star"> ★</span>}
        {p.isLegend && ' 👑'}
      </span>
      <span className="p-ovr">{p.overall}</span>
      <span className={`p-cond ${condClass(p.condition)}`}>{Math.round(p.condition * 100)}%</span>
    </button>
  );
}

// 경기 전 감독 화면: 선발 11명, 포메이션, 전술 성향 결정 + AI 코치 상담
export default function LineupScreen({ pending, onKickoff, onBack }) {
  const { home, away, mySide, label, myConditions, knockout } = pending;
  const myTeam = TEAMS[mySide === 'home' ? home : away];
  const oppTeam = TEAMS[mySide === 'home' ? away : home];

  const squad = useMemo(
    () =>
      myTeam.players
        .map((p) => ({ ...p, condition: myConditions[p.name] }))
        .sort((a, b) => POS_ORDER[a.position] - POS_ORDER[b.position] || b.overall - a.overall),
    [myTeam, myConditions]
  );

  const [formation, setFormation] = useState('4-3-3');
  const [mentality, setMentality] = useState('balanced');
  const [lineup, setLineup] = useState(() => autoLineup(squad, '4-3-3'));
  const [picked, setPicked] = useState(null); // 교체 대상으로 선택된 선발 선수 이름

  const starters = lineup.map((n) => squad.find((p) => p.name === n));
  const bench = squad.filter((p) => !lineup.includes(p.name));
  const pickedPlayer = picked ? squad.find((p) => p.name === picked) : null;

  const changeFormation = (f) => {
    setFormation(f);
    setLineup(autoLineup(squad, f));
    setPicked(null);
  };

  const swapIn = (benchPlayer) => {
    if (!pickedPlayer || benchPlayer.position !== pickedPlayer.position) return;
    setLineup(lineup.map((n) => (n === picked ? benchPlayer.name : n)));
    setPicked(null);
  };

  const coachContext = useMemo(() => {
    const f = FORMATIONS[formation];
    const list = starters
      .map((p) => `${p.position} ${p.name}(능력${p.overall}/컨디션${Math.round(p.condition * 100)}%${p.isStar ? '/스타' : ''})`)
      .join(', ');
    const benchList = bench.map((p) => `${p.position} ${p.name}(${p.overall}/${Math.round(p.condition * 100)}%)`).join(', ');
    const oppStars = oppTeam.players.filter((p) => p.isStar).map((p) => `${p.name}(${p.overall})`).join(', ');
    return [
      `당신은 축구 게임 "TACTIX 2026"에서 ${myTeam.name} 대표팀의 AI 수석코치다. 감독(사용자)의 전술 상담에 한국어로, 간결하고 실전적으로 답하라. 근거를 들어 추천하되 최종 결정은 감독 몫임을 존중하라.`,
      `[경기] ${label}${knockout ? ' (토너먼트 — 무승부 시 연장/승부차기)' : ' (조별리그)'} — ${myTeam.name}(FIFA ${myTeam.ranking}위, 전력 ${myTeam.rating}) vs ${oppTeam.name}(FIFA ${oppTeam.ranking}위, 전력 ${oppTeam.rating})`,
      `[상대 핵심 선수] ${oppStars || '정보 없음'}`,
      `[현재 우리 전술] 포메이션 ${formation} (${f.label}), 성향 ${MENTALITIES[mentality].label}`,
      `[우리 선발 11] ${list}`,
      `[우리 벤치] ${benchList}`,
      `[게임 규칙] 포메이션: ${Object.entries(FORMATIONS).map(([k, v]) => `${k}=공격${v.atk}/수비허용${v.def}`).join(', ')}. 성향: 공격적=득점↑실점↑, 수비적=득점↓실점↓. 선수 컨디션은 매 경기 70~100%로 변하며, 랭킹 차 20위 이상일 때 약팀 스타가 90% 이상 컨디션이면 업셋 확률이 크게 오른다. 교체는 경기당 5명.`,
    ].join('\n');
  }, [starters, bench, formation, mentality, myTeam, oppTeam, label, knockout]);

  return (
    <div>
      <div className="panel matchup-head">
        <div className="matchup-label">{label} · 경기 준비</div>
        <div className="fixture">
          <span className="side"><Flag code={home} size={26} /> {TEAMS[home].name}</span>
          <span className="vs">VS</span>
          <span className="side">{TEAMS[away].name} <Flag code={away} size={26} /></span>
        </div>
      </div>

      <div className="panel">
        <h3>전술 보드</h3>
        <div className="tactic-row">
          <span className="tactic-title">포메이션</span>
          {Object.keys(FORMATIONS).map((f) => (
            <button
              key={f}
              className={`chip ${formation === f ? 'active' : ''}`}
              onClick={() => changeFormation(f)}
              title={FORMATIONS[f].label}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="tactic-row">
          <span className="tactic-title">성향</span>
          {Object.entries(MENTALITIES).map(([k, v]) => (
            <button key={k} className={`chip ${mentality === k ? 'active' : ''}`} onClick={() => setMentality(k)}>
              {v.label}
            </button>
          ))}
          <button className="chip" style={{ marginLeft: 'auto' }} onClick={() => changeFormation(formation)}>
            ↺ 추천 선발로 초기화
          </button>
        </div>
        <p className="hint">
          {picked
            ? `${picked} 선수와 교체할 벤치의 동일 포지션 선수를 선택하세요.`
            : '선발 선수를 클릭한 뒤 벤치 선수를 클릭하면 교체됩니다. 오늘 컨디션(%)을 확인하세요!'}
        </p>
      </div>

      <div className="grid2">
        <div className="panel">
          <h3>선발 XI <span className="badge">{formation}</span></h3>
          <div className="p-list">
            {starters.map((p) => (
              <PlayerRow
                key={p.name}
                p={p}
                selected={picked === p.name}
                onClick={() => setPicked(picked === p.name ? null : p.name)}
              />
            ))}
          </div>
        </div>
        <div className="panel">
          <h3>벤치 ({bench.length}명)</h3>
          <div className="p-list">
            {bench.map((p) => (
              <PlayerRow
                key={p.name}
                p={p}
                dimmed={!!pickedPlayer && p.position !== pickedPlayer.position}
                onClick={() => swapIn(p)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <CoachChat context={coachContext} />
      </div>

      <div className="match-actions">
        <button className="btn ghost" onClick={onBack}>← 돌아가기</button>
        <button className="btn big" onClick={() => onKickoff({ lineup, formation, mentality })}>
          ⚽ 킥오프
        </button>
      </div>
    </div>
  );
}
