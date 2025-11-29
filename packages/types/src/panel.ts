import type { RGBCCTColor } from './color.js';

/**
 * Represents a single LED panel in the grid
 */
export interface Panel {
  id: number;      // Unique panel identifier (0-13)
  column: number;  // Column index (0 or 1)
  row: number;     // Row index within column (0-6)
  position?: {     // Optional physical position
    x: number;
    y: number;
  };
}

/**
 * Current state of a panel
 */
export interface PanelState {
  color: RGBCCTColor;
  brightness: number;  // Overall brightness (0-1)
  timestamp: number;   // When this state was set
}

/**
 * Configuration for panel grid
 */
export interface PanelGridConfig {
  columns: number;
  rowsPerColumn: number;
  initialTopology?: 'circular' | 'linear' | 'singular';
}
