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
      {events.map((evt, index) => (
        <ListItem key={index} event={evt} />
      ))}
    </EventList>
  );
}