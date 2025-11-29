import type { EffectContext, PanelState, Gradient } from '@chaser/types';
import { BaseEffect } from './BaseEffect.js';

/**
 * Chase effect - animated pattern traveling around circular loop
 * Type: Continuous (loops forever)
 * Mode: Circular (uses circular topology)
 *
 * Supports two modes:
 * - Full Gradient (fullGradient=true): Shows complete gradient across all panels, rotating
 * - Chase Pattern (fullGradient=false): Gradient with brightness falloff creating chase effect
 */
export class ChaseEffect extends BaseEffect {
  readonly name = 'chase';
  readonly type = 'continuous' as const;
  readonly defaultParams = {
    colorPreset: 'rainbow',
    speed: 1.0,              // Revolutions per second
    brightness: 1.0,
    chaseLength: 3,          // Number of panels in bright zone
    fullGradient: true       // If true, show full gradient; if false, use chase pattern
  };

  compute(context: EffectContext): PanelState[] {
    if (!this.initialized) {
      this.initialize(context);
    }

    const panelGrid = context.panelGrid as any;
    const colorManager = context.colorManager as any;

    // Get parameters
    const presetName = (context.params.colorPreset as string) || this.defaultParams.colorPreset;
    const speed = (context.params.speed as number) ?? this.defaultParams.speed;
    const targetBrightness = (context.params.brightness as number) ?? this.defaultParams.brightness;
    const chaseLength = (context.params.chaseLength as number) ?? this.defaultParams.chaseLength;
    const fullGradient = (context.params.fullGradient as boolean) ?? this.defaultParams.fullGradient;

    // Get preset
    const preset = colorManager.getPreset(presetName);
    let gradient: Gradient;

    if (preset && preset.type === 'gradient' && preset.gradient) {
      gradient = preset.gradient;
    } else {
      // Default gradient (red to blue)
      gradient = {
        stops: [
          { position: 0.0, color: { r: 255, g: 0, b: 0, cool: 0, warm: 0 } },
          { position: 1.0, color: { r: 0, g: 0, b: 255, cool: 0, warm: 0 } }
        ],
        colorSpace: 'rgb'
      };
    }

    // Get circular sequence
    const sequence = panelGrid.getCircularSequence();
    const elapsed = this.getElapsedSinceStart(context);

    // Calculate chase position (0-1 around the loop)
    const position = (elapsed * speed / 1000) % 1.0;

    // Create panel states
    const states: PanelState[] = new Array(panelGrid.getPanelCount());

    sequence.forEach((panelIndex: number, seqIndex: number) => {
      // Map panel position to gradient position
      const panelPosition = seqIndex / sequence.length;

      // Calculate offset from chase position
      let offset = (panelPosition - position + 1) % 1.0;

      // Sample gradient at this offset
      const color = colorManager.interpolateGradient(gradient, offset);

      let brightness: number;

      if (fullGradient) {
        // Full gradient mode: show gradient across all panels at full brightness
        brightness = targetBrightness;
      } else {
        // Chase mode: brightness falloff based on distance from chase head
        const distanceFromHead = Math.min(offset, 1 - offset);
        const falloffRange = chaseLength / sequence.length;
        brightness = distanceFromHead < falloffRange
          ? (1 - distanceFromHead / falloffRange) * targetBrightness
          : 0;
      }

      states[panelIndex] = this.createPanelState(color, brightness);
    });

    return states;
  }
}
