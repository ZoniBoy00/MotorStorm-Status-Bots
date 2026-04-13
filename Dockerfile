# MotorStorm Status Bots - Production Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for build
COPY package*.json tsconfig.json ./

# Install ALL dependencies (including dev for build)
RUN npm ci

# Copy source
COPY src ./src

# Build TypeScript
RUN npm run build

# Production image
FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built output
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1000 botuser && \
    adduser -D -u 1000 -G botuser botuser && \
    chown -R botuser:botuser /app

USER botuser

ENV NODE_ENV=production

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/index.js"]
