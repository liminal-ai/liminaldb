# syntax=docker/dockerfile:1

FROM oven/bun:1.3 AS base
WORKDIR /usr/src/app

# Install production dependencies
FROM base AS install
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Production image
FROM base AS release
ENV NODE_ENV=production

# Copy production dependencies
COPY --from=install /temp/prod/node_modules node_modules

# Copy application code
COPY package.json ./
COPY src ./src
COPY public ./public
COPY convex ./convex

# Run as non-root user for security
USER bun

EXPOSE 5001/tcp

ENTRYPOINT ["bun", "src/index.ts"]
