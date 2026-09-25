# KanPaint Script API v0.2

Scripts are JavaScript and may use `await` at top level.

```js
const doc = await kan.document.info();
const layers = await kan.layers.list();
await kan.ui.toast(`Canvas ${doc.width}x${doc.height}; layers ${layers.length}`);
```

## API

```js
await kan.document.info();
await kan.layers.list();
await kan.layers.export({ scope:'visible', trim:true, padding:0, zip:true });
await kan.layers.rename(layerId, 'New name');
await kan.layers.setVisible(layerId, true);
await kan.selection.info();
await kan.ui.toast('Message', 'info');
```

v0.2 intentionally does not expose raw DOM, arbitrary network calls, direct
filesystem access, or unrestricted pixel mutation. Later APIs should preserve
Undo/Redo by routing mutations through KanPaint commands.
