const API_BASE = '/api';

export async function sendChatMessage(userInput, history = [], characters = []) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_input: userInput,
      history,
      characters,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || '请求失败');
  }

  return res.json();
}

export async function fetchAvatars() {
  try {
    const res = await fetch(`/api/avatars`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function healthCheck() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
