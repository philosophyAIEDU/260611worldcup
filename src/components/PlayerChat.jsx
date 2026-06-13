import React from 'react';
import { useLang } from '../i18n.jsx';
import { buildPlayerContext } from '../engine/playerPersona.js';
import CoachChat from './CoachChat.jsx';

// 선수와 1:1 대화 모달. 선택한 선수가 Gemini 페르소나로 컨디션·각오를 들려준다.
export default function PlayerChat({ player, team, opp, label, onClose }) {
  const { t, pn, lang } = useLang();
  const cond = Math.round((player.condition ?? 0.85) * 100);
  const context = buildPlayerContext({ player, team, opp, label, lang });
  const quickPrompts = [
    { label: t('player.q.cond'), prompt: t('player.p.cond') },
    { label: t('player.q.mind'), prompt: t('player.p.mind') },
    { label: t('player.q.ready'), prompt: t('player.p.ready') },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className={`pos-chip pos-${player.position}`}>{player.position}</span>
          <span className="modal-cond">{t('player.cond', { n: cond })}</span>
          <button className="link-btn" onClick={onClose}>{t('player.close')}</button>
        </div>
        <CoachChat
          context={context}
          variant="player"
          quickPrompts={quickPrompts}
          title={`💬 ${pn(player)}`}
        />
      </div>
    </div>
  );
}
