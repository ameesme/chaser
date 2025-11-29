import type { Engine } from '@chaser/core';
import { SolidColorEffect, ChaseEffect, WaveEffect } from '@chaser/core';

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
        <button id="btn-chase">Chase</button>
        <button id="btn-wave">Wave</button>
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
        </select>
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
            <span>Speed</span>
            <span class="slider-value" id="speed-value">1.0x</span>
          </div>
          <input type="range" id="speed" min="10" max="300" value="100">
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
    const chaseBtn = document.getElementById('btn-chase');
    const waveBtn = document.getElementById('btn-wave');
    const stopBtn = document.getElementById('btn-stop');

    solidBtn?.addEventListener('click', () => {
      const effect = new SolidColorEffect();
      this.engine.runEffect(effect, this.getCurrentParams());
    });

    chaseBtn?.addEventListener('click', () => {
      const effect = new ChaseEffect();
      this.engine.runEffect(effect, this.getCurrentParams());
    });

    waveBtn?.addEventListener('click', () => {
      const effect = new WaveEffect();
      this.engine.runEffect(effect, this.getCurrentParams());
    });

    stopBtn?.addEventListener('click', () => {
      this.engine.stopCurrentEffect();
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

    // Speed slider
    const speedSlider = document.getElementById('speed') as HTMLInputElement;
    const speedValue = document.getElementById('speed-value');
    speedSlider?.addEventListener('input', () => {
      const value = parseInt(speedSlider.value) / 100;
      if (speedValue) {
        speedValue.textContent = `${value.toFixed(1)}x`;
      }
    });
  }

  /**
   * Get current parameter values from UI
   */
  private getCurrentParams() {
    const colorPreset = (document.getElementById('color-preset') as HTMLSelectElement).value;
    const brightness = parseInt((document.getElementById('brightness') as HTMLInputElement).value) / 100;
    const speed = parseInt((document.getElementById('speed') as HTMLInputElement).value) / 100;

    return {
      colorPreset,
      brightness,
      speed
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
