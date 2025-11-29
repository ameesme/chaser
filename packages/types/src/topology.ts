/**
 * Topology mode determines how panels are sequenced in animations
 */
export type TopologyMode = 'circular' | 'linear' | 'singular';

/**
 * Panel topology information
 */
export interface PanelTopology {
  mode: TopologyMode;
  sequences: number[][]; // Array of panel index sequences
}
