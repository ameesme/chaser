import type { EffectContext, PanelState } from '@chaser/types';
import { BaseEffect } from './BaseEffect.js';

/**
 * Blackout effect - turns all panels off (black)
 * Type: Oneshot (fades to black over transition duration)
 * Mode: Singular (all panels synchronized)
 */
export class BlackoutEffect extends BaseEffect {
  readonly name = 'blackout';
  readonly type = 'oneshot' as const;
  readonly defaultParams = {
    transitionDuration: 0  // Instant by default
  };

  private startStates: PanelState[] = [];

  initialize(context: EffectContext): void {
    super.initialize(context);
    // Capture current panel states to fade from
    this.startStates = (context.panelGrid as any).getAllStates().map((state: PanelState) => ({
      color: { ...state.color },
      brightness: state.brightness
    }));
  }

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

    // Fade from current state to black
    const blackColor = { r: 0, g: 0, b: 0, cool: 0, warm: 0 };

    return this.startStates.map((startState) => {
      // Interpolate each color channel from start to black
      const color = {
        r: Math.round(startState.color.r * (1 - easedProgress)),
        g: Math.round(startState.color.g * (1 - easedProgress)),
        b: Math.round(startState.color.b * (1 - easedProgress)),
        cool: Math.round(startState.color.cool * (1 - easedProgress)),
        warm: Math.round(startState.color.warm * (1 - easedProgress))
      };

      // Also fade brightness
      const brightness = startState.brightness * (1 - easedProgress);

      return { color, brightness };
    });
  }

  isComplete(context: EffectContext): boolean {
    const elapsed = this.getElapsedSinceStart(context);
    const duration = (context.params.transitionDuration as number) ?? this.defaultParams.transitionDuration;
    return elapsed >= duration;
  }
}
