import { WebSocketServer, WebSocket } from 'ws';
import { Engine } from '@chaser/core';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { EngineConfig } from '@chaser/types';
import { ArtNetOutput, type ArtNetConfig } from './DMXOutput.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load configuration
const configPath = resolve(__dirname, '../../../config.json');
const fullConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
const config: EngineConfig = {
  columns: fullConfig.engine.columns,
  rowsPerColumn: fullConfig.engine.rowsPerColumn,
  targetFPS: fullConfig.engine.targetFPS,
  initialTopology: fullConfig.engine.initialTopology
};

/**
 * Message types for client-server communication
 */
interface ClientMessage {
  type: 'runEffect' | 'stopEffect' | 'setTopology' | 'addPreset';
  payload?: any;
}

interface ServerMessage {
  type: 'stateUpdate' | 'connected' | 'error';
  payload?: any;
}

/**
 * WebSocket server for Chaser LED panel control
 */
class ChaserServer {
  private wss: WebSocketServer;
  private engine: Engine;
  private clients: Set<WebSocket> = new Set();
  private updateInterval: NodeJS.Timeout | null = null;
  private fullConfig: any;
  private artnetOutput: ArtNetOutput | null = null;

  constructor(port: number = 3001) {
    // Store full config
    this.fullConfig = fullConfig;

    // Initialize engine with config
    this.engine = new Engine(config);

    // Load color presets
    const colorManager = this.engine.getColorManager();
    colorManager.loadPresetsFromConfig(fullConfig.presets);

    // Initialize Art-Net output if configured
    if (fullConfig.artnet) {
      const artnetConfig: ArtNetConfig = {
        enabled: fullConfig.artnet.enabled || false,
        host: fullConfig.artnet.host || '192.168.1.100',
        port: fullConfig.artnet.port || 6454,
        universe: fullConfig.artnet.universe || 0,
        subnet: fullConfig.artnet.subnet || 0,
        net: fullConfig.artnet.net || 0,
        startChannel: fullConfig.artnet.startChannel || 1,
        channelsPerPanel: fullConfig.artnet.channelsPerPanel || 5,
        refreshRate: fullConfig.artnet.refreshRate || 44
      };

      this.artnetOutput = new ArtNetOutput(artnetConfig);

      // Add Art-Net output to engine
      if (this.artnetOutput.isActive()) {
        this.engine.addOutput(this.artnetOutput);
      }
    }

    // Create WebSocket server
    this.wss = new WebSocketServer({ port });

    console.log(`🚀 Chaser WebSocket server running on ws://localhost:${port}`);

    // Set up event listeners
    this.wss.on('connection', this.handleConnection.bind(this));

    // Start engine
    this.engine.start();

    // Start sending state updates
    this.startStateUpdates();
  }

  /**
   * Handle new client connection
   */
  private handleConnection(ws: WebSocket): void {
    console.log('✅ Client connected');
    this.clients.add(ws);

    // Send initial connection message
    this.sendToClient(ws, {
      type: 'connected',
      payload: {
        config: this.fullConfig,
        state: this.engine.getState()
      }
    });

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      try {
        const message: ClientMessage = JSON.parse(data.toString());
        this.handleClientMessage(ws, message);
      } catch (error) {
        console.error('❌ Error parsing message:', error);
        this.sendToClient(ws, {
          type: 'error',
          payload: { message: 'Invalid message format' }
        });
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      console.log('👋 Client disconnected');
      this.clients.delete(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      this.clients.delete(ws);
    });
  }

  /**
   * Handle messages from clients
   */
  private async handleClientMessage(ws: WebSocket, message: ClientMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'runEffect':
          await this.handleRunEffect(message.payload);
          break;

        case 'stopEffect':
          this.engine.stopCurrentEffect();
          break;

        case 'setTopology':
          this.engine.getPanelGrid().setTopologyMode(message.payload.mode);
          break;

        case 'addPreset':
          this.engine.getColorManager().addPreset(
            message.payload.name,
            message.payload.preset
          );
          break;

        default:
          this.sendToClient(ws, {
            type: 'error',
            payload: { message: `Unknown message type: ${message.type}` }
          });
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      this.sendToClient(ws, {
        type: 'error',
        payload: { message: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
  }

  /**
   * Handle runEffect command
   */
  private async handleRunEffect(payload: any): Promise<void> {
    const { effectName, params } = payload;

    console.log(`🎬 Running effect: ${effectName}`, params);

    // Map effect name to effect class
    const effectModule = await import('@chaser/core');
    const effectMap: Record<string, any> = {
      'solid': effectModule.SolidColorEffect,
      'sequential': effectModule.SequentialFadeEffect,
      'flow': effectModule.FlowEffect,
      'strobe': effectModule.StrobeEffect,
      'blackout': effectModule.BlackoutEffect,
      'chase': effectModule.ChaseEffect,
      'wave': effectModule.WaveEffect
    };

    const EffectClass = effectMap[effectName];
    if (!EffectClass) {
      throw new Error(`Unknown effect: ${effectName}`);
    }

    const effect = new EffectClass();
    this.engine.runEffect(effect, params);
  }

  /**
   * Start sending periodic state updates to all clients
   */
  private startStateUpdates(): void {
    const targetFPS = this.engine.getTargetFPS();
    const updateInterval = 1000 / targetFPS;

    this.updateInterval = setInterval(() => {
      // Get current panel states from panel grid
      const panelGrid = this.engine.getPanelGrid();
      const panels = panelGrid.getAllStates();
      const state = this.engine.getState();

      // Broadcast state to all connected clients
      this.broadcast({
        type: 'stateUpdate',
        payload: {
          panels: panels,
          currentEffect: state.currentEffect,
          timestamp: Date.now()
        }
      });
    }, updateInterval);
  }

  /**
   * Send message to a specific client
   */
  private sendToClient(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcast(message: ServerMessage): void {
    const data = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  /**
   * Cleanup and shutdown
   */
  public shutdown(): void {
    console.log('🛑 Shutting down server...');

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Close Art-Net connection
    if (this.artnetOutput) {
      this.artnetOutput.close();
    }

    this.clients.forEach(client => client.close());
    this.wss.close();
  }
}

// Start the server
const server = new ChaserServer(3001);

// Handle graceful shutdown
process.on('SIGINT', () => {
  server.shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.shutdown();
  process.exit(0);
});
