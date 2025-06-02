# microservices/order-service/Dockerfile

#-------------------------------- BUILDER STAGE --------------------------------
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./
COPY nest-cli.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./

RUN npm install

COPY ./libs ./libs
COPY ./microservices ./microservices

# Build the order-service application
RUN npm run build order-service
# Hoặc: RUN npx nest build order-service

#-------------------------------- PRODUCTION STAGE --------------------------------
FROM node:18-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev --ignore-scripts --prefer-offline

# Copy the built application artifacts from the builder stage
COPY --from=builder /usr/src/app/dist/microservices/order-service ./dist

# Cổng mà order-service sẽ lắng nghe (ví dụ: 3003)
EXPOSE 3003

CMD ["node", "dist/main.js"]