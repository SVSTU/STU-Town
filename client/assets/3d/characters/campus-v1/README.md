# Thư viện nhân vật học đường · campus-v1

Bốn GLB: `modular-human.glb`, `student.glb`, `student-female.glb`, `professor.glb`. Cùng cơ thể/khớp của `coop-v1`; mở rộng thành bốn kiểu tóc và bốn trang phục, với hai phụ kiện bật/tắt. Tổng 64 tổ hợp.

- Tóc: `wavy`, `braid`, `gray`, `ponytail`.
- Áo: `polo`, `apron`, `vest`, `uniform`.
- Phụ kiện độc lập: `backpack`, `glasses`.
- Quần/giày và cơ thể là nền chung; các material có tên để tạo thêm biến thể màu về sau. Clone material theo instance nếu cần đổi màu riêng.

```js
const descriptor = CharacterAssets.resolve('campus-modular-01');
// Import descriptor.file rồi gắn vào player host như hiện tại.
CharacterAssets.applyModules(modelRoot, {
  hair: 'ponytail', outfit: 'uniform', accessories: ['backpack']
}, CharacterAssets.campusSlots);
```

Phải dùng `campusSlots` cho thư viện mới; `slots` mặc định vẫn dành cho `coop-v1`, giữ tương thích thư viện cũ. Module có tên `module__slot__option__part`; áo và tay áo đi cùng lựa chọn, gắn đúng shoulder/elbow. Bộ chọn hỗ trợ tên node có namespace của instance. Rig dùng `student_hip/knee/shoulder/elbow_left/right`; `student_head` gắn tên, `student_nose` xác định hướng. Không đổi tên/hierarchy khi chỉnh Blender.

`student-animation.js` hỗ trợ joint có namespace nên preset dùng được cho player và NPC. Thư viện đầy đủ cần gọi `applyModules` để không chồng tóc/áo; ba preset xuất riêng chỉ giữ các phần đã chọn. Rig là transform hierarchy, không có armature/skin weights cho motion-capture.

`preview.html` cho chọn module, xoay, zoom và xem dáng đi. Lựa chọn trong trang thử **chưa lưu vào hồ sơ/server**; đây là nền để bổ sung màn chọn ngoại hình sau này theo yêu cầu. File nguồn ở `source-assets/lecture-v1/characters/`.
