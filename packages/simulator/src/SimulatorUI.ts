import type { WebSocketClient } from './WebSocketClient.js';
import type { EffectPreset } from '@chaser/types';

type EffectType = 'solid' | 'sequential' | 'flow' | 'strobe' | 'blackout' | 'static';

/**
 * Simulator UI controls with effect-specific parameter sections
 */
export class SimulatorUI {
  private client: WebSocketClient;
  private container: HTMLElement;
  private currentEffect: EffectType | null = null;
  private effectPresets: EffectPreset[] = [];

  // Gradient editor state
  private gradientStops: Array<{
    position: number;
    color: { r: number; g: number; b: number; cool: number; warm: number };
  }> = [];
  private gradientColorSpace: 'rgb' | 'hsv' = 'rgb';

  // Static effect state
  private staticPanelColors: Array<{ r: number; g: number; b: number; cool: number; warm: number }> = [];
  private panelCount: number = 0;

  constructor(client: WebSocketClient, container: HTMLElement) {
    this.client = client;
    this.container = container;

    // Register preset callbacks
    this.client.onPresetsList((presets) => {
      this.effectPresets = presets;
      this.renderPresetBank();
    });

    this.client.onPresetSaved((preset) => {
      // Dedupe: only add if not already present
      if (!this.effectPresets.find(p => p.id === preset.id)) {
        this.effectPresets.push(preset);
      }
      this.renderPresetBank();
    });

    this.client.onPresetUpdated((preset) => {
      const index = this.effectPresets.findIndex(p => p.id === preset.id);
      if (index !== -1) {
        this.effectPresets[index] = preset;
      }
      this.renderPresetBank();
    });

    this.client.onPresetDeleted((id) => {
      this.effectPresets = this.effectPresets.filter(p => p.id !== id);
      this.renderPresetBank();
    });

    this.initializeDefaultGradient();
    this.initializeStaticEffect();
    this.buildUI();
    this.attachEventListeners();

    // Fetch presets from server
    this.client.listPresets();
  }

  /**
   * Initialize static effect with panel count from config
   */
  private initializeStaticEffect(): void {
    const config = this.client.getConfig();
    if (config && config.engine) {
      const columns = config.engine.columns || 2;
      const rowsPerColumn = config.engine.rowsPerColumn || 7;
      this.panelCount = columns * rowsPerColumn;

      // Initialize all panels to black
      this.staticPanelColors = Array(this.panelCount).fill(null).map(() => ({
        r: 0, g: 0, b: 0, cool: 0, warm: 0
      }));
    }
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
        <button class="effect-tab" data-effect="static">STATIC</button>
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

        <!-- Static Effect Parameters -->
        <div class="effect-params" id="params-static">
          ${this.buildStaticParams()}
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
          <input type="text" id="effect-preset-id-input" placeholder="Preset ID (e.g., my-preset)..." />
          <input type="text" id="effect-preset-name-input" placeholder="Display name..." />
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
        </div>

        <div class="effect-actions">
          <button class="btn btn-primary" id="btn-blackout-run">RUN EFFECT</button>
          <button class="btn" id="btn-blackout-save">SAVE AS PRESET</button>
        </div>
      </div>
    `;
  }

  /**
   * Calculate display color for preview (handles RGBCCT properly)
   */
  private getDisplayColorForPreview(color: { r: number; g: number; b: number; cool: number; warm: number }): string {
    const hasRGB = color.r > 0 || color.g > 0 || color.b > 0;

    if (!hasRGB && (color.cool > 0 || color.warm > 0)) {
      // Pure white channels - show as white/warm white
      if (color.cool > 0 && color.warm === 0) {
        return '#e0f0ff'; // Cool white - bluish tint
      } else if (color.warm > 0 && color.cool === 0) {
        return '#fff5e0'; // Warm white - yellowish tint
      } else {
        return '#ffffff'; // Both cool and warm - neutral white
      }
    } else {
      // Has RGB values, show them
      return this.rgbToHex(color.r, color.g, color.b);
    }
  }

  /**
   * Build Static effect parameters HTML with collapsible panel pickers
   */
  private buildStaticParams(): string {
    const panelItems = Array(this.panelCount).fill(null).map((_, index) => {
      const color = this.staticPanelColors[index] || { r: 0, g: 0, b: 0, cool: 0, warm: 0 };
      const colorHex = this.getDisplayColorForPreview(color);

      return `
        <div class="static-panel-item" data-panel="${index}">
          <div class="static-panel-header" data-panel="${index}">
            <span class="static-panel-number">PANEL ${index}</span>
            <div class="static-panel-preview" style="background: ${colorHex}; border: 1px solid #333;"></div>
            <span class="static-panel-toggle">▶</span>
          </div>
          <div class="static-panel-content" data-panel="${index}" style="display: none;">
            <div class="param-group">
              <label class="param-label">COLOR PRESET</label>
              <select id="static-${index}-preset" class="static-preset-select" data-panel="${index}">
                <option value="off">Off / Black</option>
                <option value="white">White</option>
                <option value="warm">Warm White</option>
                <option value="custom">Custom Color</option>
              </select>
            </div>

            <div class="param-group static-custom-group" id="static-${index}-custom-group" style="display: none;">
              <label class="param-label">RGB COLOR</label>
              <input type="color" id="static-${index}-rgb-color" class="static-rgb-color" data-panel="${index}" value="${colorHex}">

              <label class="param-label" style="margin-top: 16px;">
                COOL WHITE <span class="param-value" id="static-${index}-cool-value">${color.cool}</span>
              </label>
              <input type="range" id="static-${index}-cool" class="static-cool" data-panel="${index}" min="0" max="255" value="${color.cool}">

              <label class="param-label" style="margin-top: 16px;">
                WARM WHITE <span class="param-value" id="static-${index}-warm-value">${color.warm}</span>
              </label>
              <input type="range" id="static-${index}-warm" class="static-warm" data-panel="${index}" min="0" max="255" value="${color.warm}">
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="effect-layout">
        <div class="effect-parameters">
          <div class="param-group">
            <label class="param-label">
              BRIGHTNESS <span class="param-value" id="static-brightness-value">100%</span>
            </label>
            <input type="range" id="static-brightness" min="0" max="100" value="100" step="1">
          </div>

          <div class="static-panels-list">
            ${panelItems}
          </div>
        </div>

        <div class="effect-actions">
          <button class="btn btn-primary" id="btn-static-run">RUN EFFECT</button>
          <button class="btn" id="btn-static-save">SAVE AS PRESET</button>
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

    // Static effect listeners
    this.attachStaticListeners();

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
      case 'static':
        return this.getStaticParams();
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

      const customColor = { r, g, b, cool, warm };

      // Register custom preset
      this.client.addPreset('custom', {
        type: 'solid',
        solid: customColor
      });

      return {
        colorPreset: 'custom',
        transitionDuration,
        brightness,
        customColor // Include custom color in params so it can be restored
      };
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

      const customColor = { r, g, b, cool, warm };

      this.client.addPreset('sequential-custom', {
        type: 'solid',
        solid: customColor
      });

      return {
        colorPreset: 'sequential-custom',
        delayBetweenPanels,
        fadeDuration,
        brightness,
        customColor // Include custom color in params so it can be restored
      };
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
      // Include gradient definition in params so it can be restored from preset
      const sortedStops = [...this.gradientStops].sort((a, b) => a.position - b.position);
      return {
        colorPreset: 'flow-custom',
        speed,
        scale,
        brightness,
        customGradient: {
          colorSpace: this.gradientColorSpace,
          stops: sortedStops
        }
      };
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

      const customColor = { r, g, b, cool, warm };

      this.client.addPreset('strobe-custom', {
        type: 'solid',
        solid: customColor
      });

      return {
        colorPreset: 'strobe-custom',
        frequency,
        brightness,
        customColor // Include custom color in params so it can be restored
      };
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

  /**
   * Attach Static effect listeners
   */
  private attachStaticListeners(): void {
    // Run button
    document.getElementById('btn-static-run')?.addEventListener('click', () => {
      this.runEffect('static');
    });

    // Save button
    document.getElementById('btn-static-save')?.addEventListener('click', () => {
      this.showEffectPresetDialog();
    });

    // Brightness slider
    const brightnessSlider = document.getElementById('static-brightness') as HTMLInputElement;
    brightnessSlider?.addEventListener('input', () => {
      const value = document.getElementById('static-brightness-value');
      if (value) value.textContent = `${brightnessSlider.value}%`;
    });

    // Panel header click to toggle
    const panelHeaders = document.querySelectorAll('.static-panel-header');
    panelHeaders.forEach(header => {
      header.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const panelIndex = parseInt(target.dataset.panel || '0');
        this.toggleStaticPanel(panelIndex);
      });
    });

    // Preset selectors
    const presetSelects = document.querySelectorAll('.static-preset-select');
    presetSelects.forEach(select => {
      select.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        const panelIndex = parseInt(target.dataset.panel || '0');
        const customGroup = document.getElementById(`static-${panelIndex}-custom-group`);

        if (target.value === 'custom') {
          if (customGroup) customGroup.style.display = 'block';
        } else {
          if (customGroup) customGroup.style.display = 'none';
          this.updateStaticPanelColor(panelIndex, target.value);
        }
      });
    });

    // RGB color pickers
    const rgbColorPickers = document.querySelectorAll('.static-rgb-color');
    rgbColorPickers.forEach(picker => {
      picker.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const panelIndex = parseInt(target.dataset.panel || '0');
        const hex = target.value;
        const r = parseInt(hex.substring(1, 3), 16);
        const g = parseInt(hex.substring(3, 5), 16);
        const b = parseInt(hex.substring(5, 7), 16);

        this.staticPanelColors[panelIndex] = {
          ...this.staticPanelColors[panelIndex],
          r, g, b
        };
        this.updateStaticPanelPreview(panelIndex);
      });
    });

    // Cool white sliders
    const coolSliders = document.querySelectorAll('.static-cool');
    coolSliders.forEach(slider => {
      slider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const panelIndex = parseInt(target.dataset.panel || '0');
        const coolValue = parseInt(target.value);

        this.staticPanelColors[panelIndex] = {
          ...this.staticPanelColors[panelIndex],
          cool: coolValue
        };

        const valueDisplay = document.getElementById(`static-${panelIndex}-cool-value`);
        if (valueDisplay) valueDisplay.textContent = target.value;
        this.updateStaticPanelPreview(panelIndex);
      });
    });

    // Warm white sliders
    const warmSliders = document.querySelectorAll('.static-warm');
    warmSliders.forEach(slider => {
      slider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const panelIndex = parseInt(target.dataset.panel || '0');
        const warmValue = parseInt(target.value);

        this.staticPanelColors[panelIndex] = {
          ...this.staticPanelColors[panelIndex],
          warm: warmValue
        };

        const valueDisplay = document.getElementById(`static-${panelIndex}-warm-value`);
        if (valueDisplay) valueDisplay.textContent = target.value;
        this.updateStaticPanelPreview(panelIndex);
      });
    });
  }

  /**
   * Toggle expand/collapse for a static panel picker
   */
  private toggleStaticPanel(panelIndex: number): void {
    const content = document.querySelector(`.static-panel-content[data-panel="${panelIndex}"]`) as HTMLElement;
    const toggle = document.querySelector(`.static-panel-header[data-panel="${panelIndex}"] .static-panel-toggle`) as HTMLElement;

    if (content && toggle) {
      const isExpanded = content.style.display !== 'none';
      content.style.display = isExpanded ? 'none' : 'block';
      toggle.textContent = isExpanded ? '▶' : '▼';
    }
  }

  /**
   * Update panel color from preset
   */
  private updateStaticPanelColor(panelIndex: number, presetName: string): void {
    // Default colors for presets
    const presets: Record<string, any> = {
      off: { r: 0, g: 0, b: 0, cool: 0, warm: 0 },
      white: { r: 0, g: 0, b: 0, cool: 255, warm: 0 },
      warm: { r: 0, g: 0, b: 0, cool: 0, warm: 255 }
    };

    const color = presets[presetName];
    if (color) {
      this.staticPanelColors[panelIndex] = color;
      this.updateStaticPanelPreview(panelIndex);
    }
  }

  /**
   * Update the color preview swatch for a panel
   */
  private updateStaticPanelPreview(panelIndex: number): void {
    const color = this.staticPanelColors[panelIndex];
    const preview = document.querySelector(`.static-panel-header[data-panel="${panelIndex}"] .static-panel-preview`) as HTMLElement;

    if (preview && color) {
      const displayColor = this.getDisplayColorForPreview(color);
      preview.style.background = displayColor;
    }
  }

  /**
   * Get static effect parameters
   */
  private getStaticParams(): any {
    const brightnessInput = document.getElementById('static-brightness') as HTMLInputElement;
    const brightness = parseInt(brightnessInput?.value || '100') / 100;

    return {
      panelColors: this.staticPanelColors,
      brightness
    };
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
    const idInput = document.getElementById('effect-preset-id-input') as HTMLInputElement;
    const nameInput = document.getElementById('effect-preset-name-input') as HTMLInputElement;

    if (!dialog || !idInput || !nameInput) {
      console.error('Dialog or inputs not found', { dialog, idInput, nameInput });
      return;
    }

    idInput.value = '';
    nameInput.value = '';
    dialog.classList.add('active');

    const confirmBtn = document.getElementById('btn-effect-preset-confirm');
    const cancelBtn = document.getElementById('btn-effect-preset-cancel');

    const confirm = () => {
      const id = idInput.value.trim();
      const name = nameInput.value.trim();

      if (!id || !name) {
        alert('Please provide both ID and name');
        return;
      }

      this.saveEffectPreset(id, name);
      dialog.classList.remove('active');
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
  private saveEffectPreset(id: string, name: string): void {
    if (!this.currentEffect) return;

    // Get current topology from effect-specific radio buttons
    const topologyRadio = document.querySelector(`input[name="${this.currentEffect}-topology"]:checked`) as HTMLInputElement;
    const topology = topologyRadio?.value || 'circular';

    // Get current effect parameters
    const params = this.getCurrentEffectParams();

    // Send to server
    this.client.savePreset(id, name, this.currentEffect, topology, params);

    console.log(`✅ Saving effect preset: ${name} (${id})`);
  }

  /**
   * Load and execute an effect preset
   */
  private loadEffectPreset(id: string): void {
    const preset = this.effectPresets.find(p => p.id === id);
    if (!preset) return;

    // Switch to the preset's effect tab
    this.switchToTab(preset.effect);

    // Set topology for this effect
    const topologyRadio = document.querySelector(`input[name="${preset.effect}-topology"][value="${preset.topology}"]`) as HTMLInputElement;
    if (topologyRadio) {
      topologyRadio.checked = true;
    }

    // Set parameters based on effect type
    this.setEffectParameters(preset.effect, preset.params);

    // Run the preset by ID
    this.client.runPresetById(id);
  }

  /**
   * Set UI parameters for an effect
   */
  private setEffectParameters(effect: EffectType, params: any): void {
    // Restore parameters for the given effect type
    console.log(`🔧 Loading parameters for ${effect}:`, params);

    // Special handling for flow effect with custom gradient
    if (effect === 'flow' && params.customGradient) {
      console.log('🎨 Restoring flow custom gradient:', params.customGradient);

      // Restore gradient state
      this.gradientColorSpace = params.customGradient.colorSpace || 'rgb';
      this.gradientStops = params.customGradient.stops || [];
      console.log('📊 Gradient stops restored:', this.gradientStops.length, 'stops');

      // Apply the gradient to the color manager
      this.applyCustomGradient('flow-custom');

      // Set the preset selector to 'custom'
      const presetSelect = document.getElementById('flow-preset') as HTMLSelectElement;
      if (presetSelect) {
        console.log('✅ Setting preset selector to custom');
        presetSelect.value = 'custom';
        // Trigger change event to show the custom gradient section
        presetSelect.dispatchEvent(new Event('change'));
      } else {
        console.warn('⚠️ Could not find flow-preset selector');
      }

      // Show the gradient editor (redundant with event but ensures it's visible)
      const customGradientSection = document.getElementById('flow-custom-group');
      if (customGradientSection) {
        console.log('✅ Showing custom gradient section');
        customGradientSection.style.display = 'block';
      } else {
        console.warn('⚠️ Could not find flow-custom-group section');
      }

      // Re-render gradient stops in the UI
      console.log('🔄 Re-rendering gradient stops UI');
      this.renderGradientStops('flow');

      // Set the color space selector
      const colorSpaceSelect = document.getElementById('flow-colorspace') as HTMLSelectElement;
      if (colorSpaceSelect) {
        colorSpaceSelect.value = this.gradientColorSpace;
        console.log('✅ Set color space to:', this.gradientColorSpace);
      } else {
        console.warn('⚠️ Could not find flow-colorspace selector');
      }
    }

    // Restore flow effect parameters (speed, scale, brightness)
    if (effect === 'flow') {
      if (params.speed !== undefined) {
        const speedInput = document.getElementById('flow-speed') as HTMLInputElement;
        const speedValue = document.getElementById('flow-speed-value');
        if (speedInput) {
          speedInput.value = params.speed.toString();
          if (speedValue) speedValue.textContent = params.speed.toFixed(1);
          console.log('✅ Set speed to:', params.speed);
        }
      }

      if (params.scale !== undefined) {
        const scaleInput = document.getElementById('flow-scale') as HTMLInputElement;
        const scaleValue = document.getElementById('flow-scale-value');
        if (scaleInput) {
          scaleInput.value = params.scale.toString();
          if (scaleValue) scaleValue.textContent = params.scale.toFixed(2);
          console.log('✅ Set scale to:', params.scale);
        }
      }

      if (params.brightness !== undefined) {
        const brightnessInput = document.getElementById('flow-brightness') as HTMLInputElement;
        const brightnessValue = document.getElementById('flow-brightness-value');
        if (brightnessInput) {
          const brightnessPercent = Math.round(params.brightness * 100);
          brightnessInput.value = brightnessPercent.toString();
          if (brightnessValue) brightnessValue.textContent = `${brightnessPercent}%`;
          console.log('✅ Set brightness to:', brightnessPercent + '%');
        }
      }
    }

    // Special handling for solid effect with custom color
    if (effect === 'solid' && params.customColor) {
      // Apply the custom color to the color manager
      this.client.addPreset('custom', {
        type: 'solid',
        solid: params.customColor
      });

      // Set the preset selector to 'custom'
      const presetSelect = document.getElementById('solid-preset') as HTMLSelectElement;
      if (presetSelect) {
        presetSelect.value = 'custom';
      }

      // Show the custom color group
      const customGroup = document.getElementById('solid-custom-group');
      if (customGroup) {
        customGroup.style.display = 'block';
      }

      // Restore UI values
      const rgbInput = document.getElementById('solid-rgb-color') as HTMLInputElement;
      const coolInput = document.getElementById('solid-cool') as HTMLInputElement;
      const warmInput = document.getElementById('solid-warm') as HTMLInputElement;

      if (rgbInput) {
        rgbInput.value = this.rgbToHex(params.customColor.r, params.customColor.g, params.customColor.b);
      }
      if (coolInput) {
        coolInput.value = params.customColor.cool.toString();
        const coolValue = document.getElementById('solid-cool-value');
        if (coolValue) coolValue.textContent = params.customColor.cool.toString();
      }
      if (warmInput) {
        warmInput.value = params.customColor.warm.toString();
        const warmValue = document.getElementById('solid-warm-value');
        if (warmValue) warmValue.textContent = params.customColor.warm.toString();
      }
    }

    // Special handling for sequential effect with custom color
    if (effect === 'sequential' && params.customColor) {
      // Apply the custom color to the color manager
      this.client.addPreset('sequential-custom', {
        type: 'solid',
        solid: params.customColor
      });

      // Set the preset selector to 'custom'
      const presetSelect = document.getElementById('sequential-preset') as HTMLSelectElement;
      if (presetSelect) {
        presetSelect.value = 'custom';
      }

      // Show the custom color group
      const customGroup = document.getElementById('sequential-custom-group');
      if (customGroup) {
        customGroup.style.display = 'block';
      }

      // Restore UI values
      const rgbInput = document.getElementById('sequential-rgb-color') as HTMLInputElement;
      const coolInput = document.getElementById('sequential-cool') as HTMLInputElement;
      const warmInput = document.getElementById('sequential-warm') as HTMLInputElement;

      if (rgbInput) {
        rgbInput.value = this.rgbToHex(params.customColor.r, params.customColor.g, params.customColor.b);
      }
      if (coolInput) {
        coolInput.value = params.customColor.cool.toString();
        const coolValue = document.getElementById('sequential-cool-value');
        if (coolValue) coolValue.textContent = params.customColor.cool.toString();
      }
      if (warmInput) {
        warmInput.value = params.customColor.warm.toString();
        const warmValue = document.getElementById('sequential-warm-value');
        if (warmValue) warmValue.textContent = params.customColor.warm.toString();
      }
    }

    // Special handling for strobe effect with custom color
    if (effect === 'strobe' && params.customColor) {
      // Apply the custom color to the color manager
      this.client.addPreset('strobe-custom', {
        type: 'solid',
        solid: params.customColor
      });

      // Set the preset selector to 'custom'
      const presetSelect = document.getElementById('strobe-preset') as HTMLSelectElement;
      if (presetSelect) {
        presetSelect.value = 'custom';
      }

      // Show the custom color group
      const customGroup = document.getElementById('strobe-custom-group');
      if (customGroup) {
        customGroup.style.display = 'block';
      }

      // Restore UI values
      const rgbInput = document.getElementById('strobe-rgb-color') as HTMLInputElement;
      const coolInput = document.getElementById('strobe-cool') as HTMLInputElement;
      const warmInput = document.getElementById('strobe-warm') as HTMLInputElement;

      if (rgbInput) {
        rgbInput.value = this.rgbToHex(params.customColor.r, params.customColor.g, params.customColor.b);
      }
      if (coolInput) {
        coolInput.value = params.customColor.cool.toString();
        const coolValue = document.getElementById('strobe-cool-value');
        if (coolValue) coolValue.textContent = params.customColor.cool.toString();
      }
      if (warmInput) {
        warmInput.value = params.customColor.warm.toString();
        const warmValue = document.getElementById('strobe-warm-value');
        if (warmValue) warmValue.textContent = params.customColor.warm.toString();
      }
    }

    // TODO: Implement parameter restoration for other effect types if needed
    // For now, the UI controls will use default values when switching tabs
  }

  /**
   * Delete an effect preset
   */
  private deleteEffectPreset(id: string): void {
    const preset = this.effectPresets.find(p => p.id === id);
    if (!preset) return;

    // Check if protected
    if (preset.isProtected) {
      alert(`Cannot delete protected preset: ${preset.name}`);
      return;
    }

    if (!confirm(`Delete preset "${preset.name}"?`)) return;

    this.client.deletePreset(id);

    console.log(`🗑️ Deleting effect preset: ${preset.name} (${id})`);
  }

  /**
   * Render the preset bank with all saved presets
   */
  private renderPresetBank(): void {
    const container = document.getElementById('preset-buttons-container');
    if (!container) return;

    container.innerHTML = '';

    if (this.effectPresets.length === 0) {
      container.innerHTML = '<p style="color: #666; font-size: 11px; padding: 8px 0;">No saved presets</p>';
      return;
    }

    this.effectPresets.forEach((preset) => {
      const button = document.createElement('button');
      button.className = 'preset-btn';
      button.textContent = preset.name;
      button.title = `${preset.effect.toUpperCase()} - ${preset.topology}${preset.isProtected ? ' (PROTECTED)' : ''}`;

      // Add visual indicator for protected presets
      if (preset.isProtected) {
        button.style.borderColor = '#888';
        button.style.opacity = '0.8';
      }

      button.addEventListener('click', () => {
        this.loadEffectPreset(preset.id);
        button.classList.add('active');
        setTimeout(() => button.classList.remove('active'), 500);
      });

      // Right-click to delete (only if not protected)
      if (!preset.isProtected) {
        button.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.deleteEffectPreset(preset.id);
        });
      }

      container.appendChild(button);
    });
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
