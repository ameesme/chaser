import type { EffectContext, PanelState, Gradient } from '@chaser/types';
import { BaseEffect } from './BaseEffect.js';

/**
 * Flow effect - gradient animation that respects topology mode
 * Type: Continuous (loops forever)
 * Mode: Topology-aware (adapts to current topology setting)
 *
 * In circular mode: gradient rotates around the loop
 * In linear mode: gradient flows down columns
 * In singular mode: all panels show same color
 */
export class FlowEffect extends BaseEffect {
  readonly name = 'flow';
  readonly type = 'continuous' as const;
  readonly defaultParams = {
    colorPreset: 'rainbow',
    speed: 1.0,              // Speed multiplier
    brightness: 1.0,
    mode: 'full',            // 'full' or 'chase'
    chaseLength: 3,          // Panels in bright zone (chase mode only)
    waveHeight: 0.0,         // Brightness wave modulation (0 = none, 0.5 = moderate)
    scale: 0.2               // Gradient scale - fraction of gradient shown (0.1 = 10%, negative reverses)
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
    const mode = (context.params.mode as string) || this.defaultParams.mode;
    const chaseLength = (context.params.chaseLength as number) ?? this.defaultParams.chaseLength;
    const waveHeight = (context.params.waveHeight as number) ?? this.defaultParams.waveHeight;
    const scale = (context.params.scale as number) ?? this.defaultParams.scale;

    // Get preset
    const preset = colorManager.getPreset(presetName);
    let gradient: Gradient;

    if (preset && preset.type === 'gradient' && preset.gradient) {
      gradient = preset.gradient;
    } else if (preset && preset.type === 'solid' && preset.solid) {
      const color = preset.solid;
      // Create a simple gradient from the solid color
      gradient = {
        stops: [
          { position: 0.0, color: { r: color.r, g: color.g, b: color.b, cool: color.cool, warm: color.warm } },
          { position: 1.0, color: { r: color.r, g: color.g, b: color.b, cool: color.cool, warm: color.warm } }
        ],
        colorSpace: 'rgb'
      };
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

    // Get topology and sequences
    const topology = panelGrid.getTopology();
    const elapsed = this.getElapsedSinceStart(context);
    const timeOffset = (elapsed * speed / 1000) % 1.0;

    // Create panel states
    const states: PanelState[] = new Array(panelGrid.getPanelCount());

    // Handle singular mode
    if (topology.mode === 'singular') {
      // All panels show same color at same brightness
      const color = colorManager.interpolateGradient(gradient, timeOffset);
      const brightness = targetBrightness;

      for (let i = 0; i < states.length; i++) {
        states[i] = this.createPanelState(color, brightness);
      }
      return states;
    }

    // Handle circular and linear modes
    topology.sequences.forEach((sequence: number[]) => {
      sequence.forEach((panelIndex: number, seqIndex: number) => {
        // Calculate position in sequence (0-1)
        const normalizedPosition = seqIndex / sequence.length;

        // Calculate gradient position with scale and time offset
        // Scale < 1 shows portion of gradient (higher resolution)
        // Scale = 1 shows full gradient
        // Negative scale reverses direction
        let gradientPosition = (normalizedPosition * scale + timeOffset) % 1.0;

        // Handle negative modulo for reverse direction
        if (gradientPosition < 0) {
          gradientPosition += 1.0;
        }

        // Sample gradient at this position
        const color = colorManager.interpolateGradient(gradient, gradientPosition);

        // Calculate brightness
        let brightness = targetBrightness;

        // Apply chase mode brightness falloff if enabled
        if (mode === 'chase') {
          let offset = normalizedPosition;
          const distanceFromHead = Math.min(offset, 1 - offset);
          const falloffRange = chaseLength / sequence.length;

          if (distanceFromHead < falloffRange) {
            brightness = (1 - distanceFromHead / falloffRange) * targetBrightness;
          } else {
            brightness = 0;
          }
        }

        // Apply wave modulation if enabled
        if (waveHeight > 0) {
          const wavePhase = normalizedPosition * Math.PI * 4; // 2 waves per sequence
          const wave = Math.sin(wavePhase + timeOffset * Math.PI * 2);
          const baseBrightness = brightness;
          const modulation = wave * waveHeight * brightness;
          brightness = this.clamp(baseBrightness + modulation, 0, 1);
        }

        states[panelIndex] = this.createPanelState(color, brightness);
      });
    });

    return states;
  }
}
