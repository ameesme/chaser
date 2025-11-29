import type { EngineConfig, EngineOutput, EngineState, EffectParams, Effect } from '@chaser/types';
import { PanelGrid } from './PanelGrid.js';
import { ColorManager } from './ColorManager.js';
import { EffectRunner } from './EffectRunner.js';

/**
 * Main animation engine - orchestrates the effect rendering loop
 */
export class Engine {
  private panelGrid: PanelGrid;
  private colorManager: ColorManager;
  private effectRunner: EffectRunner;
  private outputs: EngineOutput[] = [];

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  private lastTimestamp: number = 0;
  private elapsedTime: number = 0;
  private frameCount: number = 0;
  private fpsCalculationTime: number = 0;
  private currentFPS: number = 0;

  private targetFPS: number;
  private frameInterval: number;

  constructor(config: EngineConfig) {
    this.targetFPS = config.targetFPS || 60;
    this.frameInterval = 1000 / this.targetFPS;

    this.panelGrid = new PanelGrid({
      columns: config.columns,
      rowsPerColumn: config.rowsPerColumn,
      initialTopology: config.initialTopology
    });

    this.colorManager = new ColorManager();
    this.effectRunner = new EffectRunner();
  }

  /**
   * Start the animation loop
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.isPaused = false;
    this.lastTimestamp = Date.now();
    this.fpsCalculationTime = this.lastTimestamp;
    this.frameCount = 0;

    // Use setInterval for cross-platform compatibility (browser + Node.js)
    this.intervalId = setInterval(() => {
      this.tick();
    }, this.frameInterval);
  }

  /**
   * Stop the animation loop
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.isPaused = false;

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Clear any active effect
    this.effectRunner.clearEffect();
  }

  /**
   * Pause the animation loop
   */
  pause(): void {
    if (!this.isRunning || this.isPaused) {
      return;
    }

    this.isPaused = true;
  }

  /**
   * Resume the animation loop
   */
  resume(): void {
    if (!this.isRunning || !this.isPaused) {
      return;
    }

    this.isPaused = false;
    this.lastTimestamp = Date.now();
  }

  /**
   * Main animation tick
   */
  private tick(): void {
    if (!this.isRunning || this.isPaused) {
      return;
    }

    const now = Date.now();
    const deltaTime = now - this.lastTimestamp;
    this.lastTimestamp = now;

    // Update elapsed time
    this.elapsedTime += deltaTime;

    // Calculate FPS
    this.frameCount++;
    if (now - this.fpsCalculationTime >= 1000) {
      this.currentFPS = Math.round((this.frameCount * 1000) / (now - this.fpsCalculationTime));
      this.frameCount = 0;
      this.fpsCalculationTime = now;
    }

    // Render frame
    this.render(deltaTime);
  }

  /**
   * Render a single frame
   */
  private render(deltaTime: number): void {
    // Update effect and get panel states
    const states = this.effectRunner.update({
      deltaTime,
      elapsedTime: this.elapsedTime,
      panelGrid: this.panelGrid,
      colorManager: this.colorManager,
      params: {}
    });

    // Apply states to panel grid (if effect returned states)
    if (states && states.length === this.panelGrid.getPanelCount()) {
      this.panelGrid.setAllStates(states);
    }

    // Distribute to all outputs
    const currentStates = this.panelGrid.getAllStates();
    const topology = this.panelGrid.getTopology();

    for (const output of this.outputs) {
      output.render(currentStates, topology);
    }
  }

  /**
   * Run an effect with optional parameters
   */
  runEffect(effect: Effect, params?: EffectParams): void {
    // Initialize effect with current context
    effect.initialize({
      deltaTime: 0,
      elapsedTime: this.elapsedTime,
      panelGrid: this.panelGrid,
      colorManager: this.colorManager,
      params: params || {}
    });

    this.effectRunner.setEffect(effect, params);
  }

  /**
   * Stop the current effect
   */
  stopCurrentEffect(): void {
    this.effectRunner.clearEffect();
  }

  /**
   * Add an output renderer
   */
  addOutput(output: EngineOutput): void {
    this.outputs.push(output);
  }

  /**
   * Remove an output renderer
   */
  removeOutput(output: EngineOutput): void {
    const index = this.outputs.indexOf(output);
    if (index !== -1) {
      this.outputs.splice(index, 1);
    }
  }

  /**
   * Get panel grid
   */
  getPanelGrid(): PanelGrid {
    return this.panelGrid;
  }

  /**
   * Get color manager
   */
  getColorManager(): ColorManager {
    return this.colorManager;
  }

  /**
   * Get engine state
   */
  getState(): EngineState {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      currentEffect: this.effectRunner.getCurrentEffectName(),
      elapsedTime: this.elapsedTime,
      fps: this.currentFPS
    };
  }

  /**
   * Get target FPS
   */
  getTargetFPS(): number {
    return this.targetFPS;
  }

  /**
   * Get current FPS
   */
  getCurrentFPS(): number {
    return this.currentFPS;
  }
}
