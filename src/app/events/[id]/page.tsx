'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Events } from '@/app/api/types';
import Navbar from '@/components/Navbar';
import db from '@/lib/db';

const EventDetail = () => {
  const [event, setEvent] = useState<Events | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { id } = useParams();

  const fetchEvent = async () => {
      try {
          const data = await db.event.findById(id as string)
          setEvent(data);
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
          setLoading(false);
        }
      };
    
  useEffect(() => {
      fetchEvent();
  }, [id]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    fetchEvent(); // You'll need to define fetchEvent outside of useEffect for this to work
  };

  if (loading) return <div>Loading...</div>;
  if (error) return (
    <div>
      <p>{error}</p>
      <button onClick={handleRetry} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
        Retry
      </button>
    </div>
  );
  if (!event) return <div>Event not found</div>;

  const eventDate = event.eventDate ? new Date(event.eventDate) : null;
  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4 flex flex-col items-center pt-20">
        <h1 className="text-4xl font-bold mb-6 text-left w-full max-w-3xl px-6">{event.eventName || 'Untitled Event'}</h1>
        {event.photoUrl ? (
          <Image 
            src={event.photoUrl} 
            alt={event.eventName || 'Event image'} 
            width={720} 
            height={400} 
            className="mb-6 rounded-lg shadow-lg"
          />
        ) : (
          <div className="mb-6 h-[400px] bg-gray-300 flex items-center justify-center rounded-lg shadow-md">
            <span className="text-gray-600">No image available</span>
          </div>
        )}
        <div className="text-lg text-left w-full max-w-3xl px-6">
          <p className="mb-2">
            <strong>Date:</strong> {eventDate ? eventDate.toLocaleString() : 'Date not specified'}
          </p>
          <p className="mb-2">
            <strong>Location:</strong> {event.location || 'Location not specified'}
          </p>
          <p className="mb-2">
            <strong>Description:</strong> {event.description || 'No description available'}
          </p>
        </div>
      </div>
    </>
  );
}

export default EventDetail;