# KanPaint v0.5

KanPaint là trình chỉnh ảnh web phát triển trên nền OpenShop 0.31.0, giữ bố cục quen thuộc kiểu Photoshop/Photopea và tập trung vào Layer, automation/script, asset export và retouch.

## V0.5
- **Skin Retouch non-destructive** tiếp tục là mặc định; ảnh gốc không bị sửa.
- Retouch Layer lưu **mask thô + Feather + Density + toàn bộ thông số retouch**, nên mở lại vẫn chỉnh được.
- **Show red mask overlay**: hiển thị vùng đang được retouch bằng lớp phủ đỏ kiểu Photoshop.
- **Alt + Brush = Erase Mask**: giữ Alt khi quét để xóa mask.
- **Invert Mask**.
- **Feather 0–60 px** và **Density 0–100%**, preview cập nhật khi thả slider.
- **Before / After Split View** với thanh kéo chia ảnh trước/sau.
- Có Output: Retouch Layer — non-destructive / Pixels — destructive.
- Có Edit Active Retouch, Use Selection, Clear Mask, Hold: Before.
- File > Export Layers... và File > Scripts > Script Library... vẫn giữ đúng workflow kiểu Photopea.
- Script API v0.5 thêm `kan.skin.maskInfo()` và `kan.skin.invertMask()`.
- CI kiểm tra cú pháp, build, smoke test, artifact và GitHub Pages.

## Hiệu năng
Mask Feather dùng blur hai lượt theo trục ngang/dọc O(N), không Gaussian lặp nhiều lần. Red mask overlay tự giảm độ phân giải khi ảnh lớn. Preview Skin Retouch vẫn giới hạn khoảng 1.2 MP; Apply mới render full resolution.

## Build local
1. Đặt OpenShop 0.31.0 vào `upstream/`.
2. `npm run check`
3. `npm run build`
4. `npm run smoke`
5. Chạy `START_KANPAINT.bat` hoặc serve `dist/`.

## Giấy phép
KanPaint dựa trên OpenShop của SysAdminDoc / Matthew Parker. Giấy phép MIT gốc được giữ lại.
