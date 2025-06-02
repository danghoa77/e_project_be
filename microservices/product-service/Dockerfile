# microservices/product-service/Dockerfile

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

# Build the product-service application
RUN npm run build product-service
# Hoặc: RUN npx nest build product-service

#-------------------------------- PRODUCTION STAGE --------------------------------
FROM node:18-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev --ignore-scripts --prefer-offline

# Copy the built application artifacts from the builder stage
COPY --from=builder /usr/src/app/dist/microservices/product-service ./dist

# Cổng mà product-service sẽ lắng nghe (ví dụ: 3002)
EXPOSE 3002

CMD ["node", "dist/main.js"]