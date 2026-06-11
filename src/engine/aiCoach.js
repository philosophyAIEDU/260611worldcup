// AI 코치 — Google Gemini API 연동 (모델: gemini-3.1-flash-lite)
// 사용자가 직접 입력한 API 키를 localStorage에 보관해 사용한다.

const KEY_STORAGE = 'tactix2026-gemini-key';
const MODEL = 'gemini-3.1-flash-lite';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export function getApiKey() {
  try { return localStorage.getItem(KEY_STORAGE) || ''; } catch { return ''; }
}

export function setApiKey(key) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch { /* ignore */ }
}

// history: [{ role: 'user' | 'model', text }]
export async function askCoach(apiKey, systemContext, history) {
  const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemContext }] },
      contents: history.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      })),
      generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
    }),
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      if (err.error?.message) detail = err.error.message;
    } catch { /* keep status */ }
    throw new Error(detail);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('');
  if (!text) throw new Error('AI 응답이 비어 있습니다.');
  return text;
}
