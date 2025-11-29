import { describe, it, expect, beforeEach } from 'vitest';
import { ColorManager } from './ColorManager.js';
import type { ColorPreset, Gradient } from '@chaser/types';

describe('ColorManager', () => {
  let colorManager: ColorManager;

  beforeEach(() => {
    colorManager = new ColorManager();
  });

  describe('preset management', () => {
    it('should add and retrieve preset', () => {
      const preset: ColorPreset = {
        type: 'solid',
        solid: { r: 255, g: 100, b: 50, cool: 0, warm: 0 }
      };

      colorManager.addPreset('test', preset);
      const retrieved = colorManager.getPreset('test');

      expect(retrieved).toBeDefined();
      expect(retrieved?.type).toBe('solid');
      expect(retrieved?.solid?.r).toBe(255);
    });

    it('should list all presets', () => {
      colorManager.addPreset('preset1', {
        type: 'solid',
        solid: { r: 255, g: 0, b: 0, cool: 0, warm: 0 }
      });
      colorManager.addPreset('preset2', {
        type: 'solid',
        solid: { r: 0, g: 255, b: 0, cool: 0, warm: 0 }
      });

      const presets = colorManager.listPresets();
      expect(presets).toHaveLength(2);
      expect(presets).toContain('preset1');
      expect(presets).toContain('preset2');
    });

    it('should remove preset', () => {
      colorManager.addPreset('test', {
        type: 'solid',
        solid: { r: 255, g: 0, b: 0, cool: 0, warm: 0 }
      });

      expect(colorManager.hasPreset('test')).toBe(true);
      colorManager.removePreset('test');
      expect(colorManager.hasPreset('test')).toBe(false);
    });

    it('should check if preset exists', () => {
      expect(colorManager.hasPreset('nonexistent')).toBe(false);

      colorManager.addPreset('exists', {
        type: 'solid',
        solid: { r: 0, g: 0, b: 0, cool: 0, warm: 0 }
      });

      expect(colorManager.hasPreset('exists')).toBe(true);
    });
  });

  describe('gradient interpolation', () => {
    it('should interpolate simple two-stop gradient', () => {
      const gradient: Gradient = {
        stops: [
          { position: 0.0, color: { r: 0, g: 0, b: 0, cool: 0, warm: 0 } },
          { position: 1.0, color: { r: 255, g: 255, b: 255, cool: 0, warm: 0 } }
        ],
        colorSpace: 'rgb'
      };

      // At position 0.5, should be roughly middle gray
      const color = colorManager.interpolateGradient(gradient, 0.5);
      expect(color.r).toBeCloseTo(127, -1); // Allow some rounding
      expect(color.g).toBeCloseTo(127, -1);
      expect(color.b).toBeCloseTo(127, -1);
    });

    it('should return first stop color when position is 0', () => {
      const gradient: Gradient = {
        stops: [
          { position: 0.0, color: { r: 100, g: 150, b: 200, cool: 10, warm: 20 } },
          { position: 1.0, color: { r: 255, g: 255, b: 255, cool: 0, warm: 0 } }
        ],
        colorSpace: 'rgb'
      };

      const color = colorManager.interpolateGradient(gradient, 0);
      expect(color.r).toBe(100);
      expect(color.g).toBe(150);
      expect(color.b).toBe(200);
      expect(color.cool).toBe(10);
      expect(color.warm).toBe(20);
    });

    it('should return last stop color when position is 1', () => {
      const gradient: Gradient = {
        stops: [
          { position: 0.0, color: { r: 0, g: 0, b: 0, cool: 0, warm: 0 } },
          { position: 1.0, color: { r: 255, g: 200, b: 100, cool: 50, warm: 75 } }
        ],
        colorSpace: 'rgb'
      };

      const color = colorManager.interpolateGradient(gradient, 1);
      expect(color.r).toBe(255);
      expect(color.g).toBe(200);
      expect(color.b).toBe(100);
      expect(color.cool).toBe(50);
      expect(color.warm).toBe(75);
    });

    it('should clamp position to 0-1 range', () => {
      const gradient: Gradient = {
        stops: [
          { position: 0.0, color: { r: 0, g: 0, b: 0, cool: 0, warm: 0 } },
          { position: 1.0, color: { r: 255, g: 255, b: 255, cool: 0, warm: 0 } }
        ],
        colorSpace: 'rgb'
      };

      // Position < 0 should return first stop
      const colorNeg = colorManager.interpolateGradient(gradient, -0.5);
      expect(colorNeg.r).toBe(0);

      // Position > 1 should return last stop
      const colorOver = colorManager.interpolateGradient(gradient, 1.5);
      expect(colorOver.r).toBe(255);
    });

    it('should handle multi-stop gradients', () => {
      const gradient: Gradient = {
        stops: [
          { position: 0.0, color: { r: 255, g: 0, b: 0, cool: 0, warm: 0 } },
          { position: 0.5, color: { r: 0, g: 255, b: 0, cool: 0, warm: 0 } },
          { position: 1.0, color: { r: 0, g: 0, b: 255, cool: 0, warm: 0 } }
        ],
        colorSpace: 'rgb'
      };

      // At 0.25, should be between red and green
      const color1 = colorManager.interpolateGradient(gradient, 0.25);
      expect(color1.r).toBeGreaterThan(0);
      expect(color1.g).toBeGreaterThan(0);
      expect(color1.b).toBe(0);

      // At 0.75, should be between green and blue
      const color2 = colorManager.interpolateGradient(gradient, 0.75);
      expect(color2.r).toBe(0);
      expect(color2.g).toBeGreaterThan(0);
      expect(color2.b).toBeGreaterThan(0);
    });

    it('should handle HSV color space', () => {
      const gradient: Gradient = {
        stops: [
          { position: 0.0, color: { r: 255, g: 0, b: 0, cool: 0, warm: 0 } },
          { position: 1.0, color: { r: 0, g: 0, b: 255, cool: 0, warm: 0 } }
        ],
        colorSpace: 'hsv'
      };

      // HSV interpolation should give different results than RGB
      const color = colorManager.interpolateGradient(gradient, 0.5);
      // In HSV, red to blue goes through purple, not gray
      expect(color.r).toBeGreaterThan(0);
      expect(color.b).toBeGreaterThan(0);
    });

    it('should handle single stop gradient', () => {
      const gradient: Gradient = {
        stops: [
          { position: 0.5, color: { r: 100, g: 150, b: 200, cool: 25, warm: 50 } }
        ],
        colorSpace: 'rgb'
      };

      const color = colorManager.interpolateGradient(gradient, 0.7);
      expect(color.r).toBe(100);
      expect(color.g).toBe(150);
      expect(color.b).toBe(200);
    });
  });

  describe('color blending', () => {
    it('should blend two colors at 50%', () => {
      const color1 = { r: 0, g: 0, b: 0, cool: 0, warm: 0 };
      const color2 = { r: 100, g: 200, b: 50, cool: 100, warm: 200 };

      const blended = colorManager.blendColors(color1, color2, 0.5);

      expect(blended.r).toBe(50);
      expect(blended.g).toBe(100);
      expect(blended.b).toBe(25);
      expect(blended.cool).toBe(50);
      expect(blended.warm).toBe(100);
    });

    it('should return first color when mix is 0', () => {
      const color1 = { r: 255, g: 100, b: 50, cool: 10, warm: 20 };
      const color2 = { r: 0, g: 0, b: 0, cool: 0, warm: 0 };

      const blended = colorManager.blendColors(color1, color2, 0);

      expect(blended.r).toBe(255);
      expect(blended.g).toBe(100);
      expect(blended.b).toBe(50);
    });

    it('should return second color when mix is 1', () => {
      const color1 = { r: 0, g: 0, b: 0, cool: 0, warm: 0 };
      const color2 = { r: 255, g: 200, b: 100, cool: 50, warm: 75 };

      const blended = colorManager.blendColors(color1, color2, 1);

      expect(blended.r).toBe(255);
      expect(blended.g).toBe(200);
      expect(blended.b).toBe(100);
    });
  });

  describe('loading presets from config', () => {
    it('should load valid solid preset', () => {
      const config = {
        white: {
          type: 'solid',
          solid: { r: 255, g: 255, b: 255, cool: 255, warm: 0 }
        }
      };

      colorManager.loadPresetsFromConfig(config);

      expect(colorManager.hasPreset('white')).toBe(true);
      const preset = colorManager.getPreset('white');
      expect(preset?.type).toBe('solid');
      expect(preset?.solid?.r).toBe(255);
    });

    it('should load valid gradient preset', () => {
      const config = {
        rainbow: {
          type: 'gradient',
          gradient: {
            colorSpace: 'hsv',
            stops: [
              { position: 0.0, color: { r: 255, g: 0, b: 0, cool: 0, warm: 0 } },
              { position: 1.0, color: { r: 0, g: 0, b: 255, cool: 0, warm: 0 } }
            ]
          }
        }
      };

      colorManager.loadPresetsFromConfig(config);

      expect(colorManager.hasPreset('rainbow')).toBe(true);
      const preset = colorManager.getPreset('rainbow');
      expect(preset?.type).toBe('gradient');
      expect(preset?.gradient?.stops).toHaveLength(2);
    });

    it('should skip invalid presets', () => {
      const config = {
        valid: {
          type: 'solid',
          solid: { r: 255, g: 0, b: 0, cool: 0, warm: 0 }
        },
        invalid: {
          type: 'unknown'
        }
      };

      colorManager.loadPresetsFromConfig(config);

      expect(colorManager.hasPreset('valid')).toBe(true);
      expect(colorManager.hasPreset('invalid')).toBe(false);
    });

    it('should load multiple presets', () => {
      const config = {
        red: {
          type: 'solid',
          solid: { r: 255, g: 0, b: 0, cool: 0, warm: 0 }
        },
        green: {
          type: 'solid',
          solid: { r: 0, g: 255, b: 0, cool: 0, warm: 0 }
        },
        blue: {
          type: 'solid',
          solid: { r: 0, g: 0, b: 255, cool: 0, warm: 0 }
        }
      };

      colorManager.loadPresetsFromConfig(config);

      expect(colorManager.listPresets()).toHaveLength(3);
      expect(colorManager.hasPreset('red')).toBe(true);
      expect(colorManager.hasPreset('green')).toBe(true);
      expect(colorManager.hasPreset('blue')).toBe(true);
    });
  });
});
