# Bộ ảnh tham chiếu nông trại STU-Town

Mở [index.html](index.html) để xem, lọc và phóng to ảnh. Bộ này gồm ảnh phối được chọn, một bảng sáu góc toàn cảnh và 16 bảng vật thể. Đây là ảnh tham chiếu tạo bằng imagegen tích hợp, chưa phải file .glb hoặc ảnh render từ mô hình đã dựng.

## Thứ tự góc nhìn

- Toàn cảnh: hàng trên Trước, Sau, Trái; hàng dưới Phải, Trên, Phối cảnh.
- Vật thể: hàng trên Trước, Sau, Trái; hàng dưới Phải, Trên, Dưới.
- Không đo kích thước trực tiếp từ ảnh: ảnh nhiều góc có thể có chênh lệch chi tiết hoặc phối cảnh. Dùng ảnh gốc để đối chiếu phong cách, dùng layout-spec.json làm quy ước khi dựng.
- Những mặt không thấy trong ảnh gốc được bổ sung đồng nhất về vật liệu và cấu trúc; không xem chúng là dữ liệu quét 3D.

## Phạm vi vật thể

Luống đất; cà rốt; cà chua; bắp; dâu tây; nhà kho và dụng cụ; thùng nước; bình tưới; hàng rào; cây bóng mát; cụm hoa; cổng xoáy; nhân vật sinh viên; chuột; module lát lối đi; biển tên luống. Cây trồng tách khỏi luống để tái sử dụng. Biển tên tách riêng để chữ không phụ thuộc hình học.

## Chữ tiếng Việt

Biển trên asset để trống. Chữ trong game cần được tạo bằng GUI/DynamicTexture hoặc lớp giao diện tương đương, từ chuỗi Unicode có dấu. Dùng font hỗ trợ tiếng Việt như Segoe UI, Arial hoặc Noto Sans; kiểm tra kích thước, dấu và tương phản trên điện thoại. Nhãn chuẩn nằm trong layout-spec.json. Không dùng chữ do ảnh AI tạo ra làm nhãn cuối cùng.

Các nhãn chính: “Luống 1”, “Luống 2”, “Luống 3”, “Luống 4”, “Hạt giống”, “Nông sản”, “Vật phẩm”, “Gieo hạt”, “Thu hoạch”, “Độ đói”, “Sức mạnh”, “Độ mệt”, “Danh tiếng”, “Tiền đồng”, “Đồng vàng sự kiện”, “Thoát map”.

## Quy ước dựng và ghép map

Bố cục dự kiến 16 × 12 m, bốn luống 3,6 × 2,4 m, cao 0,45 m. Giữ trục lối đi giữa và khoảng trống ở cổng; tọa độ trong layout-spec.json là tọa độ đề xuất, chưa thay đổi map đang chạy.

- Dựng theo đơn vị mét, gốc vật thể tại chân/đáy; áp dụng scale trước khi xuất GLB. Giữ tên node quan trọng cho cây, biển, thân cây và phần xoáy chuyển động.
- Với Blender: Z là trục đứng, mặt trước theo -Y; kiểm tra chuyển đổi glTF/Babylon bằng góc nhìn thật, không đặt lại quaternion của gốc nhập tùy tiện.
- Chữ, vệt sáng chọn luống và vòng xoáy là lớp hiển thị riêng. Không gộp chúng vào mesh tĩnh để còn cập nhật được.
- Chia nhóm vật liệu và ghép phần tĩnh phù hợp để giảm số lượt vẽ; dùng mức chi tiết cho cây và cụm lá. Không đánh đổi hình dáng tham chiếu bằng các khối thô.
- Dùng chung đặc tả tọa độ/vùng va chạm cho máy chủ và trình duyệt. Vị trí xuất hiện phải trống; kiểm tra cả đoạn di chuyển để tránh xuyên vật thể.
- Đi bằng phím mũi tên hoặc D-pad. Thả điều khiển, mất tiêu điểm, hủy chạm đều dừng. Phím không xoay camera; kéo/vuốt chỉ điều chỉnh góc nhìn.
- Chỉ tương tác luống đang ở gần, không bị vật thể khác che chắn; máy chủ xác nhận điều kiện trước khi trừ hạt giống/chỉ số hoặc cộng vật phẩm. Không mở bảng cho cả bốn luống.
- Đi đến cổng xoáy mới thoát map; bấm cổng từ xa không dịch chuyển nhân vật.
- Các vật thể trang trí không tự tạo thêm tính năng tưới nước hay mở nhà kho.
- Dùng hệ thống ánh sáng/thời tiết/thời gian hiện có; UI và điều khiển phải nằm trong khung map, không chồng nút trên điện thoại.

## Quy tắc game cần giữ

Bốn luống cộng đồng đồng bộ cho mọi người; túi đồ riêng. Cây cộng đồng không chết. Cây trưởng thành thu 3 nông sản, cây héo thu 1; bộ đếm thời gian theo dữ liệu máy chủ. Giữ quy tắc hiện có về chi phí gieo/thu hoạch và di chuyển trong nông trại.

Bắt chuột nhận +50 điểm danh tiếng và +1 đồng vàng sự kiện (vật phẩm), đồng thời +1 độ mệt và -1 độ đói. Bị cắn mất 5 tiền đồng. Thông tin sự kiện hiển thị bằng khu vực event; không biến đồng vàng thành tiền tệ.

## Nguồn và nội dung tạo ảnh

00-approved-concept.png là ảnh phối đã chọn. prompts.json lưu toàn bộ nội dung tạo ảnh và mô tả từng vật thể. Công cụ: imagegen tích hợp; mỗi vật thể dùng một lần tạo ảnh riêng, cùng ảnh tham chiếu gốc.

