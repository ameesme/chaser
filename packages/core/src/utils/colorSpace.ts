import type { RGBColor, HSVColor, RGBCCTColor } from '@chaser/types';

/**
 * Convert RGB to HSV color space
 */
export function rgbToHSV(rgb: RGBColor): HSVColor {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const v = max;

  if (delta > 0) {
    s = delta / max;

    if (max === r) {
      h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / delta + 2) / 6;
    } else {
      h = ((r - g) / delta + 4) / 6;
    }
  }

  return {
    h: h * 360,
    s,
    v
  };
}

/**
 * Convert HSV to RGB color space
 */
export function hsvToRGB(hsv: HSVColor): RGBColor {
  const h = hsv.h / 360;
  const s = hsv.s;
  const v = hsv.v;

  let r = 0, g = 0, b = 0;

  if (s === 0) {
    r = g = b = v;
  } else {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

/**
 * Linearly interpolate between two RGB colors
 */
export function interpolateRGB(color1: RGBColor, color2: RGBColor, mix: number): RGBColor {
  return {
    r: Math.round(color1.r + (color2.r - color1.r) * mix),
    g: Math.round(color1.g + (color2.g - color1.g) * mix),
    b: Math.round(color1.b + (color2.b - color1.b) * mix)
  };
}

/**
 * Interpolate between two colors in HSV space (better for color transitions)
 */
export function interpolateHSV(color1: RGBColor, color2: RGBColor, mix: number): RGBColor {
  const hsv1 = rgbToHSV(color1);
  const hsv2 = rgbToHSV(color2);

  // Handle hue wrapping
  let h1 = hsv1.h;
  let h2 = hsv2.h;

  if (Math.abs(h2 - h1) > 180) {
    if (h1 < h2) {
      h1 += 360;
    } else {
      h2 += 360;
    }
  }

  const hsvMix: HSVColor = {
    h: (h1 + (h2 - h1) * mix) % 360,
    s: hsv1.s + (hsv2.s - hsv1.s) * mix,
    v: hsv1.v + (hsv2.v - hsv1.v) * mix
  };

  return hsvToRGB(hsvMix);
}

/**
 * Blend two RGBCCT colors
 */
export function blendRGBCCT(color1: RGBCCTColor, color2: RGBCCTColor, mix: number): RGBCCTColor {
  return {
    r: Math.round(color1.r + (color2.r - color1.r) * mix),
    g: Math.round(color1.g + (color2.g - color1.g) * mix),
    b: Math.round(color1.b + (color2.b - color1.b) * mix),
    cool: Math.round(color1.cool + (color2.cool - color1.cool) * mix),
    warm: Math.round(color1.warm + (color2.warm - color1.warm) * mix)
  };
}

/**
 * Clamp color values to valid range
 */
export function clampRGBCCT(color: RGBCCTColor): RGBCCTColor {
  return {
    r: Math.max(0, Math.min(255, Math.round(color.r))),
    g: Math.max(0, Math.min(255, Math.round(color.g))),
    b: Math.max(0, Math.min(255, Math.round(color.b))),
    cool: Math.max(0, Math.min(255, Math.round(color.cool))),
    warm: Math.max(0, Math.min(255, Math.round(color.warm)))
  };
}
