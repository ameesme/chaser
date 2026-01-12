import mqtt from 'mqtt';
import WebSocket from 'ws';
import type { PanelState, EffectPreset } from '@chaser/types';

/**
 * MQTT configuration for Home Assistant integration
 */
export interface MQTTConfig {
  enabled: boolean;
  broker: {
    host: string;
    port: number;
    username?: string;
    password?: string;
    clientId: string;
  };
  homeassistant: {
    discoveryPrefix: string;
    topicPrefix: string;
    retainDiscovery: boolean;
  };
  stateUpdateRate: number;
  reconnectInterval: number;
}

/**
 * Home Assistant light command format
 */
interface HALightCommand {
  state?: 'ON' | 'OFF';
  brightness?: number;
  color?: {
    r: number;
    g: number;
    b: number;
    c: number;
    w: number;
  };
}

/**
 * WebSocket message types
 */
interface WSMessage {
  type: 'stateUpdate' | 'connected' | 'presetsList' | 'presetSaved' | 'presetUpdated' | 'presetDeleted';
  payload?: any;
}

/**
 * MQTTBridge - Unified Home Assistant MQTT integration
 *
 * Acts as a WebSocket client to Chaser server and bridges to Home Assistant via MQTT.
 * - 14 RGBCCT light entities (light.panel_0 through light.panel_13)
 * - Dynamic preset button entities
 * - State throttling (60 FPS → 1 Hz) to prevent database spam
 * - Bidirectional sync (HA ↔ Chaser)
 */
export class MQTTBridge {
  private config: MQTTConfig;
  private chaserWSUrl: string;

  // Connections
  private mqttClient: mqtt.MqttClient | null = null;
  private wsClient: WebSocket | null = null;

  // State management
  private currentPanelStates: Map<number, PanelState> = new Map();
  private pendingStates: Map<number, PanelState> = new Map();
  private throttleTimer: NodeJS.Timeout | null = null;

  // Track intended brightness and color for each panel (before baking brightness into color)
  private panelBrightness: Map<number, number> = new Map(); // 0-1 range
  private panelFullColor: Map<number, { r: number; g: number; b: number; c: number; w: number }> = new Map();

  // Track current effect name
  private currentEffect: string | null = null;

  // Command batching to handle simultaneous HA commands
  private pendingCommands: Map<number, HALightCommand> = new Map();
  private commandBatchTimer: NodeJS.Timeout | null = null;
  private readonly COMMAND_BATCH_DELAY = 50; // ms

  // Preset management
  private presets: EffectPreset[] = [];

  constructor(config: MQTTConfig, chaserWSUrl: string) {
    this.config = config;
    this.chaserWSUrl = chaserWSUrl;
  }

  /**
   * Connect to both MQTT broker and Chaser WebSocket server
   */
  async connect(): Promise<void> {
    console.log('🏠 Connecting Home Assistant MQTT Bridge...');

    await this.connectMQTT();
    await this.connectWebSocket();

    // Start throttle timer
    this.startThrottleTimer();

    console.log('✅ Home Assistant MQTT Bridge connected');
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting Home Assistant MQTT Bridge...');

    // Stop throttle timer
    if (this.throttleTimer) {
      clearInterval(this.throttleTimer);
      this.throttleTimer = null;
    }

    // Publish offline status
    this.publishAvailability('offline');

    // Close connections
    if (this.wsClient) {
      this.wsClient.close();
      this.wsClient = null;
    }

    if (this.mqttClient) {
      await this.mqttClient.endAsync();
      this.mqttClient = null;
    }

    console.log('👋 Home Assistant MQTT Bridge disconnected');
  }

  /**
   * Connect to MQTT broker
   */
  private async connectMQTT(): Promise<void> {
    const { broker, homeassistant } = this.config;

    const mqttUrl = `mqtt://${broker.host}:${broker.port}`;
    const options: mqtt.IClientOptions = {
      clientId: broker.clientId,
      username: broker.username,
      password: broker.password,
      clean: true,
      reconnectPeriod: this.config.reconnectInterval,
      will: {
        topic: `${homeassistant.topicPrefix}/status`,
        payload: Buffer.from('offline'),
        qos: 1,
        retain: true
      }
    };

    console.log(`📡 Connecting to MQTT broker: ${mqttUrl}`);

    this.mqttClient = mqtt.connect(mqttUrl, options);

    return new Promise((resolve, reject) => {
      if (!this.mqttClient) return reject(new Error('MQTT client not initialized'));

      this.mqttClient.on('connect', () => {
        console.log('✅ Connected to MQTT broker');

        // Publish availability
        this.publishAvailability('online');

        // Publish discovery for 14 lights
        this.publishLightDiscovery();

        // Subscribe to light commands
        this.subscribeToLightCommands();

        // Subscribe to button presses
        this.subscribeToButtonPresses();

        resolve();
      });

      this.mqttClient.on('error', (error) => {
        console.error('❌ MQTT error:', error);
        reject(error);
      });

      this.mqttClient.on('message', (topic, payload) => {
        this.handleMQTTMessage(topic, payload);
      });

      this.mqttClient.on('reconnect', () => {
        console.log('🔄 Reconnecting to MQTT broker...');
      });

      this.mqttClient.on('close', () => {
        console.log('🔌 MQTT connection closed');
      });
    });
  }

  /**
   * Connect to Chaser WebSocket server
   */
  private async connectWebSocket(): Promise<void> {
    console.log(`🔌 Connecting to Chaser WebSocket: ${this.chaserWSUrl}`);

    return new Promise((resolve, reject) => {
      this.wsClient = new WebSocket(this.chaserWSUrl);

      this.wsClient.on('open', () => {
        console.log('✅ Connected to Chaser WebSocket');

        // Request preset list
        this.wsClient?.send(JSON.stringify({ type: 'listPresets' }));

        resolve();
      });

      this.wsClient.on('message', (data: Buffer) => {
        try {
          const message: WSMessage = JSON.parse(data.toString());
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      });

      this.wsClient.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        reject(error);
      });

      this.wsClient.on('close', () => {
        console.log('🔌 WebSocket connection closed');
        console.log('⚠️  WebSocket disconnected - restart server to reconnect');
      });
    });
  }

  /**
   * Handle WebSocket messages from Chaser server
   */
  private handleWebSocketMessage(message: WSMessage): void {
    switch (message.type) {
      case 'connected':
        console.log('🎮 Chaser server connection established');
        break;

      case 'stateUpdate':
        // Receive panel state updates at 60 FPS
        if (message.payload?.panels) {
          // Check if effect changed (and it's not static)
          const newEffect = message.payload?.currentEffect;
          if (newEffect && newEffect !== this.currentEffect && newEffect !== 'static') {
            // Clear tracked values when switching away from static control
            console.log(`🔄 Effect changed to '${newEffect}', clearing manual control tracking`);
            this.panelBrightness.clear();
            this.panelFullColor.clear();
          }
          this.currentEffect = newEffect;

          message.payload.panels.forEach((state: PanelState, index: number) => {
            this.enqueueStateUpdate(index, state);
          });
        }
        break;

      case 'presetsList':
        // Receive full preset list
        if (message.payload?.presets) {
          this.updatePresets(message.payload.presets);
        }
        break;

      case 'presetSaved':
        // New preset created
        if (message.payload?.preset) {
          this.addPreset(message.payload.preset);
        }
        break;

      case 'presetUpdated':
        // Preset modified
        if (message.payload?.preset) {
          this.updatePreset(message.payload.preset);
        }
        break;

      case 'presetDeleted':
        // Preset removed
        if (message.payload?.id) {
          this.removePreset(message.payload.id);
        }
        break;
    }
  }

  /**
   * Handle MQTT messages from Home Assistant
   */
  private handleMQTTMessage(topic: string, payload: Buffer): void {
    const { topicPrefix } = this.config.homeassistant;

    // Light command: chaser/light/panel_X/set
    const lightCommandMatch = topic.match(new RegExp(`^${topicPrefix}/light/panel_(\\d+)/set$`));
    if (lightCommandMatch) {
      const panelId = parseInt(lightCommandMatch[1], 10);
      try {
        const command: HALightCommand = JSON.parse(payload.toString());
        this.handleLightCommand(panelId, command);
      } catch (error) {
        console.error(`❌ Error parsing light command for panel ${panelId}:`, error);
      }
      return;
    }

    // Button press: chaser/button/preset_<id>/press
    const buttonPressMatch = topic.match(new RegExp(`^${topicPrefix}/button/preset_([^/]+)/press$`));
    if (buttonPressMatch) {
      const presetId = buttonPressMatch[1];
      this.handleButtonPress(presetId);
      return;
    }
  }

  /**
   * Enqueue state update for throttling (60 FPS → 1 Hz)
   */
  private enqueueStateUpdate(panelId: number, state: PanelState): void {
    // Store both current and pending state
    this.currentPanelStates.set(panelId, state);
    this.pendingStates.set(panelId, state);
  }

  /**
   * Start throttle timer (1 Hz)
   */
  private startThrottleTimer(): void {
    this.throttleTimer = setInterval(() => {
      this.flushPendingStates();
    }, this.config.stateUpdateRate);
  }

  /**
   * Flush pending states to MQTT (1 Hz)
   */
  private flushPendingStates(): void {
    if (this.pendingStates.size === 0) return;

    // Publish all pending panel states
    this.pendingStates.forEach((state, panelId) => {
      this.publishPanelState(panelId, state);
    });

    this.pendingStates.clear();
  }

  /**
   * Publish Home Assistant discovery config for 14 lights
   */
  private publishLightDiscovery(): void {
    if (!this.mqttClient) return;

    const { discoveryPrefix, topicPrefix, retainDiscovery } = this.config.homeassistant;

    for (let panelId = 0; panelId < 14; panelId++) {
      const discoveryTopic = `${discoveryPrefix}/light/${topicPrefix}/panel_${panelId}/config`;

      const discoveryPayload = {
        name: `Panel ${panelId}`,
        unique_id: `chaser_panel_${panelId}`,
        object_id: `panel_${panelId}`,
        state_topic: `${topicPrefix}/light/panel_${panelId}/state`,
        command_topic: `${topicPrefix}/light/panel_${panelId}/set`,
        availability_topic: `${topicPrefix}/status`,
        schema: 'json',
        brightness: true,
        color_mode: true,
        supported_color_modes: ['rgbww'],
        device: {
          identifiers: ['chaser_dmx'],
          name: 'Chaser DMX',
          model: 'LED Panel Controller',
          manufacturer: 'Chaser'
        }
      };

      this.mqttClient.publish(
        discoveryTopic,
        JSON.stringify(discoveryPayload),
        { qos: 1, retain: retainDiscovery }
      );
    }

    console.log('💡 Published discovery for 14 light entities');
  }

  /**
   * Publish panel state to Home Assistant
   */
  private publishPanelState(panelId: number, state: PanelState): void {
    if (!this.mqttClient) return;

    const { topicPrefix } = this.config.homeassistant;
    const stateTopic = `${topicPrefix}/light/panel_${panelId}/state`;

    // Get tracked brightness and full color for this panel
    const trackedBrightness = this.panelBrightness.get(panelId);
    const fullColor = this.panelFullColor.get(panelId);

    // If we have tracked data, use it; otherwise fall back to state
    let brightness: number;
    let color: { r: number; g: number; b: number; c: number; w: number };

    if (trackedBrightness !== undefined && fullColor) {
      // Use tracked values
      brightness = Math.round(trackedBrightness * 255);
      color = fullColor;
    } else {
      // Fallback to state values (for panels controlled by effects, not HA)
      brightness = Math.round(state.brightness * 255);
      color = {
        r: state.color.r,
        g: state.color.g,
        b: state.color.b,
        c: state.color.cool,
        w: state.color.warm
      };
    }

    // Check if panel is "on"
    const isOn = brightness > 0 && (
      color.r > 0 || color.g > 0 || color.b > 0 ||
      color.c > 0 || color.w > 0
    );

    const statePayload = {
      state: isOn ? 'ON' : 'OFF',
      brightness,
      color_mode: 'rgbww',
      color
    };

    this.mqttClient.publish(stateTopic, JSON.stringify(statePayload), { qos: 0 });
  }

  /**
   * Subscribe to light command topics
   */
  private subscribeToLightCommands(): void {
    if (!this.mqttClient) return;

    const { topicPrefix } = this.config.homeassistant;

    // Subscribe to all light commands using multi-level wildcard
    const commandTopic = `${topicPrefix}/light/#`;
    this.mqttClient.subscribe(commandTopic, { qos: 1 }, (err) => {
      if (err) {
        console.error('❌ Error subscribing to light commands:', err);
      } else {
        console.log('👂 Subscribed to light commands');
      }
    });
  }

  /**
   * Handle light command from Home Assistant
   * Commands are batched to handle simultaneous multi-panel updates
   */
  private handleLightCommand(panelId: number, command: HALightCommand): void {
    // Add command to pending batch
    this.pendingCommands.set(panelId, command);

    // Clear existing timer and set new one
    if (this.commandBatchTimer) {
      clearTimeout(this.commandBatchTimer);
    }

    this.commandBatchTimer = setTimeout(() => {
      this.flushCommandBatch();
    }, this.COMMAND_BATCH_DELAY);
  }

  /**
   * Process batched commands as a single StaticEffect update
   */
  private flushCommandBatch(): void {
    if (this.pendingCommands.size === 0) return;

    // Build StaticEffect params for all panels
    const panelColors: any[] = [];

    for (let i = 0; i < 14; i++) {
      // Check if this panel has a pending command
      const command = this.pendingCommands.get(i);

      if (command) {
        // Update this panel with new command
        const brightness = command.brightness !== undefined ? command.brightness / 255 : 1;
        const isOff = command.state === 'OFF';

        // Determine color to use
        let r, g, b, cool, warm;
        if (command.color) {
          // Use color from command
          r = command.color.r ?? 0;
          g = command.color.g ?? 0;
          b = command.color.b ?? 0;
          cool = command.color.c ?? 0;
          warm = command.color.w ?? 0;
        } else {
          // Preserve existing full-brightness color (not the dimmed one from engine)
          const trackedColor = this.panelFullColor.get(i);
          if (trackedColor) {
            r = trackedColor.r;
            g = trackedColor.g;
            b = trackedColor.b;
            cool = trackedColor.c;
            warm = trackedColor.w;
          } else {
            // Default to white if no tracked color
            r = 0;
            g = 0;
            b = 0;
            cool = 255;
            warm = 0;
          }
        }

        // Store full brightness color and intended brightness for this panel
        this.panelFullColor.set(i, { r, g, b, c: cool, w: warm });
        this.panelBrightness.set(i, isOff ? 0 : brightness);

        // Apply brightness directly to color channels
        panelColors.push({
          r: isOff ? 0 : Math.round(r * brightness),
          g: isOff ? 0 : Math.round(g * brightness),
          b: isOff ? 0 : Math.round(b * brightness),
          cool: isOff ? 0 : Math.round(cool * brightness),
          warm: isOff ? 0 : Math.round(warm * brightness)
        });
      } else {
        // Preserve current state of other panels
        const currentState = this.currentPanelStates.get(i);
        if (currentState) {
          // Apply brightness to color channels for preserved panels too
          panelColors.push({
            r: Math.round(currentState.color.r * currentState.brightness),
            g: Math.round(currentState.color.g * currentState.brightness),
            b: Math.round(currentState.color.b * currentState.brightness),
            cool: Math.round(currentState.color.cool * currentState.brightness),
            warm: Math.round(currentState.color.warm * currentState.brightness)
          });
        } else {
          // Default to off if no current state
          panelColors.push({
            r: 0, g: 0, b: 0, cool: 0, warm: 0
          });
        }
      }
    }

    // Send runEffect command to Chaser via WebSocket
    // Set global brightness to 1.0 since we've already applied per-panel brightness to colors
    // Add 1s transition for smooth fades
    const wsMessage = {
      type: 'runEffect',
      payload: {
        effectName: 'static',
        params: {
          panelColors,
          brightness: 1.0,
          transitionDuration: 1000
        }
      }
    };

    if (this.wsClient && this.wsClient.readyState === WebSocket.OPEN) {
      this.wsClient.send(JSON.stringify(wsMessage));
    } else {
      console.error('❌ WebSocket not connected, cannot send command');
    }

    // Clear pending commands
    this.pendingCommands.clear();
    this.commandBatchTimer = null;
  }

  /**
   * Update preset list and sync with Home Assistant
   */
  private updatePresets(presets: EffectPreset[]): void {
    console.log(`🎨 Received ${presets.length} presets from server`);

    // Remove buttons for deleted presets
    const newPresetIds = new Set(presets.map(p => p.id));
    const oldPresetIds = new Set(this.presets.map(p => p.id));

    oldPresetIds.forEach(oldId => {
      if (!newPresetIds.has(oldId)) {
        this.removePresetButton(oldId);
      }
    });

    // Add/update buttons for all current presets
    presets.forEach(preset => {
      this.publishPresetButton(preset);
    });

    this.presets = presets;
  }

  /**
   * Add a new preset
   */
  private addPreset(preset: EffectPreset): void {
    const exists = this.presets.find(p => p.id === preset.id);
    if (!exists) {
      this.presets.push(preset);
      this.publishPresetButton(preset);
      console.log(`➕ Added preset button: ${preset.name}`);
    }
  }

  /**
   * Update an existing preset
   */
  private updatePreset(preset: EffectPreset): void {
    const index = this.presets.findIndex(p => p.id === preset.id);
    if (index !== -1) {
      this.presets[index] = preset;
      this.publishPresetButton(preset);
      console.log(`🔄 Updated preset button: ${preset.name}`);
    }
  }

  /**
   * Remove a preset
   */
  private removePreset(presetId: string): void {
    const index = this.presets.findIndex(p => p.id === presetId);
    if (index !== -1) {
      this.presets.splice(index, 1);
      this.removePresetButton(presetId);
      console.log(`➖ Removed preset button: ${presetId}`);
    }
  }

  /**
   * Publish Home Assistant discovery config for preset button
   */
  private publishPresetButton(preset: EffectPreset): void {
    if (!this.mqttClient) return;

    const { discoveryPrefix, topicPrefix, retainDiscovery } = this.config.homeassistant;

    const discoveryTopic = `${discoveryPrefix}/button/${topicPrefix}/preset_${preset.id}/config`;

    const discoveryPayload = {
      name: `Preset: ${preset.name}`,
      unique_id: `chaser_preset_${preset.id}`,
      object_id: `preset_${preset.id}`,
      command_topic: `${topicPrefix}/button/preset_${preset.id}/press`,
      availability_topic: `${topicPrefix}/status`,
      device: {
        identifiers: ['chaser_dmx'],
        name: 'Chaser DMX',
        model: 'LED Panel Controller',
        manufacturer: 'Chaser'
      }
    };

    this.mqttClient.publish(
      discoveryTopic,
      JSON.stringify(discoveryPayload),
      { qos: 1, retain: retainDiscovery }
    );
  }

  /**
   * Remove preset button from Home Assistant
   */
  private removePresetButton(presetId: string): void {
    if (!this.mqttClient) return;

    const { discoveryPrefix, topicPrefix } = this.config.homeassistant;
    const discoveryTopic = `${discoveryPrefix}/button/${topicPrefix}/preset_${presetId}/config`;

    // Publish empty payload to remove entity
    this.mqttClient.publish(discoveryTopic, '', { qos: 1, retain: true });
  }

  /**
   * Subscribe to button press topics
   */
  private subscribeToButtonPresses(): void {
    if (!this.mqttClient) return;

    const { topicPrefix } = this.config.homeassistant;

    // Subscribe to all button presses using multi-level wildcard
    const buttonTopic = `${topicPrefix}/button/#`;
    this.mqttClient.subscribe(buttonTopic, { qos: 1 }, (err) => {
      if (err) {
        console.error('❌ Error subscribing to button presses:', err);
      } else {
        console.log('👂 Subscribed to preset button presses');
      }
    });
  }

  /**
   * Handle button press from Home Assistant
   */
  private handleButtonPress(presetId: string): void {
    // Send runEffect command to Chaser via WebSocket
    const wsMessage = {
      type: 'runEffect',
      payload: { presetId }
    };

    if (this.wsClient && this.wsClient.readyState === WebSocket.OPEN) {
      this.wsClient.send(JSON.stringify(wsMessage));
    } else {
      console.error('❌ WebSocket not connected, cannot trigger preset');
    }
  }

  /**
   * Publish availability status
   */
  private publishAvailability(status: 'online' | 'offline'): void {
    if (!this.mqttClient) return;

    const { topicPrefix } = this.config.homeassistant;
    const availabilityTopic = `${topicPrefix}/status`;

    this.mqttClient.publish(availabilityTopic, status, { qos: 1, retain: true });
    console.log(`📡 Published availability: ${status}`);
  }

}
