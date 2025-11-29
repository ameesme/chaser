import type { EngineOutput, PanelState, PanelTopology } from '@chaser/types';

/**
 * Canvas renderer for visualizing panel states
 */
export class CanvasRenderer implements EngineOutput {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private panelWidth: number;
  private panelHeight: number;
  private panelGap: number;
  private scale: number;
  private columns: number = 2;
  private rowsPerColumn: number = 7;

  constructor(canvas: HTMLCanvasElement, scale: number = 2) {
    this.canvas = canvas;
    this.scale = scale;

    // Panel dimensions (60x120cm in real life, scaled for display)
    this.panelWidth = 30;  // 30px base width
    this.panelHeight = 60; // 60px base height (2:1 ratio)
    this.panelGap = 10;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = ctx;

    this.setupCanvas();
  }

  /**
   * Setup canvas size
   */
  private setupCanvas(): void {
    // Calculate canvas size: 2 columns x 7 rows with gaps
    const totalWidth = (this.panelWidth * this.columns + this.panelGap * (this.columns - 1)) * this.scale;
    const totalHeight = (this.panelHeight * this.rowsPerColumn + this.panelGap * (this.rowsPerColumn - 1)) * this.scale;

    this.canvas.width = totalWidth;
    this.canvas.height = totalHeight;
  }

  /**
   * Render panel states
   */
  render(states: PanelState[], topology: PanelTopology): void {
    // Clear canvas
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw each panel
    states.forEach((state, index) => {
      const column = Math.floor(index / this.rowsPerColumn);
      const row = index % this.rowsPerColumn;

      const x = column * (this.panelWidth + this.panelGap) * this.scale;
      const y = row * (this.panelHeight + this.panelGap) * this.scale;

      this.drawPanel(x, y, state, index);
    });
  }

  /**
   * Draw a single panel
   */
  private drawPanel(x: number, y: number, state: PanelState, index: number): void {
    const { color, brightness } = state;

    // Apply brightness to all color channels
    const r = Math.round(color.r * brightness);
    const g = Math.round(color.g * brightness);
    const b = Math.round(color.b * brightness);
    const cool = Math.round(color.cool * brightness);
    const warm = Math.round(color.warm * brightness);

    // Mix RGBCCT channels
    // Cool white adds equal R,G,B with slight blue tint
    // Warm white adds equal R,G,B with slight yellow tint
    const totalCCT = cool + warm;
    const cctR = cool * 0.9 + warm * 1.0;
    const cctG = cool * 0.9 + warm * 0.9;
    const cctB = cool * 1.0 + warm * 0.7;

    // Combine RGB + CCT
    const finalR = Math.min(255, r + cctR);
    const finalG = Math.min(255, g + cctG);
    const finalB = Math.min(255, b + cctB);

    // Draw panel background
    this.ctx.fillStyle = `rgb(${finalR}, ${finalG}, ${finalB})`;
    this.ctx.fillRect(
      x,
      y,
      this.panelWidth * this.scale,
      this.panelHeight * this.scale
    );

    // Draw border
    this.ctx.strokeStyle = brightness > 0.01 ? '#555' : '#333';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(
      x,
      y,
      this.panelWidth * this.scale,
      this.panelHeight * this.scale
    );

    // Draw panel label
    this.drawPanelLabel(x, y, index, brightness);
  }

  /**
   * Draw panel label
   */
  private drawPanelLabel(x: number, y: number, index: number, brightness: number): void {
    // Choose label color based on panel brightness
    const labelColor = brightness > 0.5 ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.4)';

    this.ctx.fillStyle = labelColor;
    this.ctx.font = `${12 * this.scale}px monospace`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(
      `P${index}`,
      x + 5 * this.scale,
      y + 5 * this.scale
    );
  }

  /**
   * Update canvas scale
   */
  setScale(scale: number): void {
    this.scale = scale;
    this.setupCanvas();
  }
}
