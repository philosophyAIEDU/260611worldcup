import React, { useEffect, useRef, useState } from 'react';
import { askCoach, getApiKey, setApiKey } from '../engine/aiCoach.js';
import { useLang } from '../i18n.jsx';

// Gemini 채팅 패널. 두 가지 용도로 재사용:
//   variant='coach' → AI 수석코치(전술 상담)
//   variant='learn' → AI 영어 코치(영어 학습)
// context: Gemini systemInstruction 문자열. quickPrompts: [{label, prompt}].
export default function CoachChat({ context, variant = 'coach', quickPrompts = [], title }) {
  const { t } = useLang();
  const [apiKey, setKey] = useState(getApiKey());
  const [keyInput, setKeyInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);

  const isLearn = variant === 'learn';
  const isPlayer = variant === 'player';
  const titleKey = isLearn ? 'learn.title' : isPlayer ? 'player.title' : 'coach.title';
  const emptyKey = isLearn ? 'learn.intro' : isPlayer ? 'player.intro' : 'coach.empty';
  const askKey = isLearn ? 'learn.ask' : isPlayer ? 'player.ask' : 'coach.ask';
  const thinkingKey = isLearn ? 'learn.thinking' : isPlayer ? 'player.thinking' : 'coach.thinking';

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading]);

  const saveKey = () => {
    const k = keyInput.trim();
    if (!k) return;
    setApiKey(k);
    setKey(k);
    setKeyInput('');
  };

  const resetKey = () => {
    setApiKey('');
    setKey('');
    setMessages([]);
  };

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setError('');
    setInput('');
    const history = [...messages, { role: 'user', text: msg }];
    setMessages(history);
    setLoading(true);
    try {
      const reply = await askCoach(apiKey, context, history);
      setMessages([...history, { role: 'model', text: reply }]);
    } catch (e) {
      setError(t('coach.error', { m: e.message }));
      setMessages(messages); // 실패한 질문 롤백
      if (text == null) setInput(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`coach ${isLearn ? 'coach-learn' : ''} ${isPlayer ? 'coach-player' : ''}`}>
      <div className="coach-head">
        <span>{title || t(titleKey)}</span>
        {apiKey && (
          <button className="link-btn" onClick={resetKey}>{t('coach.changeKey')}</button>
        )}
      </div>

      {!apiKey ? (
        <div className="coach-keybox">
          <p>{t('coach.keyIntro')}</p>
          <div className="coach-keyrow">
            <input
              type="password"
              placeholder={t('coach.keyPlaceholder')}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveKey()}
            />
            <button className="btn" onClick={saveKey} disabled={!keyInput.trim()}>{t('coach.save')}</button>
          </div>
          <p className="coach-hint">{t('coach.keyHint')}</p>
        </div>
      ) : (
        <>
          {quickPrompts.length > 0 && (
            <div className="coach-quick">
              {quickPrompts.map((q) => (
                <button
                  key={q.label}
                  className="chip"
                  disabled={loading}
                  onClick={() => send(q.prompt)}
                >
                  {q.label}
                </button>
              ))}
            </div>
          )}
          <div className="coach-list" ref={listRef}>
            {messages.length === 0 && <div className="coach-empty">{t(emptyKey)}</div>}
            {messages.map((msg, i) => (
              <div key={i} className={`coach-msg ${msg.role}`}>{msg.text}</div>
            ))}
            {loading && <div className="coach-msg model">{t(thinkingKey)}</div>}
          </div>
          {error && <div className="coach-error">{error}</div>}
          <div className="coach-keyrow">
            <input
              placeholder={t(askKey)}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              disabled={loading}
            />
            <button className="btn" onClick={() => send()} disabled={loading || !input.trim()}>{t('coach.send')}</button>
          </div>
        </>
      )}
    </div>
  );
}
