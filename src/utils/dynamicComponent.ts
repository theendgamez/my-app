import React from 'react';
import dynamic from 'next/dynamic';

// Helper function to load components dynamically with client-side rendering
export function dynamicClientComponent<T>(importFunc: () => Promise<{ default: React.ComponentType<T> }>) {
  return dynamic(importFunc, {
    ssr: false,
    loading: () => React.createElement('div', { className: 'animate-pulse p-4 bg-gray-100 rounded' }, 'Loading component...')
  });
}
