# CHASER.DMX

A real-time DMX LED panel effect engine with WebSocket-based architecture and retro-styled web simulator.

![Chaser Interface](./docs/assets/chaser-demo.gif)

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
  "artnet": {
    "enabled": true,
    "host": "192.168.1.100",
    "port": 6454,
    "universe": 0,
    "subnet": 0,
    "net": 0,
    "startChannel": 1,
    "channelsPerPanel": 5,
    "refreshRate": 44
  },
  "presets": {
    "white": {
      "type": "solid",
      "solid": { "r": 255, "g": 255, "b": 255, "cool": 255, "warm": 0 }
    }
  }
}
```

### Art-Net DMX Output

Chaser supports real-time DMX output via the Art-Net protocol (DMX over Ethernet). This allows you to control physical RGBCCT LED panels.

#### Configuration Options

- **enabled** - Enable/disable Art-Net output (default: `false`)
- **host** - IP address of Art-Net node or `255.255.255.255` for broadcast
- **port** - Art-Net port (default: `6454`)
- **universe** - Art-Net universe 0-15 (default: `0`)
- **subnet** - Art-Net subnet 0-15 (default: `0`)
- **net** - Art-Net net 0-127 (default: `0`)
- **startChannel** - First DMX channel for panel data (1-512, default: `1`)
- **channelsPerPanel** - DMX channels per panel (default: `5` for RGBCCT)
- **refreshRate** - Packet refresh rate in Hz (default: `44`)

#### DMX Channel Mapping

Each panel uses 5 consecutive DMX channels in RGBCCT order:

- Channel 1: Red (0-255)
- Channel 2: Green (0-255)
- Channel 3: Blue (0-255)
- Channel 4: Cool White (0-255)
- Channel 5: Warm White (0-255)

For 14 panels starting at channel 1:
- Panel 0: Channels 1-5
- Panel 1: Channels 6-10
- Panel 2: Channels 11-15
- ... and so on

#### Setting Up Art-Net

1. Connect your computer to the same network as your Art-Net node
2. Update `config.json` with your Art-Net node's IP address
3. Set `enabled: true` in the Art-Net configuration
4. Start the server: `pnpm server`
5. Effects will now output to both the web simulator and DMX hardware

## Usage

### Creating Effects

1. Select an effect tab (SOLID, SEQUENTIAL, FLOW, STROBE, BLACKOUT)
2. Adjust parameters using sliders and controls
3. Choose a topology mode
4. Click "RUN EFFECT" to preview
5. Click "SAVE AS PRESET" to save the configuration

### Using Presets

Saved presets appear as square pads in the preset bank at the bottom of the interface. Click any preset to instantly load and run that effect configuration.

#### Server-Side Preset Storage

Effect presets are stored server-side in `presets.json` (project root), making them available across devices and sessions:

**Creating Presets:**
1. Configure your desired effect parameters
2. Click "SAVE AS PRESET"
3. Enter a unique ID (e.g., `my-cool-effect`) and display name
4. IDs are automatically sanitized: lowercase, spaces→hyphens, alphanumeric only

**Managing Presets:**
- **Load**: Click any preset pad to execute it
- **Delete**: Right-click on user presets (protected defaults cannot be deleted)
- **Protected Presets**: 7 built-in presets marked with "(PROTECTED)" are permanent

**Backup/Restore:**
- Presets file: `/presets.json` in project root
- Simply copy this file to backup or transfer presets

**Running Presets via WebSocket:**
```typescript
// Run preset by ID
{
  type: 'runEffect',
  payload: { presetId: 'flow-slow-rainbow' }
}

// List all presets
{
  type: 'listPresets'
}

// Save new preset
{
  type: 'savePreset',
  payload: {
    id: 'my-preset',
    name: 'My Custom Effect',
    effect: 'flow',
    topology: 'linear',
    params: { colorPreset: 'rainbow', speed: 0.5, scale: 0.3, brightness: 1 }
  }
}

// Delete preset
{
  type: 'deletePreset',
  payload: { id: 'my-preset' }
}
```

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
