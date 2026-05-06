import React, { useState, useRef } from 'react';
import CharacterCard from './CharacterCard';
import AvatarPicker from './AvatarPicker';
import { TrashIcon, CloseIcon, TheaterMaskIcon, TargetIcon, PackageIcon, SparklesIcon } from '../icons';
import './Settings.css';

export default function Settings({
  characters,
  onAdd,
  onUpdate,
  onRemove,
  live2dModels,
  live2dCurrent,
  onLive2dAdd,
  onLive2dRemove,
  onLive2dSelect,
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPersonality, setNewPersonality] = useState('');
  const [newAvatarId, setNewAvatarId] = useState('avt-1');
  const [colorIndex, setColorIndex] = useState(0);

  // Live2D import state
  const [live2dTab, setLive2dTab] = useState('info');
  const [importName, setImportName] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const zipInputRef = useRef(null);

  // Avatar picker state
  const [pickingCharId, setPickingCharId] = useState(null);

  const presetColors = ['#ff6b9d', '#4ecdc4', '#ffd93d', '#6c5ce7', '#ff8a5c', '#a29bfe', '#fd79a8', '#00cec9'];

  const handleAdd = () => {
    if (!newName.trim()) return;
    const isCustomImg = newAvatarId && (newAvatarId.startsWith('data:image/') || newAvatarId.startsWith('blob:'));
    onAdd({
      name: newName.trim(),
      personality: newPersonality.trim() || '待设定性格...',
      avatarId: isCustomImg ? null : newAvatarId,
      avatarCustomUrl: isCustomImg ? newAvatarId : null,
      color: presetColors[colorIndex % presetColors.length],
    });
    setNewName('');
    setNewPersonality('');
    setNewAvatarId('avt-1');
    setColorIndex((i) => (i + 1) % presetColors.length);
    setShowAdd(false);
  };

  const handleImportModel = async () => {
    if (!importName.trim() || !importUrl.trim()) {
      setImportError('请填写角色名和模型 URL');
      return;
    }
    setImporting(true);
    setImportError('');
    try {
      const resp = await fetch(importUrl, { method: 'HEAD' });
      if (!resp.ok) {
        setImportError('无法访问该 URL，请检查地址是否正确');
        setImporting(false);
        return;
      }
      onLive2dAdd({
        name: importName.trim(),
        url: importUrl.trim(),
        id: 'l2d_' + Date.now(),
      });
      setImportName('');
      setImportUrl('');
    } catch (e) {
      setImportError('连接失败: ' + e.message);
    } finally {
      setImporting(false);
    }
  };

  const handleLocalImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setImportError('请上传 .zip 格式的 Live2D 模型压缩包');
      e.target.value = '';
      return;
    }

    setImporting(true);
    setImportError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', importName.trim() || file.name.replace(/\.zip$/i, '').replace(/[_-]/g, ' '));

      const resp = await fetch('/api/live2d/upload', {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || `上传失败 (${resp.status})`);
      }

      const data = await resp.json();
      onLive2dAdd({ name: data.name, url: data.url, id: data.id });
      setImportName('');
      setImportError('');
    } catch (err) {
      console.error('ZIP import error:', err);
      setImportError('导入失败: ' + (err.message || '未知错误'));
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleRemoveModel = (model) => {
    fetch(`/api/live2d/model/${model.id}`, { method: 'DELETE' }).catch(() => {});
    onLive2dRemove(model.id);
  };

  const pickingChar = characters.find((c) => c.id === pickingCharId);

  const handleAvatarSelect = (value) => {
    if (pickingCharId) {
      if (value && (value.startsWith('data:image/') || value.startsWith('blob:'))) {
        onUpdate(pickingCharId, { avatarCustomUrl: value, avatarId: null });
      } else {
        onUpdate(pickingCharId, { avatarId: value, avatarCustomUrl: null });
      }
    }
    setPickingCharId(null);
  };

  return (
    <div className="settings">
      {/* ===== Tab Navigation ===== */}
      <div className="settings-tabs">
        <button
          className={`settings-tab ${live2dTab === 'info' ? 'active' : ''}`}
          onClick={() => setLive2dTab('info')}
        >
          <TheaterMaskIcon size={16} />
          <span>角色管理</span>
        </button>
        <button
          className={`settings-tab ${live2dTab === 'live2d' ? 'active' : ''}`}
          onClick={() => setLive2dTab('live2d')}
        >
          <TargetIcon size={16} />
          <span>Live2D 模型</span>
        </button>
      </div>

      {/* ===== Character Management ===== */}
      {live2dTab === 'info' && (
        <div className="settings-panel">
          <div className="settings-header">
            <div>
              <h2>对话角色</h2>
              <p className="settings-sub">
                管理参与对话的角色，已添加 {characters.length} 个角色
              </p>
            </div>
          </div>

          <div className="settings-char-list">
            {characters.map((c) => (
              <CharacterCard
                key={c.id}
                character={c}
                onUpdate={onUpdate}
                onRemove={onRemove}
                onPickAvatar={setPickingCharId}
              />
            ))}
          </div>

          {showAdd ? (
            <div className="add-form">
              <h3 className="add-form-title">添加新角色</h3>
              <input
                className="add-input"
                placeholder="角色名称"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
              <textarea
                className="add-textarea"
                placeholder="角色性格描述（例如：傲娇的赛博黑客，说话带刺但心地善良）"
                value={newPersonality}
                onChange={(e) => setNewPersonality(e.target.value)}
                rows={3}
              />
              <div className="add-avatar-section">
                <AvatarPicker selectedId={newAvatarId} onSelect={setNewAvatarId} />
              </div>
              <div className="add-form-actions">
                <button className="add-btn add-btn--confirm" onClick={handleAdd}>
                  添加角色
                </button>
                <button className="add-btn add-btn--cancel" onClick={() => setShowAdd(false)}>
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button className="add-char-btn" onClick={() => setShowAdd(true)}>
              + 添加角色
            </button>
          )}
        </div>
      )}

      {/* ===== Live2D Management ===== */}
      {live2dTab === 'live2d' && (
        <div className="settings-panel">
          <div className="settings-header">
            <div>
              <h2>Live2D 角色模型</h2>
              <p className="settings-sub">
                导入和管理 Live2D 角色模型，模型将显示在对话界面左侧
              </p>
            </div>
          </div>

          <div className="live2d-import-form">
            <h3 className="add-form-title">导入 Live2D 模型</h3>
            <p className="live2d-import-hint">
              输入 Live2D 模型文件（.model3.json）的 URL 地址。
              可以从 Live2D 官网或创作者社区获取免费模型。
            </p>
            <input
              className="add-input"
              placeholder="角色名称（如：小春）"
              value={importName}
              onChange={(e) => setImportName(e.target.value)}
            />
            <input
              className="add-input"
              placeholder="模型文件 URL（以 .model3.json 结尾）"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
            />
            <button
              className="add-btn add-btn--confirm"
              onClick={handleImportModel}
              disabled={importing}
            >
              {importing ? '验证中...' : '导入模型'}
            </button>

            <div className="picker-divider">
              <span className="picker-divider-text">或上传 ZIP 模型包</span>
            </div>

            <div className="zip-upload-area">
              <input
                ref={zipInputRef}
                type="file"
                accept=".zip"
                onChange={handleLocalImport}
                style={{ display: 'none' }}
              />
              <div
                className="zip-upload-placeholder"
                onClick={() => zipInputRef.current?.click()}
              >
                <div className="zip-upload-icon">
                  <PackageIcon size={24} />
                </div>
                <p className="zip-upload-text">点击选择 ZIP 压缩包</p>
                <p className="zip-upload-hint">
                  支持包含 .model3.json 的 Live2D 模型包（ZIP 格式）
                </p>
              </div>
              {importError && (
                <p className="live2d-error-msg" style={{ marginTop: 12 }}>{importError}</p>
              )}
            </div>
          </div>

          <div className="live2d-model-list">
            <h3 className="add-form-title">已导入的模型 ({live2dModels.length})</h3>
            {live2dModels.length === 0 ? (
              <div className="live2d-empty-models">
                <p>还没有导入模型</p>
                <p className="settings-sub">请使用上方表单导入 Live2D 角色模型</p>
              </div>
            ) : (
              live2dModels.map((m) => (
                <div
                  key={m.id}
                  className={`live2d-model-card ${live2dCurrent === m.id ? 'active' : ''}`}
                  onClick={() => onLive2dSelect(m.id)}
                >
                  <div className="live2d-model-info">
                    <span className="live2d-model-name">{m.name}</span>
                    <span className="live2d-model-url" title={m.url}>
                      {m.url.length > 50 ? m.url.slice(0, 50) + '...' : m.url}
                    </span>
                  </div>
                  <div className="live2d-model-actions">
                    {live2dCurrent === m.id && <span className="live2d-active-badge">使用中</span>}
                    <button
                      className="live2d-model-del"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveModel(m);
                      }}
                      title="删除模型"
                    >
                      <TrashIcon size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="live2d-guide">
            <h3 className="add-form-title">
              <SparklesIcon size={14} />
              如何获取 Live2D 模型？
            </h3>
            <ul className="live2d-guide-list">
              <li>从 <strong>Live2D 官网</strong> 下载官方示例模型（Cubism 4 格式）</li>
              <li>从 <strong>Booth.pm</strong> 或 <strong>Fantia</strong> 购买创作者制作的模型</li>
              <li>使用 <strong>VRoid</strong> 创建自己的角色并导出为 Live2D 格式</li>
              <li>从开源社区（如 GitHub）获取免费 Live2D 模型</li>
            </ul>
            <p className="live2d-guide-tip">
              支持导入本地 ZIP 模型包或远程 URL，模型文件需为 Cubism 4 格式（.model3.json）
            </p>
          </div>
        </div>
      )}

      {/* ===== Avatar Picker Overlay ===== */}
      {pickingChar && (
        <div className="picker-overlay" onClick={() => setPickingCharId(null)}>
          <div className="picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="picker-modal-header">
              <span>选择 <strong>{pickingChar.name}</strong> 的形象</span>
              <button className="picker-modal-close" onClick={() => setPickingCharId(null)}>
                <CloseIcon size={16} />
              </button>
            </div>
            <AvatarPicker selectedId={pickingChar.avatarId} onSelect={handleAvatarSelect} />
          </div>
        </div>
      )}
    </div>
  );
}
