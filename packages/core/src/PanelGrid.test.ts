import { describe, it, expect, beforeEach } from 'vitest';
import { PanelGrid } from './PanelGrid.js';

describe('PanelGrid', () => {
  let grid: PanelGrid;

  beforeEach(() => {
    grid = new PanelGrid({
      columns: 2,
      rowsPerColumn: 7,
      initialTopology: 'circular'
    });
  });

  describe('initialization', () => {
    it('should create correct number of panels', () => {
      expect(grid.getPanelCount()).toBe(14);
    });

    it('should initialize panels with correct column and row', () => {
      // Panel 0 should be column 0, row 0
      const panel0 = grid.getPanel(0);
      expect(panel0.column).toBe(0);
      expect(panel0.row).toBe(0);

      // Panel 6 should be column 0, row 6
      const panel6 = grid.getPanel(6);
      expect(panel6.column).toBe(0);
      expect(panel6.row).toBe(6);

      // Panel 7 should be column 1, row 0
      const panel7 = grid.getPanel(7);
      expect(panel7.column).toBe(1);
      expect(panel7.row).toBe(0);

      // Panel 13 should be column 1, row 6
      const panel13 = grid.getPanel(13);
      expect(panel13.column).toBe(1);
      expect(panel13.row).toBe(6);
    });

    it('should initialize all panels with black state', () => {
      const states = grid.getAllStates();
      expect(states).toHaveLength(14);

      states.forEach(state => {
        expect(state.color.r).toBe(0);
        expect(state.color.g).toBe(0);
        expect(state.color.b).toBe(0);
        expect(state.color.cool).toBe(0);
        expect(state.color.warm).toBe(0);
        expect(state.brightness).toBe(0);
      });
    });
  });

  describe('panel access', () => {
    it('should get panel by index', () => {
      const panel = grid.getPanel(5);
      expect(panel.id).toBe(5);
    });

    it('should get panel by position', () => {
      const panel = grid.getPanelByPosition(1, 3);
      expect(panel.id).toBe(10); // column 1 * 7 + row 3 = 10
    });

    it('should throw on invalid panel index', () => {
      expect(() => grid.getPanel(-1)).toThrow();
      expect(() => grid.getPanel(14)).toThrow();
    });

    it('should return all panels', () => {
      const panels = grid.getAllPanels();
      expect(panels).toHaveLength(14);
      expect(panels[0].id).toBe(0);
      expect(panels[13].id).toBe(13);
    });
  });

  describe('topology modes', () => {
    it('should have circular topology by default', () => {
      expect(grid.getTopologyMode()).toBe('circular');
    });

    it('should change topology mode', () => {
      grid.setTopologyMode('linear');
      expect(grid.getTopologyMode()).toBe('linear');

      grid.setTopologyMode('singular');
      expect(grid.getTopologyMode()).toBe('singular');
    });

    it('should get circular sequence correctly', () => {
      grid.setTopologyMode('circular');
      const sequence = grid.getCircularSequence();

      // Up column 0 (0-6), down column 1 (13-7)
      expect(sequence).toEqual([0, 1, 2, 3, 4, 5, 6, 13, 12, 11, 10, 9, 8, 7]);
    });

    it('should get linear sequences correctly', () => {
      grid.setTopologyMode('linear');
      const sequences = grid.getLinearSequences();

      expect(sequences).toHaveLength(2);
      expect(sequences[0]).toEqual([0, 1, 2, 3, 4, 5, 6]);
      expect(sequences[1]).toEqual([7, 8, 9, 10, 11, 12, 13]);
    });

    it('should get topology with correct mode and sequences', () => {
      grid.setTopologyMode('circular');
      const topology = grid.getTopology();

      expect(topology.mode).toBe('circular');
      expect(topology.sequences).toHaveLength(1);
      expect(topology.sequences[0]).toEqual([0, 1, 2, 3, 4, 5, 6, 13, 12, 11, 10, 9, 8, 7]);
    });

    it('should get topology for linear mode', () => {
      grid.setTopologyMode('linear');
      const topology = grid.getTopology();

      expect(topology.mode).toBe('linear');
      expect(topology.sequences).toHaveLength(2);
    });

    it('should get topology for singular mode', () => {
      grid.setTopologyMode('singular');
      const topology = grid.getTopology();

      expect(topology.mode).toBe('singular');
      expect(topology.sequences).toHaveLength(1);
      expect(topology.sequences[0]).toHaveLength(14);
    });
  });

  describe('panel state management', () => {
    it('should set and get panel state', () => {
      const state = {
        color: { r: 255, g: 100, b: 50, cool: 0, warm: 0 },
        brightness: 0.8,
        timestamp: Date.now()
      };

      grid.setPanelState(5, state);
      const retrieved = grid.getPanelState(5);

      expect(retrieved.color.r).toBe(255);
      expect(retrieved.color.g).toBe(100);
      expect(retrieved.brightness).toBe(0.8);
    });

    it('should throw on invalid panel index when setting state', () => {
      const state = {
        color: { r: 0, g: 0, b: 0, cool: 0, warm: 0 },
        brightness: 1,
        timestamp: Date.now()
      };

      expect(() => grid.setPanelState(-1, state)).toThrow();
      expect(() => grid.setPanelState(14, state)).toThrow();
    });

    it('should set all panel states at once', () => {
      const states = Array(14).fill(null).map(() => ({
        color: { r: 100, g: 150, b: 200, cool: 50, warm: 25 },
        brightness: 0.5,
        timestamp: Date.now()
      }));

      grid.setAllStates(states);
      const retrieved = grid.getAllStates();

      retrieved.forEach(state => {
        expect(state.color.r).toBe(100);
        expect(state.brightness).toBe(0.5);
      });
    });

    it('should throw when setting wrong number of states', () => {
      const states = Array(10).fill(null).map(() => ({
        color: { r: 0, g: 0, b: 0, cool: 0, warm: 0 },
        brightness: 1,
        timestamp: Date.now()
      }));

      expect(() => grid.setAllStates(states)).toThrow();
    });

    it('should set all panels to same color', () => {
      const color = { r: 255, g: 0, b: 255, cool: 100, warm: 200 };
      grid.setAllPanels(color, 0.75);

      const states = grid.getAllStates();
      states.forEach(state => {
        expect(state.color.r).toBe(255);
        expect(state.color.b).toBe(255);
        expect(state.color.cool).toBe(100);
        expect(state.color.warm).toBe(200);
        expect(state.brightness).toBe(0.75);
      });
    });
  });
});
