import type { WebSocketClient } from './WebSocketClient.js';

/**
 * Simulator UI controls
 */
export class SimulatorUI {
  private client: WebSocketClient;
  private container: HTMLElement;
  private gradientStops: Array<{
    position: number;
    color: { r: number; g: number; b: number; cool: number; warm: number };
  }> = [];
  private gradientColorSpace: 'rgb' | 'hsv' = 'rgb';

  constructor(client: WebSocketClient, container: HTMLElement) {
    this.client = client;
    this.container = container;
    this.initializeDefaultGradient();
    this.buildUI();
    this.attachEventListeners();
  }

  /**
   * Initialize with a default gradient
   */
  private initializeDefaultGradient(): void {
    this.gradientStops = [
      { position: 0.0, color: { r: 255, g: 0, b: 0, cool: 0, warm: 0 } },
      { position: 1.0, color: { r: 0, g: 0, b: 255, cool: 0, warm: 0 } }
    ];
  }

  /**
   * Build UI controls
   */
  private buildUI(): void {
    this.container.innerHTML = `
      <div class="control-group">
        <h3>Effects</h3>
        <button id="btn-solid">Solid Color</button>
        <button id="btn-sequential">Sequential Fade</button>
        <button id="btn-flow">Flow</button>
        <button id="btn-strobe">Strobe</button>
        <button id="btn-blackout" class="danger">Blackout</button>
      </div>

      <div class="control-group">
        <h3>Topology Mode</h3>
        <label>
          <input type="radio" name="topology" value="circular" checked> Circular
        </label>
        <label>
          <input type="radio" name="topology" value="linear"> Linear
        </label>
        <label>
          <input type="radio" name="topology" value="singular"> Singular
        </label>
      </div>

      <div class="control-group">
        <h3>Color Presets</h3>
        <select id="color-preset">
          <option value="white">White</option>
          <option value="warm">Warm White</option>
          <option value="rainbow">Rainbow</option>
          <option value="ocean">Ocean</option>
          <option value="sunset">Sunset</option>
          <option value="fire">Fire</option>
          <option value="breathe">Breathe</option>
          <option value="custom">Custom Color</option>
          <option value="custom-gradient">Custom Gradient</option>
        </select>
      </div>

      <div class="control-group" id="custom-color-group" style="display: none;">
        <h3>Custom Color (RGBCCT)</h3>
        <div class="slider-container">
          <div class="slider-label">
            <span>RGB Color</span>
          </div>
          <input type="color" id="rgb-color" value="#ff0000">
        </div>
        <div class="slider-container">
          <div class="slider-label">
            <span>Cool White</span>
            <span class="slider-value" id="cool-white-value">0</span>
          </div>
          <input type="range" id="cool-white" min="0" max="255" value="0">
        </div>
        <div class="slider-container">
          <div class="slider-label">
            <span>Warm White</span>
            <span class="slider-value" id="warm-white-value">0</span>
          </div>
          <input type="range" id="warm-white" min="0" max="255" value="0">
        </div>
      </div>

      <div class="control-group" id="gradient-editor-group" style="display: none;">
        <h3>Gradient Editor</h3>

        <div class="gradient-preview-container">
          <div id="gradient-preview" class="gradient-preview"></div>
        </div>

        <div class="slider-container">
          <div class="slider-label">
            <span>Color Space</span>
          </div>
          <select id="gradient-colorspace">
            <option value="rgb">RGB</option>
            <option value="hsv">HSV</option>
          </select>
        </div>

        <div id="gradient-stops-container">
          <h4>Gradient Stops</h4>
          <div id="gradient-stops-list"></div>
          <button id="btn-add-stop" class="small">Add Stop</button>
        </div>

        <button id="btn-apply-gradient">Apply Gradient</button>
      </div>

      <div class="control-group">
        <h3>Parameters</h3>
        <div class="slider-container">
          <div class="slider-label">
            <span>Brightness</span>
            <span class="slider-value" id="brightness-value">100%</span>
          </div>
          <input type="range" id="brightness" min="0" max="100" value="100">
        </div>
        <div class="slider-container">
          <div class="slider-label">
            <span>Duration (ms)</span>
            <span class="slider-value" id="duration-value">1000ms</span>
          </div>
          <input type="range" id="duration" min="100" max="20000" value="1000" step="100">
        </div>
        <div class="slider-container">
          <div class="slider-label">
            <span>Gradient Scale</span>
            <span class="slider-value" id="scale-value">0.20</span>
          </div>
          <input type="range" id="scale" min="-100" max="100" value="20">
        </div>
      </div>

      <div class="control-group">
        <button id="btn-stop" class="danger">Stop Effect</button>
      </div>
    `;
  }

  /**
   * Attach event listeners to controls
   */
  private attachEventListeners(): void {
    // Effect buttons
    const solidBtn = document.getElementById('btn-solid');
    const sequentialBtn = document.getElementById('btn-sequential');
    const flowBtn = document.getElementById('btn-flow');
    const strobeBtn = document.getElementById('btn-strobe');
    const blackoutBtn = document.getElementById('btn-blackout');
    const stopBtn = document.getElementById('btn-stop');

    solidBtn?.addEventListener('click', () => {
      this.updateCustomColorPreset();
      this.client.runEffect('solid', this.getCurrentParams());
    });

    sequentialBtn?.addEventListener('click', () => {
      this.updateCustomColorPreset();
      this.client.runEffect('sequential', this.getCurrentParams());
    });

    flowBtn?.addEventListener('click', () => {
      this.updateCustomColorPreset();
      this.client.runEffect('flow', this.getCurrentParams());
    });

    strobeBtn?.addEventListener('click', () => {
      this.updateCustomColorPreset();
      this.client.runEffect('strobe', this.getCurrentParams());
    });

    blackoutBtn?.addEventListener('click', () => {
      this.client.runEffect('blackout', this.getCurrentParams());
    });

    stopBtn?.addEventListener('click', () => {
      this.client.stopEffect();
    });

    // Color preset selector
    const colorPresetSelect = document.getElementById('color-preset') as HTMLSelectElement;
    colorPresetSelect?.addEventListener('change', () => {
      const customGroup = document.getElementById('custom-color-group');
      const gradientGroup = document.getElementById('gradient-editor-group');

      if (customGroup) {
        customGroup.style.display = colorPresetSelect.value === 'custom' ? 'block' : 'none';
      }

      if (gradientGroup) {
        gradientGroup.style.display = colorPresetSelect.value === 'custom-gradient' ? 'block' : 'none';
        if (colorPresetSelect.value === 'custom-gradient') {
          this.renderGradientStops();
          this.updateGradientPreview();
        }
      }
    });

    // Topology mode
    const topologyRadios = document.querySelectorAll('input[name="topology"]');
    topologyRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        this.client.setTopology(target.value);
      });
    });

    // Brightness slider
    const brightnessSlider = document.getElementById('brightness') as HTMLInputElement;
    const brightnessValue = document.getElementById('brightness-value');
    brightnessSlider?.addEventListener('input', () => {
      const value = brightnessSlider.value;
      if (brightnessValue) {
        brightnessValue.textContent = `${value}%`;
      }
    });

    // Duration slider
    const durationSlider = document.getElementById('duration') as HTMLInputElement;
    const durationValue = document.getElementById('duration-value');
    durationSlider?.addEventListener('input', () => {
      const value = parseInt(durationSlider.value);
      if (durationValue) {
        durationValue.textContent = `${value}ms`;
      }
    });

    // Scale slider
    const scaleSlider = document.getElementById('scale') as HTMLInputElement;
    const scaleValue = document.getElementById('scale-value');
    scaleSlider?.addEventListener('input', () => {
      const value = parseInt(scaleSlider.value) / 100;
      if (scaleValue) {
        scaleValue.textContent = value.toFixed(2);
      }
    });

    // Cool white slider
    const coolWhiteSlider = document.getElementById('cool-white') as HTMLInputElement;
    const coolWhiteValue = document.getElementById('cool-white-value');
    coolWhiteSlider?.addEventListener('input', () => {
      if (coolWhiteValue) {
        coolWhiteValue.textContent = coolWhiteSlider.value;
      }
    });

    // Warm white slider
    const warmWhiteSlider = document.getElementById('warm-white') as HTMLInputElement;
    const warmWhiteValue = document.getElementById('warm-white-value');
    warmWhiteSlider?.addEventListener('input', () => {
      if (warmWhiteValue) {
        warmWhiteValue.textContent = warmWhiteSlider.value;
      }
    });

    // Gradient editor controls
    const addStopBtn = document.getElementById('btn-add-stop');
    addStopBtn?.addEventListener('click', () => {
      this.addGradientStop();
    });

    const colorSpaceSelect = document.getElementById('gradient-colorspace') as HTMLSelectElement;
    colorSpaceSelect?.addEventListener('change', () => {
      this.gradientColorSpace = colorSpaceSelect.value as 'rgb' | 'hsv';
      this.updateGradientPreview();
    });

    const applyGradientBtn = document.getElementById('btn-apply-gradient');
    applyGradientBtn?.addEventListener('click', () => {
      this.applyCustomGradient();
    });
  }

  /**
   * Update custom color preset from UI values
   */
  private updateCustomColorPreset(): void {
    const colorPresetSelect = (document.getElementById('color-preset') as HTMLSelectElement);
    if (colorPresetSelect.value !== 'custom') {
      return;
    }

    // Get color picker value
    const rgbColorInput = document.getElementById('rgb-color') as HTMLInputElement;
    const coolWhiteInput = document.getElementById('cool-white') as HTMLInputElement;
    const warmWhiteInput = document.getElementById('warm-white') as HTMLInputElement;

    // Parse hex color to RGB
    const hex = rgbColorInput.value;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    // Get CCT values
    const cool = parseInt(coolWhiteInput.value);
    const warm = parseInt(warmWhiteInput.value);

    // Create and register custom preset
    this.client.addPreset('custom', {
      type: 'solid',
      solid: { r, g, b, cool, warm }
    });
  }

  /**
   * Get current parameter values from UI
   */
  private getCurrentParams() {
    const colorPreset = (document.getElementById('color-preset') as HTMLSelectElement).value;
    const brightness = parseInt((document.getElementById('brightness') as HTMLInputElement).value) / 100;
    const duration = parseInt((document.getElementById('duration') as HTMLInputElement).value);
    const scale = parseInt((document.getElementById('scale') as HTMLInputElement).value) / 100;

    // Map duration to both transitionDuration (one-shot effects) and speed (continuous effects)
    // For continuous effects: higher duration = slower animation
    const speed = 1000 / duration; // Convert ms to speed multiplier

    return {
      colorPreset,
      brightness,
      transitionDuration: duration,
      speed,
      scale
    };
  }

  /**
   * Render gradient stops UI
   */
  private renderGradientStops(): void {
    const stopsList = document.getElementById('gradient-stops-list');
    if (!stopsList) return;

    // Sort stops by position
    this.gradientStops.sort((a, b) => a.position - b.position);

    stopsList.innerHTML = '';

    this.gradientStops.forEach((stop, index) => {
      const stopElement = document.createElement('div');
      stopElement.className = 'gradient-stop';
      stopElement.innerHTML = `
        <div class="stop-header">
          <span>Stop ${index + 1}</span>
          ${this.gradientStops.length > 2 ? `<button class="btn-remove-stop small" data-index="${index}">Remove</button>` : ''}
        </div>
        <div class="slider-container">
          <div class="slider-label">
            <span>Position</span>
            <span class="slider-value">${stop.position.toFixed(3)}</span>
          </div>
          <input type="range" class="stop-position" data-index="${index}" min="0" max="1000" value="${stop.position * 1000}" step="1">
        </div>
        <div class="slider-container">
          <div class="slider-label">
            <span>RGB Color</span>
          </div>
          <input type="color" class="stop-color" data-index="${index}" value="${this.rgbToHex(stop.color.r, stop.color.g, stop.color.b)}">
        </div>
        <div class="slider-container">
          <div class="slider-label">
            <span>Cool White</span>
            <span class="slider-value">${stop.color.cool}</span>
          </div>
          <input type="range" class="stop-cool" data-index="${index}" min="0" max="255" value="${stop.color.cool}">
        </div>
        <div class="slider-container">
          <div class="slider-label">
            <span>Warm White</span>
            <span class="slider-value">${stop.color.warm}</span>
          </div>
          <input type="range" class="stop-warm" data-index="${index}" min="0" max="255" value="${stop.color.warm}">
        </div>
      `;
      stopsList.appendChild(stopElement);
    });

    // Attach event listeners to stop controls
    this.attachStopEventListeners();
  }

  /**
   * Attach event listeners to gradient stop controls
   */
  private attachStopEventListeners(): void {
    // Position sliders
    document.querySelectorAll('.stop-position').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const index = parseInt(target.dataset.index || '0');
        const position = parseInt(target.value) / 1000;
        this.gradientStops[index].position = position;

        // Update value display
        const valueSpan = target.parentElement?.querySelector('.slider-value');
        if (valueSpan) {
          valueSpan.textContent = position.toFixed(3);
        }

        this.updateGradientPreview();
      });
    });

    // Color pickers
    document.querySelectorAll('.stop-color').forEach(picker => {
      picker.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const index = parseInt(target.dataset.index || '0');
        const hex = target.value;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        this.gradientStops[index].color.r = r;
        this.gradientStops[index].color.g = g;
        this.gradientStops[index].color.b = b;

        this.updateGradientPreview();
      });
    });

    // Cool white sliders
    document.querySelectorAll('.stop-cool').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const index = parseInt(target.dataset.index || '0');
        this.gradientStops[index].color.cool = parseInt(target.value);

        // Update value display
        const valueSpan = target.parentElement?.querySelector('.slider-value');
        if (valueSpan) {
          valueSpan.textContent = target.value;
        }

        this.updateGradientPreview();
      });
    });

    // Warm white sliders
    document.querySelectorAll('.stop-warm').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const index = parseInt(target.dataset.index || '0');
        this.gradientStops[index].color.warm = parseInt(target.value);

        // Update value display
        const valueSpan = target.parentElement?.querySelector('.slider-value');
        if (valueSpan) {
          valueSpan.textContent = target.value;
        }

        this.updateGradientPreview();
      });
    });

    // Remove buttons
    document.querySelectorAll('.btn-remove-stop').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const index = parseInt(target.dataset.index || '0');
        this.removeGradientStop(index);
      });
    });
  }

  /**
   * Update gradient preview visualization
   */
  private updateGradientPreview(): void {
    const preview = document.getElementById('gradient-preview');
    if (!preview) return;

    // Sort stops by position
    const sortedStops = [...this.gradientStops].sort((a, b) => a.position - b.position);

    // Build CSS gradient string (RGB only for preview)
    const gradientStops = sortedStops.map(stop => {
      const hex = this.rgbToHex(stop.color.r, stop.color.g, stop.color.b);
      return `${hex} ${(stop.position * 100).toFixed(1)}%`;
    }).join(', ');

    preview.style.background = `linear-gradient(to right, ${gradientStops})`;
  }

  /**
   * Add a new gradient stop
   */
  private addGradientStop(): void {
    // Add stop at midpoint
    const newPosition = 0.5;
    const newStop = {
      position: newPosition,
      color: { r: 128, g: 128, b: 128, cool: 0, warm: 0 }
    };

    this.gradientStops.push(newStop);
    this.renderGradientStops();
    this.updateGradientPreview();
  }

  /**
   * Remove a gradient stop
   */
  private removeGradientStop(index: number): void {
    if (this.gradientStops.length <= 2) {
      return; // Keep at least 2 stops
    }

    this.gradientStops.splice(index, 1);
    this.renderGradientStops();
    this.updateGradientPreview();
  }

  /**
   * Apply custom gradient to color manager
   */
  private applyCustomGradient(): void {
    // Sort stops by position
    const sortedStops = [...this.gradientStops].sort((a, b) => a.position - b.position);

    this.client.addPreset('custom-gradient', {
      type: 'gradient',
      gradient: {
        colorSpace: this.gradientColorSpace,
        stops: sortedStops
      }
    });
  }

  /**
   * Convert RGB to hex color
   */
  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => {
      const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  /**
   * Update status display
   */
  updateStatus(fps: number, effectName: string | null): void {
    const fpsElement = document.getElementById('fps');
    const effectElement = document.getElementById('effect');

    if (fpsElement) {
      fpsElement.textContent = `FPS: ${fps}`;
    }

    if (effectElement) {
      effectElement.textContent = `Effect: ${effectName || 'None'}`;
    }
  }
}
