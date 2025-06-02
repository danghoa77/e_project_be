Đây là dự án E-commerce đầu tiên của t theo mô hình microservices kiến trúc high-level, được container hoá hoàn toàn bằng Docker.

🧩 Các service chính:
User

Product

Payment (tích hợp VNPay)

Order

🔧 Công nghệ & công cụ sử dụng:
MongoDB: Lưu trữ dữ liệu chính

Redis: Quản lý session & cache

Cloudinary: Lưu trữ hình ảnh sản phẩm

Nginx: Load balancer điều phối traffic giữa các service

JWT + Role-based access: Mỗi service tự quản lý xác thực và phân quyền riêng biệt