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
   * Build UI controls with tab-based layout
   */
  private buildUI(): void {
    this.container.innerHTML = `
      <!-- Effect Tabs -->
      <div class="effect-tabs">
        <button class="effect-tab" data-effect="solid">SOLID</button>
        <button class="effect-tab" data-effect="sequential">SEQUENTIAL</button>
        <button class="effect-tab" data-effect="flow">FLOW</button>
        <button class="effect-tab" data-effect="strobe">STROBE</button>
        <button class="effect-tab" data-effect="blackout">BLACKOUT</button>
      </div>

      <!-- Effect Parameters Container -->
      <div class="effect-params-container">
        <!-- Solid Color Effect Parameters -->
        <div class="effect-params" id="params-solid">
          ${this.buildSolidParams()}
        </div>

        <!-- Sequential Fade Effect Parameters -->
        <div class="effect-params" id="params-sequential">
          ${this.buildSequentialParams()}
        </div>

        <!-- Flow Effect Parameters -->
        <div class="effect-params" id="params-flow">
          ${this.buildFlowParams()}
        </div>

        <!-- Strobe Effect Parameters -->
        <div class="effect-params" id="params-strobe">
          ${this.buildStrobeParams()}
        </div>

        <!-- Blackout Effect Parameters -->
        <div class="effect-params" id="params-blackout">
          ${this.buildBlackoutParams()}
        </div>
      </div>

      <!-- Preset Bank -->
      <div class="preset-bank">
        <div class="preset-bank-header">
          <div class="preset-bank-title">SAVED PRESETS</div>
        </div>
        <div class="preset-buttons" id="preset-buttons-container">
          <!-- Preset buttons will be dynamically generated here -->
        </div>
      </div>

      <!-- Effect Preset Save Dialog -->
      <div id="effect-preset-dialog" class="dialog">
        <div class="dialog-content">
          <div class="dialog-title">SAVE PRESET</div>
          <input type="text" id="effect-preset-name-input" placeholder="Preset name..." />
          <div class="dialog-buttons">
            <button id="btn-effect-preset-confirm" class="btn">SAVE</button>
            <button id="btn-effect-preset-cancel" class="btn">CANCEL</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Build Solid Color effect parameters HTML
   */
  private buildSolidParams(): string {
    return `
      <div class="effect-layout">
        <div class="effect-parameters">
          <div class="param-group">
            <label class="param-label">COLOR PRESET</label>
            <select id="solid-preset">
              <option value="white">White</option>
              <option value="warm">Warm White</option>
              <option value="custom">Custom Color</option>
            </select>
          </div>

          <div class="param-group" id="solid-custom-group" style="display: none;">
            <label class="param-label">RGB COLOR</label>
            <input type="color" id="solid-rgb-color" value="#ff0000">

            <label class="param-label" style="margin-top: 16px;">
              COOL WHITE <span class="param-value" id="solid-cool-value">0</span>
            </label>
            <input type="range" id="solid-cool" min="0" max="255" value="0">

            <label class="param-label" style="margin-top: 16px;">
              WARM WHITE <span class="param-value" id="solid-warm-value">0</span>
            </label>
            <input type="range" id="solid-warm" min="0" max="255" value="0">
          </div>

          <div class="param-group">
            <label class="param-label">
              FADE DURATION (MS) <span class="param-value" id="solid-duration-value">1000</span>
            </label>
            <input type="range" id="solid-duration" min="0" max="5000" value="1000" step="100">
          </div>

          <div class="param-group">
            <label class="param-label">
              BRIGHTNESS <span class="param-value" id="solid-brightness-value">100%</span>
            </label>
            <input type="range" id="solid-brightness" min="0" max="100" value="100" step="1">
          </div>

          <div class="param-group">
            <label class="param-label">TOPOLOGY MODE</label>
            <div class="radio-group">
              <div class="radio-option">
                <input type="radio" name="solid-topology" value="singular" id="solid-topology-singular" checked>
                <label for="solid-topology-singular">SINGULAR</label>
              </div>
              <div class="radio-option">
                <input type="radio" name="solid-topology" value="circular" id="solid-topology-circular">
                <label for="solid-topology-circular">CIRCULAR</label>
              </div>
              <div class="radio-option">
                <input type="radio" name="solid-topology" value="linear" id="solid-topology-linear">
                <label for="solid-topology-linear">LINEAR</label>
              </div>
            </div>
          </div>
        </div>

        <div class="effect-actions">
          <button class="btn btn-primary" id="btn-solid-run">RUN EFFECT</button>
          <button class="btn" id="btn-solid-save">SAVE AS PRESET</button>
        </div>
      </div>
    `;
  }

  /**
   * Build Sequential Fade effect parameters HTML
   */
  private buildSequentialParams(): string {
    return `
      <div class="effect-layout">
        <div class="effect-parameters">
          <div class="param-group">
            <label class="param-label">COLOR PRESET</label>
            <select id="sequential-preset">
              <option value="white">White</option>
              <option value="warm">Warm White</option>
              <option value="custom">Custom Color</option>
            </select>
          </div>

          <div class="param-group" id="sequential-custom-group" style="display: none;">
            <label class="param-label">RGB COLOR</label>
            <input type="color" id="sequential-rgb-color" value="#ff0000">

            <label class="param-label" style="margin-top: 16px;">
              COOL WHITE <span class="param-value" id="sequential-cool-value">0</span>
            </label>
            <input type="range" id="sequential-cool" min="0" max="255" value="0">

            <label class="param-label" style="margin-top: 16px;">
              WARM WHITE <span class="param-value" id="sequential-warm-value">0</span>
            </label>
            <input type="range" id="sequential-warm" min="0" max="255" value="0">
          </div>

          <div class="param-group">
            <label class="param-label">
              DELAY BETWEEN PANELS (MS) <span class="param-value" id="sequential-delay-value">100</span>
            </label>
            <input type="range" id="sequential-delay" min="10" max="500" value="100" step="10">
          </div>

          <div class="param-group">
            <label class="param-label">
              FADE DURATION (MS) <span class="param-value" id="sequential-duration-value">500</span>
            </label>
            <input type="range" id="sequential-duration" min="100" max="3000" value="500" step="50">
          </div>

          <div class="param-group">
            <label class="param-label">
              BRIGHTNESS <span class="param-value" id="sequential-brightness-value">100%</span>
            </label>
            <input type="range" id="sequential-brightness" min="0" max="100" value="100" step="1">
          </div>

          <div class="param-group">
            <label class="param-label">TOPOLOGY MODE</label>
            <div class="radio-group">
              <div class="radio-option">
                <input type="radio" name="sequential-topology" value="circular" id="sequential-topology-circular" checked>
                <label for="sequential-topology-circular">CIRCULAR</label>
              </div>
              <div class="radio-option">
                <input type="radio" name="sequential-topology" value="linear" id="sequential-topology-linear">
                <label for="sequential-topology-linear">LINEAR</label>
              </div>
              <div class="radio-option">
                <input type="radio" name="sequential-topology" value="singular" id="sequential-topology-singular">
                <label for="sequential-topology-singular">SINGULAR</label>
              </div>
            </div>
          </div>
        </div>

        <div class="effect-actions">
          <button class="btn btn-primary" id="btn-sequential-run">RUN EFFECT</button>
          <button class="btn" id="btn-sequential-save">SAVE AS PRESET</button>
        </div>
      </div>
    `;
  }

  /**
   * Build Flow effect parameters HTML
   */
  private buildFlowParams(): string {
    return `
      <div class="effect-layout">
        <div class="effect-parameters">
          <div class="param-group">
            <label class="param-label">GRADIENT PRESET</label>
            <select id="flow-preset">
              <option value="rainbow">Rainbow</option>
              <option value="ocean">Ocean</option>
              <option value="sunset">Sunset</option>
              <option value="fire">Fire</option>
              <option value="breathe">Breathe</option>
              <option value="custom">Custom Gradient</option>
            </select>
          </div>

          <div class="param-group" id="flow-custom-group" style="display: none;">
            <label class="param-label">GRADIENT PREVIEW</label>
            <div id="flow-gradient-preview" style="width: 100%; height: 40px; border: 2px solid #fff; margin-bottom: 16px;"></div>

            <label class="param-label">COLOR SPACE</label>
            <select id="flow-colorspace">
              <option value="rgb">RGB</option>
              <option value="hsv">HSV</option>
            </select>

            <div style="margin-top: 16px;">
              <label class="param-label">GRADIENT STOPS</label>
              <div id="flow-stops-list"></div>
              <button class="btn" id="btn-flow-add-stop" style="width: 100%; margin-top: 8px;">ADD STOP</button>
            </div>
          </div>

          <div class="param-group">
            <label class="param-label">
              SPEED <span class="param-value" id="flow-speed-value">1.0</span>
            </label>
            <input type="range" id="flow-speed" min="0.1" max="10" value="1.0" step="0.1">
          </div>

          <div class="param-group">
            <label class="param-label">
              GRADIENT SCALE <span class="param-value" id="flow-scale-value">0.2</span>
            </label>
            <input type="range" id="flow-scale" min="0" max="4" value="0.2" step="0.05">
          </div>

          <div class="param-group">
            <label class="param-label">
              BRIGHTNESS <span class="param-value" id="flow-brightness-value">100%</span>
            </label>
            <input type="range" id="flow-brightness" min="0" max="100" value="100" step="1">
          </div>

          <div class="param-group">
            <label class="param-label">TOPOLOGY MODE</label>
            <div class="radio-group">
              <div class="radio-option">
                <input type="radio" name="flow-topology" value="circular" id="flow-topology-circular" checked>
                <label for="flow-topology-circular">CIRCULAR</label>
              </div>
              <div class="radio-option">
                <input type="radio" name="flow-topology" value="linear" id="flow-topology-linear">
                <label for="flow-topology-linear">LINEAR</label>
              </div>
              <div class="radio-option">
                <input type="radio" name="flow-topology" value="singular" id="flow-topology-singular">
                <label for="flow-topology-singular">SINGULAR</label>
              </div>
            </div>
          </div>
        </div>

        <div class="effect-actions">
          <button class="btn btn-primary" id="btn-flow-run">RUN EFFECT</button>
          <button class="btn" id="btn-flow-save">SAVE AS PRESET</button>
        </div>
      </div>
    `;
  }

  /**
   * Build Strobe effect parameters HTML
   */
  private buildStrobeParams(): string {
    return `
      <div class="effect-layout">
        <div class="effect-parameters">
          <div class="param-group">
            <label class="param-label">COLOR PRESET</label>
            <select id="strobe-preset">
              <option value="white">White</option>
              <option value="warm">Warm White</option>
              <option value="custom">Custom Color</option>
            </select>
          </div>

          <div class="param-group" id="strobe-custom-group" style="display: none;">
            <label class="param-label">RGB COLOR</label>
            <input type="color" id="strobe-rgb-color" value="#ffffff">

            <label class="param-label" style="margin-top: 16px;">
              COOL WHITE <span class="param-value" id="strobe-cool-value">0</span>
            </label>
            <input type="range" id="strobe-cool" min="0" max="255" value="0">

            <label class="param-label" style="margin-top: 16px;">
              WARM WHITE <span class="param-value" id="strobe-warm-value">0</span>
            </label>
            <input type="range" id="strobe-warm" min="0" max="255" value="0">
          </div>

          <div class="param-group">
            <label class="param-label">
              FREQUENCY (HZ) <span class="param-value" id="strobe-frequency-value">5.0</span>
            </label>
            <input type="range" id="strobe-frequency" min="0.5" max="30" value="5" step="0.5">
          </div>

          <div class="param-group">
            <label class="param-label">
              BRIGHTNESS <span class="param-value" id="strobe-brightness-value">100%</span>
            </label>
            <input type="range" id="strobe-brightness" min="0" max="100" value="100" step="1">
          </div>

          <div class="param-group">
            <label class="param-label">TOPOLOGY MODE</label>
            <div class="radio-group">
              <div class="radio-option">
                <input type="radio" name="strobe-topology" value="singular" id="strobe-topology-singular" checked>
                <label for="strobe-topology-singular">SINGULAR</label>
              </div>
              <div class="radio-option">
                <input type="radio" name="strobe-topology" value="circular" id="strobe-topology-circular">
                <label for="strobe-topology-circular">CIRCULAR</label>
              </div>
              <div class="radio-option">
                <input type="radio" name="strobe-topology" value="linear" id="strobe-topology-linear">
                <label for="strobe-topology-linear">LINEAR</label>
              </div>
            </div>
          </div>
        </div>

        <div class="effect-actions">
          <button class="btn btn-primary" id="btn-strobe-run">RUN EFFECT</button>
          <button class="btn" id="btn-strobe-save">SAVE AS PRESET</button>
        </div>
      </div>
    `;
  }

  /**
   * Build Blackout effect parameters HTML
   */
  private buildBlackoutParams(): string {
    return `
      <div class="effect-layout">
        <div class="effect-parameters">
          <div class="param-group">
            <label class="param-label">
              FADE DURATION (MS) <span class="param-value" id="blackout-duration-value">0</span>
            </label>
            <input type="range" id="blackout-duration" min="0" max="5000" value="0" step="100">
            <p style="font-size: 10px; color: #999; margin-top: 8px;">Set to 0 for instant blackout</p>
          </div>

          <div class="param-group">
            <label class="param-label">TOPOLOGY MODE</label>
            <div class="radio-group">
              <div class="radio-option">
                <input type="radio" name="blackout-topology" value="singular" id="blackout-topology-singular" checked>
                <label for="blackout-topology-singular">SINGULAR</label>
              </div>
              <div class="radio-option">
                <input type="radio" name="blackout-topology" value="circular" id="blackout-topology-circular">
                <label for="blackout-topology-circular">CIRCULAR</label>
              </div>
              <div class="radio-option">
                <input type="radio" name="blackout-topology" value="linear" id="blackout-topology-linear">
                <label for="blackout-topology-linear">LINEAR</label>
              </div>
            </div>
          </div>
        </div>

        <div class="effect-actions">
          <button class="btn btn-primary" id="btn-blackout-run">RUN EFFECT</button>
          <button class="btn" id="btn-blackout-save">SAVE AS PRESET</button>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners for tab-based layout
   */
  private attachEventListeners(): void {
    // Effect tab buttons
    const effectTabs = this.container.querySelectorAll('.effect-tab');
    effectTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const effect = (tab as HTMLElement).dataset.effect as EffectType;
        this.switchToTab(effect);
      });
    });

    // Solid color effect listeners
    this.attachSolidColorListeners();

    // Sequential fade effect listeners
    this.attachSequentialListeners();

    // Flow effect listeners
    this.attachFlowListeners();

    // Strobe effect listeners
    this.attachStrobeListeners();

    // Blackout effect listeners
    this.attachBlackoutListeners();

    // Load saved presets from localStorage
    this.loadEffectPresetsFromStorage();

    // Show first tab by default
    this.switchToTab('solid');
  }

  /**
   * Switch to a specific effect tab
   */
  private switchToTab(effect: EffectType): void {
    this.currentEffect = effect;

    // Update tab active states
    const tabs = this.container.querySelectorAll('.effect-tab');
    tabs.forEach(tab => {
      if ((tab as HTMLElement).dataset.effect === effect) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Update effect params visibility
    const allParams = this.container.querySelectorAll('.effect-params');
    allParams.forEach(params => {
      params.classList.remove('active');
    });

    const activeParams = document.getElementById(`params-${effect}`);
    if (activeParams) {
      activeParams.classList.add('active');
    }
  }

  /**
   * Run a specific effect with its current parameters
   */
  private runEffect(effect: EffectType): void {
    this.currentEffect = effect;

    // Get topology from the effect-specific radio buttons
    const topologyRadio = document.querySelector(`input[name="${effect}-topology"]:checked`) as HTMLInputElement;
    if (topologyRadio) {
      this.client.setTopology(topologyRadio.value);
    }

    const params = this.getCurrentEffectParams();
    this.client.runEffect(effect, params);
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
    // Run button
    document.getElementById('btn-solid-run')?.addEventListener('click', () => {
      this.runEffect('solid');
    });

    // Save button
    document.getElementById('btn-solid-save')?.addEventListener('click', () => {
      this.showEffectPresetDialog();
    });

    // Preset selector
    const presetSelect = document.getElementById('solid-preset') as HTMLSelectElement;
    const customGroup = document.getElementById('solid-custom-group');

    presetSelect?.addEventListener('change', () => {
      if (customGroup) {
        customGroup.style.display = presetSelect.value === 'custom' ? 'block' : 'none';
      }
    });

    // RGB color picker
    document.getElementById('solid-rgb-color')?.addEventListener('input', () => {});

    // CCT sliders
    const coolSlider = document.getElementById('solid-cool') as HTMLInputElement;
    const warmSlider = document.getElementById('solid-warm') as HTMLInputElement;

    coolSlider?.addEventListener('input', () => {
      const value = document.getElementById('solid-cool-value');
      if (value) value.textContent = coolSlider.value;
    });

    warmSlider?.addEventListener('input', () => {
      const value = document.getElementById('solid-warm-value');
      if (value) value.textContent = warmSlider.value;
    });

    // Duration slider
    const durationSlider = document.getElementById('solid-duration') as HTMLInputElement;
    durationSlider?.addEventListener('input', () => {
      const value = document.getElementById('solid-duration-value');
      if (value) value.textContent = durationSlider.value;
    });

    // Brightness slider
    const brightnessSlider = document.getElementById('solid-brightness') as HTMLInputElement;
    brightnessSlider?.addEventListener('input', () => {
      const value = document.getElementById('solid-brightness-value');
      if (value) value.textContent = `${brightnessSlider.value}%`;
    });

    // Topology radio buttons
    const topologyRadios = document.querySelectorAll('input[name="solid-topology"]');
    topologyRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (this.currentEffect === 'solid') {
          this.client.setTopology(target.value);
        }
      });
    });
  }

  private getSolidParams(): any {
    const presetSelect = document.getElementById('solid-preset') as HTMLSelectElement;
    const durationInput = document.getElementById('solid-duration') as HTMLInputElement;
    const brightnessInput = document.getElementById('solid-brightness') as HTMLInputElement;

    const preset = presetSelect?.value;
    const transitionDuration = parseInt(durationInput?.value || '1000');
    const brightness = parseFloat(brightnessInput?.value || '100') / 100;

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

      return { colorPreset: 'custom', transitionDuration, brightness };
    }

    return { colorPreset: preset || 'white', transitionDuration, brightness };
  }

  // ===== SEQUENTIAL FADE EFFECT =====

  private attachSequentialListeners(): void {
    // Run button
    document.getElementById('btn-sequential-run')?.addEventListener('click', () => {
      this.runEffect('sequential');
    });

    // Save button
    document.getElementById('btn-sequential-save')?.addEventListener('click', () => {
      this.showEffectPresetDialog();
    });

    // Preset selector
    const presetSelect = document.getElementById('sequential-preset') as HTMLSelectElement;
    const customGroup = document.getElementById('sequential-custom-group');

    presetSelect?.addEventListener('change', () => {
      if (customGroup) {
        customGroup.style.display = presetSelect.value === 'custom' ? 'block' : 'none';
      }
    });

    // RGB color picker
    document.getElementById('sequential-rgb-color')?.addEventListener('input', () => {});

    // CCT sliders
    const coolSlider = document.getElementById('sequential-cool') as HTMLInputElement;
    const warmSlider = document.getElementById('sequential-warm') as HTMLInputElement;

    coolSlider?.addEventListener('input', () => {
      const value = document.getElementById('sequential-cool-value');
      if (value) value.textContent = coolSlider.value;
    });

    warmSlider?.addEventListener('input', () => {
      const value = document.getElementById('sequential-warm-value');
      if (value) value.textContent = warmSlider.value;
    });

    // Timing sliders
    const delaySlider = document.getElementById('sequential-delay') as HTMLInputElement;
    delaySlider?.addEventListener('input', () => {
      const value = document.getElementById('sequential-delay-value');
      if (value) value.textContent = delaySlider.value;
    });

    const durationSlider = document.getElementById('sequential-duration') as HTMLInputElement;
    durationSlider?.addEventListener('input', () => {
      const value = document.getElementById('sequential-duration-value');
      if (value) value.textContent = durationSlider.value;
    });

    // Brightness slider
    const brightnessSlider = document.getElementById('sequential-brightness') as HTMLInputElement;
    brightnessSlider?.addEventListener('input', () => {
      const value = document.getElementById('sequential-brightness-value');
      if (value) value.textContent = `${brightnessSlider.value}%`;
    });

    // Topology radio buttons
    const topologyRadios = document.querySelectorAll('input[name="sequential-topology"]');
    topologyRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (this.currentEffect === 'sequential') {
          this.client.setTopology(target.value);
        }
      });
    });
  }

  private getSequentialParams(): any {
    const presetSelect = document.getElementById('sequential-preset') as HTMLSelectElement;
    const delayInput = document.getElementById('sequential-delay') as HTMLInputElement;
    const durationInput = document.getElementById('sequential-duration') as HTMLInputElement;
    const brightnessInput = document.getElementById('sequential-brightness') as HTMLInputElement;

    const preset = presetSelect?.value;
    const delayBetweenPanels = parseInt(delayInput?.value || '100');
    const fadeDuration = parseInt(durationInput?.value || '500');
    const brightness = parseFloat(brightnessInput?.value || '100') / 100;

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
    // Run button
    document.getElementById('btn-flow-run')?.addEventListener('click', () => {
      this.runEffect('flow');
    });

    // Save button
    document.getElementById('btn-flow-save')?.addEventListener('click', () => {
      this.showEffectPresetDialog();
    });

    // Preset selector
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
    });

    // Speed slider
    const speedSlider = document.getElementById('flow-speed') as HTMLInputElement;
    speedSlider?.addEventListener('input', () => {
      const value = document.getElementById('flow-speed-value');
      if (value) value.textContent = parseFloat(speedSlider.value).toFixed(1);
    });

    // Gradient scale slider
    const scaleSlider = document.getElementById('flow-scale') as HTMLInputElement;
    scaleSlider?.addEventListener('input', () => {
      const value = document.getElementById('flow-scale-value');
      if (value) value.textContent = parseFloat(scaleSlider.value).toFixed(2);
    });

    // Brightness slider
    const brightnessSlider = document.getElementById('flow-brightness') as HTMLInputElement;
    brightnessSlider?.addEventListener('input', () => {
      const value = document.getElementById('flow-brightness-value');
      if (value) value.textContent = `${brightnessSlider.value}%`;
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

    // Topology radio buttons
    const topologyRadios = document.querySelectorAll('input[name="flow-topology"]');
    topologyRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (this.currentEffect === 'flow') {
          this.client.setTopology(target.value);
        }
      });
    });
  }

  private getFlowParams(): any {
    const presetSelect = document.getElementById('flow-preset') as HTMLSelectElement;
    const speedInput = document.getElementById('flow-speed') as HTMLInputElement;
    const scaleInput = document.getElementById('flow-scale') as HTMLInputElement;
    const brightnessInput = document.getElementById('flow-brightness') as HTMLInputElement;

    const preset = presetSelect?.value;
    const speed = parseFloat(speedInput?.value || '1.0');
    const scale = parseFloat(scaleInput?.value || '0.2');
    const brightness = parseFloat(brightnessInput?.value || '100') / 100;

    console.log('Flow params:', { preset, speed, scale, brightness });

    if (preset === 'custom') {
      this.applyCustomGradient('flow-custom');
      return { colorPreset: 'flow-custom', speed, scale, brightness };
    }

    return { colorPreset: preset || 'rainbow', speed, scale, brightness };
  }

  // ===== STROBE EFFECT =====

  private attachStrobeListeners(): void {
    // Run button
    document.getElementById('btn-strobe-run')?.addEventListener('click', () => {
      this.runEffect('strobe');
    });

    // Save button
    document.getElementById('btn-strobe-save')?.addEventListener('click', () => {
      this.showEffectPresetDialog();
    });

    // Preset selector
    const presetSelect = document.getElementById('strobe-preset') as HTMLSelectElement;
    const customGroup = document.getElementById('strobe-custom-group');

    presetSelect?.addEventListener('change', () => {
      if (customGroup) {
        customGroup.style.display = presetSelect.value === 'custom' ? 'block' : 'none';
      }
    });

    // RGB color picker
    document.getElementById('strobe-rgb-color')?.addEventListener('input', () => {});

    // CCT sliders
    const coolSlider = document.getElementById('strobe-cool') as HTMLInputElement;
    const warmSlider = document.getElementById('strobe-warm') as HTMLInputElement;

    coolSlider?.addEventListener('input', () => {
      const value = document.getElementById('strobe-cool-value');
      if (value) value.textContent = coolSlider.value;
    });

    warmSlider?.addEventListener('input', () => {
      const value = document.getElementById('strobe-warm-value');
      if (value) value.textContent = warmSlider.value;
    });

    // Frequency slider
    const frequencySlider = document.getElementById('strobe-frequency') as HTMLInputElement;
    frequencySlider?.addEventListener('input', () => {
      const value = document.getElementById('strobe-frequency-value');
      if (value) value.textContent = parseFloat(frequencySlider.value).toFixed(1);
    });

    // Brightness slider
    const brightnessSlider = document.getElementById('strobe-brightness') as HTMLInputElement;
    brightnessSlider?.addEventListener('input', () => {
      const value = document.getElementById('strobe-brightness-value');
      if (value) value.textContent = `${brightnessSlider.value}%`;
    });

    // Topology radio buttons
    const topologyRadios = document.querySelectorAll('input[name="strobe-topology"]');
    topologyRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (this.currentEffect === 'strobe') {
          this.client.setTopology(target.value);
        }
      });
    });
  }

  private getStrobeParams(): any {
    const presetSelect = document.getElementById('strobe-preset') as HTMLSelectElement;
    const frequencyInput = document.getElementById('strobe-frequency') as HTMLInputElement;
    const brightnessInput = document.getElementById('strobe-brightness') as HTMLInputElement;

    const preset = presetSelect?.value;
    const frequency = parseFloat(frequencyInput?.value || '5');
    const brightness = parseFloat(brightnessInput?.value || '100') / 100;

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
    // Run button
    document.getElementById('btn-blackout-run')?.addEventListener('click', () => {
      this.runEffect('blackout');
    });

    // Save button
    document.getElementById('btn-blackout-save')?.addEventListener('click', () => {
      this.showEffectPresetDialog();
    });

    // Duration slider
    const durationSlider = document.getElementById('blackout-duration') as HTMLInputElement;
    durationSlider?.addEventListener('input', () => {
      const value = document.getElementById('blackout-duration-value');
      if (value) value.textContent = durationSlider.value;
    });

    // Topology radio buttons
    const topologyRadios = document.querySelectorAll('input[name="blackout-topology"]');
    topologyRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (this.currentEffect === 'blackout') {
          this.client.setTopology(target.value);
        }
      });
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
      stopElement.style.marginBottom = '16px';
      stopElement.style.paddingBottom = '16px';
      stopElement.style.borderBottom = '2px solid #333';

      stopElement.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <label class="param-label" style="margin-bottom: 0;">STOP ${index + 1}</label>
          ${this.gradientStops.length > 2 ? `<button class="btn btn-remove-stop" data-index="${index}" style="padding: 6px 10px; font-size: 9px;">REMOVE</button>` : ''}
        </div>
        <label class="param-label" style="margin-top: 12px;">
          POSITION <span class="param-value">${stop.position.toFixed(3)}</span>
        </label>
        <input type="range" class="stop-position" data-index="${index}" min="0" max="1000" value="${stop.position * 1000}" step="1">
        <label class="param-label" style="margin-top: 12px;">RGB COLOR</label>
        <input type="color" class="stop-color" data-index="${index}" value="${this.rgbToHex(stop.color.r, stop.color.g, stop.color.b)}">
        <label class="param-label" style="margin-top: 12px;">
          COOL WHITE <span class="param-value">${stop.color.cool}</span>
        </label>
        <input type="range" class="stop-cool" data-index="${index}" min="0" max="255" value="${stop.color.cool}">
        <label class="param-label" style="margin-top: 12px;">
          WARM WHITE <span class="param-value">${stop.color.warm}</span>
        </label>
        <input type="range" class="stop-warm" data-index="${index}" min="0" max="255" value="${stop.color.warm}">
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

        // Find the value span in the previous sibling label
        const label = target.previousElementSibling as HTMLElement;
        const valueSpan = label?.querySelector('.param-value');
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

    container.querySelectorAll('.stop-cool').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const index = parseInt(target.dataset.index || '0');
        const cool = parseInt(target.value);
        this.gradientStops[index].color.cool = cool;

        const label = target.previousElementSibling as HTMLElement;
        const valueSpan = label?.querySelector('.param-value');
        if (valueSpan) valueSpan.textContent = cool.toString();

        this.updateGradientPreview(effect);
      });
    });

    container.querySelectorAll('.stop-warm').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const index = parseInt(target.dataset.index || '0');
        const warm = parseInt(target.value);
        this.gradientStops[index].color.warm = warm;

        const label = target.previousElementSibling as HTMLElement;
        const valueSpan = label?.querySelector('.param-value');
        if (valueSpan) valueSpan.textContent = warm.toString();

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

    if (!dialog || !input) {
      console.error('Dialog or input not found', { dialog, input });
      return;
    }

    input.value = '';
    dialog.classList.add('active');

    const confirmBtn = document.getElementById('btn-effect-preset-confirm');
    const cancelBtn = document.getElementById('btn-effect-preset-cancel');

    const confirm = () => {
      const name = input.value.trim();
      if (name) {
        this.saveEffectPreset(name);
        dialog.classList.remove('active');
      }
      confirmBtn?.removeEventListener('click', confirm);
      cancelBtn?.removeEventListener('click', cancel);
    };

    const cancel = () => {
      dialog.classList.remove('active');
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

    // Get current topology from effect-specific radio buttons
    const topologyRadio = document.querySelector(`input[name="${this.currentEffect}-topology"]:checked`) as HTMLInputElement;
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

    // Update preset bank UI
    this.renderPresetBank();

    console.log(`✅ Saved effect preset: ${name}`);
  }

  /**
   * Load and execute an effect preset
   */
  private loadEffectPreset(name: string): void {
    const preset = this.effectPresets.get(name);
    if (!preset) return;

    // Switch to the preset's effect tab
    this.switchToTab(preset.effect);

    // Set topology for this effect
    const topologyRadio = document.querySelector(`input[name="${preset.effect}-topology"][value="${preset.topology}"]`) as HTMLInputElement;
    if (topologyRadio) {
      topologyRadio.checked = true;
      this.client.setTopology(preset.topology);
    }

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

    // Update preset bank UI
    this.renderPresetBank();

    console.log(`🗑️ Deleted effect preset: ${name}`);
  }

  /**
   * Render the preset bank with all saved presets
   */
  private renderPresetBank(): void {
    const container = document.getElementById('preset-buttons-container');
    if (!container) return;

    container.innerHTML = '';

    if (this.effectPresets.size === 0) {
      container.innerHTML = '<p style="color: #666; font-size: 11px; padding: 8px 0;">No saved presets</p>';
      return;
    }

    this.effectPresets.forEach((preset, name) => {
      const button = document.createElement('button');
      button.className = 'preset-btn';
      button.textContent = name;
      button.title = `${preset.effect.toUpperCase()} - ${preset.topology}`;

      button.addEventListener('click', () => {
        this.loadEffectPreset(name);
        button.classList.add('active');
        setTimeout(() => button.classList.remove('active'), 500);
      });

      // Right-click to delete
      button.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.deleteEffectPreset(name);
      });

      container.appendChild(button);
    });
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
        });
        this.renderPresetBank();
        console.log(`✅ Loaded ${presets.length} effect presets`);
      } else {
        this.renderPresetBank();
      }
    } catch (error) {
      console.error('Failed to load effect presets:', error);
      this.renderPresetBank();
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
