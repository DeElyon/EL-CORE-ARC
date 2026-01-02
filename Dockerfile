FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY turbo.json ./

# Copy all package.json files
COPY apps/arc-core-api/package.json ./apps/arc-core-api/
COPY libs/*/package.json ./libs/*/
COPY services/*/package.json ./services/*/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma Client
RUN pnpm db:generate

# Build
RUN pnpm build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

RUN npm install -g pnpm

# Copy built files
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/arc-core-api/dist ./apps/arc-core-api/dist
COPY --from=base /app/libs ./libs
COPY --from=base /app/services ./services
COPY --from=base /app/package.json ./
COPY --from=base /app/turbo.json ./

EXPOSE 3000

CMD ["pnpm", "start:api"]


