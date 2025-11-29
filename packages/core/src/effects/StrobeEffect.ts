import type { EffectContext, PanelState, RGBCCTColor } from '@chaser/types';
import { BaseEffect } from './BaseEffect.js';

/**
 * Strobe effect - rapid on/off flashing
 * Type: Continuous (loops forever)
 * Mode: Singular (all panels synchronized)
 */
export class StrobeEffect extends BaseEffect {
  readonly name = 'strobe';
  readonly type = 'continuous' as const;
  readonly defaultParams = {
    colorPreset: 'white',
    brightness: 1.0,
    frequency: 10,        // Flashes per second
    dutyCycle: 0.5        // Portion of cycle that's on (0.5 = 50% on, 50% off)
  };

  private targetColor: RGBCCTColor | null = null;

  initialize(context: EffectContext): void {
    super.initialize(context);

    // Get target color from preset
    const presetName = (context.params.colorPreset as string) || this.defaultParams.colorPreset;
    const preset = (context.colorManager as any).getPreset(presetName);

    if (preset && preset.type === 'solid' && preset.solid) {
      this.targetColor = preset.solid;
    } else if (preset && preset.type === 'gradient' && preset.gradient) {
      // If it's a gradient, sample the middle of it
      this.targetColor = (context.colorManager as any).interpolateGradient(preset.gradient, 0.5);
    } else {
      // Default to white if preset not found
      this.targetColor = { r: 255, g: 255, b: 255, cool: 255, warm: 0 };
    }
  }

  compute(context: EffectContext): PanelState[] {
    if (!this.initialized) {
      this.initialize(context);
    }

    const elapsed = this.getElapsedSinceStart(context);
    const frequency = (context.params.frequency as number) ?? this.defaultParams.frequency;
    const dutyCycle = (context.params.dutyCycle as number) ?? this.defaultParams.dutyCycle;
    const targetBrightness = (context.params.brightness as number) ?? this.defaultParams.brightness;

    // Calculate strobe state
    const cycleDuration = 1000 / frequency; // ms per flash cycle
    const cyclePosition = (elapsed % cycleDuration) / cycleDuration; // 0-1

    // Determine if we're in the "on" portion of the cycle
    const isOn = cyclePosition < dutyCycle;
    const brightness = isOn ? targetBrightness : 0;

    // Create uniform states for all panels
    const color = this.targetColor || { r: 255, g: 255, b: 255, cool: 255, warm: 0 };
    const panelCount = (context.panelGrid as any).getPanelCount();
    return this.createUniformStates(panelCount, color, brightness);
  }
}
