FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy workspace dependencies
COPY lib ./lib
COPY artifacts/api-server ./artifacts/api-server

# Install all dependencies using frozen lockfile
RUN pnpm install --frozen-lockfile

# Build the API server
RUN pnpm --filter @workspace/api-server build

# Copy the built API server to a predictable location
RUN mkdir -p /app/dist && cp -r /app/artifacts/api-server/dist/* /app/dist/

# Expose port
EXPOSE 3000

# Start the API server from the copied location
CMD ["node", "--enable-source-maps", "/app/dist/index.mjs"]
