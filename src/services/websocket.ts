import { CanFrame } from '../types/can';

type FrameListener = (frame: CanFrame) => void;
type StatusListener = (status: any) => void;

class CanWebSocketClient {
  private ws: WebSocket | null = null;
  private frameListeners: Set<FrameListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private reconnectTimer: number | null = null;
  private shouldReconnect = true;
  private isConnecting = false;

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.shouldReconnect = true;
    this.isConnecting = true;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/can`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnecting = false;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'status') {
            this.statusListeners.forEach((l) => l(data.data));
          } else if (data.id !== undefined && data.data !== undefined) {
            // Received CanFrame
            this.frameListeners.forEach((l) => l(data as CanFrame));
          }
        } catch {
          // ignore
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.ws = null;
        if (this.shouldReconnect) {
          this.reconnectTimer = window.setTimeout(() => this.connect(), 2000);
        }
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
      };
    } catch {
      this.isConnecting = false;
      if (this.shouldReconnect) {
        this.reconnectTimer = window.setTimeout(() => this.connect(), 3000);
      }
    }
  }

  public disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public onFrame(listener: FrameListener): () => void {
    this.frameListeners.add(listener);
    return () => {
      this.frameListeners.delete(listener);
    };
  }

  public onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }
}

export const canWsClient = new CanWebSocketClient();
