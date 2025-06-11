# Stage 1: Install dependencies
#------------------------------------------------------------------------------------
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci --legacy-peer-deps; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found. Please use yarn, npm, or pnpm." && exit 1; \
  fi

# Stage 2: Build the application
#------------------------------------------------------------------------------------
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Copy .env file before building.
COPY .env ./.env

# Telemetry is ENABLED by default. The line below would disable it if uncommented.
ENV NEXT_TELEMETRY_DISABLED 1
RUN \
  if [ -f yarn.lock ]; then yarn build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then pnpm run build; \
  else echo "Lockfile not found. Please use yarn, npm, or pnpm." && exit 1; \
  fi

# Stage 3: Production image
#------------------------------------------------------------------------------------
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

# Telemetry is ENABLED by default. The line below would disable it if uncommented.
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy .env file to the runner stage
COPY --from=builder /app/.env ./.env

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME 0.0.0.0
CMD ["node", "server.js"]