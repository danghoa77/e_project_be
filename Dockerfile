# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy dependency files
COPY package.json package-lock.json* ./
COPY nest-cli.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./

# Install all dependencies
RUN npm install

# Copy shared libraries and microservices
COPY ./libs ./libs
COPY ./microservices ./microservices

# Build the monolith
RUN npm run build:monolith

# Stage 2: Run
FROM node:20-alpine

WORKDIR /usr/src/app

# Copy package.json and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts

# Copy built assets from builder stage
COPY --from=builder /usr/src/app/dist/microservices/monolith ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Expose the common port
EXPOSE 3000

# Start the monolith
CMD ["node", "dist/main"]
