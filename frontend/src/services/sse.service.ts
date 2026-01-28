const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export class SSEService {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  connect(
    onMessage: (data: any) => void,
    onError?: (error: any) => void,
    onOpen?: () => void
  ) {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('No access token found');
      return;
    }

    // Close existing connection
    this.disconnect();

    // Create SSE connection with token in URL
    const url = `${API_BASE_URL}/api/v1/notifications/stream?token=${token}`;
    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      console.log('✅ SSE Connection established');
      this.reconnectAttempts = 0;
      if (onOpen) onOpen();
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 Received notification:', data);
        onMessage(data);
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('❌ SSE Connection error:', error);
      
      if (this.eventSource?.readyState === EventSource.CLOSED) {
        console.log('Connection closed, attempting to reconnect...');
        this.handleReconnect(onMessage, onError, onOpen);
      }

      if (onError) onError(error);
    };

    // Listen for specific event types
    this.eventSource.addEventListener('notification', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        console.log('🔔 New notification event:', data);
        onMessage(data);
      } catch (error) {
        console.error('Failed to parse notification event:', error);
      }
    });

    this.eventSource.addEventListener('ping', () => {
      console.log('💓 Ping received');
    });
  }

  private handleReconnect(
    onMessage: (data: any) => void,
    onError?: (error: any) => void,
    onOpen?: () => void
  ) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    setTimeout(() => {
      this.connect(onMessage, onError, onOpen);
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  disconnect() {
    if (this.eventSource) {
      console.log('🔌 Disconnecting SSE');
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  getReadyState(): number {
    return this.eventSource?.readyState ?? EventSource.CLOSED;
  }
}

export const sseService = new SSEService();