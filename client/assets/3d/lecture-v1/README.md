# Khu C · Giảng đường 3D

23 GLB môi trường mới và bốn loại asset dùng lại từ `khu-a-coop-v1` (đèn, cây chậu, bồn hoa, cây rủ). `manifest.json` ghi GLB, byte và bounds thực. Mẫu: `design/khu-c-lecture-reference/00-approved-concept.png`.

## Bản đồ và tính năng

`client/lecture-scene.js` ghép các GLB, nhân vật, slide trang trí và VFX cổng. `client/map-3d-layouts.js` dùng chung client/server: phòng 18×14 m, sáu bàn đôi, 12 ghế rời, điểm xuất hiện ở giữa lối đi và cổng về `campus` ở phía trước. Đường lên bục qua hai bậc, độ cao lần lượt 0,14 và 0,28 m; chặn đi xuyên mép bục. Chiều cao render nhân vật theo cùng tọa độ, tránh chìm chân vào mặt bục.

Giữ nguyên lịch server: 07:00–11:30 và 13:00–17:00, múi giờ Asia/Ho_Chi_Minh; vẫn kiểm tra khi vào map. Bảng xếp hạng toàn server/phiên hiện tại của game vẫn hiển thị khi vào Khu C. Bàn giảng viên có tương tác gần + E để xem thông tin giờ học. Cổng về map chính hoạt động như các map 3D khác. Không thêm phần thưởng học tập hoặc thay đổi kinh tế.

Bốn sinh viên và giáo sư là NPC trang trí dùng model riêng, không giả làm người chơi hay ghi vào bảng xếp hạng. Ghế có điểm tiếp cận bên hông (`layout.seats[].approach`) cho triển khai tiếp. **Chưa có cơ chế người chơi ngồi/học/điểm danh tại ghế**, vì game chưa có cơ chế này cho Khu C; ghế nghỉ ở sân trường giữ nguyên. Không dùng hành vi giảm mệt của ghế nghỉ làm phần thưởng giảng đường.

## Nguyên tắc 3D

- Mét; source Blender Z-up, mặt trước -Y; glTF Y-up. Import qua lớp chuyển hướng của host Babylon, tránh tự xoay thêm nội dung hai lần.
- Origin đồ đặt sàn ở tâm đáy; bảng/đèn/màn chiếu theo điểm gắn đã mô tả trong scene. Tọa độ 34 px/m, tâm (400,300). `w,d` trong layout là **nửa** footprint collider tính bằng px.
- Bàn, ghế, đồ học, nhân vật, chữ, tường và VFX độc lập. Instance sáu bàn/12 ghế; dùng lại vật liệu PBR mờ. Nền dùng quad, bo cạnh ít đoạn. Collider hộp đơn giản bao footprint thực, không đặt collider lên lá/chữ/slide/hiệu ứng.
- Tường gần camera được ẩn theo từng instance để nhìn và chọn được đối tượng bên trong, không đổi alpha/material chung. Collider tường vẫn hoạt động. Điểm xuất hiện nằm ngoài trigger thoát.
- Chữ dựng thành text mesh từ nguồn UTF-8 NFC `labels.vi.json`, bằng font Arial Bold có dấu tiếng Việt; không dùng chữ từ ảnh AI. Biển sau không có chữ lặp/chữ ngược. Màn chiếu chỉ có hình trang trí, không hiển thị điểm số hoặc dữ liệu giả.
- Kiểm tra normals, kích thước, góc camera và lối đi khi chỉnh mesh. Nhân vật dùng cùng tám khớp transform với game; đây không phải skeleton skinned để retarget motion-capture.

## Nguồn, xem và dựng lại

`source-assets/lecture-v1/` có `.blend` từng đối tượng và `khu-c-assembled.blend`. Map được ghép từ chính GLB runtime, không phải ảnh concept. `placements.json` sinh trực tiếp từ `lecture-scene.js` qua `tools/export-lecture-layout.cjs`; tránh sửa tọa độ ở hai chỗ.

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python tools/build_lecture_assets.py
node tools/export-lecture-layout.cjs
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python tools/assemble_lecture.py
node tools/serve-3d-preview.cjs
```

Map thử: `http://127.0.0.1:8766/tools/map3d-smoke.html?map=khu-c`. Xem từng asset tại `client/assets/3d/lecture-v1/preview.html`, chọn module tại `client/assets/3d/characters/campus-v1/preview.html` qua server preview. Fixture không ghi lên game backend hoặc tài khoản người chơi thật.

Kiểm tra: `verify-lecture-assets.cjs`, `verify-lecture-features.cjs`, `verify-lecture-browser.cjs`, cùng các kiểm tra controller/interaction/map cũ. `verification.json` chứa kết quả browser thực; `previews/` có ảnh mesh từ Blender và game. Smoke test khung điện thoại không phải benchmark FPS trên điện thoại thật. Chưa triển khai bản cập nhật lên hosting/server bên ngoài.
