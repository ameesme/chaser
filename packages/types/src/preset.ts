/**
 * Preset types for storing and managing effect presets
 */

/**
 * Effect preset - saved configuration for an effect
 */
export interface EffectPreset {
  id: string;              // Human-readable, sanitized ID (user-provided)
  name: string;            // User-defined display name
  effect: 'solid' | 'sequential' | 'flow' | 'strobe' | 'blackout';
  topology: string;        // 'circular' | 'linear' | 'singular'
  params: Record<string, any>;  // Effect-specific parameters
  createdAt: number;       // Timestamp
  updatedAt: number;       // Timestamp
  isProtected: boolean;    // Protected from deletion (for default presets)
}

/**
 * Preset storage format for JSON file
 */
export interface PresetStorage {
  version: string;
  presets: EffectPreset[];
}
