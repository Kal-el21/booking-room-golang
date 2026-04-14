const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export type SSEMessageHandler = (data: any) => void;

/**
 * Callback yang dipanggil setiap kali SSEService perlu token/tiket baru.
 * Dengan ini, reconnect selalu minta tiket baru (bukan pakai tiket lama yang sudah expired).
 */
export type TicketProvider = () => Promise<string>;

export class SSEService {
  private eventSource: EventSource | null = null;
  private messageHandlers: Map<string, SSEMessageHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private ticketProvider: TicketProvider | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Connect ke SSE stream.
   * @param getTicket - async callback yang mengembalikan tiket baru dari server.
   *                    Dipanggil ulang setiap reconnect sehingga tiket selalu fresh.
   */
  async connect(getTicket: TicketProvider) {
    this.disconnect();

    // Simpan provider untuk reconnect
    this.ticketProvider = getTicket;

    try {
      const ticket = await getTicket();
      this._openConnection(ticket);
    } catch (error) {
      console.error('SSE: Failed to get initial ticket:', error);
      this._scheduleReconnect();
    }
  }

  private _openConnection(ticket: string) {
    const url = `${API_BASE_URL}/api/v1/notifications/stream?ticket=${ticket}`;
    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      console.log('SSE: Connection established');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.emit('connected', { timestamp: Date.now() });
    };

    this.eventSource.addEventListener('connected', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('SSE: Received connected event:', data);
        this.emit('connected', data);
      } catch (error) {
        console.error('SSE: Failed to parse connected event:', error);
      }
    });

    this.eventSource.addEventListener('notification', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit('notification', data);
      } catch (error) {
        console.error('SSE: Failed to parse notification:', error);
      }
    });

    this.eventSource.addEventListener('ping', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('SSE: Received ping at', new Date(data.timestamp * 1000));
      } catch (error) {
        console.error('SSE: Failed to parse ping:', error);
      }
    });

    this.eventSource.onerror = (error) => {
      console.error('SSE: Connection error', error);
      if (this.eventSource?.readyState === EventSource.CLOSED) {
        console.log('SSE: Connection closed, attempting to reconnect...');
        this._scheduleReconnect();
      }
    };
  }

  private _scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('SSE: Max reconnection attempts reached');
      this.emit('connection-failed', { attempts: this.reconnectAttempts });
      return;
    }

    this.reconnectAttempts++;
    console.log(`SSE: Reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    this.reconnectTimer = setTimeout(async () => {
      if (!this.ticketProvider) return;
      try {
        // Minta tiket BARU dari server — tiket lama sudah expired/terpakai
        const ticket = await this.ticketProvider();
        this._openConnection(ticket);
      } catch (error) {
        console.error('SSE: Failed to get ticket on reconnect:', error);
        this._scheduleReconnect();
      }
    }, this.reconnectDelay);

    // Exponential backoff, max 30 detik
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      console.log('SSE: Connection closed');
    }
    this.ticketProvider = null;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
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
    handlers?.forEach((handler) => handler(data));
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  getReadyState(): number {
    return this.eventSource?.readyState ?? EventSource.CLOSED;
  }
}

let sseServiceInstance: SSEService | null = null;

export const getSSEService = (): SSEService => {
  if (!sseServiceInstance) {
    sseServiceInstance = new SSEService();
  }
  return sseServiceInstance;
};