FROM node:18-alpine AS builder

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./
COPY nest-cli.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./

RUN npm install

COPY ./libs ./libs
COPY ./microservices ./microservices

RUN npm run build order-service

FROM node:18-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev --ignore-scripts --prefer-offline

COPY --from=builder /usr/src/app/dist/microservices/order-service ./dist

EXPOSE 3003

CMD ["node", "dist/main.js"]
