import React from 'react';
import { getAvatarUrl } from '../presets';
import { BookIcon, UserIcon } from '../icons';
import './MessageBubble.css';

export default function MessageBubble({ message, characterInfo }) {
  const isUser = message.role === 'user';
  const charName = message.characterName || '';
  const isNarrator = !isUser && !charName;
  const timestamp = message.timestamp ? new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : null;

  const avatarUrl = characterInfo
    ? getAvatarUrl(characterInfo.avatarCustomUrl || characterInfo.avatarId)
    : null;

  const accentColor = characterInfo?.color || '#4facfe';

  return (
    <div className={`message ${isUser ? 'message--user' : 'message--bot'} ${isNarrator ? 'message--narrator' : ''}`}>
      {!isUser && (
        <div className="message-avatar" style={{ borderColor: accentColor }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={charName || '角色'} className="avatar-img" />
          ) : isNarrator ? (
            <span className="avatar-fallback avatar-fallback--narrator">
              <BookIcon size={18} />
            </span>
          ) : (
            <span className="avatar-fallback" style={{ background: accentColor }}>
              {charName.charAt(0) || '?'}
            </span>
          )}
        </div>
      )}

      <div className="message-body">
        {!isUser && charName && (
          <div className="message-name" style={{ color: accentColor }}>
            {charName}
          </div>
        )}
        {!isUser && isNarrator && (
          <div className="message-name message-name--narrator">
            <BookIcon size={12} />
            <span>叙述者</span>
          </div>
        )}
        <div
          className={`message-content ${isUser ? 'msg-content--user' : 'msg-content--bot'}`}
          style={!isUser && characterInfo ? { borderLeftColor: accentColor } : {}}
        >
          {message.content}
        </div>
        {timestamp && (
          <span className="message-time">{timestamp}</span>
        )}
      </div>

      {isUser && (
        <div className="message-avatar message-avatar--user">
          <span className="avatar-fallback avatar-fallback--user">
            <UserIcon size={16} />
          </span>
        </div>
      )}
    </div>
  );
}
