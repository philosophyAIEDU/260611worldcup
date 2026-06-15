import React, { useEffect, useMemo, useState } from 'react';
import { TEAMS } from './data/teams/index.js';
import { COMPETITIONS, DEFAULT_COMP } from './data/competitions.js';
import {
  groupFixtures,
  computeStandings,
  buildFirstRound,
  nextRound,
  qualifiedTeams,
} from './engine/tournament.js';
import { createMatch, simulateMatch, rollConditions } from './engine/matchEngine.js';
import { saveGame, loadGame, clearGame } from './engine/storage.js';
import { useLang, runSummaryText } from './i18n.jsx';
import TeamSelect from './components/TeamSelect.jsx';
import ClubSelect from './components/ClubSelect.jsx';
import SquadView from './components/SquadView.jsx';
import Standings from './components/Standings.jsx';
import LineupScreen from './components/LineupScreen.jsx';
import MatchView from './components/MatchView.jsx';
import Bracket from './components/Bracket.jsx';
import EndScreen from './components/EndScreen.jsx';
import LearnCoach from './components/LearnCoach.jsx';
import StatsView from './components/StatsView.jsx';
import MusicPlayer from './components/MusicPlayer.jsx';
import Flag from './components/Flag.jsx';

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
  scorers: r.scorers || [],
  assisters: r.assisters || [],
});

const newGame = (myTeam, comp) => {
  const groupKeys = Object.keys(COMPETITIONS[comp].groups);
  return {
    comp,
    myTeam,
    phase: 'group', // 'group' | 'ko' | 'done'
    matchday: 1,
    groupResults: Object.fromEntries(groupKeys.map((g) => [g, []])),
    rounds: [],
    champion: null,
    eliminated: false,
    runResult: null,
  };
};

const myGroupOf = (groups, code) => Object.keys(groups).find((g) => groups[g].includes(code));

const COMP_KEY = 'tactix2026-comp';
const getStoredComp = () => {
  try { const c = localStorage.getItem(COMP_KEY); return COMPETITIONS[c] ? c : null; } catch { return null; }
};
const storeComp = (c) => { try { localStorage.setItem(COMP_KEY, c); } catch { /* ignore */ } };

export default function App() {
  const { t, tn, lang, setLang, chosen } = useLang();
  const [screen, setScreen] = useState('home');
  const [comp, setComp] = useState(() => getStoredComp());
  const [game, setGame] = useState(null);
  const [previewTeam, setPreviewTeam] = useState(null);
  const [pending, setPending] = useState(null); // 경기 준비 정보
  const [liveMatch, setLiveMatch] = useState(null); // 진행 중인 라이브 경기 객체
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [hasSave, setHasSave] = useState(false);

  const activeComp = game?.comp || comp || DEFAULT_COMP;
  const competition = COMPETITIONS[activeComp];
  const groups = competition.groups;
  const format = competition.format;
  // 경기 진행 구조: 챔피언스리그는 전·후반, 월드컵은 4쿼터
  const matchStructure = activeComp === 'ucl' ? 'halves' : 'quarters';

  useEffect(() => {
    if (comp) setHasSave(!!loadGame(comp));
  }, [comp]);

  useEffect(() => {
    if (game) saveGame(game);
  }, [game]);

  const myGroup = game ? myGroupOf(groups, game.myTeam) : null;
  const standings = useMemo(
    () => (game ? computeStandings(groups, game.groupResults) : null),
    [game, groups]
  );

  // ── 경기 준비 (감독 모드 진입) ────────────────────────────────
  const prepMatch = (fix, label, knockout) => {
    setPending({
      home: fix.home,
      away: fix.away,
      knockout,
      label,
      mySide: fix.home === game.myTeam ? 'home' : 'away',
      myConditions: rollConditions(TEAMS[game.myTeam]),
    });
    setScreen('lineup');
  };

  const kickoff = (setup) => {
    const opts = { knockout: pending.knockout, lang, structure: matchStructure };
    opts[`${pending.mySide}Setup`] = {
      ...setup,
      conditions: pending.myConditions,
      manual: true,
    };
    setLiveMatch(createMatch(TEAMS[pending.home], TEAMS[pending.away], opts));
    setScreen('match');
  };

  // ── 조별리그 진행 ──────────────────────────────────────────────
  const myGroupFixture = () => {
    if (!game || game.phase !== 'group' || game.matchday > 3) return null;
    return groupFixtures(groups, myGroup)[game.matchday - 1].find(
      (f) => f.home === game.myTeam || f.away === game.myTeam
    );
  };

  const playGroupMatch = () =>
    prepMatch(myGroupFixture(), t('label.group', { g: myGroup, n: game.matchday }), false);

  const finishGroupMatch = (res) => {
    const g = clone(game);
    const md = g.matchday;
    for (const gk of Object.keys(groups)) {
      for (const fix of groupFixtures(groups, gk)[md - 1]) {
        const isMine = fix.home === res.home && fix.away === res.away;
        const r = isMine ? res : simulateMatch(TEAMS[fix.home], TEAMS[fix.away]);
        g.groupResults[gk].push({ ...strip(r), matchday: md });
      }
    }
    g.matchday = md + 1;

    if (g.matchday > 3) {
      const st = computeStandings(groups, g.groupResults);
      const { bestThirds } = qualifiedTeams(groups, st, format);
      const rows = st[myGroup];
      const pos = rows.findIndex((r) => r.code === g.myTeam);
      const qualified = pos < format.advancePerGroup || (pos === format.advancePerGroup && bestThirds.some((t2) => t2.code === g.myTeam));
      g.phase = 'ko';
      g.rounds = [{ name: format.rounds[0], matches: buildFirstRound(groups, st, format) }];
      if (!qualified) {
        g.eliminated = true;
        g.runResult = { type: 'group', g: myGroup, pos: pos + 1 };
      }
    }
    setGame(g);
    setLiveMatch(null);
    setPending(null);
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

  const playKoMatch = () =>
    prepMatch(myKoMatch, t('label.ko', { round: t(`round.${currentRound.name}`) }), true);

  const advanceRoundState = (g) => {
    const round = g.rounds[g.rounds.length - 1];
    for (const m of round.matches) {
      if (!m.result) m.result = strip(simulateMatch(TEAMS[m.home], TEAMS[m.away], { knockout: true }));
    }
    if (round.matches.length === 1) {
      g.champion = round.matches[0].result.winner;
      g.phase = 'done';
      if (g.champion === g.myTeam) g.runResult = { type: 'champion' };
    } else {
      g.rounds.push({
        name: format.rounds[g.rounds.length],
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
      g.runResult = { type: 'ko', round: round.name };
    }
    advanceRoundState(g);
    setGame(g);
    setLiveMatch(null);
    setPending(null);
    setScreen(g.phase === 'done' ? 'end' : 'hub');
  };

  const autoSimRest = () => {
    const g = clone(game);
    while (g.phase !== 'done') advanceRoundState(g);
    setGame(g);
    setScreen('end');
  };

  // ── 시작/리셋 ─────────────────────────────────────────────────
  const chooseComp = (c) => {
    setComp(c);
    storeComp(c);
    setGame(null);
    setScreen('home');
  };

  const changeComp = () => {
    setGame(null);
    setComp(null);
    setScreen('home');
  };

  const startNew = () => {
    clearGame(comp);
    setGame(null);
    setHasSave(false);
    setPreviewTeam(null);
    setScreen('select');
  };

  const resume = () => {
    const g = loadGame(comp);
    if (!g) return;
    setGame(g);
    setScreen(g.phase === 'done' ? 'end' : 'hub');
  };

  const restart = () => {
    clearGame(activeComp);
    setGame(null);
    setHasSave(false);
    setScreen('home');
  };

  // ── 렌더 ─────────────────────────────────────────────────────
  // 첫 화면: 언어 선택 (아직 선택하지 않았을 때)
  if (!chosen) {
    return <LanguageSelect onPick={setLang} />;
  }

  // 두 번째 화면: 대회 선택 (월드컵 / 챔피언스리그)
  if (!comp) {
    return <CompetitionSelect onPick={chooseComp} />;
  }

  return (
    <div>
      <MusicPlayer />
      <div className="topbar">
        <div className="logo">TACTIX <span>2026</span></div>
        <div className="topbar-right">
          <div className="sub">{t(competition.id === 'ucl' ? 'app.subUcl' : 'app.sub')}</div>
          <div className="lang-toggle">
            <button className={lang === 'ko' ? 'active' : ''} onClick={() => setLang('ko')}>KO</button>
            <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
          </div>
        </div>
      </div>

      {screen === 'home' && (
        <div className="hero">
          <h1>TACTIX <span>2026</span></h1>
          <div className="comp-pill">{t(competition.nameKey)}</div>
          <p style={{ whiteSpace: 'pre-line' }}>{t(competition.id === 'ucl' ? 'home.taglineUcl' : 'home.tagline')}</p>
          <div className="actions">
            <button className="btn big" onClick={startNew}>{t('home.new')}</button>
            {hasSave && <button className="btn big ghost" onClick={resume}>{t('home.resume')}</button>}
          </div>
          <div style={{ marginTop: 18 }}>
            <button className="btn ghost" onClick={changeComp}>{t('home.changeComp')}</button>
          </div>
        </div>
      )}

      {screen === 'select' && (
        competition.pickerKey === 'club'
          ? <ClubSelect onSelect={(c) => { setPreviewTeam(c); setScreen('squad'); }} />
          : <TeamSelect onSelect={(c) => { setPreviewTeam(c); setScreen('squad'); }} />
      )}

      {screen === 'squad' && (
        <SquadView
          teamCode={previewTeam}
          rankKey={format.rankKey}
          confirmKey={competition.id === 'ucl' ? 'squad.confirmClub' : 'squad.confirm'}
          onBack={() => setScreen('select')}
          onConfirm={() => {
            setGame(newGame(previewTeam, comp));
            setScreen('hub');
          }}
        />
      )}

      {screen === 'lineup' && pending && (
        <LineupScreen pending={pending} onKickoff={kickoff} onBack={() => { setPending(null); setScreen('hub'); }} />
      )}

      {screen === 'match' && liveMatch && (
        <MatchView
          key={`${pending?.label}-${pending?.home}-${pending?.away}`}
          match={liveMatch}
          mySide={pending?.mySide}
          roundLabel={pending?.label || ''}
          structure={matchStructure}
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

// ── 언어 선택(첫) 화면 ─────────────────────────────────────────────
function LanguageSelect({ onPick }) {
  return (
    <div className="lang-select">
      <div className="lang-hero">
        <div className="logo big">TACTIX <span>2026</span></div>
        <h1>{`언어를 선택하세요 / Choose your language`}</h1>
        <p>
          같은 게임, 언어만 다릅니다. 선택은 저장되며 상단바에서 언제든 바꿀 수 있어요.<br />
          Same game in both — only the language differs. You can switch any time from the top bar.
        </p>
        <div className="lang-cards">
          <button className="lang-card" onClick={() => onPick('ko')}>
            <span className="lang-flag">🇰🇷</span>
            <span className="lang-name">한국어</span>
            <span className="lang-desc">한국어로 플레이</span>
          </button>
          <button className="lang-card en" onClick={() => onPick('en')}>
            <span className="lang-flag">🇬🇧</span>
            <span className="lang-name">English</span>
            <span className="lang-desc">Play in English</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 대회 선택 화면 ─────────────────────────────────────────────────
function CompetitionSelect({ onPick }) {
  const { t } = useLang();
  return (
    <div className="lang-select">
      <div className="lang-hero">
        <div className="logo big">TACTIX <span>2026</span></div>
        <h1>{t('compselect.title')}</h1>
        <p>{t('compselect.subtitle')}</p>
        <div className="lang-cards">
          <button className="lang-card" onClick={() => onPick('wc')}>
            <span className="lang-flag">🏆</span>
            <span className="lang-name">{t('comp.wc')}</span>
            <span className="lang-desc">{t('comp.wcDesc')}</span>
          </button>
          <button className="lang-card en" onClick={() => onPick('ucl')}>
            <span className="lang-flag">⚽</span>
            <span className="lang-name">{t('comp.ucl')}</span>
            <span className="lang-desc">{t('comp.uclDesc')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Hub({
  game, myGroup, standings, fixture, myKoMatch,
  showAllGroups, onToggleGroups, onPlayGroup, onPlayKo, onAutoSim, onRestart,
}) {
  const { t, tn, lang } = useLang();
  const [showStats, setShowStats] = React.useState(false);
  const me = TEAMS[game.myTeam];
  const groupKeys = Object.keys(COMPETITIONS[game.comp].groups);
  const stageEn = game.phase === 'group'
    ? `Group ${myGroup}, matchday ${Math.min(game.matchday, 3)}`
    : `knockout stage (${currentRoundName(game)})`;
  const situation = `Managing ${me.nameEn}. Stage: ${stageEn}.`;

  return (
    <div>
      <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Flag code={me.code} size={22} />{' '}
          <strong style={{ fontSize: '1.15rem' }}>{tn(me)}</strong>
          <span className="badge">
            {game.phase === 'group'
              ? t('hub.groupBadge', { g: myGroup, n: Math.min(game.matchday, 3) })
              : t('common.tournament')}
          </span>
          {game.eliminated && <span className="badge danger-text">{t('common.eliminated')}</span>}
        </div>
        <button className="btn danger" onClick={onRestart}>{t('common.toHome')}</button>
      </div>

      {game.phase === 'group' && (
        <>
          {fixture && <NextFixture fixture={fixture} onPlay={onPlayGroup} label={t('results.line', { n: game.matchday })} compId={game.comp} />}
          <div className="panel">
            <h3 style={{ marginBottom: 10 }}>{t('hub.groupStandings', { g: myGroup })}</h3>
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
              label={t(`round.${game.rounds[game.rounds.length - 1].name}`)}
              compId={game.comp}
            />
          )}
          {game.eliminated && (
            <div className="panel" style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--dim)', marginBottom: 12 }}>
                {t('hub.eliminatedMsg', { me: tn(me), summary: runSummaryText(t, game.runResult) })}
              </p>
              <button className="btn" onClick={onAutoSim}>{t('hub.autoSim')}</button>
            </div>
          )}
          <div className="panel">
            <h3 style={{ marginBottom: 10 }}>{t('hub.bracket')}</h3>
            <Bracket rounds={game.rounds} myTeam={game.myTeam} />
          </div>
        </>
      )}

      <div className="panel">
        <button className="btn ghost" onClick={() => setShowStats((v) => !v)}>
          {t('hub.stats')}
        </button>
        {showStats && <div style={{ marginTop: 14 }}><StatsView game={game} /></div>}
      </div>

      <LearnCoach situation={situation} />

      <div className="panel">
        <button className="btn ghost" onClick={onToggleGroups}>
          {showAllGroups ? t('hub.hideAll') : t('hub.showAll')}
        </button>
        {showAllGroups && (
          <div className="grid2" style={{ marginTop: 14 }}>
            {groupKeys.map((g) => (
              <div key={g}>
                <h3 style={{ margin: '6px 0' }}>{t('hub.groupShort', { g })}</h3>
                <Standings rows={standings[g]} myTeam={game.myTeam} highlightQualified={game.matchday > 3} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function currentRoundName(game) {
  const r = game.rounds[game.rounds.length - 1];
  return r ? r.name : '';
}

function NextFixture({ fixture, onPlay, label, compId }) {
  const { t, tn } = useLang();
  const h = TEAMS[fixture.home];
  const a = TEAMS[fixture.away];
  const metaKey = compId === 'ucl' ? 'fixture.metaClub' : 'fixture.meta';
  return (
    <div className="panel next-fixture">
      <div className="matchup-label">{t('fixture.next', { label })}</div>
      <div className="fixture">
        <span className="side"><Flag code={h.code} size={28} /> {tn(h)}</span>
        <span className="vs">{t('common.vs')}</span>
        <span className="side">{tn(a)} <Flag code={a.code} size={28} /></span>
      </div>
      <div className="fixture-meta">
        {t(metaKey, { hr: h.ranking, hrt: h.rating, ar: a.ranking, art: a.rating })}
      </div>
      <div className="match-actions">
        <button className="btn big" onClick={onPlay}>{t('fixture.prep')}</button>
      </div>
    </div>
  );
}

function GroupResults({ results }) {
  const { t, tn } = useLang();
  if (!results.length) return null;
  return (
    <ul className="results-list" style={{ marginTop: 12 }}>
      {results.map((r, i) => (
        <li key={i}>
          {t('results.line', { n: r.matchday })} — <Flag code={r.home} size={14} /> {tn(TEAMS[r.home])} {r.homeGoals} : {r.awayGoals} {tn(TEAMS[r.away])} <Flag code={r.away} size={14} />
          {r.upset && <span className="upset-tag"> {t('results.upset')}</span>}
        </li>
      ))}
    </ul>
  );
}
