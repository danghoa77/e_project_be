# FROM nginx:alpine

# # Xóa file cấu hình Nginx mặc định
# RUN rm /etc/nginx/conf.d/default.conf

# # Sao chép file cấu hình của chúng ta
# COPY nginx.conf /etc/nginx/conf.d/ecommerce.conf

# # Exposed port (port 80 đã được định nghĩa trong docker-compose.yml)
# EXPOSE 80

# Sử dụng image Nginx có sẵn gettext để dùng lệnh envsubst
FROM nginx:stable-alpine

# Copy file template vào thư mục template của Nginx
COPY conf.d/ecommerce.conf.template /etc/nginx/templates/default.conf.template

# Lệnh CMD mặc định của image Nginx sẽ tự động tìm các file .template,
# thay thế các biến môi trường và tạo ra file config cuối cùng, sau đó khởi động server.