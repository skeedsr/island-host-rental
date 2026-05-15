FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy entire workspace
COPY . ./

# Install all dependencies using frozen lockfile
RUN pnpm install --frozen-lockfile

# Build the API server
RUN pnpm --filter @workspace/api-server build && \
    test -f /app/artifacts/api-server/dist/index.mjs || (echo "Build failed: index.mjs not found" && exit 1)

# Prune to production only (removes devDependencies)
RUN pnpm prune --prod

# Expose port
EXPOSE 3000

# Start the API server
CMD ["node", "--enable-source-maps", "/app/artifacts/api-server/dist/index.mjs"]
