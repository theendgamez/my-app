import React from 'react';
import EventList from '@/components/event/eventlist';
import ListItem from '@/components/event/listitem';
import type { Events } from '@/components/types';

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