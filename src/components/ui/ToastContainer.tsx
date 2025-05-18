'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Toast, { ToastProps } from './Toast';

export interface ToastData extends ToastProps {
  id: string;
}

interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxToasts?: number;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  position = 'bottom-right',
  maxToasts = 3,
}) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback(
    (toast: Omit<ToastData, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prevToasts) => {
        // If we have too many toasts, remove the oldest one
        if (prevToasts.length >= maxToasts) {
          return [...prevToasts.slice(1), { ...toast, id }];
        }
        return [...prevToasts, { ...toast, id }];
      });
    },
    [maxToasts]
  );

  // Listen for toast events
  useEffect(() => {
    const handleToast = (event: CustomEvent<ToastProps>) => {
      const { type, message, duration } = event.detail;
      addToast({ type, message, duration });
    };

    window.addEventListener('add-toast', handleToast as EventListener);

    return () => {
      window.removeEventListener('add-toast', handleToast as EventListener);
    };
  }, [addToast]);

  const removeToast = (id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  // Position classes
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 flex flex-col gap-2`}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

// Helper function to show toast notifications
export const showToast = (props: ToastProps) => {
  const event = new CustomEvent('add-toast', { detail: props });
  window.dispatchEvent(event);
};
