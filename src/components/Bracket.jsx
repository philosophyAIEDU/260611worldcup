import React from 'react';
import { TEAMS } from '../data/teams/index.js';
import Flag from './Flag.jsx';

export default function Bracket({ rounds, myTeam }) {
  return (
    <div className="bracket">
      {rounds.map((round) => (
        <div className="round" key={round.name}>
          <h3>{round.name}</h3>
          {round.matches.map((m, i) => {
            const h = TEAMS[m.home];
            const a = TEAMS[m.away];
            const r = m.result;
            const mine = m.home === myTeam || m.away === myTeam;
            return (
              <div className={`bmatch ${mine ? 'mine' : ''}`} key={i}>
                <div className="row">
                  <span className={r && r.winner === m.home ? 'win' : ''}><Flag code={m.home} size={13} /> {h.name}</span>
                  <span>{r ? r.homeGoals : ''}{r && r.shootout ? ` (${r.shootout.homeScore})` : ''}</span>
                </div>
                <div className="row">
                  <span className={r && r.winner === m.away ? 'win' : ''}><Flag code={m.away} size={13} /> {a.name}</span>
                  <span>{r ? r.awayGoals : ''}{r && r.shootout ? ` (${r.shootout.awayScore})` : ''}</span>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
