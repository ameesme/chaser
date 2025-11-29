/**
 * @chaser/core
 * Core effect engine for Chaser DMX LED panels
 */

export { PanelGrid } from './PanelGrid.js';
export { ColorManager } from './ColorManager.js';

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
  EffectParams
} from '@chaser/types';
