# Sử dụng base image của Node.js
FROM node:18-alpine

# Tạo thư mục làm việc bên trong container
WORKDIR /app

# Sao chép package.json và package-lock.json để cài đặt dependencies
COPY package*.json ./

# Cài đặt dependencies
RUN npm install

# Sao chép toàn bộ mã nguồn vào thư mục làm việc
COPY . .

# Build ứng dụng NestJS
RUN npm run build

# Port mà ứng dụng NestJS lắng nghe
EXPOSE 3000

# Lệnh chạy ứng dụng khi container khởi động
CMD ["node", "dist/main"]