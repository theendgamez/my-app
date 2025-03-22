interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function LoadingSpinner({ 
  size = 'medium', 
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'h-4 w-4 border-2',
    medium: 'h-8 w-8 border-2',
    large: 'h-16 w-16 border-4'
  };

  return (
    <div className={`animate-spin rounded-full border-b-transparent border-blue-500 ${sizeClasses[size]} ${className}`} />
  );
}