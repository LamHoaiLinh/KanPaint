# KanPaint v0.2

KanPaint là trình chỉnh ảnh web phát triển trên nền OpenShop 0.31.0, giữ bố cục quen thuộc kiểu Photoshop/Photopea và bổ sung workflow tập trung vào asset PNG, automation và retouch.

## Có trong v0.2
- File > Export Layers...: xuất Visible / Selected / All layers, PNG trong suốt, Auto Trim theo alpha, padding và ZIP.
- File > Scripts: Run Script và Script Library. Script chạy sandbox; thư viện script lưu local, có import / backup / restore.
- Skin Retouch: brush có thể giới hạn bởi Selection; Amount tổng, Smooth, Light/Dark, Shadow Lift, Shine Reduce, Texture/Pores, Detail Preserve; preview khi thả slider, Apply full-resolution một lần.

## Kiến trúc
KanPaint giữ phần mở rộng ở `src/kanpaint-v02.js` và `src/kanpaint-v02.css`, không tiếp tục phình `index.html` lớn của upstream. `tools/build-kanpaint.mjs` ghép extension vào OpenShop đã pin để tạo `dist/`.

## Build
1. Đặt source OpenShop 0.31.0 vào `upstream/`.
2. Chạy `npm run check`.
3. Chạy `npm run build`.
4. Serve `dist/` bằng HTTP server tĩnh.

GitHub Pages workflow tự checkout upstream đã pin và build KanPaint.

## Giấy phép
KanPaint v0.2 dựa trên OpenShop của SysAdminDoc / Matthew Parker. Giấy phép MIT gốc được giữ lại trong repo.
