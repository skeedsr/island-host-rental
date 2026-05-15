# Build stage
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy only what we need for the API server
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy the API server and dependencies
COPY lib ./lib
COPY artifacts/api-server ./artifacts/api-server

# Install dependencies (skip workspace mode, install only root + api-server)
RUN pnpm install --no-frozen-lockfile

# Build the API server
WORKDIR /app/artifacts/api-server
RUN pnpm run build

# Runtime
FROM node:22-alpine

WORKDIR /app

# Copy built API server and workspace config for ESM module resolution
COPY --from=0 /app/package.json ./
COPY --from=0 /app/pnpm-workspace.yaml ./
COPY --from=0 /app/artifacts/api-server/dist ./dist
COPY --from=0 /app/node_modules ./node_modules
COPY --from=0 /app/lib ./lib

# Expose port
EXPOSE 3000

# Start
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
