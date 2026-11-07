# Khu A — hợp tác xã mini: bộ tham chiếu dựng 3D

Mẫu chuẩn: `00-approved-concept.png`. Giữ nông trại **tạm khóa**, cổng vàng về bản đồ chính **hoạt động**. Vườn cộng đồng tiếp tục dùng lối vào hiện có trên map chính.

Bộ ảnh gồm 13 bảng: một bảng toàn khu và 12 bảng tham chiếu cho 22 đối tượng/nhóm đối tượng. Mở `index.html` để xem tổng hợp; `manifest.json` ghi đối tượng theo từng hàng và thứ tự sáu hướng. `signs/` chứa chín biển chữ vector riêng. `materials.json` ghi bảng màu và quy ước vật liệu.

## Cách dùng

- Mỗi bảng có sáu hướng: trước, sau, trái, phải, trên, dưới. Các bảng nhiều đối tượng chia theo hàng, mỗi hàng là một đối tượng.
- Dùng concept chuẩn để đối chiếu hình dáng và màu. Mặt khuất do AI suy diễn; kiểm tra hình học khi dựng mesh, không coi các góc là bản vẽ kỹ thuật tuyệt đối.
- Cắt riêng từng ô và từng đối tượng trước khi đưa vào công cụ image-to-3D; không đưa cả bảng nhiều đối tượng để tạo một mesh.
- Dựng vỏ phòng, nền và tường theo module; dựng quầy, cổng, ghế, bảng, props và nhân vật tách rời. Nhân vật không gắn vào quầy.
- Tọa độ và kích thước đề xuất có trong `layout-spec.json`; đây là quy ước dựng lại, không phải số đo trích chính xác từ ảnh.

## Chữ tiếng Việt

`labels.vi.json` là nguồn chữ chuẩn, UTF-8 NFC. Dùng Noto Sans có đầy đủ dấu tiếng Việt hoặc font tương đương. Chữ trên ảnh AI chỉ tham khảo; cần soát lại từng dấu, không đưa thẳng chữ AI thành texture cuối. Tách bảng và chữ thành text mesh/decal, đặt chữ trong vùng an toàn, đủ tương phản, không lặp chữ mặt sau. Khi xuất texture dùng độ phân giải đủ lớn để đọc trong góc game thực tế. Bảng giá và đơn hàng lấy dữ liệu thật của game, không dùng con số minh họa từ concept.

## Quy ước chung

Đơn vị mét, Y hướng lên, cổng vào ở -Z; origin đồ đặt sàn ở tâm đáy. Vật liệu PBR mờ, bo cạnh nhẹ, cùng bảng màu gỗ mật ong/xanh lam/kem/gạch đỏ. GLB riêng từng module; apply transform trước export. Collider đơn giản, vùng tương tác và lối đi không chồng vật cản. Cổng nông trại có collider chặn và phản hồi 'Nông trại hiện chưa mở.'; không dịch chuyển. Cổng về map chính có trigger riêng và VFX vàng tách mesh. Chưa thay đổi gameplay hay asset đang dùng.

## Nguồn tạo

Ảnh được tạo bằng công cụ imagegen tích hợp. Prompt đầy đủ cho từng bảng được lưu trong `prompts.json`. Đây là dữ liệu tham chiếu ảnh, chưa phải asset 3D hoàn chỉnh.

Các lần sửa cuối để bỏ biển thừa, giữ đúng phạm vi đối tượng được lưu trong `refinements.json`. Mẫu chuẩn quyết định diện mạo; thông số JSON quyết định quy ước dựng; không dùng sai lệch giữa các mặt ảnh làm cơ sở thay đổi gameplay. Biển đơn hàng không đồng nghĩa mở tính năng nhiệm vụ của giáo sư.

