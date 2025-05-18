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
    success: 'bg-green-100 border-green-500 text-green-800',
    info: 'bg-blue-100 border-blue-500 text-blue-800',
    error: 'bg-red-100 border-red-500 text-red-800',
    warning: 'bg-yellow-100 border-yellow-500 text-yellow-800',
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center p-4 mb-4 max-w-xs border-l-4 rounded-lg shadow-md ${styles[type]}`}>
      <div className="flex items-center">
        <div className="inline-flex items-center justify-center mr-2">
          {icons[type]}
        </div>
        <div>{message}</div>
      </div>
      <button onClick={handleClose} className="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 hover:bg-opacity-20 hover:bg-gray-400">
        <FiX className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
