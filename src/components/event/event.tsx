import React from 'react';
import EventList from '@/components/event/Eventlist';
import ListItem from '@/components/event/Listitem';
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