# STU-Town

Game cộng đồng 2D dùng Phaser và Socket.IO.

## Chạy local

1. Cài Node.js 18.18 trở lên.
2. Chạy `npm install` trong thư mục `server`.
3. Chạy `npm start` trong thư mục `server`.
4. Mở http://localhost:3000. Server phục vụ cả game và Socket.IO.

Có thể đặt `CORS_ORIGINS` thành danh sách origin phân cách bằng dấu phẩy nếu phục vụ client trên domain riêng.

## Lưu hồ sơ bằng Supabase

Chạy schema và cấu hình biến môi trường theo hướng dẫn tại [`supabase/SETUP.md`](supabase/SETUP.md). Nếu chưa cấu hình Supabase, hồ sơ chỉ được giữ trong phiên server hiện tại.
