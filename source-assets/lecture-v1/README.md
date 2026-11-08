# Nguồn dựng giảng đường

`khu-c-assembled.blend` ghép từ GLB dùng trong game. `runtime-layout.json` là snapshot physics/bố trí; `placements.json` xuất từ scene JS thực. Các `.blend` riêng giữ đối tượng có thể chỉnh sửa; `characters/` giữ thư viện module và ba preset. Backup `.blend1` không thuộc bản bàn giao.

Đơn vị mét; Blender Z-up/-Y trước, xuất GLB Y-up. Collection `GAMEPLAY_COLLIDERS` dạng wire và không render. Tường phía camera được cắt khi render mẫu; các module tường vẫn còn đầy đủ để chỉnh. Nguồn dùng font `C:/Windows/Fonts/arialbd.ttf`; thay bằng font hỗ trợ tiếng Việt nếu dựng trên hệ điều hành khác. Không phân phối font hệ điều hành trong gói.

Chạy `node tools/export-lecture-layout.cjs` trước `tools/assemble_lecture.py` sau khi đổi layout/scene. Có thể dùng `--save-only` để ghép/lưu Blender mà không render. Xem README trong thư mục GLB để biết phạm vi tính năng và các kiểm tra.
