# KanPaint 0.1

**KanPaint 0.1 là bản bắt đầu sử dụng chính thức.** Các số phiên bản 0.2–0.5 trước đây được xem là prototype trong quá trình phát triển và không còn là dòng version phát hành.

KanPaint phát triển trên nền OpenShop 0.31.0, giữ workflow quen thuộc kiểu Photoshop/Photopea nhưng bổ sung các công cụ tập trung vào retouch, layer asset và automation.

## Giao diện
- Tone **xanh lá pastel** sáng, dễ nhìn.
- Menu trên, toolbar trái, canvas giữa, layer/panel bên phải.
- File > Export Layers…
- File > Batch Runner…
- File > Scripts > Run Script / Run Last Script / Script Library / New From Template / Script Events / Assign Hotkeys
- Help > KanPaint Guide…

## Skin Retouch
- Non-destructive Retouch Layer mặc định.
- Natural / Soft Portrait / Shadow Fix / Texture Restore.
- Smooth, Light/Dark, Shadow Lift, Shine Reduce, Even Skin Tone, Warm/Cool, Texture/Pores, Grain Size, Detail Preserve.
- Red mask overlay, Alt+Brush để xóa mask, Invert Mask, Feather, Density.
- Before/After Split View.
- Selection có thể dùng làm retouch mask.

## Automation API v1
API ổn định bắt đầu tại **1.0** và được expose qua cả `kan.v1.*` lẫn alias ngắn `kan.*`.

Nhóm API:
- `kan.layers`: list, active, select, rename, visible/lock/opacity, move, duplicate, remove, resize, trim, export.
- `kan.selection`: info, selectAll, clear, invert, expand, contract, feather.
- `kan.filters`: brightness/contrast, hue/saturation, blur, sharpen, grayscale, invert.
- `kan.export`: selected, visible, all, layers.
- `kan.batch`: chọn nhiều file hoặc folder và chạy OpenShop command recipe.
- `kan.skin`: preset, retouch layer, mask.
- `kan.document.resize()`.
- `kan.ui.toast()`.

## Script Library có sẵn
KanPaint kèm các script thực chiến:
- Skin — Natural setup
- Skin — Soft Portrait setup
- Game Asset — Selected Trim + ZIP
- Game Asset — Visible Pack
- Game Asset — Rename asset_001…
- Batch — Resize folder to 1024×1024

## Automation
- Script Templates.
- Hotkey cho lệnh automation và từng script.
- Script Events: `onOpen`, `beforeExport`, `afterExport`, `beforeSave`, `afterSave`, `beforeBatchItem`, `afterBatchItem`, `onError`.
- Batch Runner dùng batch engine của OpenShop.
- API versioning v1 để script cũ tiếp tục chạy khi KanPaint nâng cấp.

## Build local
1. Đặt OpenShop 0.31.0 vào `upstream/`.
2. `npm run check`
3. `npm run build`
4. `npm run smoke`
5. Serve thư mục `dist/` hoặc chạy launcher hiện có.

## Tài liệu
- `docs/HELP.md` – hướng dẫn sử dụng.
- `docs/SCRIPTING_V1.md` – Automation API v1.
- `docs/V0.1.md` – phạm vi bản 0.1.

## Giấy phép
KanPaint dựa trên OpenShop của SysAdminDoc / Matthew Parker và giữ giấy phép MIT gốc.
