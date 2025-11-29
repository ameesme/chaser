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
    transitionDuration: 1000 // ms to fade to target color
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
    const baseDuration = (context.params.transitionDuration as number) || this.defaultParams.transitionDuration;
    const speed = (context.params.speed as number) ?? 1.0;
    const duration = baseDuration / speed; // Speed up or slow down
    const targetBrightness = (context.params.brightness as number) ?? this.defaultParams.brightness;

    // Calculate progress (0-1)
    const progress = Math.min(elapsed / duration, 1.0);

    // Apply easing for smooth fade-in
    const easedProgress = this.easeOut(progress);

    // Mark as done when transition complete
    if (progress >= 1.0) {
      this.done = true;
    }

    // Create uniform states for all panels
    const color = this.targetColor || { r: 255, g: 255, b: 255, cool: 255, warm: 0 };
    const brightness = targetBrightness * easedProgress;

    const panelCount = (context.panelGrid as any).getPanelCount();
    return this.createUniformStates(panelCount, color, brightness);
  }

  getProgress(): number {
    return this.done ? 1.0 : 0;
  }
}
