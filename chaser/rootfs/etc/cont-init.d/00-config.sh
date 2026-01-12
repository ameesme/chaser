#!/command/with-contenv bashio
# ==============================================================================
# Generate Chaser DMX configuration from add-on options
# ==============================================================================

bashio::log.info "Generating configuration..."

# Get MQTT credentials from Home Assistant Supervisor
bashio::log.info "Fetching MQTT credentials from supervisor..."
if bashio::services.available "mqtt"; then
    MQTT_HOST=$(bashio::services "mqtt" "host")
    MQTT_PORT=$(bashio::services "mqtt" "port")
    MQTT_USERNAME=$(bashio::services "mqtt" "username")
    MQTT_PASSWORD=$(bashio::services "mqtt" "password")

    bashio::log.info "MQTT service found at ${MQTT_HOST}:${MQTT_PORT}"

    # Export as environment variables for server
    export MQTT_HOST
    export MQTT_PORT
    export MQTT_USERNAME
    export MQTT_PASSWORD
else
    bashio::log.warning "MQTT service not available, will use default config"
fi

# Initialize presets if not exists
if [ ! -f /data/presets.json ]; then
    bashio::log.info "Initializing default presets..."
    cp /app/presets.json.template /data/presets.json
fi

# Read add-on options
ARTNET_ENABLED=$(bashio::config 'artnet_enabled')
ARTNET_HOST=$(bashio::config 'artnet_host')
ARTNET_PORT=$(bashio::config 'artnet_port')
ARTNET_UNIVERSE=$(bashio::config 'artnet_universe')
ARTNET_SUBNET=$(bashio::config 'artnet_subnet')
ARTNET_NET=$(bashio::config 'artnet_net')
ARTNET_START_CHANNEL=$(bashio::config 'artnet_start_channel')
ARTNET_CHANNELS_PER_PANEL=$(bashio::config 'artnet_channels_per_panel')
ARTNET_REFRESH_RATE=$(bashio::config 'artnet_refresh_rate')
ENGINE_COLUMNS=$(bashio::config 'engine_columns')
ENGINE_ROWS_PER_COLUMN=$(bashio::config 'engine_rows_per_column')
ENGINE_TARGET_FPS=$(bashio::config 'engine_target_fps')
ENGINE_INITIAL_TOPOLOGY=$(bashio::config 'engine_initial_topology')

# Generate config.json
bashio::log.info "Generating /data/config.json..."

cat > /data/config.json <<EOF
{
  "engine": {
    "targetFPS": ${ENGINE_TARGET_FPS},
    "columns": ${ENGINE_COLUMNS},
    "rowsPerColumn": ${ENGINE_ROWS_PER_COLUMN},
    "initialTopology": "${ENGINE_INITIAL_TOPOLOGY}"
  },
  "presets": {},
  "simulator": {
    "port": 3000,
    "panelScale": 2
  },
  "server": {
    "port": 3001
  },
  "artnet": {
    "enabled": ${ARTNET_ENABLED},
    "host": "${ARTNET_HOST}",
    "port": ${ARTNET_PORT},
    "universe": ${ARTNET_UNIVERSE},
    "subnet": ${ARTNET_SUBNET},
    "net": ${ARTNET_NET},
    "startChannel": ${ARTNET_START_CHANNEL},
    "channelsPerPanel": ${ARTNET_CHANNELS_PER_PANEL},
    "refreshRate": ${ARTNET_REFRESH_RATE}
  },
  "mqtt": {
    "enabled": true,
    "broker": {
      "host": "localhost",
      "port": 1883,
      "username": "chaser",
      "password": "chaser",
      "clientId": "chaser-dmx-addon"
    },
    "homeassistant": {
      "discoveryPrefix": "homeassistant",
      "topicPrefix": "chaser",
      "retainDiscovery": true
    },
    "stateUpdateRate": 200,
    "reconnectInterval": 5000
  }
}
EOF

bashio::log.info "Configuration generated successfully"
