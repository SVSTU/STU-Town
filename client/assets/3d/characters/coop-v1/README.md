# Nhân vật module · coop-v1

`modular-human.glb` chứa thư viện; `student.glb`, `professor.glb`, `merchant.glb` là ba preset xuất riêng, không có phần trang phục dư đè lên nhau. File Blender nguồn nằm tại `source-assets/khu-a-coop-v1/characters/`.

Chung tỷ lệ, điểm gắn và tám khớp `student_hip/knee/shoulder/elbow_left/right`, tương thích `student-animation-v1`. Đầu `student_head` dùng gắn tên; `student_nose` xác định hướng mặt. Rig là cây TransformNode cho chuyển động hiện tại, **không phải** armature skinned cho retarget motion-capture. Khi cần mocap phải thêm skeleton/weights tương ứng.

## Các lựa chọn

- Tóc: `wavy`, `braid`, `gray`.
- Trang phục: `polo`, `apron`, `vest`; thân áo và tay áo cùng lựa chọn, theo đúng khớp khi đi.
- Phụ kiện bật/tắt riêng: `backpack`, `glasses`.
- Slot vật liệu đặt tên: `char.skin`, `char.hair`, `char.gray`, `char.shirt`, `char.trim`, `char.trousers`, `char.shoes`, `char.apron`, `char.vest`. Khi đổi màu theo từng người phải clone material cho instance, không sửa material dùng chung.

```js
const descriptor = CharacterAssets.resolve('coop-modular-01');
// Sau khi import GLB, gắn root vào player và bindStudentAnimation như runtime.
CharacterAssets.applyModules(modelRoot, {
  hair: 'braid', outfit: 'apron', accessories: ['glasses']
});
```

Mỗi nhóm dùng tên `module__slot__option__part`, ví dụ `module__outfit__polo__sleeve_left`. Module gắn vào joint, không phải gắn toàn bộ quần áo vào root. Đổi module chỉ bật/tắt nhóm phù hợp, không xóa rig hay tải URL người dùng cung cấp. Giữ hierarchy và tên joints khi chỉnh trong Blender. Raw library sẽ chồng các lựa chọn nếu không gọi `applyModules`; dùng preset nếu công cụ ngoài không có bộ chọn module.

`CharacterAssets.normaliseModules` kiểm tra whitelist, loại phụ kiện trùng và giá trị lạ. Có 36 tổ hợp hợp lệ (3 tóc × 3 trang phục × 4 tập phụ kiện). Khu A tự dùng sinh viên mới nếu người chơi chưa có asset được chọn hợp lệ; các map khác giữ nhân vật hiện có.

Mở `preview.html` qua server preview để thử chọn module, xoay, zoom và xem dáng đi. Đây là công cụ thử asset. Chưa bổ sung lưu module vào hồ sơ/server hoặc màn chọn ngoại hình cho người chơi; API và file được chuẩn bị để tích hợp bước đó sau này.
