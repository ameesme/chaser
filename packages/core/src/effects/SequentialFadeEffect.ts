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
    fadeDuration: 500,        // ms for each panel to fade in
    startColor: null          // null = fade from black, or specify RGBCCTColor
  };

  private targetColor: RGBCCTColor | null = null;
  private startColor: RGBCCTColor = { r: 0, g: 0, b: 0, cool: 0, warm: 0 };

  initialize(context: EffectContext): void {
    super.initialize(context);

    // Get target color from preset
    const presetName = (context.params.colorPreset as string) || this.defaultParams.colorPreset;
    this.targetColor = this.getColorFromPreset(context, presetName);

    // Get start color if provided
    if (context.params.startColor) {
      this.startColor = context.params.startColor as RGBCCTColor;
    }
  }

  compute(context: EffectContext): PanelState[] {
    if (!this.initialized) {
      this.initialize(context);
    }

    const panelGrid = context.panelGrid as any;
    const elapsed = this.getElapsedSinceStart(context);
    const targetBrightness = (context.params.brightness as number) ?? this.defaultParams.brightness;

    // Use transitionDuration if provided, otherwise use individual timing params
    const transitionDuration = context.params.transitionDuration as number;
    let delayBetweenPanels: number;
    let fadeDuration: number;

    if (transitionDuration !== undefined) {
      // Split the transition duration: 70% for fading, 30% for delays
      const totalPanels = panelGrid.getPanelCount();
      delayBetweenPanels = (transitionDuration * 0.3) / totalPanels;
      fadeDuration = transitionDuration * 0.7;
    } else {
      delayBetweenPanels = (context.params.delayBetweenPanels as number) ?? this.defaultParams.delayBetweenPanels;
      fadeDuration = (context.params.fadeDuration as number) ?? this.defaultParams.fadeDuration;
    }

    // Get the sequences based on current topology
    const topology = panelGrid.getTopology();
    const targetColor = this.targetColor || { r: 255, g: 255, b: 255, cool: 255, warm: 0 };
    const states: PanelState[] = new Array(panelGrid.getPanelCount());

    // Initialize all panels to start color
    for (let i = 0; i < states.length; i++) {
      states[i] = this.createPanelState(this.startColor, targetBrightness);
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

          // Interpolate between start and target color
          const color = {
            r: Math.round(this.startColor.r + (targetColor.r - this.startColor.r) * easedProgress),
            g: Math.round(this.startColor.g + (targetColor.g - this.startColor.g) * easedProgress),
            b: Math.round(this.startColor.b + (targetColor.b - this.startColor.b) * easedProgress),
            cool: Math.round(this.startColor.cool + (targetColor.cool - this.startColor.cool) * easedProgress),
            warm: Math.round(this.startColor.warm + (targetColor.warm - this.startColor.warm) * easedProgress)
          };

          states[panelIndex] = this.createPanelState(color, targetBrightness);

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
