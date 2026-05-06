import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import Live2DViewer from './Live2DViewer';
import { SendIcon, ClearIcon, TheaterMaskIcon, ChevronLeftIcon, ChevronRightIcon, ArrowDownIcon } from '../icons';
import { getAvatarUrl } from '../presets';
import './Chat.css';

export default function Chat({
  messages,
  characters,
  onSend,
  sending,
  onClear,
  getCharacterInfo,
  live2dModel,
  live2dCharName,
  live2dAccent,
  onToggleLive2d,
  live2dVisible,
}) {
  const [input, setInput] = useState('');
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const chatEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Track scroll position for "scroll to bottom" button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
      setShowScrollBtn(!isNearBottom && messages.length > 0);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [messages.length]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const hasCharacters = characters.length > 0;
  const hasMessages = messages.length > 0;

  return (
    <div className="chat-layout">
      {/* Live2D panel - left side */}
      {live2dVisible && (
        <aside className="chat-live2d">
          <div className="live2d-panel-header">
            <span className="live2d-panel-title">Live2D</span>
            <button className="live2d-panel-close" onClick={onToggleLive2d} title="隐藏角色面板">
              <ChevronLeftIcon size={16} />
            </button>
          </div>
          <Live2DViewer
            modelSrc={live2dModel}
            characterName={live2dCharName}
            accentColor={live2dAccent}
          />
        </aside>
      )}

      {/* Chat panel */}
      <div className="chat">
        {!live2dVisible && (
          <button className="live2d-show-btn" onClick={onToggleLive2d} title="显示 Live2D 角色">
            <TheaterMaskIcon size={20} />
          </button>
        )}

        {!hasCharacters ? (
          <div className="chat-empty">
            <div className="empty-icon">
              <TheaterMaskIcon size={64} />
            </div>
            <h2>还没有角色</h2>
            <p>请先到 <strong>设置</strong> 中添加至少一个角色来开始对话</p>
          </div>
        ) : !hasMessages ? (
          <div className="chat-welcome">
            <div className="welcome-avatars">
              {characters.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  className="welcome-avatar-ring"
                  style={{ borderColor: c.color }}
                  title={c.name}
                >
                  <img
                    src={getAvatarUrl(c.avatarCustomUrl || c.avatarId)}
                    alt={c.name}
                  />
                </div>
              ))}
              {characters.length > 5 && (
                <div className="welcome-more">+{characters.length - 5}</div>
              )}
            </div>
            <h2>准备好开始角色扮演了吗？</h2>
            <p className="welcome-hint">
              参与角色：{characters.map((c) => c.name).join('、')}
            </p>
            <p className="welcome-sub">在下方输入消息开始对话吧</p>
          </div>
        ) : null}

        <div className="chat-messages" ref={messagesContainerRef}>
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              characterInfo={getCharacterInfo(msg.characterId, msg.characterName)}
            />
          ))}
          {sending && (
            <div className="chat-typing">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          )}
          <div ref={chatEndRef} />

          {showScrollBtn && (
            <button className="scroll-bottom-btn" onClick={scrollToBottom} title="滚动到底部">
              <ArrowDownIcon size={16} />
            </button>
          )}
        </div>

        <form className="chat-input-bar" onSubmit={handleSubmit}>
          {hasMessages && (
            <button type="button" className="clear-btn" onClick={onClear} title="清空对话">
              <ClearIcon size={18} />
            </button>
          )}
          <input
            type="text"
            className="chat-input"
            placeholder={
              !hasCharacters
                ? '请先在设置中添加角色...'
                : sending
                ? '正在等待回复...'
                : '输入你的消息...'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending || !hasCharacters}
          />
          <button
            type="submit"
            className="send-btn"
            disabled={!input.trim() || sending || !hasCharacters}
          >
            {sending ? (
              <span className="send-spinner" />
            ) : (
              <>
                <span>发送</span>
                <SendIcon size={14} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
