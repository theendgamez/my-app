import React from 'react';
import EventList from '@/components/eventlist';
import ListItem from '@/components/listitem';
import type { Events } from '@/app/api/types';

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