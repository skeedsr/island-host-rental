# ============================================================================
# BUILD STAGE: Build the API server only
# ============================================================================
# Use Debian-based image for builder to avoid native module issues
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

# Install all dependencies
# Using --no-frozen-lockfile to allow pnpm to re-resolve dependencies
RUN pnpm install --no-frozen-lockfile

# Set environment variables for build
ENV NODE_ENV=production
ENV PORT=3000
ENV BASE_PATH=/

# Build frontend
RUN pnpm --filter @workspace/canary-rentals run build

# Install dependencies specifically for api-server
# (pnpm install should have done this, but being explicit)
RUN pnpm --filter @workspace/api-server install

# Build API server
RUN pnpm --filter @workspace/api-server run build

# Verify API server build succeeded
RUN test -f /build/artifacts/api-server/dist/index.mjs || \
    (echo "API server build failed" && exit 1)

# ============================================================================
# RUNTIME STAGE: Production image
# ============================================================================
# Using Debian (node:22) instead of Alpine to ensure native module compatibility
# (native modules compiled in Debian builder won't work with Alpine's musl libc)
FROM node:22

WORKDIR /app

# Install pnpm for production dependencies
RUN npm install -g pnpm

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy pre-built applications
# Frontend is already built and committed to repo
COPY artifacts/canary-rentals/dist ./artifacts/canary-rentals/dist

# Copy API server built from builder stage
COPY --from=builder /build/artifacts/api-server/dist ./artifacts/api-server/dist

# Copy libraries (needed at runtime by api-server)
COPY lib ./lib

# Install runtime dependencies
# This ensures all external dependencies (like @google-cloud/storage) are available
RUN pnpm install --prefer-offline

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
