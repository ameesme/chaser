import type { EffectContext, PanelState, RGBCCTColor } from '@chaser/types';
import { BaseEffect } from './BaseEffect.js';

/**
 * Sequential fade effect - fades panels in one by one to target color
 * Type: One-shot (completes after all panels fade in)
 * Mode: Works with any topology (uses sequences)
 */
export class SequentialFadeEffect extends BaseEffect {
  readonly name = 'sequential-fade';
  readonly type = 'oneshot' as const;
  readonly defaultParams = {
    colorPreset: 'white',
    brightness: 1.0,
    delayBetweenPanels: 100,  // ms delay between each panel starting
    fadeDuration: 500          // ms for each panel to fade in
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

    const panelGrid = context.panelGrid as any;
    const elapsed = this.getElapsedSinceStart(context);
    const targetBrightness = (context.params.brightness as number) ?? this.defaultParams.brightness;
    const speed = (context.params.speed as number) ?? 1.0;
    const delayBetweenPanels = ((context.params.delayBetweenPanels as number) ?? this.defaultParams.delayBetweenPanels) / speed;
    const fadeDuration = ((context.params.fadeDuration as number) ?? this.defaultParams.fadeDuration) / speed;

    // Get the sequences based on current topology
    const topology = panelGrid.getTopology();
    const color = this.targetColor || { r: 255, g: 255, b: 255, cool: 255, warm: 0 };
    const states: PanelState[] = new Array(panelGrid.getPanelCount());

    // Initialize all panels to black
    for (let i = 0; i < states.length; i++) {
      states[i] = this.createPanelState(color, 0);
    }

    // Calculate which panels should be fading and their progress
    let allComplete = true;

    // Process all sequences (for linear mode, this handles both columns)
    topology.sequences.forEach((sequence: number[]) => {
      sequence.forEach((panelIndex: number, seqIndex: number) => {
        // Calculate when this panel should start fading
        const panelStartTime = seqIndex * delayBetweenPanels;

        if (elapsed >= panelStartTime) {
          // This panel has started fading
          const panelElapsed = elapsed - panelStartTime;
          const progress = Math.min(panelElapsed / fadeDuration, 1.0);

          // Apply easing
          const easedProgress = this.easeOut(progress);
          const brightness = targetBrightness * easedProgress;

          states[panelIndex] = this.createPanelState(color, brightness);

          if (progress < 1.0) {
            allComplete = false;
          }
        } else {
          // This panel hasn't started yet
          allComplete = false;
        }
      });
    });

    // Mark as done when all panels are fully faded in
    if (allComplete) {
      this.done = true;
    }

    return states;
  }

  getProgress(): number {
    return this.done ? 1.0 : 0;
  }
}
