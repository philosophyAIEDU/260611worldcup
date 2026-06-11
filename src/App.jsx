import React, { useEffect, useMemo, useState } from 'react';
import { TEAMS } from './data/teams/index.js';
import { GROUPS, GROUP_KEYS } from './data/groups.js';
import {
  groupFixtures,
  computeStandings,
  buildRoundOf32,
  nextRound,
  qualifiedTeams,
  ROUND_NAMES,
} from './engine/tournament.js';
import { simulateMatch } from './engine/matchEngine.js';
import { saveGame, loadGame, clearGame } from './engine/storage.js';
import TeamSelect from './components/TeamSelect.jsx';
import SquadView from './components/SquadView.jsx';
import Standings from './components/Standings.jsx';
import MatchView from './components/MatchView.jsx';
import Bracket from './components/Bracket.jsx';
import EndScreen from './components/EndScreen.jsx';

const clone = (o) => JSON.parse(JSON.stringify(o));

// 저장 용량을 위해 이벤트 로그를 제외한 결과만 보존
const strip = (r) => ({
  home: r.home,
  away: r.away,
  homeGoals: r.homeGoals,
  awayGoals: r.awayGoals,
  winner: r.winner,
  extraTime: r.extraTime,
  upset: r.upset,
  shootout: r.shootout ? { homeScore: r.shootout.homeScore, awayScore: r.shootout.awayScore } : null,
});

const newGame = (myTeam) => ({
  myTeam,
  phase: 'group', // 'group' | 'ko' | 'done'
  matchday: 1,
  groupResults: Object.fromEntries(GROUP_KEYS.map((g) => [g, []])),
  rounds: [],
  champion: null,
  eliminated: false,
  runSummary: '',
});

const myGroupOf = (code) => GROUP_KEYS.find((g) => GROUPS[g].includes(code));

export default function App() {
  const [screen, setScreen] = useState('home');
  const [game, setGame] = useState(null);
  const [previewTeam, setPreviewTeam] = useState(null);
  const [liveResult, setLiveResult] = useState(null);
  const [liveLabel, setLiveLabel] = useState('');
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    setHasSave(!!loadGame());
  }, []);

  useEffect(() => {
    if (game) saveGame(game);
  }, [game]);

  const myGroup = game ? myGroupOf(game.myTeam) : null;
  const standings = useMemo(
    () => (game ? computeStandings(game.groupResults) : null),
    [game]
  );

  // ── 조별리그 진행 ──────────────────────────────────────────────
  const myGroupFixture = () => {
    if (!game || game.phase !== 'group' || game.matchday > 3) return null;
    return groupFixtures(myGroup)[game.matchday - 1].find(
      (f) => f.home === game.myTeam || f.away === game.myTeam
    );
  };

  const playGroupMatch = () => {
    const fix = myGroupFixture();
    const res = simulateMatch(TEAMS[fix.home], TEAMS[fix.away], { knockout: false });
    setLiveResult(res);
    setLiveLabel(`조별리그 ${myGroup}조 · ${game.matchday}차전`);
    setScreen('match');
  };

  const finishGroupMatch = (res) => {
    const g = clone(game);
    const md = g.matchday;
    for (const gk of GROUP_KEYS) {
      for (const fix of groupFixtures(gk)[md - 1]) {
        const isMine = fix.home === res.home && fix.away === res.away;
        const r = isMine ? res : simulateMatch(TEAMS[fix.home], TEAMS[fix.away], { knockout: false });
        g.groupResults[gk].push({ ...strip(r), matchday: md });
      }
    }
    g.matchday = md + 1;

    if (g.matchday > 3) {
      const st = computeStandings(g.groupResults);
      const { bestThirds } = qualifiedTeams(st);
      const rows = st[myGroup];
      const pos = rows.findIndex((r) => r.code === g.myTeam);
      const qualified = pos < 2 || (pos === 2 && bestThirds.some((t) => t.code === g.myTeam));
      g.phase = 'ko';
      g.rounds = [{ name: ROUND_NAMES[0], matches: buildRoundOf32(st) }];
      if (!qualified) {
        g.eliminated = true;
        g.runSummary = `조별리그 ${myGroup}조 ${pos + 1}위 탈락`;
      }
    }
    setGame(g);
    setLiveResult(null);
    setScreen('hub');
  };

  // ── 토너먼트 진행 ──────────────────────────────────────────────
  const currentRound = game && game.rounds.length > 0 ? game.rounds[game.rounds.length - 1] : null;
  const myKoMatch =
    currentRound && !game.eliminated
      ? currentRound.matches.find(
          (m) => !m.result && (m.home === game.myTeam || m.away === game.myTeam)
        )
      : null;

  const playKoMatch = () => {
    const res = simulateMatch(TEAMS[myKoMatch.home], TEAMS[myKoMatch.away], { knockout: true });
    setLiveResult(res);
    setLiveLabel(`토너먼트 · ${currentRound.name}`);
    setScreen('match');
  };

  const advanceRoundState = (g) => {
    const round = g.rounds[g.rounds.length - 1];
    for (const m of round.matches) {
      if (!m.result) m.result = strip(simulateMatch(TEAMS[m.home], TEAMS[m.away], { knockout: true }));
    }
    if (round.matches.length === 1) {
      g.champion = round.matches[0].result.winner;
      g.phase = 'done';
      if (g.champion === g.myTeam) g.runSummary = '우승';
    } else {
      g.rounds.push({
        name: ROUND_NAMES[g.rounds.length],
        matches: nextRound(round.matches),
      });
    }
  };

  const finishKoMatch = (res) => {
    const g = clone(game);
    const round = g.rounds[g.rounds.length - 1];
    const m = round.matches.find((x) => x.home === res.home && x.away === res.away);
    m.result = strip(res);
    if (res.winner !== g.myTeam) {
      g.eliminated = true;
      g.runSummary = `${round.name} 탈락`;
    }
    advanceRoundState(g);
    setGame(g);
    setLiveResult(null);
    setScreen(g.phase === 'done' ? 'end' : 'hub');
  };

  const autoSimRest = () => {
    const g = clone(game);
    while (g.phase !== 'done') advanceRoundState(g);
    setGame(g);
    setScreen('end');
  };

  // ── 시작/리셋 ─────────────────────────────────────────────────
  const startNew = () => {
    clearGame();
    setGame(null);
    setPreviewTeam(null);
    setScreen('select');
  };

  const resume = () => {
    const g = loadGame();
    if (!g) return;
    setGame(g);
    setScreen(g.phase === 'done' ? 'end' : 'hub');
  };

  const restart = () => {
    clearGame();
    setGame(null);
    setHasSave(false);
    setScreen('home');
  };

  // ── 렌더 ─────────────────────────────────────────────────────
  return (
    <div>
      <div className="topbar">
        <div className="logo">TACTIX <span>2026</span></div>
        <div className="sub">2026 FIFA 북중미 월드컵 시뮬레이터</div>
      </div>

      {screen === 'home' && (
        <div className="hero">
          <h1>TACTIX <span>2026</span></h1>
          <p>48개국, 104경기, 단 하나의 트로피. 당신의 팀을 세계 정상으로 이끄세요.</p>
          <div className="actions">
            <button className="btn big" onClick={startNew}>새 게임 시작</button>
            {hasSave && <button className="btn big ghost" onClick={resume}>이어하기</button>}
          </div>
        </div>
      )}

      {screen === 'select' && <TeamSelect onSelect={(c) => { setPreviewTeam(c); setScreen('squad'); }} />}

      {screen === 'squad' && (
        <SquadView
          teamCode={previewTeam}
          onBack={() => setScreen('select')}
          onConfirm={() => {
            setGame(newGame(previewTeam));
            setScreen('hub');
          }}
        />
      )}

      {screen === 'match' && liveResult && (
        <MatchView
          result={liveResult}
          roundLabel={liveLabel}
          onFinish={game.phase === 'group' ? finishGroupMatch : finishKoMatch}
        />
      )}

      {screen === 'hub' && game && (
        <Hub
          game={game}
          myGroup={myGroup}
          standings={standings}
          fixture={myGroupFixture()}
          myKoMatch={myKoMatch}
          showAllGroups={showAllGroups}
          onToggleGroups={() => setShowAllGroups((v) => !v)}
          onPlayGroup={playGroupMatch}
          onPlayKo={playKoMatch}
          onAutoSim={autoSimRest}
          onRestart={restart}
        />
      )}

      {screen === 'end' && game && <EndScreen game={game} onRestart={restart} />}
    </div>
  );
}

function Hub({
  game, myGroup, standings, fixture, myKoMatch,
  showAllGroups, onToggleGroups, onPlayGroup, onPlayKo, onAutoSim, onRestart,
}) {
  const me = TEAMS[game.myTeam];

  return (
    <div>
      <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong style={{ fontSize: '1.15rem' }}>{me.flag} {me.name}</strong>
          <span className="badge">
            {game.phase === 'group' ? `조별리그 ${myGroup}조 · ${Math.min(game.matchday, 3)}차전` : '토너먼트'}
          </span>
          {game.eliminated && <span className="badge" style={{ color: 'var(--red)' }}>탈락</span>}
        </div>
        <button className="btn danger" onClick={onRestart}>처음으로</button>
      </div>

      {game.phase === 'group' && (
        <>
          {fixture && <NextFixture fixture={fixture} onPlay={onPlayGroup} label={`${game.matchday}차전`} />}
          <div className="panel">
            <h3 style={{ marginBottom: 10 }}>{myGroup}조 순위</h3>
            <Standings rows={standings[myGroup]} myTeam={game.myTeam} highlightQualified />
            <GroupResults results={game.groupResults[myGroup]} />
          </div>
        </>
      )}

      {game.phase === 'ko' && (
        <>
          {!game.eliminated && myKoMatch && (
            <NextFixture
              fixture={myKoMatch}
              onPlay={onPlayKo}
              label={game.rounds[game.rounds.length - 1].name}
            />
          )}
          {game.eliminated && (
            <div className="panel" style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--dim)', marginBottom: 12 }}>
                {me.name}의 여정은 여기까지입니다 — {game.runSummary}. 남은 대회를 지켜보시겠습니까?
              </p>
              <button className="btn" onClick={onAutoSim}>남은 대회 자동 진행 ⏩</button>
            </div>
          )}
          <div className="panel">
            <h3 style={{ marginBottom: 10 }}>토너먼트 대진표</h3>
            <Bracket rounds={game.rounds} myTeam={game.myTeam} />
          </div>
        </>
      )}

      <div className="panel">
        <button className="btn ghost" onClick={onToggleGroups}>
          {showAllGroups ? '전체 조 순위 접기' : '전체 조 순위 보기'}
        </button>
        {showAllGroups && (
          <div className="grid2" style={{ marginTop: 14 }}>
            {GROUP_KEYS.map((g) => (
              <div key={g}>
                <h3 style={{ margin: '6px 0' }}>{g}조</h3>
                <Standings rows={standings[g]} myTeam={game.myTeam} highlightQualified={game.matchday > 3} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NextFixture({ fixture, onPlay, label }) {
  const h = TEAMS[fixture.home];
  const a = TEAMS[fixture.away];
  return (
    <div className="panel">
      <div style={{ textAlign: 'center', color: 'var(--dim)', fontSize: '0.85rem' }}>다음 경기 · {label}</div>
      <div className="fixture">
        <span className="side">{h.flag} {h.name}</span>
        <span className="vs">VS</span>
        <span className="side">{a.name} {a.flag}</span>
      </div>
      <div style={{ textAlign: 'center', color: 'var(--dim)', fontSize: '0.8rem', marginBottom: 12 }}>
        FIFA 랭킹 {h.ranking}위 (전력 {h.rating}) vs {a.ranking}위 (전력 {a.rating})
      </div>
      <div className="match-actions">
        <button className="btn big" onClick={onPlay}>⚽ 경기 시작</button>
      </div>
    </div>
  );
}

function GroupResults({ results }) {
  if (!results.length) return null;
  return (
    <ul className="results-list" style={{ marginTop: 12 }}>
      {results.map((r, i) => (
        <li key={i}>
          {r.matchday}차전 — {TEAMS[r.home].flag} {TEAMS[r.home].name} {r.homeGoals} : {r.awayGoals} {TEAMS[r.away].name} {TEAMS[r.away].flag}
          {r.upset && <span className="upset-tag"> 🚨 이변!</span>}
        </li>
      ))}
    </ul>
  );
}
