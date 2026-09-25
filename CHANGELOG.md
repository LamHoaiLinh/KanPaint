# Changelog

## 0.5.0
- Added Photoshop-style red Skin Retouch mask overlay.
- Added Alt+Brush mask erasing, Invert Mask, Feather and Density.
- Feather/Density are saved as editable Retouch Layer metadata.
- Added Before/After split comparison with draggable divider.
- Added mask inspection/inversion Script API methods.
- Updated build, smoke tests, artifact naming and Pages deployment for v0.5.

# Changelog

## 0.4.0
- Skin Retouch defaults to a separate editable non-destructive Retouch Layer.
- Retouch layers persist target object ID, parameters and a compressed alpha mask.
- Existing Retouch Layers can be reopened and edited.
- Added Output mode: Retouch Layer or destructive Pixels.
- Added Edit Active Retouch and script APIs for retouch layer discovery/editing.
- Added build smoke-check before artifact upload and Pages deployment.

# Changelog

## 0.3.0
- Fix GitHub Pages bootstrap by enabling Pages from the deployment workflow.
- Upgrade Script Library with search, Run Last Script and Run-before-save.
- Script API: active layer and Skin Retouch preset/introspection APIs.
- Skin Retouch: Selection-to-mask, Clear Mask, presets, Even Skin Tone, Warm/Cool and Grain Size.
- Preview status and large-image proxy preview retained to limit 4K/8K lag.
- Build now targets kanpaint-v03.js / kanpaint-v03.css.

## 0.2.0
- Export Layers + alpha Auto Trim + ZIP.
- Sandboxed Script Engine and local Script Library.
- Initial Skin Retouch brush with master Amount and release-to-preview sliders.
