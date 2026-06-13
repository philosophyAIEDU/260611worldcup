import React, { useMemo, useState } from 'react';
import { TEAMS } from '../data/teams/index.js';
import { FORMATIONS, MENTALITIES, PLAYSTYLES, autoLineup, defaultPlaystyle } from '../engine/matchEngine.js';
import { formationLabel, mentalityLabel, playstyleLabel, posLabel } from '../engine/labels.js';
import { useLang } from '../i18n.jsx';
import Flag from './Flag.jsx';
import CoachChat from './CoachChat.jsx';
import PlayerChat from './PlayerChat.jsx';

const POS_ORDER = { GK: 0, DF: 1, MF: 2, FW: 3 };

function condClass(c) {
  if (c >= 0.9) return 'cond-hot';
  if (c >= 0.8) return 'cond-ok';
  return 'cond-low';
}

function PlayerRow({ p, name, selected, dimmed, onClick, onChat, talkTitle, starters }) {
  return (
    <div className={`p-row-wrap ${dimmed ? 'dimmed' : ''}`}>
      <button
        className={`p-row ${selected ? 'selected' : ''}`}
        onClick={onClick}
        disabled={dimmed}
      >
        <span className={`pos-chip pos-${p.position}`}>{starters ? posLabel(p, starters) : p.position}</span>
        <span className="p-name">
          {name}
          {p.isStar && <span className="star"> ★</span>}
          {p.isLegend && ' 👑'}
        </span>
        <span className="p-ovr">{p.overall}</span>
        <span className={`p-cond ${condClass(p.condition)}`}>{Math.round(p.condition * 100)}%</span>
      </button>
      <button className="p-chat-btn" title={talkTitle} onClick={onChat}>💬</button>
    </div>
  );
}

// 경기 전 감독 화면: 선발 11명, 포메이션, 전술 성향 결정 + AI 코치 상담
export default function LineupScreen({ pending, onKickoff, onBack }) {
  const { t, tn, pn, lang } = useLang();
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
  const [playstyle, setPlaystyle] = useState(() => defaultPlaystyle(myTeam.code));
  const [lineup, setLineup] = useState(() => autoLineup(squad, '4-3-3'));
  const [picked, setPicked] = useState(null); // 교체 대상으로 선택된 선발 선수 이름
  const [chatPlayer, setChatPlayer] = useState(null); // 대화 중인 선수

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
      .map((p) => `${p.position} ${pn(p)}(${p.overall}/${Math.round(p.condition * 100)}%${p.isStar ? '/★' : ''})`)
      .join(', ');
    const benchList = bench.map((p) => `${p.position} ${pn(p)}(${p.overall}/${Math.round(p.condition * 100)}%)`).join(', ');
    const oppStars = oppTeam.players.filter((p) => p.isStar).map((p) => `${pn(p)}(${p.overall})`).join(', ');
    const en = lang === 'en';
    return [
      en
        ? `You are the AI assistant coach of ${tn(myTeam)} in the football game "TACTIX 2026". Answer the manager's tactical questions in concise, practical English. Recommend with reasons, but respect that the final decision is the manager's.`
        : `당신은 축구 게임 "TACTIX 2026"에서 ${tn(myTeam)} 대표팀의 AI 수석코치다. 감독(사용자)의 전술 상담에 한국어로, 간결하고 실전적으로 답하라. 근거를 들어 추천하되 최종 결정은 감독 몫임을 존중하라.`,
      en
        ? `[Match] ${label}${knockout ? ' (knockout — extra time/penalties if drawn)' : ' (group stage)'} — ${tn(myTeam)} (FIFA #${myTeam.ranking}, rating ${myTeam.rating}) vs ${tn(oppTeam)} (FIFA #${oppTeam.ranking}, rating ${oppTeam.rating})`
        : `[경기] ${label}${knockout ? ' (토너먼트 — 무승부 시 연장/승부차기)' : ' (조별리그)'} — ${tn(myTeam)}(FIFA ${myTeam.ranking}위, 전력 ${myTeam.rating}) vs ${tn(oppTeam)}(FIFA ${oppTeam.ranking}위, 전력 ${oppTeam.rating})`,
      `${en ? '[Opponent key players]' : '[상대 핵심 선수]'} ${oppStars || (en ? 'none' : '정보 없음')}`,
      `${en ? '[Our tactics]' : '[현재 우리 전술]'} ${formation} (${formationLabel(formation, lang)}), ${mentalityLabel(mentality, lang)}, ${playstyleLabel(playstyle, lang)}`,
      `${en ? '[Our starting XI]' : '[우리 선발 11]'} ${list}`,
      `${en ? '[Our bench]' : '[우리 벤치]'} ${benchList}`,
      en
        ? '[Rules] Mentality: attacking = more goals scored & conceded; defensive = fewer of both. Player condition varies 70-100% each match; if the ranking gap is 20+ and the weaker team\'s star is 90%+ condition, an upset becomes much more likely. Max 5 substitutions.'
        : `[게임 규칙] 성향: 공격적=득점↑실점↑, 수비적=득점↓실점↓. 선수 컨디션은 매 경기 70~100%로 변하며, 랭킹 차 20위 이상일 때 약팀 스타가 90% 이상 컨디션이면 업셋 확률이 크게 오른다. 교체는 경기당 5명.`,
    ].join('\n');
  }, [starters, bench, formation, mentality, playstyle, myTeam, oppTeam, label, knockout, lang]);

  const coachQuickPrompts = [
    { label: t('coach.q.scout'), prompt: t('coach.p.scout') },
    { label: t('coach.q.predict'), prompt: t('coach.p.predict') },
    { label: t('coach.q.plan'), prompt: t('coach.p.plan') },
  ];

  return (
    <div>
      <div className="panel matchup-head">
        <div className="matchup-label">{t('label.prep', { label })}</div>
        <div className="fixture">
          <span className="side"><Flag code={home} size={26} /> {tn(TEAMS[home])}</span>
          <span className="vs">{t('common.vs')}</span>
          <span className="side">{tn(TEAMS[away])} <Flag code={away} size={26} /></span>
        </div>
      </div>

      <div className="panel">
        <h3>{t('lineup.board')}</h3>
        <div className="tactic-row">
          <span className="tactic-title">{t('lineup.formation')}</span>
          {Object.keys(FORMATIONS).map((f) => (
            <button
              key={f}
              className={`chip ${formation === f ? 'active' : ''}`}
              onClick={() => changeFormation(f)}
              title={formationLabel(f, lang)}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="tactic-row">
          <span className="tactic-title">{t('lineup.mentality')}</span>
          {Object.keys(MENTALITIES).map((k) => (
            <button key={k} className={`chip ${mentality === k ? 'active' : ''}`} onClick={() => setMentality(k)}>
              {mentalityLabel(k, lang)}
            </button>
          ))}
          <button className="chip" style={{ marginLeft: 'auto' }} onClick={() => changeFormation(formation)}>
            {t('lineup.reset')}
          </button>
        </div>
        <div className="tactic-row">
          <span className="tactic-title">{t('lineup.playstyle')}</span>
          {Object.keys(PLAYSTYLES).map((k) => (
            <button
              key={k}
              className={`chip ${playstyle === k ? 'active' : ''}`}
              onClick={() => setPlaystyle(k)}
            >
              {playstyleLabel(k, lang)}
            </button>
          ))}
        </div>
        <p className="hint">
          {picked ? t('lineup.hintPicked', { p: pn(pickedPlayer) }) : t('lineup.hintDefault')}
        </p>
      </div>

      <div className="grid2">
        <div className="panel">
          <h3>{t('lineup.startingXI')} <span className="badge">{formation}</span></h3>
          <div className="p-list">
            {starters.map((p) => (
              <PlayerRow
                key={p.name}
                p={p}
                name={pn(p)}
                selected={picked === p.name}
                starters={starters}
                talkTitle={t('player.talkTitle')}
                onChat={() => setChatPlayer(p)}
                onClick={() => setPicked(picked === p.name ? null : p.name)}
              />
            ))}
          </div>
        </div>
        <div className="panel">
          <h3>{t('lineup.bench', { n: bench.length })}</h3>
          <div className="p-list">
            {bench.map((p) => (
              <PlayerRow
                key={p.name}
                p={p}
                name={pn(p)}
                dimmed={!!pickedPlayer && p.position !== pickedPlayer.position}
                talkTitle={t('player.talkTitle')}
                onChat={() => setChatPlayer(p)}
                onClick={() => swapIn(p)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <CoachChat context={coachContext} quickPrompts={coachQuickPrompts} />
      </div>

      <div className="match-actions">
        <button className="btn ghost" onClick={onBack}>{t('common.back')}</button>
        <button className="btn big" onClick={() => onKickoff({ lineup, formation, mentality, playstyle })}>
          {t('lineup.kickoff')}
        </button>
      </div>

      {chatPlayer && (
        <PlayerChat
          player={chatPlayer}
          team={myTeam}
          opp={oppTeam}
          label={label}
          onClose={() => setChatPlayer(null)}
        />
      )}
    </div>
  );
}
