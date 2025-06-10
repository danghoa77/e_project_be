# Stage 1: Build the application
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock)

COPY package.json package-lock.json* ./
COPY nest-cli.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./
# Install ALL dependencies 
RUN npm install



COPY ./libs ./libs
COPY ./microservices ./microservices
COPY tsconfig.json tsconfig.build.json nest-cli.json  .prettierrc ./


# Build the application (transpile TypeScript to JavaScript)
RUN npm run build user-service

# Stage 2: Create the production image
FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package.json and package-lock.json 
COPY package*.json ./

#  production dependencies.
RUN npm install --omit=dev --ignore-scripts

# Copy built application from the builder stage
COPY --from=builder /usr/src/app/dist/microservices/user-service ./dist
# Copy node_modules 

COPY --from=builder /usr/src/app/node_modules ./node_modules

EXPOSE 3001

# Command to run the application
CMD ["node", "dist/main"]