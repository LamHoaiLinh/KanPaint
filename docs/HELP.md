# Hướng dẫn KanPaint 0.1

## 1. Làm đẹp da tự nhiên
1. Mở ảnh và chọn layer ảnh.
2. Nếu muốn giới hạn đúng vùng da, dùng Lasso/Quick Selection để selection vùng da trước.
3. Chọn **Skin Retouch** ở toolbar.
4. Chọn preset **Natural** hoặc **Soft Portrait**.
5. Bấm **Use Selection** nếu đã selection, hoặc dùng brush quét trực tiếp vùng cần chỉnh.
6. Bật **Show red mask overlay** để thấy vùng mask. Giữ **Alt + Brush** để xóa phần quét dư.
7. Tham khảo mức đầu tiên: Smooth 25–45, Shine Reduce 8–20, Texture/Pores 10–25, Detail Preserve 70–90, Feather 4–12 px, Density 60–85%.
8. Bấm **Before / After Split** để kéo thanh chia so sánh trước/sau.
9. Bấm **Apply**. Mặc định KanPaint tạo một **Skin Retouch Layer** riêng, không phá ảnh gốc.
10. Muốn sửa lại, chọn Skin Retouch Layer > Skin Retouch > **Edit Active Retouch**.

## 2. Xử lý bóng dầu / bóng da
- Dùng preset **Shadow Fix** nếu vùng tối cần nâng.
- Tăng **Shine Reduce** cho trán, mũi, cằm bị bóng.
- Nếu hiệu ứng quá mạnh, giảm **Amount** hoặc **Density**.
- Đừng Smooth quá cao; ưu tiên giữ Detail Preserve và Texture/Pores để tránh da nhựa.

## 3. Dùng Script Library
1. Vào **File > Scripts > Script Library…**
2. Script Built-in là script có sẵn và không bị sửa trực tiếp.
3. Bấm **Run** để chạy.
4. Bấm **Copy to Library** nếu muốn tạo bản riêng để sửa.
5. Script riêng được lưu cục bộ trên browser.
6. Có thể Backup/Restore toàn bộ Script Library.

### Script có sẵn nên dùng
- **Skin — Natural setup**: chuẩn bị preset retouch tự nhiên.
- **Skin — Soft Portrait setup**: chân dung mềm.
- **Game Asset — Selected Trim + ZIP**: xuất các layer đang chọn thành PNG trong suốt, trim sát và đóng ZIP.
- **Game Asset — Visible Pack**: xuất toàn bộ layer đang hiện.
- **Game Asset — Rename asset_001…**: đổi tên layer theo thứ tự.
- **Batch — Resize folder to 1024×1024**: chọn folder ảnh và resize canvas bằng batch engine.

## 4. Tạo Script từ mẫu
1. **File > Scripts > New From Template…**
2. Chọn template.
3. Sửa code nếu cần.
4. Bấm Run để thử.
5. Save để lưu vào Script Library.

## 5. Gán phím tắt
Vào **File > Scripts > Assign Hotkeys…**.
Có thể gán phím cho:
- Run Last Script
- Script Library
- Export Layers
- Batch Runner
- Skin Retouch
- KanPaint Guide
- từng script cụ thể

Hotkey mặc định:
- Ctrl+Shift+R: Run Last Script
- Ctrl+Alt+L: Script Library
- Ctrl+Alt+E: Export Layers
- Ctrl+Alt+B: Batch Runner
- Ctrl+Alt+S: Skin Retouch
- Ctrl+Alt+H: Help

## 6. Script Events
Vào **File > Scripts > Script Events…** rồi gắn script vào:
- onOpen
- beforeExport / afterExport
- beforeSave / afterSave
- beforeBatchItem / afterBatchItem
- onError

Ví dụ: có thể gắn script kiểm tra tên layer vào beforeExport hoặc script log vào afterSave.

## 7. Tách asset game
Workflow khuyến nghị:
1. Mỗi tóc/váy/phụ kiện là một layer.
2. Đặt tên dễ hiểu: `hair_long_01`, `dress_blue_01`, `crown_01`.
3. Chọn các layer cần xuất.
4. Chạy **Game Asset — Selected Trim + ZIP** hoặc **File > Export Layers…**
5. Dùng Auto Trim + padding 2–4 px + PNG transparent.

Nếu game cần giữ tọa độ tuyệt đối giữa các asset, đừng trim lúc export hoặc phải lưu offset X/Y riêng. Với đồ thay nhân vật, đây là điểm rất quan trọng.

## 8. Batch Runner
**File > Batch Runner…**
- Chọn nhiều file hoặc cả folder.
- Chọn recipe.
- KanPaint chuyển việc xử lý sang batch engine của OpenShop.
- Có thể tạo script template dùng `kan.batch.pickFolderAndRun()`.

## 9. API version
Script mới nên kiểm tra:
```js
const info = await kan.app.info();
console.log(info.version, info.apiVersion);
```

Ưu tiên API ổn định:
```js
await kan.v1.layers.list();
await kan.v1.export.selected({ trim:true, padding:3, zip:true });
```

Top-level alias vẫn dùng được:
```js
await kan.layers.list();
```
