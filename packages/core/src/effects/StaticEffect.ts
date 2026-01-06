import type { EffectContext, PanelState, RGBCCTColor } from '@chaser/types';
import { BaseEffect } from './BaseEffect.js';

/**
 * Static effect - allows per-panel color configuration
 * Type: Continuous (maintains state)
 * Mode: Per-panel individual colors
 */
export class StaticEffect extends BaseEffect {
  readonly name = 'static';
  readonly type = 'continuous' as const;
  readonly defaultParams = {
    panelColors: [] as RGBCCTColor[], // Array of colors, one per panel
    brightness: 1.0
  };

  private panelColors: RGBCCTColor[] = [];

  initialize(context: EffectContext): void {
    super.initialize(context);

    const panelCount = (context.panelGrid as any).getPanelCount();

    // Get panel colors from params or initialize with default (black)
    if (context.params.panelColors && Array.isArray(context.params.panelColors)) {
      this.panelColors = context.params.panelColors as RGBCCTColor[];
    } else {
      // Default to black for all panels
      this.panelColors = Array(panelCount).fill(null).map(() => ({
        r: 0, g: 0, b: 0, cool: 0, warm: 0
      }));
    }

    // Ensure we have exactly panelCount colors
    while (this.panelColors.length < panelCount) {
      this.panelColors.push({ r: 0, g: 0, b: 0, cool: 0, warm: 0 });
    }
  }

  compute(context: EffectContext): PanelState[] {
    if (!this.initialized) {
      this.initialize(context);
    }

    const brightness = (context.params.brightness as number) ?? this.defaultParams.brightness;
    const panelCount = (context.panelGrid as any).getPanelCount();

    // Return each panel with its configured color
    return this.panelColors.slice(0, panelCount).map((color) => ({
      color,
      brightness,
      timestamp: Date.now()
    }));
  }

  getProgress(): number {
    return 0; // Continuous effect, no progress
  }
}
