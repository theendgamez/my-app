import React from 'react';

interface EventListProps {
  children: React.ReactNode;
}

export default function EventList({ children }: EventListProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6">
      {children}
    </div>
  );
}