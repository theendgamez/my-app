import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Events as EventsType } from '@/types';

// EventList Component
interface EventListProps {
  children: React.ReactNode;
}

export function EventList({ children }: EventListProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6">
      {children}
    </div>
  );
}

// EventListItem Component
interface ListItemProps {
  event: EventsType;
}

export function ListItem({ event }: ListItemProps) {
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

// Events Component (Main export)
interface EventsProps {
  events: EventsType[];
}

export default function Events({ events }: EventsProps) {
  // Add safety check to ensure events is an array
  if (!Array.isArray(events)) {
    console.error('Events prop is not an array:', events);
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">無法顯示活動列表：數據格式錯誤</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">目前沒有活動</p>
      </div>
    );
  }

  return (
    <EventList>
      {events.map((evt) => (
        <ListItem key={evt.eventId} event={evt} /> 
      ))}
    </EventList>
  );
}
