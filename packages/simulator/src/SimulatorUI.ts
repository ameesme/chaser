import type { Engine } from '@chaser/core';
import { SolidColorEffect, FlowEffect, SequentialFadeEffect } from '@chaser/core';

/**
 * Simulator UI controls
 */
export class SimulatorUI {
  private engine: Engine;
  private container: HTMLElement;

  constructor(engine: Engine, container: HTMLElement) {
    this.engine = engine;
    this.container = container;
    this.buildUI();
    this.attachEventListeners();
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
          <option value="custom">Custom Color</option>
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
          <input type="range" id="duration" min="100" max="5000" value="1000" step="100">
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
    const stopBtn = document.getElementById('btn-stop');

    solidBtn?.addEventListener('click', () => {
      this.updateCustomColorPreset();
      const effect = new SolidColorEffect();
      this.engine.runEffect(effect, this.getCurrentParams());
    });

    sequentialBtn?.addEventListener('click', () => {
      this.updateCustomColorPreset();
      const effect = new SequentialFadeEffect();
      this.engine.runEffect(effect, this.getCurrentParams());
    });

    flowBtn?.addEventListener('click', () => {
      this.updateCustomColorPreset();
      const effect = new FlowEffect();
      this.engine.runEffect(effect, this.getCurrentParams());
    });

    stopBtn?.addEventListener('click', () => {
      this.engine.stopCurrentEffect();
    });

    // Color preset selector
    const colorPresetSelect = document.getElementById('color-preset') as HTMLSelectElement;
    colorPresetSelect?.addEventListener('change', () => {
      const customGroup = document.getElementById('custom-color-group');
      if (customGroup) {
        customGroup.style.display = colorPresetSelect.value === 'custom' ? 'block' : 'none';
      }
    });

    // Topology mode
    const topologyRadios = document.querySelectorAll('input[name="topology"]');
    topologyRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        this.engine.getPanelGrid().setTopologyMode(target.value as any);
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
    const colorManager = this.engine.getColorManager();
    colorManager.addPreset('custom', {
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
    const transitionDuration = parseInt((document.getElementById('duration') as HTMLInputElement).value);
    const scale = parseInt((document.getElementById('scale') as HTMLInputElement).value) / 100;

    return {
      colorPreset,
      brightness,
      transitionDuration,
      scale
    };
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
