import type { Effect, EffectContext, EffectParams, PanelState } from '@chaser/types';

/**
 * Manages effect lifecycle and execution
 */
export class EffectRunner {
  private currentEffect: Effect | null = null;
  private currentParams: EffectParams = {};

  /**
   * Set the active effect
   */
  setEffect(effect: Effect, params?: EffectParams): void {
    // Clean up previous effect
    if (this.currentEffect) {
      this.currentEffect.cleanup();
    }

    this.currentEffect = effect;
    this.currentParams = {
      ...effect.defaultParams,
      ...params
    };

    // Initialize new effect
    // Note: We'll initialize with a dummy context, actual context comes in update()
    // This is a limitation of the current design, but works for our use case
  }

  /**
   * Clear the current effect
   */
  clearEffect(): void {
    if (this.currentEffect) {
      this.currentEffect.cleanup();
      this.currentEffect = null;
      this.currentParams = {};
    }
  }

  /**
   * Update and compute panel states for current frame
   */
  update(context: EffectContext): PanelState[] | null {
    if (!this.currentEffect) {
      return null;
    }

    // Merge context params with stored params
    const effectContext: EffectContext = {
      ...context,
      params: { ...this.currentParams, ...context.params }
    };

    // Compute panel states from effect
    const states = this.currentEffect.compute(effectContext);

    // Check if one-shot effect is done
    if (this.currentEffect.type === 'oneshot' && this.currentEffect.isDone()) {
      // Effect completed, clear it
      this.clearEffect();
    }

    return states;
  }

  /**
   * Check if an effect is currently active
   */
  isEffectActive(): boolean {
    return this.currentEffect !== null;
  }

  /**
   * Get the current effect (if any)
   */
  getCurrentEffect(): Effect | null {
    return this.currentEffect;
  }

  /**
   * Get current effect name
   */
  getCurrentEffectName(): string | null {
    return this.currentEffect?.name ?? null;
  }

  /**
   * Get current effect progress (for one-shot effects)
   */
  getProgress(): number {
    if (!this.currentEffect) {
      return 0;
    }
    return this.currentEffect.getProgress();
  }
}
