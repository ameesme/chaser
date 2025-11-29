import type { PanelState } from './panel.js';

/**
 * Effect parameters - effect-specific configuration
 */
export interface EffectParams {
  [key: string]: unknown;
  speed?: number;         // Animation speed multiplier
  colorPreset?: string;   // Color preset name
  brightness?: number;    // Brightness override (0-1)
}

/**
 * Context provided to effects during computation
 * Contains all dependencies an effect needs
 */
export interface EffectContext {
  deltaTime: number;        // Milliseconds since last frame
  elapsedTime: number;      // Milliseconds since effect started
  panelGrid: unknown;       // Will be PanelGrid, but avoiding circular dependency
  colorManager: unknown;    // Will be ColorManager, but avoiding circular dependency
  params: EffectParams;     // Effect-specific parameters
}

/**
 * Core effect interface
 */
export interface Effect {
  readonly name: string;
  readonly type: 'continuous' | 'oneshot';
  readonly defaultParams: EffectParams;

  /**
   * Initialize effect when it starts
   */
  initialize(context: EffectContext): void;

  /**
   * Compute panel states for current frame
   */
  compute(context: EffectContext): PanelState[];

  /**
   * Clean up resources when effect stops
   */
  cleanup(): void;

  /**
   * Check if one-shot effect is complete
   */
  isDone(): boolean;

  /**
   * Get progress for one-shot effects (0-1)
   */
  getProgress(): number;
}
