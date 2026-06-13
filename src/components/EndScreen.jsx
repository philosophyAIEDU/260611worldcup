import React from 'react';
import { TEAMS } from '../data/teams/index.js';
import { useLang, runSummaryText } from '../i18n.jsx';
import Bracket from './Bracket.jsx';
import Flag from './Flag.jsx';

export default function EndScreen({ game, onRestart }) {
  const { t, tn } = useLang();
  const champ = game.champion ? TEAMS[game.champion] : null;
  const iWon = game.champion === game.myTeam;
  const me = TEAMS[game.myTeam];

  return (
    <div>
      <div className="banner">
        <div className="trophy">{iWon ? '🏆' : '🎬'}</div>
        {iWon ? (
          <>
            <h2><Flag code={me.code} size={30} /> {t('end.championTitle', { me: tn(me) })}</h2>
            <p>{t('end.championDesc', { me: tn(me) })}</p>
          </>
        ) : (
          <>
            <h2>{t('end.over')}</h2>
            <p>
              {champ && <><Flag code={champ.code} size={16} /> </>}
              {t('end.summary', {
                champ: champ ? tn(champ) : '—',
                me: tn(me),
                summary: runSummaryText(t, game.runResult),
              })}
            </p>
          </>
        )}
        <button className="btn big" onClick={onRestart}>{t('end.restart')}</button>
      </div>
      {game.rounds.length > 0 && (
        <div className="panel">
          <h3 style={{ marginBottom: 10 }}>{t('end.results')}</h3>
          <Bracket rounds={game.rounds} myTeam={game.myTeam} />
        </div>
      )}
    </div>
  );
}
