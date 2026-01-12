# Installation Instructions

## Repository Structure

This repository **is** the Home Assistant add-on. The entire repo serves as the add-on.

```
chaser/                        # Repository root = Add-on root
├── config.yaml                # Add-on configuration
├── build.yaml                 # Multi-architecture support
├── Dockerfile                 # Build instructions
├── repository.yaml            # Repository metadata
├── README.md                  # Add-on documentation
├── rootfs/                    # S6 overlay files
│   └── etc/
│       ├── cont-init.d/
│       │   └── 00-config.sh   # Config generator
│       └── s6-overlay/s6-rc.d/
│           ├── chaser-server/
│           └── chaser-simulator/
└── packages/                  # Source code
    ├── core/
    ├── server/
    ├── simulator/
    ├── homeassistant/
    └── types/
```

## Add to Home Assistant

1. **Add this repository to Home Assistant:**
   - Go to: **Settings** → **Add-ons** → **Add-on Store** → **⋮** (top right) → **Repositories**
   - Add: `https://github.com/ameesme/chaser`
   - Click **Add**

2. **Install the add-on:**
   - Refresh the add-on store
   - Find **"Chaser DMX"** in the list
   - Click on it and click **Install**

3. **Configure (optional):**
   - Go to the **Configuration** tab
   - Set Art-Net options if using physical DMX hardware
   - Adjust engine settings if needed

4. **Start the add-on:**
   - Click **Start**
   - Check the **Log** tab for any errors

## Expected Behavior

After starting the add-on:

### MQTT Integration
- **14 light entities** will appear: `light.panel_0` through `light.panel_13`
- **Preset buttons** will be created dynamically for saved effects
- Control lights from Home Assistant dashboard

### Web Interface
- A **"Chaser DMX"** entry appears in the Home Assistant sidebar
- Click it to access the retro-styled simulator UI
- Create and manage effects in real-time

### Logs
Check the add-on logs for successful startup:
```
[INFO] Starting Chaser DMX server...
[INFO] Fetching MQTT credentials from supervisor...
[INFO] MQTT service found at 192.168.x.x:1883
[INFO] Generating /data/config.json...
🚀 Chaser WebSocket server running on ws://localhost:3001
🏠 Home Assistant MQTT integration enabled
[INFO] Starting Chaser DMX simulator...
```

## Configuration Options

All configurable via Home Assistant UI:

### Engine Settings
- `engine_columns`: Number of panel columns (default: 2)
- `engine_rows_per_column`: Panels per column (default: 7)
- `engine_target_fps`: Effect update rate (default: 60)
- `engine_initial_topology`: `circular` or `linear` (default: circular)

### Art-Net DMX Settings
- `artnet_enabled`: Enable DMX output (default: false)
- `artnet_host`: DMX node IP (default: 192.168.1.100)
- `artnet_universe`: DMX universe 0-255 (default: 0)
- `artnet_start_channel`: First DMX channel (default: 1)
- `artnet_channels_per_panel`: Channels per panel (default: 5 for RGBCCT)

## Troubleshooting

### MQTT not connecting
- Ensure **Mosquitto broker** add-on is installed and running
- Check MQTT integration is configured in Home Assistant

### Lights not appearing
- Check add-on logs for MQTT connection errors
- Restart the add-on after fixing MQTT issues

### Web UI not accessible
- Verify add-on is running (check logs)
- Ingress should work automatically - no port configuration needed

### Art-Net not working
- Verify `artnet_enabled: true` in configuration
- Check network connectivity to DMX node
- Ensure DMX node IP is correct

## Updating

When new versions are released:
1. Go to the add-on page in Home Assistant
2. If an update is available, click **Update**
3. Your presets and configuration are preserved in `/data/`

## Development

To work on the add-on locally:

```bash
# Clone the repository
git clone https://github.com/ameesme/chaser.git
cd chaser

# Run in development mode (outside Home Assistant)
pnpm install
pnpm dev

# Test Docker build
docker build --build-arg BUILD_FROM=ghcr.io/hassio-addons/base:19.0.0 -t chaser-dmx:dev .
```
