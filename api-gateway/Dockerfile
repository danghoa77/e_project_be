FROM nginx:alpine

# Xóa file cấu hình Nginx mặc định
RUN rm /etc/nginx/conf.d/default.conf

# Sao chép file cấu hình của chúng ta
COPY nginx.conf /etc/nginx/conf.d/ecommerce.conf

# Exposed port (port 80 đã được định nghĩa trong docker-compose.yml)
EXPOSE 80