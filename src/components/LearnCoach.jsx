import React, { useMemo } from 'react';
import { useLang } from '../i18n.jsx';
import CoachChat from './CoachChat.jsx';

// AI 영어 코치 — Gemini를 활용한 축구 영어 학습 도우미.
// 사용자가 월드컵을 즐기는 맥락(내 팀/현재 상황)을 함께 넘겨 더 친근한 학습을 돕는다.
export default function LearnCoach({ situation = '' }) {
  const { t, lang } = useLang();

  const context = useMemo(() => {
    const replyRule = lang === 'en'
      ? 'Reply in clear, friendly English suitable for an intermediate learner (CEFR A2-B1). Keep answers short. When the learner writes English, gently correct mistakes: show the corrected sentence, then a one-line tip.'
      : 'The learner is a Korean speaker. Reply mainly in English to help them learn, but add a short Korean (한국어) gloss in parentheses for hard words. When the learner writes English, gently correct mistakes and add a short Korean explanation.';
    return [
      'You are a warm, encouraging English tutor inside the football game "TACTIX 2026". You teach football/soccer English: vocabulary, common phrases, and live-commentary expressions.',
      replyRule,
      'Always be concise. Use bullet points or short lines. Add one example sentence when teaching a word. End by inviting the learner to try using the word.',
      situation ? `[The learner is currently playing] ${situation}` : '',
    ].filter(Boolean).join('\n');
  }, [lang, situation]);

  const quickPrompts = [
    { label: t('learn.q.word'), prompt: t('learn.p.word') },
    { label: t('learn.q.quiz'), prompt: t('learn.p.quiz') },
    { label: t('learn.q.offside'), prompt: t('learn.p.offside') },
    { label: t('learn.q.commentary'), prompt: t('learn.p.commentary') },
  ];

  return (
    <div className="panel learn-panel">
      <h3 style={{ marginBottom: 6 }}>{t('learn.title')}</h3>
      <p className="hint" style={{ marginTop: 0 }}>{t('learn.panelHint')}</p>
      <CoachChat context={context} variant="learn" quickPrompts={quickPrompts} />
    </div>
  );
}
