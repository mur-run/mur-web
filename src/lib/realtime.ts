// Real-time WebSocket connection to mur serve

type EventHandler = (event: MurEvent) => void;

export interface MurEvent {
  type: string;
  id: string;
  ts: string;
}

let ws: WebSocket | null = null;
let handlers: EventHandler[] = [];
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export function connect(baseUrl: string) {
  disconnect();
  const wsUrl = baseUrl.replace(/^http/, 'ws') + '/api/v1/ws';
  try {
    ws = new WebSocket(wsUrl);
    ws.onmessage = (e) => {
      try {
        const event: MurEvent = JSON.parse(e.data);
        handlers.forEach(h => h(event));
      } catch { /* ignore parse errors */ }
    };
    ws.onclose = () => {
      ws = null;
      // Auto-reconnect after 5s
      reconnectTimer = setTimeout(() => connect(baseUrl), 5000);
    };
    ws.onerror = () => {
      ws?.close();
    };
  } catch { /* connection failed */ }
}

export function disconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  if (ws) {
    ws.onclose = null;
    ws.close();
    ws = null;
  }
}

export function onEvent(handler: EventHandler): () => void {
  handlers.push(handler);
  return () => {
    handlers = handlers.filter(h => h !== handler);
  };
}

export function isConnected(): boolean {
  return ws?.readyState === WebSocket.OPEN;
}
