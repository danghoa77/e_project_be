# microservices/user-service/Dockerfile

#-------------------------------- BUILDER STAGE --------------------------------
FROM node:18-alpine AS builder

# Thiết lập thư mục làm việc trong container
WORKDIR /usr/src/app

# 1. Sao chép các file quản lý package và cấu hình gốc của monorepo
# Docker build context nên là thư mục gốc của monorepo (nơi chứa package.json, nest-cli.json, libs/, microservices/)
COPY package.json package-lock.json* ./ 
# Sao chép package-lock.json hoặc yarn.lock hoặc pnpm-lock.yaml tùy theo bạn dùng gì.
# Dấu * sau package-lock.json để bắt cả package-lock.json (npm v7+) và các file lock cũ hơn.

COPY nest-cli.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./ 

# 2. Cài đặt TẤT CẢ dependencies từ package.json gốc
# Bao gồm cả devDependencies vì chúng cần thiết cho quá trình build (ví dụ: typescript, @nestjs/cli)
RUN npm install

# 3. Sao chép mã nguồn của THƯ VIỆN và các MICROSERVICES
# Điều này CỰC KỲ QUAN TRỌNG để lệnh `nest build` có thể tìm thấy và biên dịch thư viện.
COPY ./libs ./libs                           
COPY ./microservices ./microservices           
# Nếu bạn chỉ muốn copy service hiện tại và lib nó cần:
# COPY ./libs/common-auth ./libs/common-auth
# COPY ./microservices/user-service ./microservices/user-service
# Tuy nhiên, copy toàn bộ `libs` và `microservices` thường an toàn hơn và dễ quản lý hơn
# cho các dependencies phức tạp hơn giữa các libs hoặc apps trong tương lai.

# 4. Build ứng dụng cụ thể (ví dụ: user-service)
# Lệnh `nest build user-service` sẽ:
#   - Tự động tìm và build `common-auth` (và các libs khác mà user-service phụ thuộc)
#   - Build `user-service`
# Output sẽ nằm trong thư mục /usr/src/app/dist/microservices/user-service
RUN npm run build user-service
# Đảm bảo rằng trong package.json gốc, bạn có script kiểu như:
# "scripts": {
#   "build": "nest build",
#   "build:user-service": "nest build user-service", // Hoặc dùng trực tiếp nest build user-service
#   ...
# }
# Nếu bạn dùng script "build:user-service", thì lệnh RUN ở trên sẽ là:
# RUN npm run build:user-service
# Hoặc trực tiếp:
# RUN npx nest build user-service

#-------------------------------- PRODUCTION STAGE --------------------------------
FROM node:18-alpine

WORKDIR /usr/src/app

# Sao chép package.json gốc để cài đặt chỉ production dependencies
COPY package.json package-lock.json* ./

# Cài đặt CHỈ production dependencies
# --omit=dev tương đương với --production cho npm v7+
# --ignore-scripts để tránh chạy các script không cần thiết
# --prefer-offline để cố gắng sử dụng cache nếu có
RUN npm install --omit=dev --ignore-scripts --prefer-offline

# Sao chép các artifact đã được build của user-service từ builder stage
COPY --from=builder /usr/src/app/dist/microservices/user-service ./dist

# Sao chép các node_modules đã được cài đặt (chỉ production) từ builder stage
# Đây là một cách khác nếu bạn không muốn chạy lại npm install ở production stage
# COPY --from=builder /usr/src/app/node_modules ./node_modules

# Cổng mà ứng dụng user-service sẽ lắng nghe (thay đổi nếu cần)
EXPOSE 3001

# Lệnh để chạy ứng dụng
# File entrypoint thường là main.js trong thư mục dist của service
CMD ["node", "dist/main.js"]