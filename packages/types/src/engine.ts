import type { PanelState } from './panel.js';
import type { PanelTopology, TopologyMode } from './topology.js';

/**
 * Engine configuration
 */
export interface EngineConfig {
  columns: number;
  rowsPerColumn: number;
  targetFPS?: number;
  initialTopology?: TopologyMode;
}

/**
 * Engine state information
 */
export interface EngineState {
  isRunning: boolean;
  isPaused: boolean;
  currentEffect: string | null;
  elapsedTime: number;
  fps: number;
}

/**
 * Output interface for rendering panel states
 * Implement this to add new output targets (Canvas, DMX, etc.)
 */
export interface EngineOutput {
  /**
   * Render current panel states
   */
  render(states: PanelState[], topology: PanelTopology): void;
}

/**
 * Configuration loaded from config.json
 */
export interface Config {
  engine: EngineConfig;
  presets: Record<string, unknown>; // ColorPreset, but avoiding circular dependency
  simulator?: {
    port: number;
    panelScale: number;
  };
}
