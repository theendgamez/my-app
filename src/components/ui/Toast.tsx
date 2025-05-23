'use client';

import React, { useState, useEffect } from 'react';
import { FiCheck, FiInfo, FiAlertCircle, FiX } from 'react-icons/fi';

export interface ToastProps {
  type: 'success' | 'info' | 'error' | 'warning';
  message: string;
  duration?: number;
  onClose?: () => void;
}

const Toast: React.FC<ToastProps> = ({
  type,
  message,
  duration = 3000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) {
        onClose();
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      onClose();
    }
  };

  if (!isVisible) return null;

  const icons = {
    success: <FiCheck className="w-5 h-5" />,
    info: <FiInfo className="w-5 h-5" />,
    error: <FiAlertCircle className="w-5 h-5" />,
    warning: <FiAlertCircle className="w-5 h-5" />,
  };

  const styles = {
    success: 'bg-white border-l-4 border-success-500 text-success-800 shadow-lg',
    info: 'bg-white border-l-4 border-primary-500 text-primary-800 shadow-lg',
    error: 'bg-white border-l-4 border-error-500 text-error-800 shadow-lg',
    warning: 'bg-white border-l-4 border-warning-500 text-warning-800 shadow-lg',
  };

  return (
    <div className={`
      relative max-w-sm p-4 rounded-lg backdrop-blur-sm
      transform transition-all duration-300 ease-in-out
      ${styles[type]}
      animate-fade-in
    `}>
      <div className="flex items-center">
        <div className="flex-shrink-0 mr-3">
          {icons[type]}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button 
          onClick={handleClose} 
          className="ml-4 -mr-1 p-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          <FiX className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
