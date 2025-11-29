/**
 * RGBCCT color representation with 5 channels
 */
export interface RGBCCTColor {
  r: number;      // Red (0-255)
  g: number;      // Green (0-255)
  b: number;      // Blue (0-255)
  cool: number;   // Cool white (0-255)
  warm: number;   // Warm white (0-255)
  alpha?: number; // Optional alpha for blending (0-1)
}

/**
 * RGB color representation
 */
export interface RGBColor {
  r: number; // Red (0-255)
  g: number; // Green (0-255)
  b: number; // Blue (0-255)
}

/**
 * HSV color representation
 */
export interface HSVColor {
  h: number; // Hue (0-360)
  s: number; // Saturation (0-1)
  v: number; // Value/Brightness (0-1)
}

/**
 * Gradient stop with position and color
 */
export interface GradientStop {
  position: number;  // Position along gradient (0-1)
  color: RGBCCTColor;
}

/**
 * Gradient definition with color space
 */
export interface Gradient {
  stops: GradientStop[];
  colorSpace: 'rgb' | 'hsv' | 'lab'; // Interpolation color space
}

/**
 * Color preset - can be solid or gradient
 */
export interface ColorPreset {
  type: 'solid' | 'gradient';
  solid?: RGBCCTColor;
  gradient?: Gradient;
  metadata?: {
    name: string;
    description?: string;
    tags?: string[];
  };
}
