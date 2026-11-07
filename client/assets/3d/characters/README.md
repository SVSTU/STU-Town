# Thư viện nhân vật sinh viên

`student-male-01.glb` là model mặc định được dựng từ bộ ảnh sinh viên sáu góc, có vật liệu PBR và texture vải. File chỉnh sửa Blender nằm tại `source-assets/characters/student-male-01.blend`. Chạy `tools/build_student_character.py` bằng Blender để tái tạo asset; `tools/render_built_assets.py -- --student` render lại sáu góc từ GLB đã xuất.

## Dùng trong game

`client/character-assets.js` là danh mục mẫu nhân vật. Bộ render dùng `CharacterAssets.resolve(player.characterAssetId)`; mã không hợp lệ quay về mẫu mặc định và không được dùng làm URL tải model tùy ý. Khi thêm mẫu mới, thêm GLB và một mục danh mục mới. Cơ chế này chuẩn bị cho chức năng lựa chọn hình dáng sau này; chưa thêm màn hình chọn, API lưu lựa chọn hoặc thay đổi schema hồ sơ.

Mọi người dùng chung model mặc định, phân biệt bạn/khách bằng màu nền tên. Đối tượng tên bám vào đầu model. Không dùng avatar tròn làm nhân vật 3D. Bóng tiếp xúc là lớp mờ dưới chân, được ẩn khi ngồi ghế.

## Hợp đồng hoạt ảnh

- Đơn vị mét, cao khoảng 1,78 m, gốc tại chân; mặt trước Blender -Y.
- Các node `student_hip_left/right`, `student_knee_left/right`, `student_shoulder_left/right`, `student_elbow_left/right` phải giữ tên. Gối là con của hông, khuỷu tay là con của vai; bàn chân đi theo gối.
- `student_head` và `student_nose` là điểm tham chiếu cho tên và hướng mặt. Không xóa khi tối ưu mesh.
- Danh mục có `seatOffset` để hiệu chỉnh độ cao ngồi theo vị trí hông; model mặc định dùng 0,20 m cho ghế đài phun nước.
- Các nhóm thân, đầu/tóc, cánh tay và chân được tách theo khớp. Đây là rig bằng node chuyển đổi, dùng trực tiếp với `student-animation.js`; không tự nhận là model đã skin theo chuẩn xương humanoid.
- Vật liệu có tên `char.skin`, `char.hair`, `char.shirt`, `char.trim`, `char.trousers`, `char.shoes` để mở rộng ngoại hình. Khi thay vật liệu cho một người, cần clone vật liệu trước để không đổi đồng thời các nhân vật khác.
- Mẫu mới phải tuân theo cùng hợp đồng khớp hoặc có bộ chuyển đổi hoạt ảnh riêng. Giữ tỷ lệ va chạm và kiểm tra dáng đi/ngồi trước khi đưa vào danh mục.

Ảnh trong `previews/` được render từ GLB bằng Blender, không phải ảnh phối AI. Xem `preview.html` để mở đủ sáu góc.
