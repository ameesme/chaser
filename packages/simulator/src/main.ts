import { Engine } from '@chaser/core';
import { CanvasRenderer } from './CanvasRenderer.js';
import { SimulatorUI } from './SimulatorUI.js';

/**
 * Main entry point for simulator
 */
async function main() {
  // Load config
  const config = await loadConfig();

  // Initialize engine
  const engine = new Engine({
    columns: config.engine.columns,
    rowsPerColumn: config.engine.rowsPerColumn,
    targetFPS: config.engine.targetFPS,
    initialTopology: config.engine.initialTopology as any
  });

  // Load color presets
  const colorManager = engine.getColorManager();
  colorManager.loadPresetsFromConfig(config.presets);

  // Setup canvas renderer
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas element not found');
  }

  const scale = config.simulator?.panelScale || 2;
  const renderer = new CanvasRenderer(canvas, scale);
  engine.addOutput(renderer);

  // Setup UI
  const controlsContainer = document.getElementById('controls') as HTMLElement;
  if (!controlsContainer) {
    throw new Error('Controls container not found');
  }

  const ui = new SimulatorUI(engine, controlsContainer);

  // Start engine
  engine.start();

  // Update status display
  setInterval(() => {
    const state = engine.getState();
    ui.updateStatus(state.fps, state.currentEffect);
  }, 100);

  console.log('Chaser simulator initialized');
  console.log(`Loaded ${colorManager.listPresets().length} color presets:`, colorManager.listPresets());
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
