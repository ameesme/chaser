/**
 * @chaser/types
 * Shared TypeScript types for Chaser DMX effect engine
 */

// Color types
export type {
  RGBCCTColor,
  RGBColor,
  HSVColor,
  GradientStop,
  Gradient,
  ColorPreset
} from './color.js';

// Panel types
export type {
  Panel,
  PanelState,
  PanelGridConfig
} from './panel.js';

// Topology types
export type {
  TopologyMode,
  PanelTopology
} from './topology.js';

// Effect types
export type {
  EffectParams,
  EffectContext,
  Effect
} from './effect.js';

// Engine types
export type {
  EngineConfig,
  EngineState,
  EngineOutput,
  Config
} from './engine.js';

// Preset types
export type {
  EffectPreset,
  PresetStorage
} from './preset.js';
