ARG BUILD_FROM
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Install pnpm
RUN npm install -g pnpm@9.15.0

# Copy entire monorepo
WORKDIR /build
COPY ../ ./

# Install dependencies and build
# Note: Remove node_modules to ensure clean install for target architecture
RUN rm -rf node_modules packages/*/node_modules
RUN pnpm install --no-frozen-lockfile
RUN pnpm build

# Stage 2: Runtime
FROM ${BUILD_FROM}

# Install runtime dependencies
RUN apk add --no-cache \
    nodejs \
    npm \
    jq \
    curl

# Install serve for serving simulator UI
RUN npm install -g serve@14

# Set working directory
WORKDIR /app

# Copy built packages from builder
COPY --from=builder /build/packages/server/dist ./packages/server/dist
COPY --from=builder /build/packages/simulator/dist ./packages/simulator/dist
COPY --from=builder /build/packages/core/dist ./packages/core/dist
COPY --from=builder /build/packages/homeassistant/dist ./packages/homeassistant/dist
COPY --from=builder /build/packages/types/dist ./packages/types/dist

# Copy node_modules (needed for runtime dependencies)
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/packages/server/node_modules ./packages/server/node_modules
COPY --from=builder /build/packages/homeassistant/node_modules ./packages/homeassistant/node_modules

# Copy package.json files for module resolution
COPY --from=builder /build/package.json ./package.json
COPY --from=builder /build/packages/server/package.json ./packages/server/package.json
COPY --from=builder /build/packages/core/package.json ./packages/core/package.json
COPY --from=builder /build/packages/homeassistant/package.json ./packages/homeassistant/package.json
COPY --from=builder /build/packages/types/package.json ./packages/types/package.json
COPY --from=builder /build/packages/simulator/package.json ./packages/simulator/package.json

# Copy default config templates
COPY --from=builder /build/config.json ./config.json.template
COPY --from=builder /build/presets.json ./presets.json.template

# Copy rootfs (relative to build context which is parent directory)
COPY chaser/rootfs /

# Build arguments
ARG BUILD_ARCH
ARG BUILD_DATE
ARG BUILD_DESCRIPTION
ARG BUILD_NAME
ARG BUILD_REF
ARG BUILD_REPOSITORY
ARG BUILD_VERSION

# Labels
LABEL \
    io.hass.name="${BUILD_NAME}" \
    io.hass.description="${BUILD_DESCRIPTION}" \
    io.hass.arch="${BUILD_ARCH}" \
    io.hass.type="addon" \
    io.hass.version=${BUILD_VERSION} \
    maintainer="Mees Boeijen" \
    org.opencontainers.image.title="${BUILD_NAME}" \
    org.opencontainers.image.description="${BUILD_DESCRIPTION}" \
    org.opencontainers.image.vendor="Chaser DMX" \
    org.opencontainers.image.authors="Mees Boeijen" \
    org.opencontainers.image.licenses="MIT" \
    org.opencontainers.image.source="https://github.com/${BUILD_REPOSITORY}" \
    org.opencontainers.image.documentation="https://github.com/${BUILD_REPOSITORY}/blob/main/README.md" \
    org.opencontainers.image.created=${BUILD_DATE} \
    org.opencontainers.image.revision=${BUILD_REF} \
    org.opencontainers.image.version=${BUILD_VERSION}
