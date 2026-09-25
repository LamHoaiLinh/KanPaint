# KanPaint Script API v0.4

Script là JavaScript và hỗ trợ `await` ở top level.

```js
const doc = await kan.document.info();
const active = await kan.layers.active();
await kan.ui.toast(`Canvas ${doc.width}x${doc.height} · ${active?.name || 'No active layer'}`);
```

## API
```js
await kan.document.info();

await kan.layers.list();
await kan.layers.active();
await kan.layers.export({ scope:'visible', trim:true, padding:0, zip:true });
await kan.layers.rename(layerId, 'New name');
await kan.layers.setVisible(layerId, true);

await kan.selection.info();

await kan.skin.info();
await kan.skin.preset('natural'); // natural | soft | shadow | texture
await kan.skin.layers();          // danh sách Retouch Layer
await kan.skin.editActive();      // mở Retouch Layer đang chọn

await kan.ui.toast('Message', 'info');
```

## Script Library
File > Scripts > Script Library. V0.3 có tìm kiếm script, import .js, backup/restore, Run trong editor và Run Last Script.

## An toàn
V0.3 không cấp raw DOM, network tùy ý, filesystem trực tiếp hay pixel mutation tùy ý. Mọi API ghi mới nên tiếp tục đi qua bridge/command để bảo toàn Undo/Redo.
