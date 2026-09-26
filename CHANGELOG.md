# Changelog

## 0.1.0 — First usable release

### Startup reliability hotfix
- Vendored the three startup-critical libraries (Fabric.js, ag-psd and jsPDF) into the built KanPaint site so the welcome screen no longer waits on jsDelivr before the editor can initialize.
- Build-time SHA-384 verification keeps the same pinned-integrity guarantee while runtime loading becomes same-origin.
- Pre-cached the boot libraries in the service worker and bumped the shell revision.
- Rebranded the welcome screen to KanPaint.
- Changed the File/Edit/Select/Image/Filter/AI/View application bar and its dropdowns to dark chrome matching the workspace.

### Toolbox usability hotfix
- Changed the desktop toolbox to a dark workspace-style surface while keeping the rest of KanPaint pastel green.
- Enlarged the desktop toolbox from the cramped 104px two-column layout to a 144px two-column layout with larger icons and readable family labels.
- Fixed registry flyouts after OpenShop portals them into `#flyout-host`; the original descendant CSS no longer matched after the move, which collapsed choices to roughly icon width.
- Tool flyouts now use a dark 276px panel, 38px rows, readable 12px names, visible shortcuts and no duplicate tooltip text.

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
