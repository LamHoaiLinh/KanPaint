# KanPaint v0.4

KanPaint là trình chỉnh ảnh web phát triển trên nền OpenShop 0.31.0, giữ bố cục quen thuộc kiểu Photoshop/Photopea và tập trung vào Layer, automation/script, asset export và retouch.

## V0.4
- **Skin Retouch non-destructive** là mặc định: bấm Apply sẽ tạo một layer riêng tên **Skin Retouch**, ảnh gốc không bị sửa.
- Retouch layer lưu lại **mask + thông số**. Chọn lại layer đó rồi mở Skin Retouch để chỉnh tiếp.
- Có lựa chọn Output: **Retouch Layer — non-destructive** hoặc **Pixels — destructive**.
- Có **Edit Active Retouch**, Use Selection, Clear Mask và Hold: Before.
- Retouch vẫn có Amount, Smooth, Light/Dark, Shadow Lift, Shine Reduce, Even Skin Tone, Warm/Cool, Texture/Pores, Grain Size, Detail Preserve và 4 preset.
- **File > Export Layers...**: Visible / Selected / All, PNG transparent, Auto Trim alpha, padding và ZIP.
- **File > Scripts**: Run Script, Run Last Script, Script Library; sandbox, tìm kiếm, import/backup/restore và chạy thử.
- Script API v0.4 đọc được danh sách Retouch Layer và có thể mở Retouch Layer đang chọn.
- CI có thêm smoke test sau khi build; GitHub Pages tự deploy khi Pages đã bật.

## Hiệu năng và an toàn
- Ảnh lớn dùng preview proxy khoảng <=1.2 MP; Apply mới render full-resolution.
- Skin smoothing giữ chi tiết bằng Detail Preserve + Texture/Pores.
- Script chạy trong iframe sandbox, không có quyền DOM/network/filesystem trực tiếp.
- Phần KanPaint tiếp tục nằm ngoài core OpenShop trong `src/kanpaint-v04.js` và `src/kanpaint-v04.css`.

## Build local
1. Đặt OpenShop 0.31.0 vào `upstream/`.
2. `npm run check`
3. `npm run build`
4. `npm run smoke`
5. Chạy `START_KANPAINT.bat` hoặc serve `dist/`.

## Giấy phép
KanPaint dựa trên OpenShop của SysAdminDoc / Matthew Parker. Giấy phép MIT gốc được giữ lại.
