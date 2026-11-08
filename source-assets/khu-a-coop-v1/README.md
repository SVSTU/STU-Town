# Nguồn Blender · Khu A hợp tác xã

`khu-a-assembled.blend` là map đã ghép từ chính các GLB game dùng. Mỗi asset có `.blend` riêng ở thư mục này; nhân vật nằm trong `characters/`. Các bản `.blend1` là backup của Blender, không thuộc gói bàn giao.

`runtime-layout.json` chụp cấu hình từ `client/map-3d-layouts.js`, gồm collider và vị trí dùng chung với server. Cần tạo lại file này và chạy `tools/assemble_khu_a_coop.py` sau khi thay tọa độ. Bộ render thật nằm ở `client/assets/3d/khu-a-coop-v1/previews/`.

Dùng `tools/build_khu_a_coop.py` và `tools/asset_modeling.py` để dựng lại; Blender 5.2, font `C:/Windows/Fonts/arialbd.ttf`. Nếu đổi hệ điều hành, thay đường dẫn bằng font hỗ trợ đầy đủ dấu tiếng Việt. Gói không phân phối file font của hệ điều hành.

Nguồn phòng dùng Z-up, -Y hướng mặt trước; runtime GLB dùng Y-up. Collection wire `GAMEPLAY_COLLIDERS` không được xuất làm hình học render. Không bake nhân vật, chữ giao diện động hoặc VFX vào nền phòng. Rig nhân vật dùng tám khớp transform của controller hiện tại; giữ tên và hierarchy khi tạo thêm tóc/áo/phụ kiện.

Đọc thêm hai README trong các thư mục GLB để biết API module, tương tác, trạng thái khóa và kiểm thử. Chưa triển khai lên hosting/server bên ngoài.
