import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Live2DCubismModel } from 'live2d-renderer-lite';
import { TheaterMaskIcon, AlertTriangleIcon, RefreshIcon } from '../icons';
import './Live2DViewer.css';

export default function Live2DViewer({ modelSrc, characterName, accentColor }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const modelRef = useRef(null);
  const rafRef = useRef(null);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const initLive2D = useCallback(async () => {
    if (!canvasRef.current || !modelSrc) {
      setStatus('no_model');
      return;
    }

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (modelRef.current) {
      modelRef.current.destroy();
      modelRef.current = null;
    }

    try {
      setStatus('loading');
      setErrorMsg('');

      const canvas = canvasRef.current;
      const container = containerRef.current;
      const w = container.clientWidth || 260;
      const h = container.clientHeight || 400;

      canvas.width = w;
      canvas.height = h;

      const model = new Live2DCubismModel(canvas, {
        autoAnimate: false,
        autoInteraction: true,
        tapInteraction: true,
        randomMotion: true,
        enablePan: false,
      });

      const origLoadMotion = model.loadMotion.bind(model);
      const MIN_FADE = 0.5;
      model.loadMotion = function (...args) {
        const motion = origLoadMotion(...args);
        if (motion) {
          if (motion._fadeInSeconds < MIN_FADE) motion.setFadeInTime(MIN_FADE);
          if (motion._fadeOutSeconds < MIN_FADE) motion.setFadeOutTime(MIN_FADE);
        }
        return motion;
      };

      await model.load(modelSrc);

      if (!mountedRef.current) {
        model.destroy();
        return;
      }

      modelRef.current = model;

      const loop = () => {
        if (!mountedRef.current || !modelRef.current) return;
        modelRef.current.update();
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();

      if (mountedRef.current) {
        setStatus('ready');
      }
    } catch (err) {
      if (mountedRef.current) {
        console.error('Live2D init error:', err);
        setStatus('error');
        setErrorMsg(err.message || '初始化失败');
      }
    }
  }, [modelSrc]);

  useEffect(() => {
    mountedRef.current = true;
    initLive2D();
    return () => {
      mountedRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (modelRef.current) {
        modelRef.current.destroy();
        modelRef.current = null;
      }
    };
  }, [initLive2D]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w > 0 && h > 0) {
          canvas.width = w;
          canvas.height = h;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Block mouse wheel zoom — must be on the canvas in capture phase
  // to intercept before the Live2D library handles it
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blockWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    canvas.addEventListener('wheel', blockWheel, { passive: false, capture: true });
    return () => canvas.removeEventListener('wheel', blockWheel, { capture: true });
  }, []);

  const handleRetry = () => {
    initLive2D();
  };

  return (
    <div className="live2d-viewer" ref={containerRef}>
      <canvas ref={canvasRef} className="live2d-canvas" />

      {status === 'loading' && (
        <div className="live2d-overlay">
          <div className="live2d-loading">
            <div className="live2d-spinner" />
            <span>加载角色中...</span>
          </div>
        </div>
      )}

      {status === 'no_model' && (
        <div className="live2d-overlay">
          <div className="live2d-placeholder">
            <div className="placeholder-icon">
              <TheaterMaskIcon size={48} />
            </div>
            <p className="placeholder-text">还没有 Live2D 角色</p>
            <p className="placeholder-hint">前往设置导入角色素材</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="live2d-overlay">
          <div className="live2d-error-state">
            <div className="error-icon">
              <AlertTriangleIcon size={36} />
            </div>
            <p className="error-text">角色加载失败</p>
            <p className="error-detail">{errorMsg}</p>
            <button className="retry-btn" onClick={handleRetry}>
              <RefreshIcon size={14} />
              <span>重试</span>
            </button>
          </div>
        </div>
      )}

      {status === 'ready' && characterName && (
        <div className="live2d-name-tag" style={{ background: accentColor || 'rgba(79,172,254,0.8)' }}>
          {characterName}
        </div>
      )}
    </div>
  );
}
