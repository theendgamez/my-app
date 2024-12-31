import { useEffect, useState } from 'react';
import db from '@/lib/db';
import { Events } from '../types';

export function useEvents(initialData?: Events[]) {
  const [events, setEvents] = useState<Events[]>(initialData || []);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (initialData) return;

    async function fetchEvents() {
      try {
        const data = await db.event.findMany() as Events[];
        setEvents(data || []);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching events:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [initialData]); 

  return { events, loading, error };
}
