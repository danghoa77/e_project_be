FROM node:18-alpine AS builder

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./
COPY nest-cli.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./

RUN npm install

COPY ./libs ./libs
COPY ./microservices ./microservices
COPY tsconfig.json tsconfig.build.json nest-cli.json .prettierrc ./

RUN npm run build user-service

FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts

COPY --from=builder /usr/src/app/dist/microservices/user-service ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules

EXPOSE 3001

CMD ["node", "dist/main"]
