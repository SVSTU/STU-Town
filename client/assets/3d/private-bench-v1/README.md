# Asset vườn ghế riêng

GLB PBR, đơn vị mét, có nguồn Blender trong `source-assets/private-bench-v1`. Tất cả đối tượng được dựng bằng geometry, không phải ảnh nền giả 3D.

| Tệp | Đối tượng |
|---|---|
| pergola.glb | Chòi dây leo, bốn trụ, lối vào mở |
| bench.glb | Ghế gỗ/đá cho hai người |
| tree.glb | Cây có thân, nhánh và lớp lá |
| lamp.glb | Đèn sân vườn |
| flower-urn.glb | Chậu hoa có đế đá |
| flowerbed.glb | Bồn hoa tròn |
| hedge.glb | Đoạn hàng rào cây dùng lặp |
| exit-portal.glb | Khung cổng, chân đế, tinh thể; xoáy là shader chạy riêng |
| paving.glb | Mô-đun đường lát |
| garden-ground.glb | Nền cỏ và đường vòng ghép sẵn |

Nhân vật ở `../characters/private-garden-v1`: `modular-student.glb` có tóc/áo/phụ kiện thay riêng; `student-polo.glb` là preset gọn. Xem `manifest.json` của hai thư mục để biết kích thước, số byte và giao ước khớp.

Mặt trước nguồn Blender -Y, GLB xuất Y-up. Giữ root đổi hệ tọa độ của glTF và dùng node cha chuẩn hóa trong Babylon như `babylon-map-packs.js`; không áp phép lật âm lên nhân vật/geometry.

`index.html` có ảnh chụp map thật, `preview.html` cho xoay từng GLB. Trang xem mô-đun ở `../characters/private-garden-v1/preview.html`. Các trang GLB cần chạy qua HTTP; có thể dùng `node tools/serve-3d-preview.cjs` tại thư mục gốc dự án.

Map dùng footprint từ `client/map-3d-layouts.js`, lớp ghép `client/private-bench-scene.js`, khớp chuyển động `student-animation.js`, xử lý ghế phía máy chủ `server/private-bench.js`. Cơ chế: phòng riêng theo cặp, hai chỗ ngồi, không tiêu hao chỉ số, hồi 1 độ mệt/5 phút, đi đến cổng mới thoát.

Ảnh Blender không chứa shader xoáy thời gian thực. Các ảnh `previews/map-*.png` và `two-seated.png` được chụp từ Babylon, có shader, GUI và điều khiển thực tế. `verification.json` là kết quả kiểm tra trình duyệt với dữ liệu giả lập cục bộ, không có thông tin tài khoản thật. Chưa đo FPS trên điện thoại thật.
