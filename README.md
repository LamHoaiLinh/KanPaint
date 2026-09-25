# KanPaint v0.3

KanPaint là trình chỉnh ảnh web phát triển trên nền OpenShop 0.31.0, giữ bố cục quen thuộc kiểu Photoshop/Photopea và tập trung vào Layer, automation/script và retouch.

## V0.3
- Sửa workflow GitHub Pages: cho phép workflow tự bật Pages khi repository chưa được cấu hình.
- **File > Export Layers...**: Visible / Selected / All layers, PNG trong suốt, Auto Trim alpha, padding, ZIP.
- **File > Scripts**: Run Script, Run Last Script, Script Library; thư viện có tìm kiếm, import/backup/restore và chạy thử ngay trong editor script.
- Script API v0.3: document info, layer list/active/export/rename/visibility, selection info, Skin Retouch presets và toast.
- **Skin Retouch v0.3**: Amount tổng, Smooth, Light/Dark, Shadow Lift, Shine Reduce, Even Skin Tone, Warm/Cool, Texture/Pores, Grain Size, Detail Preserve.
- Preset: Natural, Soft Portrait, Shadow Fix, Texture Restore.
- Có **Use Selection** để lấy vùng selection hiện tại làm retouch mask và **Clear Mask** để làm lại.
- Slider đổi giá trị trực tiếp; preview render khi thả slider. Ảnh lớn dùng proxy preview, Apply mới render full-resolution.

## Kiến trúc
Phần KanPaint nằm ở `src/kanpaint-v03.js` và `src/kanpaint-v03.css`. Core OpenShop được pin trong workflow/build, tránh tiếp tục phình `index.html` upstream.

## Build local
1. Đặt OpenShop 0.31.0 vào `upstream/`.
2. `npm run check`
3. `npm run build`
4. Chạy `START_KANPAINT.bat` hoặc serve thư mục `dist/`.

## Giấy phép
KanPaint dựa trên OpenShop của SysAdminDoc / Matthew Parker. Giấy phép MIT gốc được giữ lại.
