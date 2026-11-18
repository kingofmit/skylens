import { StateVector } from "@skylens/core";

export interface WebSocketFeedOptions {
  reconnect?: boolean;
  maxReconnectDelayMs?: number;
}

/** Generic WebSocket feed with pluggable parser and auto-reconnect */
export class WebSocketFeed {
  private url: string;
  private parser: (msg: string | ArrayBuffer) => StateVector[];
  private ws: WebSocket | null = null;
  private dataListeners: ((states: StateVector[]) => void)[] = [];
  private errorListeners: ((err: unknown) => void)[] = [];
  private reconnectDelay = 1000;
  private shouldReconnect: boolean;
  private maxReconnectDelay: number;
  private closed = false;

  constructor(
    url: string,
    parser: (msg: string | ArrayBuffer) => StateVector[],
    options?: WebSocketFeedOptions,
  ) {
    this.url = url;
    this.parser = parser;
    this.shouldReconnect = options?.reconnect ?? true;
    this.maxReconnectDelay = options?.maxReconnectDelayMs ?? 30000;
  }

  connect(): Promise<void> {
    this.closed = false;
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectDelay = 1000;
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const states = this.parser(event.data);
          if (states.length > 0) {
            for (const listener of this.dataListeners) listener(states);
          }
        } catch (err) {
          for (const listener of this.errorListeners) listener(err);
        }
      };

      this.ws.onerror = (event) => {
        for (const listener of this.errorListeners) listener(event);
        reject(event);
      };

      this.ws.onclose = () => {
        if (!this.closed && this.shouldReconnect) {
          setTimeout(() => {
            this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
            this.connect().catch(() => {});
          }, this.reconnectDelay);
        }
      };
    });
  }

  disconnect(): void {
    this.closed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  onData(callback: (states: StateVector[]) => void): () => void {
    this.dataListeners.push(callback);
    return () => {
      const idx = this.dataListeners.indexOf(callback);
      if (idx >= 0) this.dataListeners.splice(idx, 1);
    };
  }

  onError(callback: (err: unknown) => void): () => void {
    this.errorListeners.push(callback);
    return () => {
      const idx = this.errorListeners.indexOf(callback);
      if (idx >= 0) this.errorListeners.splice(idx, 1);
    };
  }
}
