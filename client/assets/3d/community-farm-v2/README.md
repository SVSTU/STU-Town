# Vườn cộng đồng 3D · Bộ asset đã ghép

Bộ này có 26 GLB, dựng từ bộ ảnh `design/farm-v2-reference/`. Bố cục game được ghép bởi `client/community-garden-scene.js`, dùng `client/map-3d-layouts.js` làm nguồn tọa độ, điểm xuất hiện, ranh giới và vùng va chạm dùng chung với máy chủ.

## Các nhóm

- Luống đất và biển tên tách riêng.
- Cà rốt, cà chua, bắp và dâu tây: mỗi loại có ba model đang lớn, trưởng thành và héo. Cây cộng đồng không chuyển sang trạng thái chết.
- Nhà kho, dụng cụ, thùng nước, bình tưới, hàng rào, cột rào, cây bóng mát và cụm hoa.
- Tấm lát nhỏ và nền lát nguyên khu để giảm số lượt vẽ.
- Khung cổng thoát và chuột phá hoại. Mặt xoáy của cổng dùng shader chuyển động riêng trong game.

Nhà kho, thùng nước và bình tưới là vật trang trí; không tạo thêm dịch vụ ngoài cơ chế game hiện có. Cây trồng tách khỏi luống để cập nhật trạng thái mà không tải lại khung luống.

## Bố cục và trạng thái

Map rộng 16 × 12 m; bốn luống theo cụm 2 × 2. Model luống gốc khoảng 3,63 × 2,43 m, dùng scale 1,2 trong scene để gần tỷ lệ ảnh phối. Nhà kho ở góc sau bên trái, thùng nước ở góc sau bên phải, cổng thoát ở trước bên trái. Lối đi giữa rộng khoảng 1,45 m và lối ngang khoảng 1,08 m, đủ cho vùng va chạm nhân vật.

Giữ ID `farm` và `plot-1` đến `plot-4`, không tạo bản sao dữ liệu vườn riêng cho mỗi người và không tự gieo cây mẫu vào dữ liệu production. Ảnh chụp kiểm thử dùng dữ liệu minh họa tách biệt: luống 1 trống, luống 2 cà chua, luống 3 bắp, luống 4 dâu tây. Production hiển thị trạng thái thật từ máy chủ, túi đồ vẫn thuộc từng người.

Máy chủ và trình duyệt dùng cùng vùng va chạm. Chuột xuất hiện trên các điểm đi được nối với điểm xuất hiện của người chơi, di chuyển có kiểm tra đoạn đường và không được bắt xuyên vật cản. Phần thưởng vẫn là 50 danh tiếng và một đồng vàng sự kiện (vật phẩm), kèm mệt +1 và đói -1; bị cắn mất 5 tiền đồng.

## Tương tác và chữ

Di chuyển bằng phím mũi tên hoặc D-pad, thả là dừng. Kéo/vuốt xoay camera. Chỉ tương tác luống ở gần, không qua vật cản. Gieo/thu hoạch dùng luồng xử lý hiện có, không nhân bản nút cho cả bốn luống. Đi đến cổng xoáy mới thoát map. Có thể zoom vào để xem chi tiết.

Biển tên được để trống trong GLB. Chữ “Luống 1” đến “Luống 4” và “Thoát map” được vẽ từ Unicode bằng Segoe UI/Arial, không dùng chữ trong ảnh AI. Camera, vùng điều khiển và lớp UI giữ trong khung map trên điện thoại. Thời tiết, ánh sáng ngày đêm tiếp tục dùng thời gian thực của hệ thống hiện có.

## Xây dựng và kiểm tra

- Dựng lại: Blender chạy `tools/build_community_garden.py`. Có thể thêm `-- --only=tên-asset` để dựng riêng một file.
- Render từ GLB: Blender chạy `tools/render_built_assets.py`.
- Kiểm tra: `node tools/verify-garden-assets.cjs`, `node tools/verify-map3d.cjs`, `node tools/verify-interactions.cjs`, `node tools/verify-student-controls.cjs`.
- Với repo được phục vụ ở cổng 8766: `node tools/verify-garden-browser.cjs` kiểm tra model, khớp, chữ, các giai đoạn cây, điều hướng, cổng, đổi map và điện thoại; lưu sáu góc thực tế vào `previews/`.

`manifest.json` ghi kích thước và dung lượng từng GLB. Khung nhập glTF giữ nguyên phép chuyển đổi hệ trục; lớp chuẩn hóa của pack xử lý hướng mặt trước. Không đặt lại quaternion hoặc scale gốc nhập một cách tùy tiện.

Ảnh trong `previews/` là render/chụp từ asset thực tế. Ảnh phối gốc là tài liệu tham chiếu, không phải cam kết khớp từng pixel. Cần triển khai cả frontend lẫn backend để đồng bộ tọa độ mới.
