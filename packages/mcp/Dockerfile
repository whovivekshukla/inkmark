# ── Stage 1: Install dependencies ──
FROM node:22-slim AS deps

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/mcp/package.json packages/mcp/

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ──
FROM deps AS build

COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/mcp/ packages/mcp/

RUN pnpm --filter @inkmark/shared build
RUN pnpm --filter @inkmark/mcp build

# ── Stage 3: Production image ──
FROM node:22-slim AS production

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/mcp/package.json packages/mcp/

# @inkmark/shared is bundled into the build output (noExternal), so only the
# runtime deps (express, SDK, zod) are needed here.
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/packages/mcp/dist packages/mcp/dist

ENV NODE_ENV=production
# The HTTP server authenticates per-request (bearer PAT) and holds no secrets,
# so no Infisical injection is needed — only the internal API URL and port.
ENV INKMARK_MCP_PORT=3001
EXPOSE 3001

USER node

CMD ["node", "packages/mcp/dist/http.js"]
