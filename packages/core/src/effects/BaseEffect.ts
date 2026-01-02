import type { Effect, EffectContext, EffectParams, PanelState, RGBCCTColor } from '@chaser/types';

/**
 * Abstract base class for all effects
 */
export abstract class BaseEffect implements Effect {
  abstract readonly name: string;
  abstract readonly type: 'continuous' | 'oneshot';
  abstract readonly defaultParams: EffectParams;

  protected startTime: number = 0;
  protected done: boolean = false;
  protected initialized: boolean = false;

  /**
   * Initialize effect when it starts
   */
  initialize(context: EffectContext): void {
    this.startTime = context.elapsedTime;
    this.done = false;
    this.initialized = true;
  }

  /**
   * Compute panel states - must be implemented by subclasses
   */
  abstract compute(context: EffectContext): PanelState[];

  /**
   * Clean up resources when effect stops
   */
  cleanup(): void {
    this.initialized = false;
    this.done = false;
  }

  /**
   * Check if one-shot effect is complete
   */
  isDone(): boolean {
    return this.done;
  }

  /**
   * Get progress for one-shot effects (0-1)
   * Override in subclasses for one-shot effects
   */
  getProgress(): number {
    if (this.type === 'continuous') {
      return 0;
    }
    return this.done ? 1.0 : 0;
  }

  /**
   * Helper: Get elapsed time since effect started
   */
  protected getElapsedSinceStart(context: EffectContext): number {
    return context.elapsedTime - this.startTime;
  }

  /**
   * Helper: Create a panel state from color and brightness
   */
  protected createPanelState(color: RGBCCTColor, brightness: number): PanelState {
    return {
      color,
      brightness: Math.max(0, Math.min(1, brightness)),
      timestamp: Date.now()
    };
  }

  /**
   * Helper: Create array of identical panel states
   */
  protected createUniformStates(panelCount: number, color: RGBCCTColor, brightness: number): PanelState[] {
    const state = this.createPanelState(color, brightness);
    return Array(panelCount).fill(null).map(() => ({ ...state }));
  }

  /**
   * Helper: Apply easing function to a value (0-1)
   */
  protected easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  /**
   * Helper: Apply ease-in function
   */
  protected easeIn(t: number): number {
    return t * t;
  }

  /**
   * Helper: Apply ease-out function
   */
  protected easeOut(t: number): number {
    return t * (2 - t);
  }

  /**
   * Helper: Clamp value between min and max
   */
  protected clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Helper: Get color from a color preset
   * Handles both solid and gradient presets, sampling gradients at position 0.5
   */
  protected getColorFromPreset(context: EffectContext, presetName: string, defaultColor?: RGBCCTColor): RGBCCTColor {
    const preset = (context.colorManager as any).getPreset(presetName);

    if (preset && preset.type === 'solid' && preset.solid) {
      return preset.solid;
    } else if (preset && preset.type === 'gradient' && preset.gradient) {
      // If it's a gradient, sample the middle of it
      return (context.colorManager as any).interpolateGradient(preset.gradient, 0.5);
    } else {
      // Default to white if preset not found and no default provided
      return defaultColor || { r: 255, g: 255, b: 255, cool: 255, warm: 0 };
    }
  }
}
