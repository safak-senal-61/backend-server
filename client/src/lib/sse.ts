export interface SSEMessage {
  type: string;
  content?: string;
  clientId?: string;
  message?: string;
  timestamp?: string | Date;
  id?: number;
}

export class SSEClient {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;

  constructor(
    private url: string,
    private onMessage: (message: SSEMessage) => void,
    private onConnectionChange: (connected: boolean) => void,
    private onError: (error: Event) => void
  ) {}

  connect() {
    try {
      this.eventSource = new EventSource(this.url);
      
      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.onConnectionChange(true);
        console.log('SSE connection established');
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.onMessage(data);
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };

      this.eventSource.onerror = (event) => {
        this.isConnected = false;
        this.onConnectionChange(false);
        this.onError(event);
        
        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`SSE reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
          
          setTimeout(() => {
            this.disconnect();
            this.connect();
          }, this.reconnectDelay * this.reconnectAttempts);
        } else {
          console.error('Max SSE reconnection attempts reached');
        }
      };
    } catch (error) {
      console.error('Failed to establish SSE connection:', error);
      this.onError(error as Event);
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
      this.onConnectionChange(false);
    }
  }

  isConnectionOpen() {
    return this.isConnected && this.eventSource?.readyState === EventSource.OPEN;
  }
}
