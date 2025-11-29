import { WebSocketClient } from './WebSocketClient.js';
import { CanvasRenderer } from './CanvasRenderer.js';
import { SimulatorUI } from './SimulatorUI.js';

/**
 * Main entry point for simulator
 */
async function main() {
  // Load config
  const config = await loadConfig();

  // Create WebSocket client
  const serverUrl = `ws://localhost:${config.server?.port || 3001}`;
  const client = new WebSocketClient(serverUrl);

  // Setup canvas renderer
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas element not found');
  }

  const scale = config.simulator?.panelScale || 2;
  const renderer = new CanvasRenderer(canvas, scale);

  // Connect to server
  console.log('🔌 Connecting to server...');
  await client.connect();
  console.log('✅ Connected to server');

  // Setup UI
  const controlsContainer = document.getElementById('controls') as HTMLElement;
  if (!controlsContainer) {
    throw new Error('Controls container not found');
  }

  const ui = new SimulatorUI(client, controlsContainer);

  // Handle state updates from server
  client.onStateUpdate((panels, currentEffect) => {
    // Render panels on canvas
    renderer.render(panels, {} as any); // topology not needed for rendering

    // Update status display
    const fps = 60; // Approximate FPS
    ui.updateStatus(fps, currentEffect);
  });

  // Handle connection events
  client.onConnected(() => {
    console.log('✅ Connected to server');
  });

  client.onDisconnected(() => {
    console.warn('⚠️ Disconnected from server, attempting reconnect...');
  });

  client.onError((error) => {
    console.error('❌ Error:', error);
  });

  console.log('Chaser simulator initialized');
}

/**
 * Load configuration from config.json
 */
async function loadConfig() {
  try {
    const response = await fetch('/config.json');
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading config:', error);
    // Return default config
    return {
      engine: {
        targetFPS: 60,
        columns: 2,
        rowsPerColumn: 7,
        initialTopology: 'circular'
      },
      presets: {
        white: {
          type: 'solid',
          solid: { r: 255, g: 255, b: 255, cool: 255, warm: 0 }
        }
      },
      simulator: {
        port: 3000,
        panelScale: 2
      }
    };
  }
}

// Start the application
main().catch(console.error);
