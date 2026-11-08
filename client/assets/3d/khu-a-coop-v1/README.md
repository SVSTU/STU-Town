# Khu A · Hợp tác xã mini

21 GLB môi trường độc lập, dựng bằng Blender từ `design/khu-a-coop-reference/00-approved-concept.png`. Mesh thật, không phải ảnh ghép/billboard. Tham chiếu hình ảnh được diễn giải thành hình khối low-poly; không cam kết khớp từng chi tiết của ảnh AI.

## Sử dụng

- `node tools/serve-3d-preview.cjs`, mở `http://127.0.0.1:8766/tools/map3d-smoke.html?map=khu-a` để kiểm tra map bằng fixture cục bộ, không giao dịch với người chơi thật.
- `client/khu-a-coop-scene.js` ghép GLB; `client/map-3d-layouts.js` là nguồn tọa độ, spawn, cổng thoát và collider dùng chung client/server. Quy đổi 34 px/m, tâm (400,300). Collider `w,d` là **nửa** kích thước theo px.
- Sinh viên, giáo sư, thương nhân dùng preset từ `characters/coop-v1`, không gộp nhân vật vào quầy. Điểm xuất hiện ở giữa phòng, tránh bị cổng trước che.
- `source-assets/khu-a-coop-v1/` chứa Blender riêng từng asset, nhân vật, `runtime-layout.json` và `khu-a-assembled.blend`. Collection `GAMEPLAY_COLLIDERS` chỉ dành cho gameplay, dạng wire và không render.

## Tính năng

Hai quầy dùng dịch vụ thương nhân hiện có: mua hạt/bán nông sản, có kiểm tra tiền/túi đồ/khoảng cách ở server. Hồi phục giữ giá 500 và hiệu ứng hiện có. Giáo sư/đơn hàng chưa mở. Cổng vàng ở trước đưa về `campus`; nông trại `personal-farm` đóng, có xích/ổ khóa và thông báo khi tương tác. Vườn cộng đồng `farm` vẫn vào từ sân trường. Bản cập nhật không mở nông trại cá nhân hay nhiệm vụ.

## Quy ước 3D

- Mét; Blender Z-up, mặt trước -Y. GLB Y-up, không đổi tọa độ mô hình bằng tay. Runtime Babylon dùng cùng lớp chuyển hướng như căn tin/vườn cộng đồng; nhãn và hướng tiếp cận là -Z.
- Origin đặt sàn ở tâm đáy/mặt sàn; bảng treo bắt đầu ở cạnh dưới, đèn/cây treo dùng điểm gắn. `manifest.json` có bounds thực từ mesh. Một số chân/bậc nền nằm dưới 0 có chủ ý.
- Vật liệu PBR mờ dùng lại; bo cạnh một đoạn cho đồ môi trường; nền lát bằng quad để giảm đỉnh. Collider hộp đơn giản bao được footprint render, tách khỏi mesh trang trí. Không đặt collider trên lá, chữ hay VFX.
- Biển dùng text mesh Unicode NFC dựng từ Arial Bold có dấu tiếng Việt. Không dùng chữ từ ảnh AI. Nội dung động về giá/đơn hàng giữ trong UI, không ghi giá giả vào bảng. Chỉ cổng đang mở có VFX vàng; VFX tách khỏi hình học cổng.
- Phòng mở mái, tường trước/bên thấp để nhìn được nhân vật; lối giữa thông đến mọi dịch vụ. Không cho thao tác xuyên vật cản hoặc sau lưng quầy. Bàn phím và pad dùng cùng controller.

## Dựng và kiểm tra lại

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python tools/build_khu_a_coop.py
node -e "require('fs').writeFileSync('source-assets/khu-a-coop-v1/runtime-layout.json',JSON.stringify(require('./client/map-3d-layouts').get('khu-a'),null,2))"
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python tools/assemble_khu_a_coop.py
node tools/verify-coop-assets.cjs
node tools/verify-map3d.cjs
node tools/verify-interactions.cjs
node tools/verify-student-controls.cjs
node tools/verify-coop-browser.cjs
```

Browser test cần server preview trên 8766 và Chrome. Có thể đặt ba thư viện Babylon chính thức hiện game dùng vào `tools/.preview-cache/` (`babylon.js`, `babylon.gui.min.js`, `babylonjs.loaders.min.js`) để test offline; server chỉ thay nguồn tải của HTML preview, CDP cũng có fallback cache. Không đổi CDN trang game. `verification.json` và `previews/map-*.png` ghi kết quả chạy thực tế; `assembled-*.png` render từ GLB bằng Blender. Kiểm tra viewport điện thoại là smoke test trên Chrome/SwiftShader, chưa phải đo FPS trên máy điện thoại thật.
