# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Development stage
FROM node:22-alpine AS development
WORKDIR /app
RUN apk add --no-cache git bash
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "run", "dev"]

# Production stage
FROM node:22-alpine AS production

# Install development tools and build dependencies
RUN apk add --no-cache git bash build-base python3

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env.example ./.env
COPY --from=builder /app/order.png ./order.png

EXPOSE 3000

USER node

CMD ["npm", "start"]
