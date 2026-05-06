import React, { useState, useCallback, useEffect } from 'react';
import Chat from './components/Chat';
import Settings from './components/Settings';
import { sendChatMessage } from './api';
import { ChatIcon, SettingsIcon } from './icons';

const DEFAULT_CHARACTERS = [
  { id: 'char_1', name: 'Alice', personality: '傲娇的赛博黑客，说话带刺但心地善良', avatarId: 'lor-1', color: '#ff6b9d' },
  { id: 'char_2', name: 'Bob', personality: '沉稳冷酷的企业特工，言语简洁有力', avatarId: 'avt-5', color: '#4ecdc4' },
];

function loadFromStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function persistToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage full or unavailable */ }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [characters, setCharacters] = useState(() => loadFromStorage('rp_characters', DEFAULT_CHARACTERS));
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);

  // Live2D state
  const [live2dModels, setLive2dModels] = useState(() => loadFromStorage('rp_live2d_models', []));
  const [live2dCurrent, setLive2dCurrent] = useState(() => loadFromStorage('rp_live2d_current', null));
  const [live2dVisible, setLive2dVisible] = useState(true);

  useEffect(() => { persistToStorage('rp_characters', characters); }, [characters]);
  useEffect(() => { persistToStorage('rp_live2d_models', live2dModels); }, [live2dModels]);
  useEffect(() => { persistToStorage('rp_live2d_current', live2dCurrent); }, [live2dCurrent]);

  const addCharacter = useCallback((char) => {
    setCharacters((prev) => [...prev, { ...char, id: 'char_' + Date.now() }]);
  }, []);

  const updateCharacter = useCallback((id, data) => {
    setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
  }, []);

  const removeCharacter = useCallback((id) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleSend = useCallback(async (text) => {
    if (!text.trim() || sending) return;

    const userMsg = { role: 'user', content: text, id: Date.now().toString() };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const history = messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
        name: m.characterName || undefined,
      }));

      const charNameToId = {};
      characters.forEach((c) => { charNameToId[c.name.toLowerCase()] = c.id; });

      const data = await sendChatMessage(text, history, characters);
      const botMessages = (data.responses || []).map((resp, i) => {
        const name = resp.character_name || resp.name || '';
        const charId = charNameToId[name.toLowerCase()] || null;
        return {
          role: 'assistant',
          content: typeof resp === 'string' ? resp : resp.content || '',
          characterName: name,
          characterId: charId,
          id: (Date.now() + i).toString(),
        };
      });

      setMessages((prev) => [...prev, ...botMessages]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '⚠️ 连接失败：' + err.message, id: Date.now().toString() },
      ]);
    } finally {
      setSending(false);
    }
  }, [messages, sending, characters]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const getCharacterInfo = useCallback(
    (characterId, characterName) => {
      if (characterId) {
        const found = characters.find((c) => c.id === characterId);
        if (found) return found;
      }
      if (characterName) {
        return characters.find((c) => c.name.toLowerCase() === characterName.toLowerCase()) || null;
      }
      return null;
    },
    [characters]
  );

  // Live2D handlers
  const handleLive2dAdd = useCallback((model) => {
    setLive2dModels((prev) => {
      const updated = [...prev, model];
      if (!live2dCurrent) {
        setLive2dCurrent(model.id);
      }
      return updated;
    });
  }, [live2dCurrent]);

  const handleLive2dRemove = useCallback((id) => {
    setLive2dModels((prev) => prev.filter((m) => m.id !== id));
    setLive2dCurrent((prev) => {
      if (prev !== id) return prev;
      const remaining = live2dModels.filter((m) => m.id !== id);
      return remaining.length > 0 ? remaining[0].id : null;
    });
  }, [live2dModels]);

  const handleLive2dSelect = useCallback((id) => {
    setLive2dCurrent(id);
  }, []);

  const currentModel = live2dModels.find((m) => m.id === live2dCurrent);
  const live2dModelUrl = currentModel?.url || null;
  const live2dCharName = currentModel?.name || '';

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          <img
            className="app-logo-img"
            src="/static/logo/logo.svg"
            alt="Logo"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <span className="app-title-text">角色扮演对话平台</span>
        </h1>
        <nav className="app-nav">
          <button
            className={`nav-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <ChatIcon size={16} />
            <span>对话</span>
          </button>
          <button
            className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <SettingsIcon size={16} />
            <span>设置</span>
          </button>
        </nav>
      </header>

      <main className="app-main">
        {activeTab === 'chat' ? (
          <Chat
            messages={messages}
            characters={characters}
            onSend={handleSend}
            sending={sending}
            onClear={clearMessages}
            getCharacterInfo={getCharacterInfo}
            live2dModel={live2dModelUrl}
            live2dCharName={live2dCharName}
            live2dAccent="#4facfe"
            live2dVisible={live2dVisible}
            onToggleLive2d={() => setLive2dVisible((v) => !v)}
          />
        ) : (
          <Settings
            characters={characters}
            onAdd={addCharacter}
            onUpdate={updateCharacter}
            onRemove={removeCharacter}
            live2dModels={live2dModels}
            live2dCurrent={live2dCurrent}
            onLive2dAdd={handleLive2dAdd}
            onLive2dRemove={handleLive2dRemove}
            onLive2dSelect={handleLive2dSelect}
          />
        )}
      </main>
    </div>
  );
}
