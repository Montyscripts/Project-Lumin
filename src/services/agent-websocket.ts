import { parseStructuredStatus, AgentStatusSchema } from '../types/status-schema';

export interface AgentWebSocketOptions {
  onStatusChange?: (running: boolean) => void;
  onScrollback?: (data: string) => void;
  onOutput?: (data: string) => void;
  onStructuredStatus?: (status: AgentStatusSchema) => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
}

export class AgentWebSocketBridge {
  private ws: WebSocket | null = null;
  private options: AgentWebSocketOptions;
  private isConnecting = false;
  private shouldStartOnConnect = false;
  private autoReconnectTimeout: any = null;
  private isDisposed = false;

  constructor(options: AgentWebSocketOptions) {
    this.options = options;
  }

  public connect(forceConnect = false): void {
    if (this.isDisposed) return;

    if (!forceConnect && this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.cleanupSocket();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/terminal`;

    this.isConnecting = true;
    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    ws.onopen = () => {
      if (this.ws !== ws || this.isDisposed) {
        try { ws.close(); } catch (e) {}
        return;
      }
      this.isConnecting = false;
      console.log('Agent WebSocket bridge connected.');

      if (this.shouldStartOnConnect) {
        this.startAgent();
        this.shouldStartOnConnect = false;
      }
    };

    ws.onmessage = (event) => {
      if (this.ws !== ws || this.isDisposed) return;
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'status') {
          this.options.onStatusChange?.(Boolean(msg.running));
        } else if (msg.type === 'scrollback') {
          this.options.onScrollback?.(msg.data || '');
          const status = parseStructuredStatus(msg.data);
          if (status) {
            this.options.onStructuredStatus?.(status);
          }
        } else if (msg.type === 'output') {
          this.options.onOutput?.(msg.data || '');
          const status = parseStructuredStatus(msg.data);
          if (status) {
            this.options.onStructuredStatus?.(status);
          }
        }
      } catch (e) {
        console.error('Error parsing Agent WebSocket message:', e);
      }
    };

    ws.onclose = () => {
      if (this.ws !== ws || this.isDisposed) return;
      this.ws = null;
      this.isConnecting = false;
      this.options.onStatusChange?.(false);
      this.options.onClose?.();

      // Schedule auto reconnect if active and not disposed
      if (!this.isDisposed) {
        this.autoReconnectTimeout = setTimeout(() => {
          if (!this.ws && !this.isDisposed) {
            this.connect();
          }
        }, 3000);
      }
    };

    ws.onerror = (err: Event) => {
      if (this.ws !== ws || this.isDisposed) return;
      this.options.onError?.(err);
    };
  }

  public startAgent(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'start' }));
    } else {
      this.shouldStartOnConnect = true;
      this.connect(true);
    }
  }

  public stopAgent(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'stop' }));
    }
    this.options.onStatusChange?.(false);
  }

  public sendInput(data: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'input', data }));
    }
  }

  public isConnected(): boolean {
    return Boolean(this.ws && this.ws.readyState === WebSocket.OPEN);
  }

  private cleanupSocket(): void {
    if (this.autoReconnectTimeout) {
      clearTimeout(this.autoReconnectTimeout);
      this.autoReconnectTimeout = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
  }

  public disconnect(): void {
    this.isDisposed = true;
    this.cleanupSocket();
  }
}
