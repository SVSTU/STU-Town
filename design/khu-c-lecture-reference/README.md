# Khu C · Giảng đường: tham chiếu map và asset 3D

Mẫu chuẩn: `00-approved-concept.png`. Mở `index.html` để xem toàn bộ. 12 bảng gồm sáu hướng của toàn giảng đường và 11 bảng cho 25 đối tượng/nhóm đối tượng. Trước, sau, trái, phải, trên, dưới; các bảng nhiều hàng có một đối tượng mỗi hàng. `manifest.json` ghi nội dung và thứ tự ảnh.

## Cách dựng

- Dùng ảnh chuẩn quyết định màu sắc/hình khối; dùng `layout-spec.json` làm quy ước kích thước đề xuất. Các kích thước không phải số đo trích chính xác từ ảnh AI.
- Sáu bàn đôi, mỗi bàn hai ghế, 12 chỗ ngồi; hai khối trái/phải, mỗi khối ba hàng. Ghế quay về bảng. Giữ lối đi giữa, lối bên và khoảng ra/vào ghế. Bục giảng, cửa ra và điểm xuất hiện không được chặn nhau.
- Cắt riêng từng đối tượng và từng góc trước khi đưa vào công cụ image-to-3D. Không tạo một mesh từ cả bảng nhiều vật thể. Ghế, bàn, sách, người và thiết bị phải độc lập.
- Mét, Y-up khi xuất glTF; source Blender Z-up. Apply transform, đặt origin nhất quán, ghi rõ hướng mặt, độ dày, điểm gắn tường/trần. Collider đơn giản tách khỏi render mesh và bao footprint mesh cuối.
- Dùng instance cho sáu bàn/12 ghế, chia sẻ vật liệu, bo cạnh vừa đủ, kiểm tra normals và mesh giao nhau. Không bake chữ giao diện, nhân vật hay VFX vào tường/nền.
- Nhân vật có thể dùng lại thư viện `client/assets/3d/characters/coop-v1` và tên khớp hiện có khi triển khai. Tóc/trang phục/phụ kiện tách rời; ảnh A-pose không tự tạo rig hay skin weights.

## Chữ tiếng Việt

`labels.vi.json` là nguồn chữ chuẩn UTF-8 NFC. `signs/` chứa biển vector có chữ đầy đủ dấu để làm lớp chữ riêng. Dùng font Noto Sans/Arial hỗ trợ tiếng Việt, chữ đậm, tương phản rõ và có vùng đệm. Chuyển chữ thành outline hoặc raster có kiểm tra font trước khi xuất. Không dùng chữ sinh bởi AI làm texture cuối; kiểm tra từng dấu và khả năng đọc trong camera game. Mặt sau biển không lặp/chữ ngược. Giờ học giữ 07:00–11:30 và 13:00–17:00 theo mẫu hiện tại.

## Giới hạn và xác minh

Ảnh được tạo bằng công cụ imagegen tích hợp; `prompts.json` chứa prompt đầy đủ. Sáu góc là dữ liệu tham khảo, không phải bản scan hoặc bản vẽ cơ khí chính xác: AI có thể suy diễn mặt khuất và giữ phối cảnh nhẹ. Khi có mesh cần render lại sáu góc orthographic thật để đối chiếu, kiểm tra va chạm, lối đi và camera desktop/mobile. Bộ này chưa tạo GLB/Blender mới và chưa đổi gameplay, giờ mở cửa hoặc map đang chạy.

