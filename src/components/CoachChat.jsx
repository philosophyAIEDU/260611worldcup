import React, { useEffect, useRef, useState } from 'react';
import { askCoach, getApiKey, setApiKey } from '../engine/aiCoach.js';

// AI 수석코치 채팅 패널. context: 현재 경기/전술 상황 요약 문자열.
export default function CoachChat({ context }) {
  const [apiKey, setKey] = useState(getApiKey());
  const [keyInput, setKeyInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);

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

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setError('');
    setInput('');
    const history = [...messages, { role: 'user', text }];
    setMessages(history);
    setLoading(true);
    try {
      const reply = await askCoach(apiKey, context, history);
      setMessages([...history, { role: 'model', text: reply }]);
    } catch (e) {
      setError(`코치 연결 실패: ${e.message}`);
      setMessages(messages); // 실패한 질문 롤백
      setInput(text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="coach">
      <div className="coach-head">
        <span>🎙️ AI 수석코치</span>
        {apiKey && (
          <button className="link-btn" onClick={resetKey}>API 키 변경</button>
        )}
      </div>

      {!apiKey ? (
        <div className="coach-keybox">
          <p>
            전술 상담을 위해 Google Gemini API 키를 입력하세요.
            키는 이 브라우저(localStorage)에만 저장되며 외부로 전송되지 않습니다.
          </p>
          <div className="coach-keyrow">
            <input
              type="password"
              placeholder="Gemini API 키 (AIza…)"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveKey()}
            />
            <button className="btn" onClick={saveKey} disabled={!keyInput.trim()}>저장</button>
          </div>
          <p className="coach-hint">
            키 발급: Google AI Studio (aistudio.google.com) → Get API key · 사용 모델: gemini-3.1-flash-lite
          </p>
        </div>
      ) : (
        <>
          <div className="coach-list" ref={listRef}>
            {messages.length === 0 && (
              <div className="coach-empty">
                상대 분석, 포메이션 추천, 선발 명단 고민… 무엇이든 물어보세요.
                코치는 현재 경기 상황과 양 팀 정보를 알고 있습니다.
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`coach-msg ${msg.role}`}>{msg.text}</div>
            ))}
            {loading && <div className="coach-msg model">전술 보드를 살펴보는 중…</div>}
          </div>
          {error && <div className="coach-error">{error}</div>}
          <div className="coach-keyrow">
            <input
              placeholder="코치에게 질문하기…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              disabled={loading}
            />
            <button className="btn" onClick={send} disabled={loading || !input.trim()}>전송</button>
          </div>
        </>
      )}
    </div>
  );
}
