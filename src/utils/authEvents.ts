/**
 * Utility for handling auth state change events across components
 * This helps components react to auth state changes without a page refresh
 */

type AuthEventListener = () => void;

class AuthEventEmitter {
  private listeners: AuthEventListener[] = [];
  
  // Add a listener for auth state changes
  public subscribe(listener: AuthEventListener): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  // Notify all listeners when auth state changes
  public emit(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Create a singleton instance
const authEvents = new AuthEventEmitter();

export default authEvents;
