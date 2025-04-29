import { fetchWithAuth } from './fetchWithAuth';

/**
 * Start the lottery draw process for a specific event
 * 
 * @param eventId - The ID of the event to draw for
 * @returns A promise that resolves to the draw results
 */
export async function startLotteryDraw(eventId: string) {
  try {
    const response = await fetchWithAuth('/api/lottery/draw', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ eventId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to start lottery draw (${response.status})`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error starting lottery draw:', error);
    throw error;
  }
}

/**
 * Check if an event is eligible for drawing
 * 
 * @param event - The event object
 * @returns Boolean indicating if the event can be drawn
 */
export function canStartDraw(event: any) {
  // Event must be in draw mode and have a draw date that has passed
  if (!event.isDrawMode) return false;
  if (!event.drawDate) return false;
  if (event.isDrawn) return false;
  
  const drawDateTime = new Date(event.drawDate);
  const now = new Date();
  return now >= drawDateTime;
}
