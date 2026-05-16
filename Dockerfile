# ============================================================================
# BUILD STAGE: Build the entire application
# ============================================================================
# Use Debian-based image for builder to avoid Alpine Linux musl issues with native modules
FROM node:22 AS builder

WORKDIR /build

# Install pnpm
RUN npm install -g pnpm

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy all workspace packages
COPY lib ./lib
COPY artifacts ./artifacts
COPY scripts ./scripts

# Install all dependencies with frozen lockfile
# This ensures reproducible builds
# Using --no-optional to skip optional dependencies that might not exist on this platform
RUN pnpm install --frozen-lockfile --no-optional

# Set environment variables for build
ENV NODE_ENV=production
ENV BASE_PATH=/
ENV PORT=3000

# Build frontend (canary-rentals)
# This must happen before api-server since api-server serves it in production
RUN pnpm --filter @workspace/canary-rentals run build

# Build API server
RUN pnpm --filter @workspace/api-server run build

# Verify both builds succeeded
RUN test -f /build/artifacts/canary-rentals/dist/public/index.html || \
    (echo "Frontend build failed" && exit 1)
RUN test -f /build/artifacts/api-server/dist/index.mjs || \
    (echo "API server build failed" && exit 1)

# ============================================================================
# RUNTIME STAGE: Minimal production image
# ============================================================================
FROM node:22-alpine

WORKDIR /app

# Install pnpm for production dependencies
RUN npm install -g pnpm

# Copy only what's needed from builder
# 1. Root package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# 2. Built applications
COPY --from=builder /build/artifacts ./artifacts

# 3. Libraries (needed at runtime by api-server)
COPY --from=builder /build/lib ./lib

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Verify runtime files exist
RUN test -f /app/artifacts/api-server/dist/index.mjs || \
    (echo "Runtime: API server index.mjs missing" && exit 1)
RUN test -f /app/artifacts/canary-rentals/dist/public/index.html || \
    (echo "Runtime: Frontend index.html missing" && exit 1)

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/healthz', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start API server
CMD ["node", "--enable-source-maps", "/app/artifacts/api-server/dist/index.mjs"]
