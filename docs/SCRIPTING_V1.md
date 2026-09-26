# KanPaint Automation API v1

Current API version: **1.0**

## Versioning
```js
const info = await kan.app.info();
// { version: "0.1.0", apiVersion: "1.0" }
```

Stable namespace:
```js
kan.v1
```

Top-level aliases such as `kan.layers` remain available. `kan.layers.getAll()` is kept as a compatibility alias of `list()`.

## Document
```js
await kan.document.info();
await kan.document.resize(1280, 720);
```

## Layers
```js
const layers = await kan.layers.list();
const active = await kan.layers.active();

await kan.layers.select(id);
await kan.layers.rename(id, "hair_long_01");
await kan.layers.setVisible(id, true);
await kan.layers.setLocked(id, false);
await kan.layers.setOpacity(id, 80);
await kan.layers.move(id, 0);
await kan.layers.duplicate(id);
await kan.layers.remove(id);
await kan.layers.resize(id, { percent:50 });
await kan.layers.resize(id, { width:512, keepAspect:true });
await kan.layers.trim(id, { padding:3 });
```

`trim()` rasterize layer. Duplicate first if vector/text editability matters.

## Selection
```js
await kan.selection.info();
await kan.selection.selectAll();
await kan.selection.clear();
await kan.selection.invert();
await kan.selection.expand(4);
await kan.selection.contract(2);
await kan.selection.feather(6);
```

## Filters
Filters apply to the active image/pixel layer.
```js
await kan.filters.brightnessContrast({ brightness:10, contrast:8 });
await kan.filters.hueSaturation({ hue:5, saturation:12 });
await kan.filters.blur(2);
await kan.filters.sharpen(35);
await kan.filters.grayscale();
await kan.filters.invert();
```

## Export
```js
await kan.export.selected({ trim:true, padding:3, zip:true });
await kan.export.visible({ trim:true, padding:0, zip:true });
await kan.export.all({ trim:false, zip:true });
```

## Batch
Batch uses OpenShop command recipes.
```js
await kan.batch.pickFolderAndRun([
  {
    schemaVersion:1,
    id:"canvas.resize",
    args:{ width:1024, height:1024 }
  }
], { format:"png" });
```

Or select individual files:
```js
await kan.batch.pickAndRun(commands, { format:"png" });
```

## Skin Retouch
```js
await kan.skin.preset("natural");
await kan.skin.info();
await kan.skin.layers();
await kan.skin.editActive();
await kan.skin.maskInfo();
await kan.skin.invertMask();
```

## UI
```js
await kan.ui.toast("Hoàn tất", "success");
```

## Sandbox
Scripts run inside an iframe sandbox. They do not receive arbitrary DOM, network or filesystem access. File/folder access is brokered by explicit KanPaint API calls.
