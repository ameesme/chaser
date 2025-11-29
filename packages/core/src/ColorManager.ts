import type { RGBCCTColor, ColorPreset, Gradient } from '@chaser/types';
import { interpolateRGB, interpolateHSV, blendRGBCCT, clampRGBCCT } from './utils/colorSpace.js';

/**
 * Manages color presets and interpolation
 */
export class ColorManager {
  private presets: Map<string, ColorPreset>;

  constructor() {
    this.presets = new Map();
  }

  /**
   * Add a color preset
   */
  addPreset(name: string, preset: ColorPreset): void {
    this.presets.set(name, preset);
  }

  /**
   * Get a color preset by name
   */
  getPreset(name: string): ColorPreset | undefined {
    return this.presets.get(name);
  }

  /**
   * List all preset names
   */
  listPresets(): string[] {
    return Array.from(this.presets.keys());
  }

  /**
   * Remove a preset
   */
  removePreset(name: string): boolean {
    return this.presets.delete(name);
  }

  /**
   * Check if a preset exists
   */
  hasPreset(name: string): boolean {
    return this.presets.has(name);
  }

  /**
   * Sample a gradient at a specific position (0-1)
   */
  interpolateGradient(gradient: Gradient, position: number): RGBCCTColor {
    // Clamp position to 0-1
    position = Math.max(0, Math.min(1, position));

    const stops = [...gradient.stops].sort((a, b) => a.position - b.position);

    // Handle edge cases
    if (stops.length === 0) {
      return { r: 0, g: 0, b: 0, cool: 0, warm: 0 };
    }
    if (stops.length === 1 || position <= stops[0].position) {
      return { ...stops[0].color };
    }
    if (position >= stops[stops.length - 1].position) {
      return { ...stops[stops.length - 1].color };
    }

    // Find two adjacent stops
    let lower = stops[0];
    let upper = stops[stops.length - 1];

    for (let i = 0; i < stops.length - 1; i++) {
      if (position >= stops[i].position && position <= stops[i + 1].position) {
        lower = stops[i];
        upper = stops[i + 1];
        break;
      }
    }

    // Calculate local position between stops
    const range = upper.position - lower.position;
    const localPosition = range > 0 ? (position - lower.position) / range : 0;

    // Interpolate based on color space
    const rgb1 = { r: lower.color.r, g: lower.color.g, b: lower.color.b };
    const rgb2 = { r: upper.color.r, g: upper.color.g, b: upper.color.b };

    let interpolatedRGB;
    if (gradient.colorSpace === 'hsv') {
      interpolatedRGB = interpolateHSV(rgb1, rgb2, localPosition);
    } else {
      // 'rgb' or 'lab' (for now, lab is treated as rgb)
      interpolatedRGB = interpolateRGB(rgb1, rgb2, localPosition);
    }

    // Interpolate CCT channels linearly
    const cool = lower.color.cool + (upper.color.cool - lower.color.cool) * localPosition;
    const warm = lower.color.warm + (upper.color.warm - lower.color.warm) * localPosition;

    return clampRGBCCT({
      r: interpolatedRGB.r,
      g: interpolatedRGB.g,
      b: interpolatedRGB.b,
      cool,
      warm
    });
  }

  /**
   * Blend two colors
   */
  blendColors(color1: RGBCCTColor, color2: RGBCCTColor, mix: number): RGBCCTColor {
    return blendRGBCCT(color1, color2, mix);
  }

  /**
   * Load presets from config object
   */
  loadPresetsFromConfig(presets: Record<string, unknown>): void {
    for (const [name, presetData] of Object.entries(presets)) {
      try {
        // Validate and add preset
        const preset = presetData as ColorPreset;
        if (this.isValidPreset(preset)) {
          this.addPreset(name, preset);
        } else {
          console.warn(`Invalid preset "${name}", skipping`);
        }
      } catch (error) {
        console.error(`Error loading preset "${name}":`, error);
      }
    }
  }

  /**
   * Validate preset structure
   */
  private isValidPreset(preset: unknown): preset is ColorPreset {
    if (typeof preset !== 'object' || preset === null) {
      return false;
    }

    const p = preset as ColorPreset;

    if (p.type !== 'solid' && p.type !== 'gradient') {
      return false;
    }

    if (p.type === 'solid') {
      return this.isValidRGBCCTColor(p.solid);
    }

    if (p.type === 'gradient') {
      return this.isValidGradient(p.gradient);
    }

    return false;
  }

  /**
   * Validate RGBCCT color structure
   */
  private isValidRGBCCTColor(color: unknown): boolean {
    if (typeof color !== 'object' || color === null) {
      return false;
    }

    const c = color as RGBCCTColor;
    return (
      typeof c.r === 'number' &&
      typeof c.g === 'number' &&
      typeof c.b === 'number' &&
      typeof c.cool === 'number' &&
      typeof c.warm === 'number'
    );
  }

  /**
   * Validate gradient structure
   */
  private isValidGradient(gradient: unknown): boolean {
    if (typeof gradient !== 'object' || gradient === null) {
      return false;
    }

    const g = gradient as Gradient;
    return (
      Array.isArray(g.stops) &&
      g.stops.length > 0 &&
      g.stops.every(stop =>
        typeof stop.position === 'number' &&
        this.isValidRGBCCTColor(stop.color)
      ) &&
      (g.colorSpace === 'rgb' || g.colorSpace === 'hsv' || g.colorSpace === 'lab')
    );
  }
}
