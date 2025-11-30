# CHASER.DMX

A real-time DMX LED panel effect engine with WebSocket-based architecture and retro-styled web simulator.

## Overview

Chaser is a modular DMX lighting control system designed for managing RGBCCT LED panels. It features a powerful effect engine, WebSocket-based client-server architecture, and a retro black-and-white web interface for creating and previewing lighting effects in real-time.

## Architecture

```
┌─────────────────┐       WebSocket        ┌──────────────────┐
│   Simulator     │ ◄──────────────────► │     Server       │
│   (Web UI)      │                        │  (Effect Engine) │
└─────────────────┘                        └──────────────────┘
                                                     │
                                           ┌─────────┴──────────┐
                                           │                    │
                                      ┌────▼────┐         ┌────▼────┐
                                      │  Core   │         │  Types  │
                                      │ Effects │         │  Shared │
                                      └─────────┘         └─────────┘
```

### Packages

- **@chaser/core** - Effect engine, color management, and topology system
- **@chaser/server** - WebSocket server and effect orchestration
- **@chaser/simulator** - Web-based UI and canvas renderer
- **@chaser/types** - Shared TypeScript types

## Features

### Effects

- **Solid Color** - Static color with fade transitions
- **Sequential Fade** - Panel-by-panel color transitions with customizable delay
- **Flow** - Animated gradients with direction control
- **Strobe** - Configurable frequency strobing
- **Blackout** - Instant or faded blackout

### Color System

- Full RGBCCT color support (RGB + Cool/Warm white)
- Built-in color presets (white, warm white, rainbow, ocean, sunset, fire)
- Custom gradient editor with HSV/RGB color space interpolation
- Real-time gradient preview

### Topology Modes

- **Circular** - Panels arranged in a circle
- **Linear** - Panels in a straight line
- **Singular** - All panels as a single unit

### UI Features

- Retro black-and-white interface with IBM Plex Mono font
- Tab-based effect selection
- Real-time parameter adjustment
- Preset bank for one-tap effect triggering
- Live canvas preview with 60 FPS rendering
- Save and load custom effect configurations

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 9.0.0

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Development

Run the simulator and server in parallel:

```bash
pnpm dev
```

Or run them separately:

```bash
# Terminal 1: Start the server
pnpm server

# Terminal 2: Start the simulator UI
pnpm sim
```

The simulator will be available at `http://localhost:3000`

### Configuration

Configuration is loaded from `config.json` in the root directory. Example:

```json
{
  "engine": {
    "targetFPS": 60,
    "columns": 2,
    "rowsPerColumn": 7,
    "initialTopology": "circular"
  },
  "server": {
    "port": 3001
  },
  "simulator": {
    "port": 3000,
    "panelScale": 1
  },
  "presets": {
    "white": {
      "type": "solid",
      "solid": { "r": 255, "g": 255, "b": 255, "cool": 255, "warm": 0 }
    }
  }
}
```

## Usage

### Creating Effects

1. Select an effect tab (SOLID, SEQUENTIAL, FLOW, STROBE, BLACKOUT)
2. Adjust parameters using sliders and controls
3. Choose a topology mode
4. Click "RUN EFFECT" to preview
5. Click "SAVE AS PRESET" to save the configuration

### Using Presets

Saved presets appear as square pads in the preset bank at the bottom of the interface. Click any preset to instantly load and run that effect configuration.

### Custom Gradients

For Flow effects:

1. Select "Custom Gradient" from the preset dropdown
2. Choose color space (RGB or HSV)
3. Add gradient stops with the "ADD STOP" button
4. Adjust position and color for each stop
5. Control speed and scale for animation

## API

### WebSocket Protocol

The server exposes a WebSocket API on port 3001:

#### Client → Server

```typescript
// Run an effect
{
  type: 'run_effect',
  payload: {
    effectName: 'solid',
    params: { colorPreset: 'white', brightness: 1.0 }
  }
}

// Set topology
{
  type: 'set_topology',
  payload: { topology: 'circular' }
}

// Add color preset
{
  type: 'add_preset',
  payload: {
    name: 'custom',
    preset: {
      type: 'solid',
      solid: { r: 255, g: 0, b: 0, cool: 0, warm: 0 }
    }
  }
}
```

#### Server → Client

```typescript
// State update (60 FPS)
{
  type: 'state_update',
  payload: {
    panels: [...],  // Array of panel states
    currentEffect: 'flow'
  }
}
```

## Testing

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @chaser/core test
```

## Project Structure

```
chaser/
├── packages/
│   ├── core/          # Effect engine and color system
│   ├── server/        # WebSocket server
│   ├── simulator/     # Web UI and renderer
│   └── types/         # Shared TypeScript types
├── config.json        # Configuration
├── package.json       # Root package config
└── turbo.json         # Turborepo config
```

## License

MIT
