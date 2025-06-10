# FROM nginx:alpine

# # Xóa file cấu hình Nginx mặc định
# RUN rm /etc/nginx/conf.d/default.conf

# # Sao chép file cấu hình của chúng ta
# COPY nginx.conf /etc/nginx/conf.d/ecommerce.conf

# # Exposed port (port 80 đã được định nghĩa trong docker-compose.yml)
# EXPOSE 80

# api-gateway/Dockerfile

FROM nginx:alpine

# Cài thêm envsubst để xử lý biến môi trường
RUN apk add --no-cache bash curl gettext

# Copy file template và nginx config
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ecommerce.conf.template /etc/nginx/templates/ecommerce.conf.template

# Entry point để thay thế biến môi trường
CMD ["/bin/sh", "-c", "envsubst < /etc/nginx/templates/ecommerce.conf.template > /etc/nginx/conf.d/ecommerce.conf && nginx -g 'daemon off;'"]
