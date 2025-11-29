import type { PanelState, EffectParams } from '@chaser/types';

/**
 * Message types for client-server communication
 */
interface ServerMessage {
  type: 'stateUpdate' | 'connected' | 'error';
  payload?: any;
}

interface ClientMessage {
  type: 'runEffect' | 'stopEffect' | 'setTopology' | 'addPreset';
  payload?: any;
}

/**
 * WebSocket client for communicating with Chaser server
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private serverUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private reconnectTimer: number | null = null;

  // State
  private panels: PanelState[] = [];
  private currentEffect: string | null = null;
  private config: any = null;
  private connected = false;

  // Callbacks
  private onStateUpdateCallbacks: Array<(panels: PanelState[], currentEffect: string | null) => void> = [];
  private onConnectedCallbacks: Array<() => void> = [];
  private onDisconnectedCallbacks: Array<() => void> = [];
  private onErrorCallbacks: Array<(error: string) => void> = [];

  constructor(serverUrl: string = 'ws://localhost:3001') {
    this.serverUrl = serverUrl;
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`🔌 Connecting to ${this.serverUrl}...`);
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          console.log('✅ Connected to server');
          this.connected = true;
          this.reconnectAttempts = 0;
          this.onConnectedCallbacks.forEach(cb => cb());
        };

        this.ws.onmessage = (event) => {
          try {
            const message: ServerMessage = JSON.parse(event.data);
            this.handleServerMessage(message);
          } catch (error) {
            console.error('❌ Error parsing server message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('👋 Disconnected from server');
          this.connected = false;
          this.onDisconnectedCallbacks.forEach(cb => cb());
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.onErrorCallbacks.forEach(cb => cb('Connection error'));
          reject(error);
        };

        // Resolve on first successful connection
        const checkConnection = () => {
          if (this.connected && this.config) {
            resolve();
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();

      } catch (error) {
        console.error('❌ Error creating WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Attempt to reconnect to the server
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 5);

    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    this.reconnectTimer = window.setTimeout(() => {
      this.connect().catch(error => {
        console.error('❌ Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Handle incoming messages from server
   */
  private handleServerMessage(message: ServerMessage): void {
    switch (message.type) {
      case 'connected':
        this.config = message.payload.config;
        this.panels = message.payload.state.panels;
        this.currentEffect = message.payload.state.currentEffect;
        break;

      case 'stateUpdate':
        this.panels = message.payload.panels;
        this.currentEffect = message.payload.currentEffect;
        this.onStateUpdateCallbacks.forEach(cb => cb(this.panels, this.currentEffect));
        break;

      case 'error':
        console.error('❌ Server error:', message.payload.message);
        this.onErrorCallbacks.forEach(cb => cb(message.payload.message));
        break;

      default:
        console.warn('⚠️ Unknown message type:', (message as any).type);
    }
  }

  /**
   * Send message to server
   */
  private send(message: ClientMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('❌ WebSocket not connected');
      return;
    }

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Run an effect
   */
  public runEffect(effectName: string, params: EffectParams): void {
    this.send({
      type: 'runEffect',
      payload: { effectName, params }
    });
  }

  /**
   * Stop current effect
   */
  public stopEffect(): void {
    this.send({
      type: 'stopEffect'
    });
  }

  /**
   * Set topology mode
   */
  public setTopology(mode: string): void {
    this.send({
      type: 'setTopology',
      payload: { mode }
    });
  }

  /**
   * Add a color preset
   */
  public addPreset(name: string, preset: any): void {
    this.send({
      type: 'addPreset',
      payload: { name, preset }
    });
  }

  /**
   * Get current configuration
   */
  public getConfig(): any {
    return this.config;
  }

  /**
   * Get current panels state
   */
  public getPanels(): PanelState[] {
    return this.panels;
  }

  /**
   * Get current effect name
   */
  public getCurrentEffect(): string | null {
    return this.currentEffect;
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.connected;
  }

  /**
   * Register callback for state updates
   */
  public onStateUpdate(callback: (panels: PanelState[], currentEffect: string | null) => void): void {
    this.onStateUpdateCallbacks.push(callback);
  }

  /**
   * Register callback for connection
   */
  public onConnected(callback: () => void): void {
    this.onConnectedCallbacks.push(callback);
  }

  /**
   * Register callback for disconnection
   */
  public onDisconnected(callback: () => void): void {
    this.onDisconnectedCallbacks.push(callback);
  }

  /**
   * Register callback for errors
   */
  public onError(callback: (error: string) => void): void {
    this.onErrorCallbacks.push(callback);
  }

  /**
   * Disconnect from server
   */
  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connected = false;
  }
}
