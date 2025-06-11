FROM nginx:stable-alpine

# Xóa file config mặc định để tránh xung đột
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy file cấu hình duy nhất của chúng ta vào đúng vị trí
COPY nginx.conf /etc/nginx/nginx.conf