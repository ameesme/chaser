import dgram from 'dgram';
import type { EngineOutput, PanelState, PanelTopology } from '@chaser/types';

export interface ArtNetConfig {
  enabled: boolean;
  host: string; // Art-Net node IP address (e.g., '192.168.1.100' or '255.255.255.255' for broadcast)
  port: number; // Art-Net port (default: 6454)
  universe: number; // Art-Net universe (0-15)
  subnet: number; // Art-Net subnet (0-15)
  net: number; // Art-Net net (0-127)
  startChannel: number; // Starting DMX channel (1-512)
  channelsPerPanel: number; // Number of DMX channels per panel (5 for RGBCCT)
  refreshRate: number; // Refresh rate in Hz (default: 44)
}

/**
 * Art-Net DMX output for LED panels
 * Maps RGBCCT panel states to DMX channels via Art-Net protocol
 */
export class ArtNetOutput implements EngineOutput {
  private config: ArtNetConfig;
  private socket: dgram.Socket | null = null;
  private dmxData: Buffer;
  private sequence: number = 0;
  private lastSendTime: number = 0;
  private minInterval: number;

  constructor(config: ArtNetConfig) {
    this.config = config;
    this.dmxData = Buffer.alloc(512, 0);
    this.minInterval = 1000 / config.refreshRate; // ms between packets

    if (!config.enabled) {
      console.log('💡 Art-Net output disabled in config');
      return;
    }

    try {
      // Create UDP socket
      this.socket = dgram.createSocket('udp4');

      // Enable broadcast if needed
      if (config.host === '255.255.255.255') {
        this.socket.setBroadcast(true);
      }

      console.log(`✅ Art-Net output initialized`);
      console.log(`   Host: ${config.host}:${config.port}`);
      console.log(`   Universe: ${config.universe} (Net: ${config.net}, Subnet: ${config.subnet})`);
      console.log(`   Start Channel: ${config.startChannel}`);
      console.log(`   Channels per Panel: ${config.channelsPerPanel}`);
      console.log(`   Refresh Rate: ${config.refreshRate} Hz`);
    } catch (error) {
      console.error('❌ Failed to initialize Art-Net:', error);
      this.socket = null;
    }
  }

  /**
   * Render panel states to Art-Net DMX
   */
  render(states: PanelState[], _topology: PanelTopology): void {
    if (!this.config.enabled || !this.socket) {
      return;
    }

    // Rate limiting - don't send faster than configured refresh rate
    const now = Date.now();
    if (now - this.lastSendTime < this.minInterval) {
      return;
    }
    this.lastSendTime = now;

    // Clear DMX buffer
    this.dmxData.fill(0);

    // Map panel states to DMX channels
    states.forEach((state, panelIndex) => {
      const baseChannel = this.config.startChannel - 1 + (panelIndex * this.config.channelsPerPanel);

      // Check if channels are within DMX universe bounds
      if (baseChannel < 0 || baseChannel + this.config.channelsPerPanel > 512) {
        return;
      }

      // Apply brightness to all channels
      const r = Math.round(state.color.r * state.brightness);
      const g = Math.round(state.color.g * state.brightness);
      const b = Math.round(state.color.b * state.brightness);
      const cool = Math.round(state.color.cool * state.brightness);
      const warm = Math.round(state.color.warm * state.brightness);

      // Map to DMX channels (RGBCCT order)
      this.dmxData[baseChannel] = Math.max(0, Math.min(255, r));
      this.dmxData[baseChannel + 1] = Math.max(0, Math.min(255, g));
      this.dmxData[baseChannel + 2] = Math.max(0, Math.min(255, b));
      this.dmxData[baseChannel + 3] = Math.max(0, Math.min(255, cool));
      this.dmxData[baseChannel + 4] = Math.max(0, Math.min(255, warm));
    });

    // Send Art-Net packet
    this.sendArtNetPacket();
  }

  /**
   * Build and send Art-Net DMX packet
   */
  private sendArtNetPacket(): void {
    if (!this.socket) return;

    // Art-Net header
    const packet = Buffer.alloc(18 + 512);

    // ID (8 bytes): "Art-Net\0"
    packet.write('Art-Net\0', 0, 8);

    // OpCode (2 bytes): 0x5000 (ArtDMX) - little endian
    packet.writeUInt16LE(0x5000, 8);

    // Protocol Version (2 bytes): 14 - big endian
    packet.writeUInt16BE(14, 10);

    // Sequence (1 byte): incrementing packet counter
    packet.writeUInt8(this.sequence++, 12);
    if (this.sequence > 255) this.sequence = 0;

    // Physical (1 byte): 0
    packet.writeUInt8(0, 13);

    // Universe (2 bytes): SubNet (high nibble) + Universe (low nibble) - little endian
    const universeAddr = (this.config.net << 8) | (this.config.subnet << 4) | this.config.universe;
    packet.writeUInt16LE(universeAddr, 14);

    // Length (2 bytes): 512 - big endian
    packet.writeUInt16BE(512, 16);

    // DMX Data (512 bytes)
    this.dmxData.copy(packet, 18);

    // Send packet
    this.socket.send(packet, this.config.port, this.config.host, (err) => {
      if (err) {
        console.error('❌ Art-Net send error:', err);
      }
    });
  }

  /**
   * Close Art-Net connection
   */
  close(): void {
    if (this.socket) {
      console.log('🔌 Closing Art-Net connection');

      // Send blackout
      this.dmxData.fill(0);
      this.sendArtNetPacket();

      // Close socket
      this.socket.close();
      this.socket = null;
    }
  }

  /**
   * Check if Art-Net is active
   */
  isActive(): boolean {
    return this.config.enabled && this.socket !== null;
  }
}
