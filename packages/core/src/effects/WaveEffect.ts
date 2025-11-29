import type { EffectContext, PanelState, RGBCCTColor } from '@chaser/types';
import { BaseEffect } from './BaseEffect.js';

/**
 * Wave effect - sine wave brightness modulation down columns
 * Type: Continuous (loops forever)
 * Mode: Linear (two independent columns)
 */
export class WaveEffect extends BaseEffect {
  readonly name = 'wave';
  readonly type = 'continuous' as const;
  readonly defaultParams = {
    colorPreset: 'ocean',
    speed: 1.0,           // Waves per second
    brightness: 1.0,
    waveHeight: 0.5,      // Amplitude of brightness wave (0-1)
    waveLength: 2.0       // Waves per column
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
    const waveHeight = (context.params.waveHeight as number) ?? this.defaultParams.waveHeight;
    const waveLength = (context.params.waveLength as number) ?? this.defaultParams.waveLength;

    // Get base color from preset
    const preset = colorManager.getPreset(presetName);
    let baseColor: RGBCCTColor;

    if (preset && preset.type === 'solid' && preset.solid) {
      baseColor = preset.solid;
    } else if (preset && preset.type === 'gradient' && preset.gradient) {
      // Use middle of gradient
      baseColor = colorManager.interpolateGradient(preset.gradient, 0.5);
    } else {
      // Default to blue
      baseColor = { r: 0, g: 100, b: 200, cool: 0, warm: 0 };
    }

    // Get linear sequences (two columns)
    const sequences = panelGrid.getLinearSequences();
    const elapsed = this.getElapsedSinceStart(context);

    // Create panel states array
    const states: PanelState[] = new Array(panelGrid.getPanelCount());

    // Process each column independently
    sequences.forEach((columnIndices: number[]) => {
      columnIndices.forEach((panelIndex: number, rowIdx: number) => {
        // Calculate wave position
        const normalizedRow = rowIdx / columnIndices.length;
        const phase = normalizedRow * Math.PI * 2 * waveLength;
        const time = (elapsed / 1000) * speed;
        const wave = Math.sin(phase + time * Math.PI * 2);

        // Map wave (-1 to 1) to brightness
        // Base brightness + wave modulation
        const baseBrightness = 0.5; // Midpoint
        const modulation = wave * waveHeight;
        const brightness = this.clamp(
          (baseBrightness + modulation) * targetBrightness,
          0,
          1
        );

        states[panelIndex] = this.createPanelState(baseColor, brightness);
      });
    });

    return states;
  }
}
