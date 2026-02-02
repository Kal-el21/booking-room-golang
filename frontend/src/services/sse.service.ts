const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export type SSEMessageHandler = (data: any) => void;
export type SSEErrorHandler = (error: Event) => void;

export class SSEService {
  private eventSource: EventSource | null = null;
  private messageHandlers: Map<string, SSEMessageHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  connect(token: string) {
    // Close existing connection if any
    this.disconnect();

    try {
      // Create EventSource with token in query param
      const url = `${API_BASE_URL}/api/v1/notifications/stream?token=${token}`;
      this.eventSource = new EventSource(url);

      // Handle connection open
      this.eventSource.onopen = () => {
        console.log('SSE: Connection established');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
      };

      // Handle notification events
      this.eventSource.addEventListener('notification', (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit('notification', data);
        } catch (error) {
          console.error('SSE: Failed to parse notification:', error);
        }
      });

      // Handle ping events (keep-alive)
      this.eventSource.addEventListener('ping', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('SSE: Received ping at', new Date(data.timestamp * 1000));
        } catch (error) {
          console.error('SSE: Failed to parse ping:', error);
        }
      });

      // Handle errors
      this.eventSource.onerror = (error) => {
        console.error('SSE: Connection error', error);
        
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          console.log('SSE: Connection closed, attempting to reconnect...');
          this.handleReconnect(token);
        }
      };

    } catch (error) {
      console.error('SSE: Failed to create connection:', error);
      this.handleReconnect(token);
    }
  }

  private handleReconnect(token: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('SSE: Max reconnection attempts reached');
      this.emit('connection-failed', { attempts: this.reconnectAttempts });
      return;
    }

    this.reconnectAttempts++;
    console.log(`SSE: Reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect(token);
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      console.log('SSE: Connection closed');
    }
  }

  on(event: string, handler: SSEMessageHandler) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, []);
    }
    this.messageHandlers.get(event)?.push(handler);
  }

  off(event: string, handler: SSEMessageHandler) {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  getReadyState(): number {
    return this.eventSource?.readyState ?? EventSource.CLOSED;
  }
}

// Singleton instance
let sseServiceInstance: SSEService | null = null;

export const getSSEService = (): SSEService => {
  if (!sseServiceInstance) {
    sseServiceInstance = new SSEService();
  }
  return sseServiceInstance;
};