import { WebSocketServer, WebSocket } from 'ws';
import { Engine } from '@chaser/core';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { EngineConfig } from '@chaser/types';
import { ArtNetOutput, type ArtNetConfig } from './DMXOutput.js';
import { PresetManager } from './PresetManager.js';
import { MQTTBridge, type MQTTConfig } from '@chaser/homeassistant';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load configuration (use CONFIG_PATH env var if set, for HA add-on support)
const configPath = process.env.CONFIG_PATH || resolve(__dirname, '../../../config.json');
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
  type: 'runEffect' | 'stopEffect' | 'setTopology' | 'addPreset'
      | 'savePreset' | 'updatePreset' | 'deletePreset' | 'listPresets';
  payload?: any;
}

interface ServerMessage {
  type: 'stateUpdate' | 'connected' | 'error'
      | 'presetSaved' | 'presetUpdated' | 'presetDeleted' | 'presetsList';
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
  private presetManager: PresetManager;
  private mqttBridge: MQTTBridge | null = null;

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

    // Initialize PresetManager (use PRESETS_PATH env var if set, for HA add-on support)
    const presetsPath = process.env.PRESETS_PATH || resolve(__dirname, '../../../presets.json');
    this.presetManager = new PresetManager(presetsPath);

    // Create WebSocket server
    this.wss = new WebSocketServer({ port });

    console.log(`🚀 Chaser WebSocket server running on ws://localhost:${port}`);

    // Initialize MQTT Bridge for Home Assistant if configured
    if (fullConfig.mqtt?.enabled) {
      // Override MQTT config with env vars from supervisor API (HA add-on support)
      const mqttConfig: MQTTConfig = {
        enabled: fullConfig.mqtt.enabled,
        broker: {
          host: process.env.MQTT_HOST || fullConfig.mqtt.broker?.host || 'localhost',
          port: parseInt(process.env.MQTT_PORT || '') || fullConfig.mqtt.broker?.port || 1883,
          username: process.env.MQTT_USERNAME || fullConfig.mqtt.broker?.username,
          password: process.env.MQTT_PASSWORD || fullConfig.mqtt.broker?.password,
          clientId: fullConfig.mqtt.broker?.clientId || 'chaser-dmx'
        },
        homeassistant: {
          discoveryPrefix: fullConfig.mqtt.homeassistant?.discoveryPrefix || 'homeassistant',
          topicPrefix: fullConfig.mqtt.homeassistant?.topicPrefix || 'chaser',
          retainDiscovery: fullConfig.mqtt.homeassistant?.retainDiscovery !== false
        },
        stateUpdateRate: fullConfig.mqtt.stateUpdateRate || 1000,
        reconnectInterval: fullConfig.mqtt.reconnectInterval || 5000
      };

      this.mqttBridge = new MQTTBridge(mqttConfig, `ws://localhost:${port}`);

      // Connect after server is ready
      setImmediate(async () => {
        try {
          await this.mqttBridge?.connect();
          console.log('🏠 Home Assistant MQTT integration enabled');
        } catch (error) {
          console.error('❌ Failed to start MQTT Bridge:', error);
          this.mqttBridge = null;
        }
      });
    }

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

        case 'savePreset':
          await this.handleSavePreset(ws, message.payload);
          break;

        case 'updatePreset':
          await this.handleUpdatePreset(ws, message.payload);
          break;

        case 'deletePreset':
          await this.handleDeletePreset(ws, message.payload);
          break;

        case 'listPresets':
          await this.handleListPresets(ws);
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
    let effectName: string;
    let params: any;
    let topology: string | undefined;

    // Check if running by preset ID
    if (payload.presetId) {
      const preset = this.presetManager.get(payload.presetId);
      if (!preset) {
        throw new Error(`Preset not found: ${payload.presetId}`);
      }

      console.log(`🎬 Running preset: ${preset.name} (${preset.id})`);
      effectName = preset.effect;
      params = preset.params;
      topology = preset.topology;
    } else {
      effectName = payload.effectName;
      params = payload.params;
      console.log(`🎬 Running effect: ${effectName}`, params);
    }

    // Set topology if provided
    if (topology) {
      this.engine.getPanelGrid().setTopologyMode(topology as any);
    }

    // Map effect name to effect class
    const effectModule = await import('@chaser/core');
    const effectMap: Record<string, any> = {
      'solid': effectModule.SolidColorEffect,
      'sequential': effectModule.SequentialFadeEffect,
      'flow': effectModule.FlowEffect,
      'strobe': effectModule.StrobeEffect,
      'blackout': effectModule.BlackoutEffect,
      'static': effectModule.StaticEffect
    };

    const EffectClass = effectMap[effectName];
    if (!EffectClass) {
      throw new Error(`Unknown effect: ${effectName}`);
    }

    const effect = new EffectClass();
    this.engine.runEffect(effect, params);
  }

  /**
   * Handle savePreset command
   */
  private async handleSavePreset(ws: WebSocket, payload: any): Promise<void> {
    const { id, name, effect, topology, params } = payload;

    try {
      const preset = this.presetManager.create({ id, name, effect, topology, params });
      this.sendToClient(ws, {
        type: 'presetSaved',
        payload: { preset }
      });
    } catch (error) {
      throw new Error(`Failed to save preset: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle updatePreset command
   */
  private async handleUpdatePreset(ws: WebSocket, payload: any): Promise<void> {
    const { id, ...updates } = payload;

    try {
      const preset = this.presetManager.update(id, updates);
      if (!preset) {
        throw new Error(`Preset not found: ${id}`);
      }

      this.sendToClient(ws, {
        type: 'presetUpdated',
        payload: { preset }
      });
    } catch (error) {
      throw new Error(`Failed to update preset: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle deletePreset command
   */
  private async handleDeletePreset(ws: WebSocket, payload: any): Promise<void> {
    const { id } = payload;

    try {
      const success = this.presetManager.delete(id);
      if (!success) {
        throw new Error(`Preset not found: ${id}`);
      }

      this.sendToClient(ws, {
        type: 'presetDeleted',
        payload: { id }
      });
    } catch (error) {
      throw new Error(`Failed to delete preset: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle listPresets command
   */
  private async handleListPresets(ws: WebSocket): Promise<void> {
    const presets = this.presetManager.getAll();
    this.sendToClient(ws, {
      type: 'presetsList',
      payload: { presets }
    });
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
  public async shutdown(): Promise<void> {
    console.log('🛑 Shutting down server...');

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Close Art-Net connection
    if (this.artnetOutput) {
      this.artnetOutput.close();
    }

    // Disconnect MQTT Bridge
    if (this.mqttBridge) {
      await this.mqttBridge.disconnect();
    }

    this.clients.forEach(client => client.close());
    this.wss.close();
  }
}

// Start the server
const server = new ChaserServer(3001);

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await server.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.shutdown();
  process.exit(0);
});
