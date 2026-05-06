import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { CheckCircleIcon, AlertTriangleIcon, InfoIcon, CloseIcon } from '../icons';
import './Toast.css';

const ToastContext = createContext(null);

const TOAST_DURATION = 3500;

let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback: return no-op if no provider
    return () => {};
  }
  return ctx;
}

function ToastItem({ toast, onRemove }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
    }, TOAST_DURATION);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (exiting) {
      const timer = setTimeout(() => {
        onRemove(toast.id);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [exiting, onRemove, toast.id]);

  const handleDismiss = () => {
    setExiting(true);
  };

  const icon = toast.type === 'success'
    ? <CheckCircleIcon size={16} />
    : toast.type === 'error'
    ? <AlertTriangleIcon size={16} />
    : <InfoIcon size={16} />;

  return (
    <div className={`toast toast--${toast.type} ${exiting ? 'toast--exit' : ''}`}>
      <span className="toast-icon">{icon}</span>
      <span className="toast-message">{toast.message}</span>
      <button className="toast-close" onClick={handleDismiss} title="关闭">
        <CloseIcon size={12} />
      </button>
    </div>
  );
}
