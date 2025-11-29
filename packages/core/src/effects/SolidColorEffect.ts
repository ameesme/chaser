import type { EffectContext, PanelState, RGBCCTColor } from '@chaser/types';
import { BaseEffect } from './BaseEffect.js';

/**
 * Solid color effect - fades all panels to a single color
 * Type: One-shot (completes after transition)
 * Mode: Singular (all panels same)
 */
export class SolidColorEffect extends BaseEffect {
  readonly name = 'solid-color';
  readonly type = 'oneshot' as const;
  readonly defaultParams = {
    colorPreset: 'white',
    brightness: 1.0,
    transitionDuration: 1000, // ms to fade to target color
    startColor: null // null = fade from black, or specify RGBCCTColor
  };

  private targetColor: RGBCCTColor | null = null;
  private startColor: RGBCCTColor = { r: 0, g: 0, b: 0, cool: 0, warm: 0 };

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

    // Get start color if provided
    if (context.params.startColor) {
      this.startColor = context.params.startColor as RGBCCTColor;
    }
  }

  compute(context: EffectContext): PanelState[] {
    if (!this.initialized) {
      this.initialize(context);
    }

    const elapsed = this.getElapsedSinceStart(context);
    const duration = (context.params.transitionDuration as number) || this.defaultParams.transitionDuration;
    const targetBrightness = (context.params.brightness as number) ?? this.defaultParams.brightness;

    // Calculate progress (0-1)
    const progress = Math.min(elapsed / duration, 1.0);

    // Apply easing for smooth fade-in
    const easedProgress = this.easeOut(progress);

    // Mark as done when transition complete
    if (progress >= 1.0) {
      this.done = true;
    }

    // Interpolate between start and target color
    const targetColor = this.targetColor || { r: 255, g: 255, b: 255, cool: 255, warm: 0 };
    const color = {
      r: Math.round(this.startColor.r + (targetColor.r - this.startColor.r) * easedProgress),
      g: Math.round(this.startColor.g + (targetColor.g - this.startColor.g) * easedProgress),
      b: Math.round(this.startColor.b + (targetColor.b - this.startColor.b) * easedProgress),
      cool: Math.round(this.startColor.cool + (targetColor.cool - this.startColor.cool) * easedProgress),
      warm: Math.round(this.startColor.warm + (targetColor.warm - this.startColor.warm) * easedProgress)
    };

    const panelCount = (context.panelGrid as any).getPanelCount();
    return this.createUniformStates(panelCount, color, targetBrightness);
  }

  getProgress(): number {
    return this.done ? 1.0 : 0;
  }
}
