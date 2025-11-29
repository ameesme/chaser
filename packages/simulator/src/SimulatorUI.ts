import type { WebSocketClient } from './WebSocketClient.js';

type EffectType = 'solid' | 'sequential' | 'flow' | 'strobe' | 'blackout';

interface EffectPreset {
  name: string;
  effect: EffectType;
  topology: string;
  params: any;
}

/**
 * Simulator UI controls with effect-specific parameter sections
 */
export class SimulatorUI {
  private client: WebSocketClient;
  private container: HTMLElement;
  private currentEffect: EffectType | null = null;
  private effectPresets: Map<string, EffectPreset> = new Map();

  // Gradient editor state
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
        <h3>Effect Presets</h3>
        <select id="effect-preset-select">
          <option value="">Select Preset...</option>
        </select>
        <div style="display: flex; gap: 8px; margin-top: 8px;">
          <button id="btn-save-effect-preset" class="small" style="flex: 1;">Save Current</button>
          <button id="btn-delete-effect-preset" class="small secondary" style="flex: 1;">Delete</button>
        </div>
      </div>

      <div class="control-group">
        <h3>Effects</h3>
        <button id="btn-solid" data-effect="solid">Solid Color</button>
        <button id="btn-sequential" data-effect="sequential">Sequential Fade</button>
        <button id="btn-flow" data-effect="flow">Flow</button>
        <button id="btn-strobe" data-effect="strobe">Strobe</button>
        <button id="btn-blackout" data-effect="blackout" class="danger">Blackout</button>
        <button id="btn-stop" class="secondary">Stop Effect</button>
      </div>

      <div class="control-group" id="topology-group" style="display: none;">
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

      <div class="control-group" id="brightness-group" style="display: none;">
        <h3>Brightness</h3>
        <div class="slider-container">
          <div class="slider-label">
            <span>Master Brightness</span>
            <span class="slider-value" id="brightness-value">100%</span>
          </div>
          <input type="range" id="brightness-slider" min="0" max="100" value="100" step="1">
        </div>
      </div>

      <!-- Solid Color Effect Parameters -->
      <div class="effect-params" id="params-solid" style="display: none;">
        <div class="control-group">
          <h3>Solid Color</h3>
          <select id="solid-preset" class="preset-select">
            <option value="">Select Preset...</option>
            <option value="white">White</option>
            <option value="warm">Warm White</option>
            <option value="custom">Custom Color</option>
          </select>
        </div>

        <div class="control-group" id="solid-custom-group" style="display: none;">
          <h3>Custom Color (RGBCCT)</h3>
          <div class="slider-container">
            <div class="slider-label"><span>RGB Color</span></div>
            <input type="color" id="solid-rgb-color" value="#ff0000">
          </div>
          <div class="slider-container">
            <div class="slider-label">
              <span>Cool White</span>
              <span class="slider-value" id="solid-cool-value">0</span>
            </div>
            <input type="range" id="solid-cool" min="0" max="255" value="0">
          </div>
          <div class="slider-container">
            <div class="slider-label">
              <span>Warm White</span>
              <span class="slider-value" id="solid-warm-value">0</span>
            </div>
            <input type="range" id="solid-warm" min="0" max="255" value="0">
          </div>
        </div>

        <div class="control-group">
          <h3>Timing</h3>
          <div class="slider-container">
            <div class="slider-label">
              <span>Fade Duration (ms)</span>
              <span class="slider-value" id="solid-duration-value">1000</span>
            </div>
            <input type="range" id="solid-duration" min="0" max="5000" value="1000" step="100">
          </div>
        </div>
      </div>

      <!-- Sequential Fade Effect Parameters -->
      <div class="effect-params" id="params-sequential" style="display: none;">
        <div class="control-group">
          <h3>Target Color</h3>
          <select id="sequential-preset" class="preset-select">
            <option value="">Select Preset...</option>
            <option value="white">White</option>
            <option value="warm">Warm White</option>
            <option value="custom">Custom Color</option>
          </select>
        </div>

        <div class="control-group" id="sequential-custom-group" style="display: none;">
          <h3>Custom Color (RGBCCT)</h3>
          <div class="slider-container">
            <div class="slider-label"><span>RGB Color</span></div>
            <input type="color" id="sequential-rgb-color" value="#ff0000">
          </div>
          <div class="slider-container">
            <div class="slider-label">
              <span>Cool White</span>
              <span class="slider-value" id="sequential-cool-value">0</span>
            </div>
            <input type="range" id="sequential-cool" min="0" max="255" value="0">
          </div>
          <div class="slider-container">
            <div class="slider-label">
              <span>Warm White</span>
              <span class="slider-value" id="sequential-warm-value">0</span>
            </div>
            <input type="range" id="sequential-warm" min="0" max="255" value="0">
          </div>
        </div>

        <div class="control-group">
          <h3>Timing</h3>
          <div class="slider-container">
            <div class="slider-label">
              <span>Delay Between Panels (ms)</span>
              <span class="slider-value" id="sequential-delay-value">100</span>
            </div>
            <input type="range" id="sequential-delay" min="10" max="500" value="100" step="10">
          </div>
          <div class="slider-container">
            <div class="slider-label">
              <span>Fade Duration (ms)</span>
              <span class="slider-value" id="sequential-duration-value">500</span>
            </div>
            <input type="range" id="sequential-duration" min="100" max="3000" value="500" step="50">
          </div>
        </div>
      </div>

      <!-- Flow Effect Parameters -->
      <div class="effect-params" id="params-flow" style="display: none;">
        <div class="control-group">
          <h3>Gradient Preset</h3>
          <select id="flow-preset" class="preset-select">
            <option value="">Select Preset...</option>
            <option value="rainbow">Rainbow</option>
            <option value="ocean">Ocean</option>
            <option value="sunset">Sunset</option>
            <option value="fire">Fire</option>
            <option value="breathe">Breathe</option>
            <option value="custom">Custom Gradient</option>
          </select>
        </div>

        <div class="control-group" id="flow-custom-group" style="display: none;">
          <h3>Gradient Editor</h3>
          <div class="gradient-preview-container">
            <div id="flow-gradient-preview" class="gradient-preview"></div>
          </div>
          <div class="slider-container">
            <div class="slider-label"><span>Color Space</span></div>
            <select id="flow-colorspace">
              <option value="rgb">RGB</option>
              <option value="hsv">HSV</option>
            </select>
          </div>
          <div id="flow-stops-container">
            <h4>Gradient Stops</h4>
            <div id="flow-stops-list"></div>
            <button id="btn-flow-add-stop" class="small">Add Stop</button>
          </div>
        </div>

        <div class="control-group">
          <h3>Animation</h3>
          <div class="slider-container">
            <div class="slider-label">
              <span>Speed</span>
              <span class="slider-value" id="flow-speed-value">1.0</span>
            </div>
            <input type="range" id="flow-speed" min="0.1" max="10" value="1.0" step="0.1">
          </div>
          <div class="slider-container">
            <div class="slider-label">
              <span>Gradient Scale</span>
              <span class="slider-value" id="flow-scale-value">0.2</span>
            </div>
            <input type="range" id="flow-scale" min="-2" max="2" value="0.2" step="0.05">
          </div>
        </div>
      </div>

      <!-- Strobe Effect Parameters -->
      <div class="effect-params" id="params-strobe" style="display: none;">
        <div class="control-group">
          <h3>Strobe Color</h3>
          <select id="strobe-preset" class="preset-select">
            <option value="">Select Preset...</option>
            <option value="white">White</option>
            <option value="warm">Warm White</option>
            <option value="custom">Custom Color</option>
          </select>
        </div>

        <div class="control-group" id="strobe-custom-group" style="display: none;">
          <h3>Custom Color (RGBCCT)</h3>
          <div class="slider-container">
            <div class="slider-label"><span>RGB Color</span></div>
            <input type="color" id="strobe-rgb-color" value="#ffffff">
          </div>
          <div class="slider-container">
            <div class="slider-label">
              <span>Cool White</span>
              <span class="slider-value" id="strobe-cool-value">0</span>
            </div>
            <input type="range" id="strobe-cool" min="0" max="255" value="0">
          </div>
          <div class="slider-container">
            <div class="slider-label">
              <span>Warm White</span>
              <span class="slider-value" id="strobe-warm-value">0</span>
            </div>
            <input type="range" id="strobe-warm" min="0" max="255" value="0">
          </div>
        </div>

        <div class="control-group">
          <h3>Timing</h3>
          <div class="slider-container">
            <div class="slider-label">
              <span>Frequency (Hz)</span>
              <span class="slider-value" id="strobe-frequency-value">5</span>
            </div>
            <input type="range" id="strobe-frequency" min="0.5" max="30" value="5" step="0.5">
          </div>
        </div>
      </div>

      <!-- Blackout Effect Parameters -->
      <div class="effect-params" id="params-blackout" style="display: none;">
        <div class="control-group">
          <h3>Transition</h3>
          <div class="slider-container">
            <div class="slider-label">
              <span>Fade Duration (ms)</span>
              <span class="slider-value" id="blackout-duration-value">0</span>
            </div>
            <input type="range" id="blackout-duration" min="0" max="5000" value="0" step="100">
          </div>
          <p style="font-size: 0.8rem; color: #888; margin-top: 8px;">Set to 0 for instant blackout</p>
        </div>
      </div>

      <!-- Effect Preset Save Dialog -->
      <div id="effect-preset-dialog" class="dialog" style="display: none;">
        <div class="dialog-content">
          <h3>Save Effect Preset</h3>
          <input type="text" id="effect-preset-name-input" placeholder="Preset name (e.g., 'Fast Rainbow Flow')..." />
          <div class="dialog-buttons">
            <button id="btn-effect-preset-confirm" class="small">Save</button>
            <button id="btn-effect-preset-cancel" class="small secondary">Cancel</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Effect preset management
    const presetSelect = document.getElementById('effect-preset-select') as HTMLSelectElement;
    presetSelect?.addEventListener('change', () => {
      if (presetSelect.value) {
        this.loadEffectPreset(presetSelect.value);
      }
    });

    document.getElementById('btn-save-effect-preset')?.addEventListener('click', () => {
      this.showEffectPresetDialog();
    });

    document.getElementById('btn-delete-effect-preset')?.addEventListener('click', () => {
      const presetSelect = document.getElementById('effect-preset-select') as HTMLSelectElement;
      if (presetSelect?.value) {
        this.deleteEffectPreset(presetSelect.value);
      }
    });

    // Effect buttons
    const effectButtons = this.container.querySelectorAll('button[data-effect]');
    effectButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const effect = (btn as HTMLElement).dataset.effect as EffectType;
        this.showEffectParams(effect);
        this.runCurrentEffect();
      });
    });

    // Stop button
    document.getElementById('btn-stop')?.addEventListener('click', () => {
      this.client.stopEffect();
      this.clearCurrentEffect();
    });

    // Topology mode
    const topologyRadios = this.container.querySelectorAll('input[name="topology"]');
    topologyRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        this.client.setTopology(target.value);
      });
    });

    // Brightness slider
    const brightnessSlider = document.getElementById('brightness-slider') as HTMLInputElement;
    brightnessSlider?.addEventListener('input', () => {
      const value = document.getElementById('brightness-value');
      if (value) value.textContent = `${brightnessSlider.value}%`;
      this.runCurrentEffect();
    });

    // Solid color effect
    this.attachSolidColorListeners();

    // Sequential fade effect
    this.attachSequentialListeners();

    // Flow effect
    this.attachFlowListeners();

    // Strobe effect
    this.attachStrobeListeners();

    // Blackout effect
    this.attachBlackoutListeners();

    // Load saved presets from localStorage
    this.loadEffectPresetsFromStorage();
  }

  /**
   * Show effect-specific parameters
   */
  private showEffectParams(effect: EffectType): void {
    this.currentEffect = effect;

    // Hide all effect params
    this.hideAllEffectParams();

    // Show selected effect params
    const paramsDiv = document.getElementById(`params-${effect}`);
    if (paramsDiv) {
      paramsDiv.style.display = 'block';
    }

    // Show brightness control for all effects
    const brightnessGroup = document.getElementById('brightness-group');
    if (brightnessGroup) {
      brightnessGroup.style.display = 'block';
    }

    // Auto-set topology to singular for effects that only work in singular mode
    // Also hide topology controls for these effects
    const topologyGroup = document.getElementById('topology-group');
    if (effect === 'strobe' || effect === 'blackout' || effect === 'solid') {
      const singularRadio = this.container.querySelector('input[name="topology"][value="singular"]') as HTMLInputElement;
      if (singularRadio && !singularRadio.checked) {
        singularRadio.checked = true;
        this.client.setTopology('singular');
      }
      // Hide topology controls
      if (topologyGroup) {
        topologyGroup.style.display = 'none';
      }
    } else {
      // Show topology controls for effects that use topology
      if (topologyGroup) {
        topologyGroup.style.display = 'block';
      }
    }

    // Update button states
    const buttons = this.container.querySelectorAll('button[data-effect]');
    buttons.forEach(btn => {
      if ((btn as HTMLElement).dataset.effect === effect) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  /**
   * Hide all effect parameter sections
   */
  private hideAllEffectParams(): void {
    const paramsDivs = this.container.querySelectorAll('.effect-params');
    paramsDivs.forEach(div => {
      (div as HTMLElement).style.display = 'none';
    });

    const buttons = this.container.querySelectorAll('button[data-effect]');
    buttons.forEach(btn => btn.classList.remove('active'));

    // Don't clear currentEffect here - it's set by showEffectParams before this is called
    // Only clear when explicitly stopping
  }

  /**
   * Clear current effect state
   */
  private clearCurrentEffect(): void {
    this.currentEffect = null;
    this.hideAllEffectParams();

    // Hide topology controls when no effect is selected
    const topologyGroup = document.getElementById('topology-group');
    if (topologyGroup) {
      topologyGroup.style.display = 'none';
    }

    // Hide brightness control when no effect is selected
    const brightnessGroup = document.getElementById('brightness-group');
    if (brightnessGroup) {
      brightnessGroup.style.display = 'none';
    }
  }

  /**
   * Get the current brightness value (0-1)
   */
  private getBrightness(): number {
    const brightnessSlider = document.getElementById('brightness-slider') as HTMLInputElement;
    return parseFloat(brightnessSlider?.value || '100') / 100;
  }

  /**
   * Run the currently selected effect with its parameters
   */
  private runCurrentEffect(): void {
    if (!this.currentEffect) return;

    const params = this.getCurrentEffectParams();
    this.client.runEffect(this.currentEffect, params);
  }

  /**
   * Get parameters for current effect
   */
  private getCurrentEffectParams(): any {
    switch (this.currentEffect) {
      case 'solid':
        return this.getSolidParams();
      case 'sequential':
        return this.getSequentialParams();
      case 'flow':
        return this.getFlowParams();
      case 'strobe':
        return this.getStrobeParams();
      case 'blackout':
        return this.getBlackoutParams();
      default:
        return {};
    }
  }

  // ===== SOLID COLOR EFFECT =====

  private attachSolidColorListeners(): void {
    const presetSelect = document.getElementById('solid-preset') as HTMLSelectElement;
    const customGroup = document.getElementById('solid-custom-group');

    presetSelect?.addEventListener('change', () => {
      if (customGroup) {
        customGroup.style.display = presetSelect.value === 'custom' ? 'block' : 'none';
      }
      this.runCurrentEffect();
    });

    // RGB color picker
    document.getElementById('solid-rgb-color')?.addEventListener('input', () => this.runCurrentEffect());

    // CCT sliders
    const coolSlider = document.getElementById('solid-cool') as HTMLInputElement;
    const warmSlider = document.getElementById('solid-warm') as HTMLInputElement;

    coolSlider?.addEventListener('input', () => {
      const value = document.getElementById('solid-cool-value');
      if (value) value.textContent = coolSlider.value;
      this.runCurrentEffect();
    });

    warmSlider?.addEventListener('input', () => {
      const value = document.getElementById('solid-warm-value');
      if (value) value.textContent = warmSlider.value;
      this.runCurrentEffect();
    });

    // Duration slider
    const durationSlider = document.getElementById('solid-duration') as HTMLInputElement;
    durationSlider?.addEventListener('input', () => {
      const value = document.getElementById('solid-duration-value');
      if (value) value.textContent = durationSlider.value;
      this.runCurrentEffect();
    });
  }

  private getSolidParams(): any {
    const presetSelect = document.getElementById('solid-preset') as HTMLSelectElement;
    const durationInput = document.getElementById('solid-duration') as HTMLInputElement;

    const preset = presetSelect?.value;
    const duration = parseInt(durationInput?.value || '1000');
    const brightness = this.getBrightness();

    if (preset === 'custom') {
      const rgbInput = document.getElementById('solid-rgb-color') as HTMLInputElement;
      const coolInput = document.getElementById('solid-cool') as HTMLInputElement;
      const warmInput = document.getElementById('solid-warm') as HTMLInputElement;

      const hex = rgbInput?.value || '#ffffff';
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const cool = parseInt(coolInput?.value || '0');
      const warm = parseInt(warmInput?.value || '0');

      // Register custom preset
      this.client.addPreset('custom', {
        type: 'solid',
        solid: { r, g, b, cool, warm }
      });

      return { colorPreset: 'custom', duration, brightness };
    }

    return { colorPreset: preset || 'white', duration, brightness };
  }

  // ===== SEQUENTIAL FADE EFFECT =====

  private attachSequentialListeners(): void {
    const presetSelect = document.getElementById('sequential-preset') as HTMLSelectElement;
    const customGroup = document.getElementById('sequential-custom-group');

    presetSelect?.addEventListener('change', () => {
      if (customGroup) {
        customGroup.style.display = presetSelect.value === 'custom' ? 'block' : 'none';
      }
      this.runCurrentEffect();
    });

    // RGB color picker
    document.getElementById('sequential-rgb-color')?.addEventListener('input', () => this.runCurrentEffect());

    // CCT sliders
    const coolSlider = document.getElementById('sequential-cool') as HTMLInputElement;
    const warmSlider = document.getElementById('sequential-warm') as HTMLInputElement;

    coolSlider?.addEventListener('input', () => {
      const value = document.getElementById('sequential-cool-value');
      if (value) value.textContent = coolSlider.value;
      this.runCurrentEffect();
    });

    warmSlider?.addEventListener('input', () => {
      const value = document.getElementById('sequential-warm-value');
      if (value) value.textContent = warmSlider.value;
      this.runCurrentEffect();
    });

    // Timing sliders
    const delaySlider = document.getElementById('sequential-delay') as HTMLInputElement;
    delaySlider?.addEventListener('input', () => {
      const value = document.getElementById('sequential-delay-value');
      if (value) value.textContent = delaySlider.value;
      this.runCurrentEffect();
    });

    const durationSlider = document.getElementById('sequential-duration') as HTMLInputElement;
    durationSlider?.addEventListener('input', () => {
      const value = document.getElementById('sequential-duration-value');
      if (value) value.textContent = durationSlider.value;
      this.runCurrentEffect();
    });
  }

  private getSequentialParams(): any {
    const presetSelect = document.getElementById('sequential-preset') as HTMLSelectElement;
    const delayInput = document.getElementById('sequential-delay') as HTMLInputElement;
    const durationInput = document.getElementById('sequential-duration') as HTMLInputElement;

    const preset = presetSelect?.value;
    const delayBetweenPanels = parseInt(delayInput?.value || '100');
    const fadeDuration = parseInt(durationInput?.value || '500');
    const brightness = this.getBrightness();

    if (preset === 'custom') {
      const rgbInput = document.getElementById('sequential-rgb-color') as HTMLInputElement;
      const coolInput = document.getElementById('sequential-cool') as HTMLInputElement;
      const warmInput = document.getElementById('sequential-warm') as HTMLInputElement;

      const hex = rgbInput?.value || '#ffffff';
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const cool = parseInt(coolInput?.value || '0');
      const warm = parseInt(warmInput?.value || '0');

      this.client.addPreset('sequential-custom', {
        type: 'solid',
        solid: { r, g, b, cool, warm }
      });

      return { colorPreset: 'sequential-custom', delayBetweenPanels, fadeDuration, brightness };
    }

    return { colorPreset: preset || 'white', delayBetweenPanels, fadeDuration, brightness };
  }

  // ===== FLOW EFFECT =====

  private attachFlowListeners(): void {
    const presetSelect = document.getElementById('flow-preset') as HTMLSelectElement;
    const customGroup = document.getElementById('flow-custom-group');

    presetSelect?.addEventListener('change', () => {
      if (customGroup) {
        customGroup.style.display = presetSelect.value === 'custom' ? 'block' : 'none';
        if (presetSelect.value === 'custom') {
          this.renderGradientStops('flow');
          this.updateGradientPreview('flow');
        }
      }
      this.runCurrentEffect();
    });

    // Speed slider
    const speedSlider = document.getElementById('flow-speed') as HTMLInputElement;
    speedSlider?.addEventListener('input', () => {
      const value = document.getElementById('flow-speed-value');
      if (value) value.textContent = parseFloat(speedSlider.value).toFixed(1);
      this.runCurrentEffect();
    });

    // Gradient scale slider
    const scaleSlider = document.getElementById('flow-scale') as HTMLInputElement;
    scaleSlider?.addEventListener('input', () => {
      const value = document.getElementById('flow-scale-value');
      if (value) value.textContent = parseFloat(scaleSlider.value).toFixed(2);
      this.runCurrentEffect();
    });

    // Gradient editor
    const colorSpaceSelect = document.getElementById('flow-colorspace') as HTMLSelectElement;
    colorSpaceSelect?.addEventListener('change', () => {
      this.gradientColorSpace = colorSpaceSelect.value as 'rgb' | 'hsv';
      this.updateGradientPreview('flow');
    });

    document.getElementById('btn-flow-add-stop')?.addEventListener('click', () => {
      this.addGradientStop('flow');
    });
  }

  private getFlowParams(): any {
    const presetSelect = document.getElementById('flow-preset') as HTMLSelectElement;
    const speedInput = document.getElementById('flow-speed') as HTMLInputElement;
    const scaleInput = document.getElementById('flow-scale') as HTMLInputElement;

    const preset = presetSelect?.value;
    const speed = parseFloat(speedInput?.value || '1.0');
    const scale = parseFloat(scaleInput?.value || '0.2');
    const brightness = this.getBrightness();

    console.log('Flow params:', { preset, speed, scale, brightness });

    if (preset === 'custom') {
      this.applyCustomGradient('flow-custom');
      return { colorPreset: 'flow-custom', speed, scale, brightness };
    }

    return { colorPreset: preset || 'rainbow', speed, scale, brightness };
  }

  // ===== STROBE EFFECT =====

  private attachStrobeListeners(): void {
    const presetSelect = document.getElementById('strobe-preset') as HTMLSelectElement;
    const customGroup = document.getElementById('strobe-custom-group');

    presetSelect?.addEventListener('change', () => {
      if (customGroup) {
        customGroup.style.display = presetSelect.value === 'custom' ? 'block' : 'none';
      }
      this.runCurrentEffect();
    });

    // RGB color picker
    document.getElementById('strobe-rgb-color')?.addEventListener('input', () => this.runCurrentEffect());

    // CCT sliders
    const coolSlider = document.getElementById('strobe-cool') as HTMLInputElement;
    const warmSlider = document.getElementById('strobe-warm') as HTMLInputElement;

    coolSlider?.addEventListener('input', () => {
      const value = document.getElementById('strobe-cool-value');
      if (value) value.textContent = coolSlider.value;
      this.runCurrentEffect();
    });

    warmSlider?.addEventListener('input', () => {
      const value = document.getElementById('strobe-warm-value');
      if (value) value.textContent = warmSlider.value;
      this.runCurrentEffect();
    });

    // Frequency slider
    const frequencySlider = document.getElementById('strobe-frequency') as HTMLInputElement;
    frequencySlider?.addEventListener('input', () => {
      const value = document.getElementById('strobe-frequency-value');
      if (value) value.textContent = parseFloat(frequencySlider.value).toFixed(1);
      this.runCurrentEffect();
    });
  }

  private getStrobeParams(): any {
    const presetSelect = document.getElementById('strobe-preset') as HTMLSelectElement;
    const frequencyInput = document.getElementById('strobe-frequency') as HTMLInputElement;

    const preset = presetSelect?.value;
    const frequency = parseFloat(frequencyInput?.value || '5');
    const brightness = this.getBrightness();

    if (preset === 'custom') {
      const rgbInput = document.getElementById('strobe-rgb-color') as HTMLInputElement;
      const coolInput = document.getElementById('strobe-cool') as HTMLInputElement;
      const warmInput = document.getElementById('strobe-warm') as HTMLInputElement;

      const hex = rgbInput?.value || '#ffffff';
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const cool = parseInt(coolInput?.value || '0');
      const warm = parseInt(warmInput?.value || '0');

      this.client.addPreset('strobe-custom', {
        type: 'solid',
        solid: { r, g, b, cool, warm }
      });

      return { colorPreset: 'strobe-custom', frequency, brightness };
    }

    return { colorPreset: preset || 'white', frequency, brightness };
  }

  // ===== BLACKOUT EFFECT =====

  private attachBlackoutListeners(): void {
    const durationSlider = document.getElementById('blackout-duration') as HTMLInputElement;
    durationSlider?.addEventListener('input', () => {
      const value = document.getElementById('blackout-duration-value');
      if (value) value.textContent = durationSlider.value;
    });
  }

  private getBlackoutParams(): any {
    const durationInput = document.getElementById('blackout-duration') as HTMLInputElement;
    const transitionDuration = parseInt(durationInput?.value || '0');
    return { transitionDuration };
  }

  // ===== GRADIENT EDITOR =====

  private renderGradientStops(effect: 'sequential' | 'flow'): void {
    const stopsList = document.getElementById(`${effect}-stops-list`);
    if (!stopsList) return;

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
          <div class="slider-label"><span>RGB Color</span></div>
          <input type="color" class="stop-color" data-index="${index}" value="${this.rgbToHex(stop.color.r, stop.color.g, stop.color.b)}">
        </div>
      `;
      stopsList.appendChild(stopElement);
    });

    this.attachGradientStopListeners(effect);
  }

  private attachGradientStopListeners(effect: 'sequential' | 'flow'): void {
    const container = document.getElementById(`${effect}-stops-list`);
    if (!container) return;

    container.querySelectorAll('.stop-position').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const index = parseInt(target.dataset.index || '0');
        const position = parseInt(target.value) / 1000;
        this.gradientStops[index].position = position;

        const valueSpan = target.parentElement?.querySelector('.slider-value');
        if (valueSpan) valueSpan.textContent = position.toFixed(3);

        this.updateGradientPreview(effect);
      });
    });

    container.querySelectorAll('.stop-color').forEach(picker => {
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

        this.updateGradientPreview(effect);
      });
    });

    container.querySelectorAll('.btn-remove-stop').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const index = parseInt(target.dataset.index || '0');
        this.removeGradientStop(effect, index);
      });
    });
  }

  private updateGradientPreview(effect: 'sequential' | 'flow'): void {
    const preview = document.getElementById(`${effect}-gradient-preview`);
    if (!preview) return;

    const sortedStops = [...this.gradientStops].sort((a, b) => a.position - b.position);
    const gradientStops = sortedStops.map(stop => {
      const hex = this.rgbToHex(stop.color.r, stop.color.g, stop.color.b);
      return `${hex} ${(stop.position * 100).toFixed(1)}%`;
    }).join(', ');

    preview.style.background = `linear-gradient(to right, ${gradientStops})`;
  }

  private addGradientStop(effect: 'sequential' | 'flow'): void {
    const newStop = {
      position: 0.5,
      color: { r: 128, g: 128, b: 128, cool: 0, warm: 0 }
    };

    this.gradientStops.push(newStop);
    this.renderGradientStops(effect);
    this.updateGradientPreview(effect);
  }

  private removeGradientStop(effect: 'sequential' | 'flow', index: number): void {
    if (this.gradientStops.length <= 2) return;

    this.gradientStops.splice(index, 1);
    this.renderGradientStops(effect);
    this.updateGradientPreview(effect);
  }

  private applyCustomGradient(presetName: string): void {
    const sortedStops = [...this.gradientStops].sort((a, b) => a.position - b.position);

    this.client.addPreset(presetName, {
      type: 'gradient',
      gradient: {
        colorSpace: this.gradientColorSpace,
        stops: sortedStops
      }
    });
  }

  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => {
      const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  // ===== EFFECT PRESET MANAGEMENT =====

  /**
   * Show dialog to save current effect configuration as preset
   */
  private showEffectPresetDialog(): void {
    if (!this.currentEffect) {
      alert('Please select an effect first');
      return;
    }

    const dialog = document.getElementById('effect-preset-dialog');
    const input = document.getElementById('effect-preset-name-input') as HTMLInputElement;

    if (!dialog || !input) return;

    input.value = '';
    dialog.style.display = 'flex';

    const confirmBtn = document.getElementById('btn-effect-preset-confirm');
    const cancelBtn = document.getElementById('btn-effect-preset-cancel');

    const confirm = () => {
      const name = input.value.trim();
      if (name) {
        this.saveEffectPreset(name);
        dialog.style.display = 'none';
      }
      confirmBtn?.removeEventListener('click', confirm);
      cancelBtn?.removeEventListener('click', cancel);
    };

    const cancel = () => {
      dialog.style.display = 'none';
      confirmBtn?.removeEventListener('click', confirm);
      cancelBtn?.removeEventListener('click', cancel);
    };

    confirmBtn?.addEventListener('click', confirm);
    cancelBtn?.addEventListener('click', cancel);
  }

  /**
   * Save current effect configuration as a preset
   */
  private saveEffectPreset(name: string): void {
    if (!this.currentEffect) return;

    // Get current topology
    const topologyRadio = this.container.querySelector('input[name="topology"]:checked') as HTMLInputElement;
    const topology = topologyRadio?.value || 'circular';

    // Get current effect parameters
    const params = this.getCurrentEffectParams();

    // Create preset
    const preset: EffectPreset = {
      name,
      effect: this.currentEffect,
      topology,
      params
    };

    // Save to map and localStorage
    this.effectPresets.set(name, preset);
    this.saveEffectPresetsToStorage();

    // Add to dropdown
    this.addEffectPresetToDropdown(name);

    console.log(`✅ Saved effect preset: ${name}`);
  }

  /**
   * Load and execute an effect preset
   */
  private loadEffectPreset(name: string): void {
    const preset = this.effectPresets.get(name);
    if (!preset) return;

    // Set topology
    const topologyRadio = this.container.querySelector(`input[name="topology"][value="${preset.topology}"]`) as HTMLInputElement;
    if (topologyRadio) {
      topologyRadio.checked = true;
      this.client.setTopology(preset.topology);
    }

    // Show effect params
    this.showEffectParams(preset.effect);

    // Set parameters based on effect type
    this.setEffectParameters(preset.effect, preset.params);

    // Run the effect
    this.client.runEffect(preset.effect, preset.params);
  }

  /**
   * Set UI parameters for an effect
   */
  private setEffectParameters(effect: EffectType, params: any): void {
    // Implementation depends on effect type - set all input values
    // This is simplified for now
    console.log(`Loading parameters for ${effect}:`, params);
  }

  /**
   * Delete an effect preset
   */
  private deleteEffectPreset(name: string): void {
    if (!confirm(`Delete preset "${name}"?`)) return;

    this.effectPresets.delete(name);
    this.saveEffectPresetsToStorage();

    // Remove from dropdown
    const select = document.getElementById('effect-preset-select') as HTMLSelectElement;
    const option = Array.from(select.options).find(opt => opt.value === name);
    if (option) {
      select.removeChild(option);
      select.value = '';
    }

    console.log(`🗑️ Deleted effect preset: ${name}`);
  }

  /**
   * Add effect preset to dropdown
   */
  private addEffectPresetToDropdown(name: string): void {
    const select = document.getElementById('effect-preset-select') as HTMLSelectElement;
    if (!select) return;

    // Check if already exists
    const existing = Array.from(select.options).find(opt => opt.value === name);
    if (existing) return;

    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);

    // Select the new preset
    select.value = name;
  }

  /**
   * Save effect presets to localStorage
   */
  private saveEffectPresetsToStorage(): void {
    const presets = Array.from(this.effectPresets.values());
    localStorage.setItem('chaser-effect-presets', JSON.stringify(presets));
  }

  /**
   * Load effect presets from localStorage
   */
  private loadEffectPresetsFromStorage(): void {
    try {
      const stored = localStorage.getItem('chaser-effect-presets');
      if (stored) {
        const presets: EffectPreset[] = JSON.parse(stored);
        presets.forEach(preset => {
          this.effectPresets.set(preset.name, preset);
          this.addEffectPresetToDropdown(preset.name);
        });
        console.log(`✅ Loaded ${presets.length} effect presets`);
      }
    } catch (error) {
      console.error('Failed to load effect presets:', error);
    }
  }

  /**
   * Update status display
   */
  public updateStatus(fps: number, currentEffect: string | null): void {
    const fpsElement = document.getElementById('fps');
    const effectElement = document.getElementById('current-effect');

    if (fpsElement) {
      fpsElement.textContent = `FPS: ${fps.toFixed(1)}`;
    }

    if (effectElement) {
      effectElement.textContent = `Effect: ${currentEffect || 'None'}`;
    }
  }
}
