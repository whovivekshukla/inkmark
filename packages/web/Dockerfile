# ── Stage 1: Install dependencies ──
FROM node:22-slim AS deps

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/web/package.json packages/web/

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ──
FROM deps AS build

COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/web/ packages/web/

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN pnpm --filter @inkmark/shared build
RUN pnpm --filter @inkmark/web build

# ── Stage 3: Serve with nginx ──
FROM nginx:alpine AS production

COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
