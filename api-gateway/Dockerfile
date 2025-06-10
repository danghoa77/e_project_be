FROM nginx:stable-alpine

# Xóa file config mặc định để tránh xung đột
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy file cấu hình chính
COPY nginx.conf /etc/nginx/nginx.conf

# Copy file template vào thư mục mà entrypoint của Nginx sẽ tự động xử lý
COPY conf.d/ecommerce.conf.template /etc/nginx/templates/default.conf.template