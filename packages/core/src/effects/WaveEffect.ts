import type { EffectContext, PanelState, RGBCCTColor, Gradient } from '@chaser/types';
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

    // Get color from preset
    const preset = colorManager.getPreset(presetName);
    let baseColor: RGBCCTColor | null = null;
    let gradient: Gradient | null = null;

    if (preset && preset.type === 'solid' && preset.solid) {
      baseColor = preset.solid;
    } else if (preset && preset.type === 'gradient' && preset.gradient) {
      // Use gradient mode
      gradient = preset.gradient;
    } else {
      // Default to blue
      baseColor = { r: 0, g: 100, b: 200, cool: 0, warm: 0 };
    }

    // Get linear sequences (two columns)
    const sequences = panelGrid.getLinearSequences();
    const elapsed = this.getElapsedSinceStart(context);

    // Create panel states array
    const states: PanelState[] = new Array(panelGrid.getPanelCount());

    // Calculate time offset for animation
    const timeOffset = (elapsed / 1000) * speed;

    // Process each column independently
    sequences.forEach((columnIndices: number[]) => {
      columnIndices.forEach((panelIndex: number, rowIdx: number) => {
        // Calculate normalized position (0-1) down the column
        const normalizedRow = rowIdx / columnIndices.length;

        // Get color from gradient or solid
        let color: RGBCCTColor;
        if (gradient) {
          // Sample gradient based on position down column (with time offset for animation)
          const gradientPosition = (normalizedRow + timeOffset) % 1.0;
          color = colorManager.interpolateGradient(gradient, gradientPosition);
        } else {
          color = baseColor!;
        }

        // Calculate wave position for brightness modulation
        const phase = normalizedRow * Math.PI * 2 * waveLength;
        const wave = Math.sin(phase + timeOffset * Math.PI * 2);

        // Map wave (-1 to 1) to brightness
        // Base brightness + wave modulation
        const baseBrightness = 0.5; // Midpoint
        const modulation = wave * waveHeight;
        const brightness = this.clamp(
          (baseBrightness + modulation) * targetBrightness,
          0,
          1
        );

        states[panelIndex] = this.createPanelState(color, brightness);
      });
    });

    return states;
  }
}
