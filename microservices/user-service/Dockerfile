# Stage 1: Build the application
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock)

COPY package.json package-lock.json* ./
COPY nest-cli.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./
# Install ALL dependencies (bao gồm devDependencies để build)
RUN npm install

# Copy the rest of the application code
# Tạo thư mục src trước để đảm bảo nó tồn tại
COPY ./libs ./libs
COPY ./microservices ./microservices
COPY tsconfig.json tsconfig.build.json nest-cli.json  .prettierrc ./
# Nếu có các tệp hoặc thư mục khác ở root cần cho quá trình build, hãy COPY chúng ở đây

# Build the application (transpile TypeScript to JavaScript)
RUN npm run build user-service

# Stage 2: Create the production image
FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package.json and package-lock.json để cài đặt production dependencies
COPY package*.json ./

# Cài đặt chỉ production dependencies.
RUN npm install --omit=dev --ignore-scripts

# Copy built application from the builder stage
COPY --from=builder /usr/src/app/dist/microservices/user-service ./dist
# Copy node_modules từ builder stage để đảm bảo các native dependencies đã được build đúng cách
# Điều này quan trọng hơn là chạy lại npm install production nếu có native modules
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Expose the port the app runs on (mặc định của NestJS là 3000, bạn có thể thay đổi)
EXPOSE 3001

# Command to run the application
CMD ["node", "dist/main"]