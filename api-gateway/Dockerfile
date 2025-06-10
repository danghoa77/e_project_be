# api-gateway/Dockerfile

FROM nginx:stable-alpine

# Xóa file config mặc định
RUN rm /etc/nginx/conf.d/default.conf

# Copy file cấu hình chính
COPY nginx.conf /etc/nginx/nginx.conf

# Copy toàn bộ thư mục cấu hình phụ
COPY conf.d/ /etc/nginx/conf.d/