import type { EffectContext, PanelState, RGBCCTColor } from '@chaser/types';
import { BaseEffect } from './BaseEffect.js';

/**
 * Static effect - allows per-panel color configuration with smooth transitions
 * Type: Continuous (maintains state)
 * Mode: Per-panel individual colors with optional fade transitions
 */
export class StaticEffect extends BaseEffect {
  readonly name = 'static';
  readonly type = 'continuous' as const;
  readonly defaultParams = {
    panelColors: [] as RGBCCTColor[], // Array of colors, one per panel
    brightness: 1.0,
    transitionDuration: 300 // Transition duration in ms (0 = instant)
  };

  private targetColors: RGBCCTColor[] = [];
  private previousColors: RGBCCTColor[] = [];
  private transitionStartTime: number = 0;
  private isTransitioning: boolean = false;
  private firstCompute: boolean = true;

  initialize(context: EffectContext): void {
    super.initialize(context);

    const panelCount = (context.panelGrid as any).getPanelCount();

    // Get panel colors from params or initialize with default (black)
    if (context.params.panelColors && Array.isArray(context.params.panelColors)) {
      this.targetColors = context.params.panelColors as RGBCCTColor[];
    } else {
      // Default to black for all panels
      this.targetColors = Array(panelCount).fill(null).map(() => ({
        r: 0, g: 0, b: 0, cool: 0, warm: 0
      }));
    }

    // Ensure we have exactly panelCount colors
    while (this.targetColors.length < panelCount) {
      this.targetColors.push({ r: 0, g: 0, b: 0, cool: 0, warm: 0 });
    }

    // DON'T initialize previousColors yet - we'll read from panel grid in first compute()
    this.previousColors = [];
  }

  compute(context: EffectContext): PanelState[] {
    if (!this.initialized) {
      this.initialize(context);
    }

    const brightness = (context.params.brightness as number) ?? this.defaultParams.brightness;
    const transitionDuration = (context.params.transitionDuration as number) ?? this.defaultParams.transitionDuration;
    const panelCount = (context.panelGrid as any).getPanelCount();
    const now = Date.now();

    // On first compute, initialize previousColors from current panel states
    if (this.firstCompute) {
      this.previousColors = this.getCurrentColors(context);
      this.transitionStartTime = now;
      this.isTransitioning = transitionDuration > 0;
      this.firstCompute = false;
    }

    // Check if target colors have changed (new command received)
    const newTargetColors = context.params.panelColors as RGBCCTColor[] | undefined;
    if (newTargetColors && this.hasColorsChanged(newTargetColors, this.targetColors)) {
      // Store current state as previous colors for smooth transition
      this.previousColors = this.getCurrentColors(context);
      this.targetColors = newTargetColors;
      this.transitionStartTime = now;
      this.isTransitioning = transitionDuration > 0;
    }

    // Calculate transition progress
    let transitionProgress = 1.0;
    if (this.isTransitioning) {
      const elapsed = now - this.transitionStartTime;
      transitionProgress = Math.min(elapsed / transitionDuration, 1.0);

      // Apply easing function (ease-out cubic for smooth deceleration)
      transitionProgress = 1 - Math.pow(1 - transitionProgress, 3);

      if (transitionProgress >= 1.0) {
        this.isTransitioning = false;
      }
    }

    // Interpolate between previous and target colors
    const currentColors = this.targetColors.slice(0, panelCount).map((targetColor, index) => {
      const prevColor = this.previousColors[index] || { r: 0, g: 0, b: 0, cool: 0, warm: 0 };

      return {
        r: Math.round(this.lerp(prevColor.r, targetColor.r, transitionProgress)),
        g: Math.round(this.lerp(prevColor.g, targetColor.g, transitionProgress)),
        b: Math.round(this.lerp(prevColor.b, targetColor.b, transitionProgress)),
        cool: Math.round(this.lerp(prevColor.cool, targetColor.cool, transitionProgress)),
        warm: Math.round(this.lerp(prevColor.warm, targetColor.warm, transitionProgress))
      };
    });

    // Return each panel with its interpolated color
    return currentColors.map((color) => ({
      color,
      brightness,
      timestamp: now
    }));
  }

  /**
   * Get current interpolated colors from last render
   */
  private getCurrentColors(context: EffectContext): RGBCCTColor[] {
    const panelCount = (context.panelGrid as any).getPanelCount();
    const states = (context.panelGrid as any).getAllStates() as PanelState[];

    return states.slice(0, panelCount).map(state => ({ ...state.color }));
  }

  /**
   * Check if colors array has changed
   */
  private hasColorsChanged(newColors: RGBCCTColor[], oldColors: RGBCCTColor[]): boolean {
    if (newColors.length !== oldColors.length) return true;

    return newColors.some((newColor, index) => {
      const oldColor = oldColors[index];
      return newColor.r !== oldColor.r ||
             newColor.g !== oldColor.g ||
             newColor.b !== oldColor.b ||
             newColor.cool !== oldColor.cool ||
             newColor.warm !== oldColor.warm;
    });
  }

  /**
   * Linear interpolation between two values
   */
  private lerp(start: number, end: number, progress: number): number {
    return start + (end - start) * progress;
  }

  getProgress(): number {
    return 0; // Continuous effect, no progress
  }
}
