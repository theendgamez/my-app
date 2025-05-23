import React from 'react';

type SpinnerSize = 'tiny' | 'small' | 'medium' | 'large';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  className?: string;
  color?: 'primary' | 'secondary' | 'white' | 'gray';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  className = '',
  color = 'primary'
}) => {
  const sizeClasses = {
    tiny: 'w-3 h-3',
    small: 'w-5 h-5',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'border-primary-600 border-r-transparent',
    secondary: 'border-secondary-600 border-r-transparent', 
    white: 'border-white border-r-transparent',
    gray: 'border-gray-600 border-r-transparent'
  };
  
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`
        ${sizeClasses[size]} 
        border-2 
        ${colorClasses[color]}
        rounded-full 
        animate-spin
      `} />
    </div>
  );
};

export default LoadingSpinner;