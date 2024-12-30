import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Events } from '../../app/api/types';

interface ListItemProps {
  event: Events;
}

export default function ListItem({ event }: ListItemProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateString);
        return 'Date not available';
      }

      return new Intl.DateTimeFormat('zh-HK', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Date not available';
    }
  };

  return (
    <Link 
      href={`/events/${event.eventId}`}
      className="block w-full rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 relative group cursor-pointer"
    >
      <div className="relative aspect-[16/9]">
        <Image
          src={event.photoUrl}
          alt={`${event.eventName} - Event Cover Image`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        
        {/* Event info */}
        <div className="absolute bottom-0 left-0 p-4 w-full">
          <h3 className="text-base font-semibold text-white mb-2 line-clamp-2">
            {event.eventName}
          </h3>
          <p className="text-sm text-gray-100">
            {formatDate(event.eventDate)}
          </p>
        </div>
      </div>
    </Link>
  );
}