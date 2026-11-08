# Map ghế riêng — Bộ ảnh tham chiếu 6 góc

Bộ ảnh tạo bằng công cụ imagegen tích hợp, dựa trên phối cảnh đã xem trong cuộc trò chuyện. Bao gồm 1 bảng tổng thể và 10 bảng đối tượng, mỗi bảng có 6 ô hình. Không thay đổi code game và chưa tạo mô hình .blend/.glb.

## Xem ảnh

- [Phối cảnh gốc](00-approved-perspective.png)
- [Tổng thể map](01-map-six-views.png)
- [Chòi nghỉ](02-pergola-six-views.png)
- [Ghế đôi](03-bench-six-views.png)
- [Cây bóng mát](04-tree-six-views.png)
- [Đèn sân vườn](05-lamp-six-views.png)
- [Chậu hoa có đế](06-flower-urn-six-views.png)
- [Bồn hoa tròn](07-round-flowerbed-six-views.png)
- [Hàng rào cây](08-hedge-six-views.png)
- [Cổng xoáy thoát](09-exit-portal-six-views.png)
- [Nhân vật sinh viên](10-student-six-views.png)
- [Mô-đun đường lát](11-paving-six-views.png)

Bảng tổng thể: **Trước, Sau, Trái, Phải, Trên, Phối cảnh**. Các bảng đối tượng: **Trước, Sau, Trái, Phải, Trên, Dưới**.

Đây là hình tham chiếu tạo bằng AI, chưa phải sáu camera chụp cùng một mô hình 3D. Các góc khuất là phương án tái dựng; tán lá, số thanh gỗ, phối cảnh và chi tiết nhỏ có thể lệch giữa các ô. Dùng ảnh phối gốc để chốt phong cách, bảng dưới để chốt tỷ lệ; khi có mesh phải render lại từ sáu camera trực giao để nghiệm thu. Không đo kích thước chính xác từ pixel của bảng ảnh.

## Quy ước khi dựng mô hình

- Đơn vị 1 m; áp dụng scale/rotation trước khi xuất, không dùng scale âm để sửa hướng.
- Trong map Babylon: Y hướng lên; mặt trước map và mặt ngồi của ghế hướng về -Z. Giữ phép đổi hệ tọa độ glTF trong root nhập; chỉnh hướng asset bằng node cha và kiểm tra thực tế sau import, không cộng PI chung cho mọi asset.
- Origin tại giữa đáy tiếp đất. Ghế, chòi, đèn, cây, bồn hoa, cổng và đường lát là các module độc lập; vật liệu gỗ/đá/kim loại dùng chung.
- Bảng ảnh là tài liệu thiết kế. Không dùng ảnh tĩnh thay cho mô hình tương tác hay ảnh chụp kiểm chứng GLB.

| Module | Kích thước mục tiêu (m) | Ghi chú |
|---|---|---|
| Chòi | rộng 3,8; sâu 2,6; cao 2,8 | Bốn trụ riêng, mặt trước và hai bên mở |
| Ghế đôi | rộng 2,1; sâu 0,70; cao 0,95 | Mặt ngồi cao 0,46; hai vị trí ngồi |
| Cây | cao 5; tán rộng khoảng 4 | Thân có va chạm, lá là trang trí |
| Đèn | cao 2,8; chân khoảng 0,35 | Tách khỏi bồn hoa |
| Chậu hoa có đế | cao 1,2; miệng rộng 0,9 | Khối đế cố định |
| Bồn hoa tròn | đường kính 1,7; viền cao 0,25 | Không gộp đường đi vào mesh |
| Hàng rào cây | dài 2; sâu 0,6; cao 0,8 | Đoạn lặp, chừa khoảng ra vào |
| Cổng xoáy | cao 2,2; rộng 1,5; đế rộng 1,8 | Khung và hiệu ứng xoáy tách riêng |
| Sinh viên | cao 1,75 | A-pose, khớp hông/gối/vai/khuỷu để đi và ngồi |
| Đường lát | dài 2; rộng 1,5; dày 0,08 | Lát bằng mặt phẳng, không tạo bậc chắn lối |

## Bố cục mục tiêu

Mặt bằng dự kiến rộng 12 m, sâu 10 m. Cổng vào ở phía trước; chòi và ghế ở giữa phía sau, ghế quay về lối vào. Bồn hoa tròn nằm giữa đường vòng, hai chậu hoa ở hai bên. Đèn đứng riêng ở hai phía sau. Cổng xoáy phía trước bên phải nối với đường chính bằng một nhánh ngắn. Cây và hàng rào ở biên; không chặn cửa chòi hoặc cổng xoáy.

Giữ lối đi rộng tối thiểu khoảng 1,2 m và vùng tiếp cận trước ghế. Kiểm tra khoảng trống với bán kính nhân vật, không chỉ kiểm tra xem mesh có đè nhau hay không.

## Va chạm, ngồi nghỉ và điều khiển

- Collider đơn giản cho thân cây, chân đèn, đế bồn hoa, bốn trụ chòi, ghế và biên map; không tạo hộp đặc bao kín cả chòi. Nhân vật phải đi vào chòi được.
- Ghế có hai seat anchor riêng, cách nhau khoảng 0,65–0,70 m; đo vị trí hông thực tế để ngồi đúng mặt ghế. Có vị trí tiếp cận và đứng dậy không nằm trong vật cản.
- Không gian chỉ dành cho hai thành viên của cặp ghế. Giữ cơ chế không trừ chỉ số và hồi 1 độ mệt sau mỗi 5 phút; tài liệu ảnh không tự thay đổi logic này.
- Dùng phím mũi tên và vùng điều khiển nổi chung một bộ điều khiển, dừng khi nhả. Không thêm click-to-move. Chuột/vuốt dành cho xoay camera.
- Cổng thoát có trigger riêng trong lòng cổng; nhấn nút thoát thì phải đi tới cổng mới chuyển map. Khung cổng có va chạm nhưng không chặn trigger.

## Tiếng Việt và giao diện

- Các nhãn: **Trước, Sau, Trái, Phải, Trên, Dưới, Phối cảnh**; dùng đầy đủ dấu.
- Tên người và thông tin trong game dùng DOM/Babylon GUI với font hỗ trợ tiếng Việt (ví dụ Noto Sans), kiểm tra dấu khi render. Không bake tên/nội dung thay đổi vào texture GLB.
- Chỉ phân biệt người dùng bằng nền tên: **Bạn** xanh, **Khách** cam; không thêm vòng avatar hoặc vòng chọn khi ngồi.
- Mô hình không mang chữ “TRƯỚC/SAU” hoặc nhãn bảng tham chiếu vào game.

Toàn bộ prompt đã dùng được lưu trong [prompts.json](prompts.json).

