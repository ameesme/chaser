import type { EffectContext, PanelState } from '@chaser/types';
import { BaseEffect } from './BaseEffect.js';

/**
 * Blackout effect - turns all panels off (black)
 * Type: Oneshot (completes immediately)
 * Mode: Singular (all panels synchronized)
 */
export class BlackoutEffect extends BaseEffect {
  readonly name = 'blackout';
  readonly type = 'oneshot' as const;
  readonly defaultParams = {
    transitionDuration: 0  // Instant by default
  };

  compute(context: EffectContext): PanelState[] {
    if (!this.initialized) {
      this.initialize(context);
    }

    const elapsed = this.getElapsedSinceStart(context);
    const duration = (context.params.transitionDuration as number) ?? this.defaultParams.transitionDuration;

    // Calculate fade progress
    let progress = duration > 0 ? Math.min(1, elapsed / duration) : 1;

    // Apply easing for smooth transition
    const easedProgress = this.easeInOut(progress);

    // Fade to black
    const brightness = 1 - easedProgress;

    // Create black states for all panels
    const blackColor = { r: 0, g: 0, b: 0, cool: 0, warm: 0 };
    const panelCount = (context.panelGrid as any).getPanelCount();
    return this.createUniformStates(panelCount, blackColor, brightness);
  }

  isComplete(context: EffectContext): boolean {
    const elapsed = this.getElapsedSinceStart(context);
    const duration = (context.params.transitionDuration as number) ?? this.defaultParams.transitionDuration;
    return elapsed >= duration;
  }
}
