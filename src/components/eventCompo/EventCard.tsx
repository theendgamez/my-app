import React from 'react';
import EventList from '@/components/eventCompo/EventList';
import ListItem from '@/components/eventCompo/Listitem';
import type { Events } from '@/types';

interface Props {
  events: Events[];
}

export default function Events({ events }: Props) {
  return (
    <EventList>
      {events.map((evt) => (
        <ListItem key={evt.eventId} event={evt} /> 
      ))}
    </EventList>
  );
}