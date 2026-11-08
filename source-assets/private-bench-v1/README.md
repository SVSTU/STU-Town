# Vườn ghế riêng — Asset và map 3D

Bộ triển khai gồm 10 GLB cảnh quan, 2 GLB nhân vật, nguồn Blender có thể sửa và map Babylon ghép từ chính các GLB đó. Ảnh trong thư mục `references` là tài liệu ý tưởng; ảnh trong `client/assets/3d/private-bench-v1/previews` là render/chụp từ mesh thật. Mức chi tiết được điều chỉnh cho game web; không coi ảnh AI là bản đo hình học chính xác.

## Tệp chính

- `models/*.blend`: nguồn của chòi, ghế, cây, đèn, chậu hoa, bồn hoa, hàng rào cây, khung cổng, đường lát và nền map.
- `characters/modular-student.blend`: nhân vật có các nhánh tóc, trang phục, phụ kiện tách riêng.
- `characters/student-polo.blend`: bản sinh viên áo polo đã bỏ các lựa chọn không dùng.
- `private-garden-assembled.blend`: cảnh đã ghép, collider nằm trong collection `GAMEPLAY_COLLIDERS` không render. Hai nhân vật `PREVIEW_PLAYER_*` chỉ để xem tư thế, không được gộp vào cảnh quan trong game.
- `runtime-layout.json`: tọa độ được xuất từ `Map3DLayouts`, cùng dữ liệu với máy chủ và trình duyệt.
- `../../client/assets/3d/private-bench-v1/manifest.json`: kích thước, số byte và danh mục GLB cảnh quan.
- `../../client/assets/3d/characters/private-garden-v1/manifest.json`: danh mục nhân vật, tên khớp và các mô-đun.

## Quy tắc 3D đã áp dụng

1. Đơn vị mét; nguồn Blender Z-up, mặt trước -Y. GLB giữ nguyên root đổi hệ tọa độ; Babylon dùng node cha để chuẩn hóa mặt trước -Z. Không dùng scale âm để sửa hướng.
2. Geometry hiển thị, collider, vùng tương tác và seat anchor tách biệt. Collider của chòi chỉ gồm bốn trụ; không chặn toàn bộ khoảng bên trong. Lá và hoa là trang trí, thân/đế là phần va chạm.
3. Map rộng 12 × 10 m; giới hạn nhân vật theo bán kính. Hai vị trí vào map, ghế, chòi và cổng được kiểm tra có đường đi, không xuất hiện trong vật thể.
4. Ghế có hai anchor, cách nhau 0,70 m; mặt ngồi cao 0,46 m. Dùng chiều cao hông đo từ model để đặt tư thế ngồi. Vị trí logic của người ngồi nằm ở phía trước ghế, giúp đứng dậy không bị kẹt collider.
5. Tải asset qua container dùng lại cho các bản sao cây, hàng rào và đèn. Vật liệu PBR/texture nhúng trong GLB. Nhân vật giữ các nhánh chuyển động, không gộp vào cảnh quan.
6. Khung cổng và mặt xoáy động tách riêng. Asset GLB của cổng chỉ chứa khung, chân đế, tinh thể; shader Babylon cung cấp xoáy trong game.
7. Phím mũi tên và vùng điều khiển nổi dùng chung bộ điều khiển theo camera; dừng khi nhả. Kéo chuột/vuốt để xoay. Không bật click-to-move trong chế độ 3D.
8. Đi vào lòng cổng mới thoát. Vị trí cuối được gửi trước yêu cầu chuyển map, và máy chủ kiểm tra khoảng cách tới cổng.
9. Chữ giao diện và tên dùng font hỗ trợ tiếng Việt; không bake tên, nhãn “TRƯỚC/SAU” hoặc nội dung thay đổi vào GLB. Bạn/Khách chỉ phân biệt bằng nền tên xanh/cam, không vòng avatar. Hai bảng tên được tách khi camera nhìn xa để không che nhau.

## Nhân vật tái sử dụng

Nhân vật dùng cùng giao ước `student-animation-v1`: tám TransformNode hông/gối/vai/khuỷu, có chuỗi cha-con để chân và giày đi cùng nhau. Đây là animation khớp qua mã đang dùng trong dự án, không phải bộ motion-capture hoặc armature có skin weights.

Nhánh mô-đun đặt tên `module__slot__option__part`:

| Nhóm | Lựa chọn |
|---|---|
| Tóc | `wavy`, `braid`, `gray` |
| Trang phục | `polo`, `apron`, `vest` |
| Phụ kiện | `backpack`, `glasses`; có thể bật/tắt riêng |

36 tổ hợp được kiểm tra. Đăng ký catalogue: `garden-modular-01`; mặc định của vườn riêng là tóc ngắn, polo, không phụ kiện. Các map khác vẫn giữ lựa chọn mặc định riêng. `CharacterAssets.forPlayer` nhận `characterModules` đã chuẩn hóa; thay lựa chọn không cần tải lại GLB.

Trang `client/assets/3d/characters/private-garden-v1/preview.html` cho thử các phần và chuyển động. Lựa chọn trong trang xem asset chưa lưu vào hồ sơ người chơi; giao diện chọn ngoại hình trong game và lưu hồ sơ là bước sau.

## Cơ chế map

- Mỗi cặp đồng ý lời mời ghế có ID phòng `bench-private:<offerId>` riêng. Người thứ ba không có đường tham gia bằng `enterCampusMap`.
- Khi vào vườn, hai người đứng ở vị trí trống và đi lại bình thường. Đến phía trước ghế, bấm **Ngồi nghỉ** hoặc **E** để ngồi; tối đa hai chỗ. Di chuyển/thoát/ngắt kết nối giải phóng chỗ.
- Không tiêu hao độ đói/sức mạnh hay tăng độ mệt trong vườn riêng; giảm 1 độ mệt sau đủ mỗi 5 phút. Không đổi quy tắc lời mời 30 giây và cùng xác nhận trong 10 giây tại ghế công cộng.
- Chat chung vẫn theo đúng phòng; ưu tiên cuộc trò chuyện riêng với người cùng cặp khi vào. Thời gian tin nhắn và Reactions giữ trong giao diện chat. Bong bóng chat riêng có nền tím; biểu cảm nhanh nổi trên đầu, không gửi thành tin nhắn.
- Bấm tên mở thẻ thông tin nhân vật hiện có, bao gồm avatar và mã định danh. Có trời/ngày/đêm, thời tiết và chế độ ngước nhìn từ hệ thống chung.
- Bảng tương tác nằm trong canvas, có thể thu gọn bằng nút hiện có và không che vùng điều hướng. Khi không có WebGL, fallback 2D dùng cùng footprint.

## Dựng lại và kiểm tra

Chạy từ thư mục gốc dự án với Blender 5.2 và Node:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python tools/build_private_bench.py
node -e "require('fs').writeFileSync('source-assets/private-bench-v1/runtime-layout.json',JSON.stringify(require('./client/map-3d-layouts').get('bench-private:reference'),null,2))"
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python tools/assemble_private_bench.py
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python tools/assemble_private_bench.py -- --gallery
node tools/verify-private-bench.cjs
```

Để xem model qua HTTP: chạy `node tools/serve-3d-preview.cjs`, mở `http://127.0.0.1:8766/client/assets/3d/private-bench-v1/index.html`. Kiểm tra trình duyệt: `node tools/verify-private-bench-browser.cjs`; fixture không kết nối tài khoản hay máy chủ game thật. Báo cáo lưu tại `client/assets/3d/private-bench-v1/verification.json`.

Kiểm tra gồm: đường đi, biên map, chống tương tác xuyên, hai chỗ/phòng tách biệt, không thoát từ xa, hồi phục sau 5 phút, phím và nút nổi, dừng khi nhả, vị trí ngồi, bảng tên, thay mô-đun, bong bóng/biểu cảm, ngày/đêm và bố cục điện thoại. Gói tin dừng trùng vị trí không làm hủy ghế vừa ngồi. Chưa đo FPS trên điện thoại thật.

`node tools/verify-private-bench-live.cjs` chạy server Socket.IO thật cục bộ với ba client và Supabase được tắt riêng cho tiến trình thử. Kiểm tra đợi 30 giây, hai xác nhận, phòng cặp riêng, chặn người thứ ba, ghế hai chỗ, chat đúng phòng và đi tới cổng để thoát. Báo cáo: `client/assets/3d/private-bench-v1/server-verification.json`. Không dùng thông tin tài khoản hay ghi dữ liệu lên database thật.

Triển khai cần cập nhật cả Cloudflare (client/GLB) và server Render (`server/index.js`, `server/private-bench.js`, layout dùng chung). Không có migration database hay package mới.
