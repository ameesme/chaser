/**
 * @chaser/core
 * Core effect engine for Chaser DMX LED panels
 */

export { PanelGrid } from './PanelGrid.js';
export { ColorManager } from './ColorManager.js';
export { Engine } from './Engine.js';
export { EffectRunner } from './EffectRunner.js';

// Effects
export { BaseEffect, SolidColorEffect, SequentialFadeEffect, FlowEffect, StrobeEffect, ChaseEffect, WaveEffect } from './effects/index.js';

// Re-export types for convenience
export type {
  Panel,
  PanelState,
  PanelGridConfig,
  TopologyMode,
  PanelTopology,
  RGBCCTColor,
  ColorPreset,
  Gradient,
  Effect,
  EffectContext,
  EffectParams,
  EngineConfig,
  EngineState,
  EngineOutput
} from '@chaser/types';
