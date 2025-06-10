# FROM nginx:alpine

# # Xóa file cấu hình Nginx mặc định
# RUN rm /etc/nginx/conf.d/default.conf

# # Sao chép file cấu hình của chúng ta
# COPY nginx.conf /etc/nginx/conf.d/ecommerce.conf

# # Exposed port (port 80 đã được định nghĩa trong docker-compose.yml)
# EXPOSE 80

# api-gateway/Dockerfile

FROM nginx:stable-alpine

# Copy file cấu hình chính
COPY nginx.conf /etc/nginx/nginx.conf

# Copy file template vào thư mục mà entrypoint của Nginx sẽ tự động xử lý
COPY conf.d/ecommerce.conf.template /etc/nginx/templates/default.conf.template