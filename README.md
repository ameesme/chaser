# Chaser DMX - Home Assistant Add-on

A real-time DMX LED panel effect engine with MQTT integration for Home Assistant.

![Supports aarch64 Architecture][aarch64-shield] ![Supports amd64 Architecture][amd64-shield]

## About

Chaser DMX is a powerful effect engine designed for controlling RGBCCT LED panels via DMX/Art-Net. This add-on integrates seamlessly with Home Assistant through MQTT, exposing individual panel controls and preset effects.

## Features

- **MQTT Auto-Configuration**: Automatically connects to Home Assistant's MQTT broker
- **Web Interface**: Retro-styled simulator UI accessible via Home Assistant Ingress
- **Art-Net DMX Output**: Control physical LED panels via DMX over Ethernet
- **14 RGBCCT Light Entities**: Individual control of each panel
- **Effect Presets**: Pre-configured lighting effects accessible as Home Assistant buttons
- **Real-time Effects**: Flow, strobe, sequential fade, and more at 60 FPS

## Installation

1. Add this repository to your Home Assistant add-on store
2. Install the "Chaser DMX" add-on
3. Start the add-on
4. Access the web interface via Home Assistant's sidebar

## Configuration

### Engine Settings

- **engine_columns**: Number of panel columns (default: 2)
- **engine_rows_per_column**: Number of panels per column (default: 7)
- **engine_target_fps**: Effect update rate (default: 60)
- **engine_initial_topology**: Panel arrangement - `circular` or `linear` (default: circular)

### Art-Net/DMX Settings

- **artnet_enabled**: Enable Art-Net DMX output (default: false)
- **artnet_host**: IP address of Art-Net node (default: 192.168.1.100)
- **artnet_port**: Art-Net port (default: 6454)
- **artnet_universe**: DMX universe 0-255 (default: 0)
- **artnet_subnet**: Art-Net subnet 0-15 (default: 0)
- **artnet_net**: Art-Net net 0-127 (default: 0)
- **artnet_start_channel**: First DMX channel (default: 1)
- **artnet_channels_per_panel**: Channels per panel (default: 5 for RGBCCT)
- **artnet_refresh_rate**: DMX update rate in Hz (default: 44)

### Example Configuration

```yaml
artnet_enabled: true
artnet_host: "192.168.1.100"
engine_columns: 2
engine_rows_per_column: 7
engine_target_fps: 60
engine_initial_topology: "circular"
```

## Usage

### Home Assistant Integration

After starting the add-on, you'll find:

**Lights** (in Home Assistant):
- `light.panel_0` through `light.panel_13` - Individual RGBWW panel controls
- Each light supports brightness and color control

**Buttons** (in Home Assistant):
- Preset effect buttons for one-tap activation

### Web Interface

Access the simulator UI through Home Assistant's sidebar:
- Visual preview of panel states
- Create and manage effect presets
- Real-time effect parameter adjustment

### Creating Effects

1. Open the web interface
2. Select an effect type (SOLID, FLOW, SEQUENTIAL, STROBE, BLACKOUT)
3. Adjust parameters
4. Click "SAVE AS PRESET" to make it available in Home Assistant

## DMX Channel Mapping

Each panel uses 5 consecutive DMX channels:
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

## Support

For issues and feature requests, please visit:
https://github.com/yourusername/chaser

## License

MIT

[aarch64-shield]: https://img.shields.io/badge/aarch64-yes-green.svg
[amd64-shield]: https://img.shields.io/badge/amd64-yes-green.svg
