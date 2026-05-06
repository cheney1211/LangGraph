import React, { useEffect, useRef, useState } from 'react';
import { FALLBACK_AVATARS, getAvatarUrl, isCustomAvatar } from '../presets';
import { fetchAvatars } from '../api';
import { ImageIcon, PaletteIcon, UploadCloudIcon } from '../icons';
import './AvatarPicker.css';

export default function AvatarPicker({ selectedId, onSelect }) {
  const fileInputRef = useRef(null);
  const [avatars, setAvatars] = useState(FALLBACK_AVATARS);
  const [customPreview, setCustomPreview] = useState(
    isCustomAvatar(selectedId) ? selectedId : null
  );

  useEffect(() => {
    fetchAvatars().then((list) => {
      if (list && list.length > 0) setAvatars(list);
    });
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件（PNG、JPG、GIF 等）');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result;
      if (typeof dataUrl === 'string') {
        setCustomPreview(dataUrl);
        onSelect(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCustom = () => {
    setCustomPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onSelect(avatars[0]?.id || 'avt-1');
  };

  return (
    <div className="avatar-picker">
      {/* ===== Custom Avatar Upload ===== */}
      <div className="picker-section">
        <h4 className="picker-section-title picker-section-title--custom">
          <ImageIcon size={14} />
          <span>自定义头像</span>
        </h4>
        <div className="custom-upload-area">
          {customPreview ? (
            <div className="custom-preview-wrap">
              <img src={customPreview} alt="自定义头像" className="custom-preview-img" />
              <div className="custom-preview-actions">
                <button className="custom-btn custom-btn--change" onClick={() => fileInputRef.current?.click()}>
                  更换图片
                </button>
                <button className="custom-btn custom-btn--remove" onClick={handleRemoveCustom}>
                  移除
                </button>
              </div>
            </div>
          ) : (
            <div className="custom-upload-placeholder" onClick={() => fileInputRef.current?.click()}>
              <div className="upload-icon">
                <UploadCloudIcon size={22} />
              </div>
              <p className="upload-text">点击上传本地图片</p>
              <p className="upload-hint">支持 PNG、JPG、GIF，最大 5MB</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* ===== Divider ===== */}
      <div className="picker-divider">
        <span className="picker-divider-text">或选择预设形象</span>
      </div>

      {/* ===== Preset Avatars ===== */}
      <div className="picker-section">
        <h4 className="picker-section-title">
          <PaletteIcon size={14} />
          <span>预设二次元形象</span>
        </h4>
        <div className="picker-grid">
          {avatars.map((av) => {
            const isSelected = selectedId === av.id;
            return (
              <button
                key={av.id}
                className={`picker-item ${isSelected ? 'picker-item--selected' : ''}`}
                onClick={() => {
                  setCustomPreview(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                  onSelect(av.id);
                }}
                title={av.name}
              >
                <div className="picker-avatar-wrap">
                  <img src={getAvatarUrl(av.id, 80)} alt={av.name} />
                  {isSelected && <div className="picker-check">✓</div>}
                </div>
                <span className="picker-label">{av.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
