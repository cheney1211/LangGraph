import React, { useState } from 'react';
import { getAvatarUrl } from '../presets';
import { EditIcon, TrashIcon, CameraIcon } from '../icons';
import './CharacterCard.css';

export default function CharacterCard({ character, onUpdate, onRemove, onPickAvatar }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(character.name);
  const [personality, setPersonality] = useState(character.personality);

  const handleSave = () => {
    if (!name.trim()) return;
    onUpdate(character.id, { name: name.trim(), personality: personality.trim() });
    setEditing(false);
  };

  const handleCancel = () => {
    setName(character.name);
    setPersonality(character.personality);
    setEditing(false);
  };

  const avatarUrl = getAvatarUrl(character.avatarCustomUrl || character.avatarId);

  return (
    <div className="char-card" style={{ borderLeftColor: character.color || '#4facfe' }}>
      <div className="char-card-avatar" onClick={() => onPickAvatar(character.id)}>
        <img src={avatarUrl} alt={character.name} />
        <div className="char-card-avatar-overlay">
          <CameraIcon size={20} />
        </div>
      </div>

      <div className="char-card-body">
        {editing ? (
          <div className="char-card-edit">
            <input
              className="edit-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="角色名称"
              autoFocus
            />
            <textarea
              className="edit-textarea"
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              placeholder="角色性格描述..."
              rows={3}
            />
            <div className="edit-actions">
              <button className="edit-btn edit-btn--save" onClick={handleSave}>保存</button>
              <button className="edit-btn edit-btn--cancel" onClick={handleCancel}>取消</button>
            </div>
          </div>
        ) : (
          <>
            <div className="char-card-header">
              <h3 className="char-card-name">{character.name}</h3>
              <div className="char-card-actions">
                <button className="char-action-btn" onClick={() => setEditing(true)} title="编辑">
                  <EditIcon size={15} />
                </button>
                <button className="char-action-btn" onClick={() => onRemove(character.id)} title="删除">
                  <TrashIcon size={15} />
                </button>
              </div>
            </div>
            <p className="char-card-personality">{character.personality}</p>
          </>
        )}
      </div>
    </div>
  );
}
