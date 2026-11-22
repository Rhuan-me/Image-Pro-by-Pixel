export interface BackplaneMetadata {
  eventId: string;
  originInstance: string;
  deliveredByInstance: string;
  channel: string;
  timestamp: number;
}

export interface NotificationMessage {
  type: string;
  event?: string;
  instanceId?: string;
  message?: string;
  data?: {
    imageId?: string;
    status?: string;
    processedStorageUrl?: string;
    message?: string;
  };
  backplane?: BackplaneMetadata;
  timestamp?: number;
}

type NotificationListener = (msg: NotificationMessage) => void;

const DEFAULT_ENDPOINTS = [
  import.meta.env.VITE_WS_NOTIFICATION_URL_1 || 'wss://localhost:4000',
  import.meta.env.VITE_WS_NOTIFICATION_URL_2 || 'wss://localhost:4001'
];

export class ResilientNotificationSocket {
  private endpoints: string[];
  private currentIndex = 0;
  private retryCount = 0;
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private manuallyClosed = false;
  private listeners = new Set<NotificationListener>();
  private tokenGetter: () => string | null;

  constructor(tokenGetter: () => string | null, endpoints: string[] = DEFAULT_ENDPOINTS) {
    this.tokenGetter = tokenGetter;
    this.endpoints = endpoints;
  }

  public connect(): void {
    const token = this.tokenGetter();
    if (!token) return;

    this.manuallyClosed = false;
    const baseUrl = this.endpoints[this.currentIndex % this.endpoints.length];
    const url = `${baseUrl}/?token=${encodeURIComponent(token)}`;

    console.info(`[WSS Hub] Conectando à instância ${baseUrl} (tentativa #${this.retryCount + 1})...`);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.retryCount = 0;
        console.info(`[WSS Hub] Conectado com sucesso em ${baseUrl}`);
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as NotificationMessage;
          this.listeners.forEach((cb) => cb(parsed));
        } catch (err) {
          console.warn('[WSS Hub] Falha ao decodificar mensagem:', err);
        }
      };

      this.ws.onclose = (event) => {
        if (this.manuallyClosed) return;
        console.warn(`[WSS Hub] Conexão perdida com ${baseUrl} (code=${event.code}). Iniciando reconexão automática...`);
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        // O evento onclose será disparado em seguida e cuidará do failover/reconexão
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.manuallyClosed) return;
    this.retryCount += 1;
    this.currentIndex = (this.currentIndex + 1) % this.endpoints.length;
    const nextEndpoint = this.endpoints[this.currentIndex];
    const delayMs = Math.min(10000, 1000 * Math.pow(1.5, Math.min(this.retryCount - 1, 5)));

    console.info(`[WSS Hub] Reconectando automaticamente em ${nextEndpoint} após ${Math.round(delayMs)}ms...`);
    this.reconnectTimer = setTimeout(() => this.connect(), delayMs);
  }

  public subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public disconnect(): void {
    this.manuallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
