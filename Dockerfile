# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY lib ./lib
COPY artifacts ./artifacts
COPY scripts ./scripts

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build
RUN pnpm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/artifacts ./artifacts
COPY --from=builder /app/scripts ./scripts

# Expose port
EXPOSE ${PORT:-3000}

# Start command
CMD ["pnpm", "run", "start"]
