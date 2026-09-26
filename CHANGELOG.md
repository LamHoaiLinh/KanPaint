# Changelog

## 0.1.0 — First usable release

### Dropzone hotfix
- Fixed the full-screen “Drop files here” overlay remaining visible after a file was successfully added to the canvas.
- Added capture-phase and next-frame safety cleanup so future canvas handlers cannot leave the overlay stuck.
- Forced the pastel-green palette across upstream saved theme classes.
- Bumped the offline shell revision so browsers receive the fix instead of serving the previous cached build.
KanPaint reset version line về **0.1**. Các version 0.2–0.5 trước đây là prototype nội bộ trong quá trình xây nền.

### Editor & UI
- Pastel-green Photoshop/Photopea-style interface.
- Export Layers with transparent PNG, exact alpha trim, padding and ZIP.
- Non-destructive Skin Retouch layers with editable metadata.

### Skin Retouch
- Smooth, Light/Dark, Shadow Lift, Shine Reduce, Even Skin Tone, Warm/Cool.
- Texture/Pores, Grain Size, Detail Preserve.
- Natural, Soft Portrait, Shadow Fix, Texture Restore presets.
- Red mask overlay, Alt+Brush erase, Invert, Feather and Density.
- Before/After split comparison.

### Automation API v1
- Stable `kan.v1` namespace and top-level compatibility aliases.
- Layer rename, selection, visibility, lock, opacity, move, duplicate, delete, resize, destructive trim and export.
- Selection select-all, clear, inverse, expand, contract and feather.
- Filters: brightness/contrast, hue/saturation, blur, sharpen, grayscale and invert.
- Document resize.
- Selected/visible/all layer export.
- Batch files/folder via OpenShop command recipes.

### Scripts & automation
- Script Library and templates.
- Built-in portrait and game-asset scripts.
- Hotkeys for automation commands and individual scripts.
- Script Events: onOpen, beforeExport, afterExport, beforeSave, afterSave, beforeBatchItem, afterBatchItem and onError.
- Integrated KanPaint Guide for retouch, scripts, assets, batch and API.

### Compatibility
- Sandboxed scripts.
- API v1 begins at 1.0.
- Legacy shortcut `kan.layers.getAll()` remains an alias for `kan.layers.list()`.
