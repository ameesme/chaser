import type {
  Panel,
  PanelState,
  PanelGridConfig,
  TopologyMode,
  PanelTopology,
  RGBCCTColor
} from '@chaser/types';

/**
 * Manages the panel grid layout and topology
 */
export class PanelGrid {
  private panels: Panel[];
  private states: Map<number, PanelState>;
  private columns: number;
  private rowsPerColumn: number;
  private topologyMode: TopologyMode;

  constructor(config: PanelGridConfig) {
    this.columns = config.columns;
    this.rowsPerColumn = config.rowsPerColumn;
    this.topologyMode = config.initialTopology || 'circular';
    this.panels = [];
    this.states = new Map();

    this.initializePanels();
  }

  /**
   * Initialize panel array based on grid configuration
   */
  private initializePanels(): void {
    const totalPanels = this.columns * this.rowsPerColumn;

    for (let i = 0; i < totalPanels; i++) {
      const column = Math.floor(i / this.rowsPerColumn);
      const row = i % this.rowsPerColumn;

      this.panels.push({
        id: i,
        column,
        row
      });

      // Initialize with black state
      this.states.set(i, {
        color: { r: 0, g: 0, b: 0, cool: 0, warm: 0 },
        brightness: 0,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get a specific panel by index
   */
  getPanel(index: number): Panel {
    if (index < 0 || index >= this.panels.length) {
      throw new Error(`Panel index ${index} out of bounds`);
    }
    return this.panels[index];
  }

  /**
   * Get panel by column and row position
   */
  getPanelByPosition(column: number, row: number): Panel {
    const index = column * this.rowsPerColumn + row;
    return this.getPanel(index);
  }

  /**
   * Get all panels
   */
  getAllPanels(): Panel[] {
    return [...this.panels];
  }

  /**
   * Set topology mode
   */
  setTopologyMode(mode: TopologyMode): void {
    this.topologyMode = mode;
  }

  /**
   * Get current topology mode
   */
  getTopologyMode(): TopologyMode {
    return this.topologyMode;
  }

  /**
   * Get topology information
   */
  getTopology(): PanelTopology {
    let sequences: number[][];

    switch (this.topologyMode) {
      case 'circular':
        sequences = [this.getCircularSequence()];
        break;
      case 'linear':
        sequences = this.getLinearSequences();
        break;
      case 'singular':
        // All panels as one sequence
        sequences = [this.panels.map(p => p.id)];
        break;
    }

    return {
      mode: this.topologyMode,
      sequences
    };
  }

  /**
   * Get circular sequence: up column 0, down column 1
   * [0→1→2→3→4→5→6→13→12→11→10→9→8→7]
   */
  getCircularSequence(): number[] {
    const column0 = [];
    const column1 = [];

    // Column 0: panels 0-6 (ascending)
    for (let i = 0; i < this.rowsPerColumn; i++) {
      column0.push(i);
    }

    // Column 1: panels 7-13 (descending)
    for (let i = this.rowsPerColumn * 2 - 1; i >= this.rowsPerColumn; i--) {
      column1.push(i);
    }

    return [...column0, ...column1];
  }

  /**
   * Get linear sequences: two independent columns
   * [[0→1→2→3→4→5→6], [7→8→9→10→11→12→13]]
   */
  getLinearSequences(): number[][] {
    const sequences: number[][] = [];

    for (let col = 0; col < this.columns; col++) {
      const sequence: number[] = [];
      const startIndex = col * this.rowsPerColumn;

      for (let row = 0; row < this.rowsPerColumn; row++) {
        sequence.push(startIndex + row);
      }

      sequences.push(sequence);
    }

    return sequences;
  }

  /**
   * Set state for a specific panel
   */
  setPanelState(index: number, state: PanelState): void {
    if (index < 0 || index >= this.panels.length) {
      throw new Error(`Panel index ${index} out of bounds`);
    }
    this.states.set(index, { ...state });
  }

  /**
   * Get state for a specific panel
   */
  getPanelState(index: number): PanelState {
    const state = this.states.get(index);
    if (!state) {
      throw new Error(`No state found for panel ${index}`);
    }
    return { ...state };
  }

  /**
   * Get all panel states in order
   */
  getAllStates(): PanelState[] {
    return this.panels.map(panel => this.getPanelState(panel.id));
  }

  /**
   * Set all panel states at once
   */
  setAllStates(states: PanelState[]): void {
    if (states.length !== this.panels.length) {
      throw new Error(`Expected ${this.panels.length} states, got ${states.length}`);
    }
    states.forEach((state, index) => {
      this.setPanelState(index, state);
    });
  }

  /**
   * Set all panels to a single color and brightness
   */
  setAllPanels(color: RGBCCTColor, brightness: number): void {
    const state: PanelState = {
      color,
      brightness,
      timestamp: Date.now()
    };
    this.panels.forEach(panel => {
      this.setPanelState(panel.id, state);
    });
  }

  /**
   * Get total number of panels
   */
  getPanelCount(): number {
    return this.panels.length;
  }
}
