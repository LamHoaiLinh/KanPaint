'use strict';

/*
 * KanPaint v0.3 extension layer.
 * Upstream core remains in index.html. This file intentionally owns new
 * features so later versions can be split into modules without growing the
 * already-large upstream core.
 */
(() => {
    const VERSION = '0.3.0';
    const SCRIPT_LIBRARY_KEY = 'kanpaint.script-library.v1';
    const SCRIPT_RECENT_KEY = 'kanpaint.script-recent.v1';
    const SCRIPT_LIMIT = 50;
    const SCRIPT_BYTES = 256 * 1024;
    const SCRIPT_TOTAL_BYTES = 2 * 1024 * 1024;
    const LIVE_PREVIEW_PIXELS = 1_200_000;

    const kp = window.KanPaint = window.KanPaint || {};
    kp.version = VERSION;

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v) || 0));
    const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve()));
    const tick = () => new Promise(resolve => setTimeout(resolve, 0));
    const textBytes = value => new Blob([String(value || '')]).size;
    const safeName = (value, fallback = 'Layer') => {
        const cleaned = String(value || '').trim().replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').replace(/\s+/g, ' ').slice(0, 120);
        return cleaned || fallback;
    };
    const el = (tag, attrs = {}, children = []) => {
        const node = document.createElement(tag);
        Object.entries(attrs).forEach(([key, value]) => {
            if (key === 'class') node.className = value;
            else if (key === 'text') node.textContent = value;
            else if (key === 'type') node.type = value;
            else if (key === 'checked') node.checked = Boolean(value);
            else if (key === 'value') node.value = value;
            else if (key === 'dataset') Object.entries(value || {}).forEach(([k, v]) => { node.dataset[k] = v; });
            else if (key in node && !key.startsWith('aria')) node[key] = value;
            else node.setAttribute(key, String(value));
        });
        (Array.isArray(children) ? children : [children]).filter(Boolean).forEach(child => node.append(child));
        return node;
    };
    const button = (label, className = 'btn') => el('button', { type:'button', class:className, text:label });

    function closeModal(overlay) {
        if (!overlay) return;
        overlay.remove();
    }
    function modal(title, { widthClass = '' } = {}) {
        const overlay = el('div', { class:'kp-modal-overlay' });
        const box = el('section', { class:`kp-modal ${widthClass}`.trim(), role:'dialog', 'aria-modal':'true' });
        const heading = el('h3', { text:title });
        box.append(heading);
        overlay.append(box);
        document.body.append(overlay);
        overlay.addEventListener('mousedown', event => { if (event.target === overlay) closeModal(overlay); });
        const esc = event => {
            if (event.key !== 'Escape' || !overlay.isConnected) return;
            closeModal(overlay);
            document.removeEventListener('keydown', esc, true);
        };
        document.addEventListener('keydown', esc, true);
        return { overlay, box, close:() => closeModal(overlay) };
    }

    // ---------------------------------------------------------------------
    // Layer export: PNG, per layer, exact alpha trim, optional padding + ZIP.
    // Uses the upstream rasterizer but scans only the candidate object bounds,
    // avoiding a full-document RGBA allocation for every layer.
    // ---------------------------------------------------------------------
    const LayerExport = {
        _scopeLayers(scope = 'visible') {
            const layers = Array.isArray(OS.layers) ? OS.layers : [];
            const selected = new Set(OS._selectedLayerIds || []);
            if (!selected.size && layers[OS.activeLayerIdx]?.id) selected.add(layers[OS.activeLayerIdx].id);
            return layers.map((layer, index) => ({ layer, index })).filter(({ layer }) => {
                if (!layer || layer.kind === 'group') return false;
                const objects = (layer.objects || []).filter(object => object?.name !== '__boundary__' && !object?.excludeFromExport);
                if (!objects.length) return false;
                if (scope === 'all') return true;
                if (scope === 'selected') return selected.has(layer.id);
                const group = typeof OS._getPSDGroupState === 'function' ? OS._getPSDGroupState(layer) : { visible:true };
                return layer.visible !== false && group.visible !== false;
            });
        },
        _alphaBounds(canvas) {
            const ctx = canvas.getContext('2d', { willReadFrequently:true });
            const width = canvas.width, height = canvas.height;
            if (!ctx || !width || !height) return null;
            const data = ctx.getImageData(0, 0, width, height).data;
            let minX = width, minY = height, maxX = -1, maxY = -1;
            for (let y = 0; y < height; y++) {
                let row = (y * width) * 4 + 3;
                for (let x = 0; x < width; x++, row += 4) {
                    if (data[row] === 0) continue;
                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                }
            }
            return maxX < minX ? null : { x:minX, y:minY, width:maxX-minX+1, height:maxY-minY+1 };
        },
        _renderOne(layer, { trim = true, padding = 0 } = {}) {
            const report = { warnings:[] };
            const rendered = OS._renderLayerCanvasForPSD(layer, report);
            if (!rendered?.canvas) return null;
            const groupState = typeof OS._getPSDGroupState === 'function' ? OS._getPSDGroupState(layer) : { opacity:1 };
            const opacity = clamp((rendered.opacity ?? 1) * (groupState.opacity ?? 1), 0, 1);
            if (opacity <= 0) return null;

            if (!trim) {
                const full = document.createElement('canvas');
                full.width = Math.max(1, Math.round(OS.canvasW));
                full.height = Math.max(1, Math.round(OS.canvasH));
                const ctx = full.getContext('2d');
                ctx.globalAlpha = opacity;
                ctx.drawImage(rendered.canvas, 0, 0);
                return full;
            }

            const rough = OS._oraLayerBounds(layer, rendered.canvas);
            // Scan a small halo too, so antialiasing and shadows near an object
            // bound are not clipped before the exact alpha pass.
            const halo = 24;
            const sx = Math.max(0, rough.x - halo);
            const sy = Math.max(0, rough.y - halo);
            const ex = Math.min(rendered.canvas.width, rough.x + rough.width + halo);
            const ey = Math.min(rendered.canvas.height, rough.y + rough.height + halo);
            const scan = document.createElement('canvas');
            scan.width = Math.max(1, ex - sx);
            scan.height = Math.max(1, ey - sy);
            const scanCtx = scan.getContext('2d');
            scanCtx.globalAlpha = opacity;
            scanCtx.drawImage(rendered.canvas, -sx, -sy);
            const exact = this._alphaBounds(scan);
            if (!exact) return null;

            const pad = Math.max(0, Math.min(512, Math.round(Number(padding) || 0)));
            const out = document.createElement('canvas');
            out.width = Math.max(1, exact.width + pad * 2);
            out.height = Math.max(1, exact.height + pad * 2);
            out.getContext('2d').drawImage(scan, -exact.x + pad, -exact.y + pad);
            return out;
        },
        async export(options = {}) {
            const scope = ['all','visible','selected'].includes(options.scope) ? options.scope : 'visible';
            const trim = options.trim !== false;
            const padding = Math.max(0, Math.min(512, Math.round(Number(options.padding) || 0)));
            const zip = options.zip !== false;
            const layers = this._scopeLayers(scope);
            if (!layers.length) {
                OS.toast('No drawable layers match the export scope', 'info');
                return { exported:0, skipped:0 };
            }
            const used = new Set();
            const entries = [];
            let skipped = 0;
            for (let i = 0; i < layers.length; i++) {
                const { layer, index } = layers[i];
                options.onProgress?.({ index:i + 1, total:layers.length, layer });
                const canvas = this._renderOne(layer, { trim, padding });
                if (!canvas) { skipped++; continue; }
                let base = safeName(layer.name, `Layer_${index + 1}`);
                let name = `${base}.png`, suffix = 2;
                while (used.has(name.toLowerCase())) name = `${base}_${suffix++}.png`;
                used.add(name.toLowerCase());
                const bytes = OS._oraPNGBytesFromCanvas(canvas);
                entries.push({ name, bytes });
                if ((i + 1) % 3 === 0) await tick();
            }
            if (!entries.length) {
                OS.toast('All matching layers were empty or fully transparent', 'info');
                return { exported:0, skipped };
            }
            if (zip || entries.length > 1) {
                const blob = await OS._zipBatchEntries(entries, {
                    onProgress: detail => options.onZipProgress?.(detail)
                });
                OS._downloadBlob(blob, options.filename || 'KanPaint-Layers.zip');
            } else {
                OS._downloadBlob(new Blob([entries[0].bytes], { type:'image/png' }), entries[0].name);
            }
            OS.toast(`Exported ${entries.length} layer${entries.length === 1 ? '' : 's'}${skipped ? ` · skipped ${skipped} empty` : ''}`, 'success');
            return { exported:entries.length, skipped, names:entries.map(entry => entry.name) };
        },
        showDialog() {
            const ui = modal('Export Layers');
            const intro = el('p', { text:'Export each rasterized layer as a transparent PNG. Auto Trim removes transparent canvas around the real pixels.' });
            const scope = el('select');
            [['visible','Visible layers'],['selected','Selected layers'],['all','All layers']].forEach(([value,label]) => scope.append(el('option',{value,text:label})));
            const trim = el('input', { type:'checkbox', checked:true });
            const zip = el('input', { type:'checkbox', checked:true });
            const padding = el('input', { type:'number', value:'0', min:'0', max:'512', step:'1' });
            const row = (label, control) => ui.box.append(el('div',{class:'kp-form-row'},[el('label',{text:label}),control]));
            ui.box.append(intro); row('Scope', scope); row('Auto Trim transparent pixels', trim); row('Padding (px)', padding); row('Download as ZIP', zip);
            const progress = el('div', { class:'kp-progress', text:'' });
            const actions = el('div', { class:'kp-modal-actions' });
            const cancel = button('Cancel');
            const run = button('Export', 'btn btn-primary');
            actions.append(cancel, run); ui.box.append(progress, actions);
            cancel.addEventListener('click', ui.close);
            run.addEventListener('click', async () => {
                run.disabled = true; cancel.disabled = true;
                try {
                    await this.export({
                        scope:scope.value,
                        trim:trim.checked,
                        padding:+padding.value || 0,
                        zip:zip.checked,
                        onProgress:({index,total,layer}) => { progress.textContent = `Rendering ${index}/${total}: ${safeName(layer.name)}`; },
                        onZipProgress:({index,total}) => { progress.textContent = `Building ZIP ${index}/${total}…`; }
                    });
                    ui.close();
                } catch (error) {
                    console.error(error); progress.textContent = `Export failed: ${error.message}`; run.disabled = false; cancel.disabled = false;
                    OS.toast(`Layer export failed: ${error.message}`, 'error');
                }
            });
        }
    };
    kp.layers = LayerExport;

    // ---------------------------------------------------------------------
    // Sandboxed scripts + persistent script library.
    // The sandbox has no same-origin permission, no network, and no direct DOM
    // access. Only these explicit bridge methods can affect the document.
    // ---------------------------------------------------------------------
    const ScriptEngine = {
        builtins: [
            {
                id:'builtin.export-visible-trim', name:'Export visible layers — Auto Trim', builtin:true,
                description:'Exports visible layers as trimmed transparent PNG files inside one ZIP.',
                source:`await kan.layers.export({ scope: 'visible', trim: true, padding: 0, zip: true });`
            },
            {
                id:'builtin.export-selected-trim', name:'Export selected layers — Auto Trim', builtin:true,
                description:'Exports the selected layer(s) only.',
                source:`await kan.layers.export({ scope: 'selected', trim: true, padding: 0, zip: true });`
            },
            {
                id:'builtin.layer-report', name:'Layer report', builtin:true,
                description:'Shows the number of layers and their names in the browser console.',
                source:`const layers = await kan.layers.list();\nconsole.log('KanPaint layers:', layers);\nawait kan.ui.toast('Layers: ' + layers.length, 'info');`
            }
        ],
        _loadUser() {
            try {
                const parsed = JSON.parse(localStorage.getItem(SCRIPT_LIBRARY_KEY) || '[]');
                if (!Array.isArray(parsed)) return [];
                return parsed.filter(item => item && typeof item.name === 'string' && typeof item.source === 'string').slice(0, SCRIPT_LIMIT);
            } catch (_) { return []; }
        },
        _saveUser(items) {
            const list = items.slice(0, SCRIPT_LIMIT).map(item => ({
                id:String(item.id || `user.${Date.now()}.${Math.random().toString(36).slice(2)}`),
                name:safeName(item.name, 'Script'), description:String(item.description || '').slice(0, 240), source:String(item.source || '').slice(0, SCRIPT_BYTES)
            }));
            const json = JSON.stringify(list);
            if (textBytes(json) > SCRIPT_TOTAL_BYTES) throw new Error('Script library exceeds the 2 MiB local limit');
            localStorage.setItem(SCRIPT_LIBRARY_KEY, json);
            return list;
        },
        list() { return [...this.builtins, ...this._loadUser()]; },
        _bridge(method, args = {}) {
            if (method === 'document.info') {
                return {
                    width:Math.round(OS.canvasW || 0), height:Math.round(OS.canvasH || 0),
                    layerCount:OS.layers?.length || 0, activeLayerIndex:OS.activeLayerIdx
                };
            }
            if (method === 'layers.list') {
                return (OS.layers || []).map((layer,index) => ({
                    id:layer.id, index, name:String(layer.name || `Layer ${index + 1}`), kind:layer.kind || 'pixel',
                    visible:layer.visible !== false, locked:Boolean(layer.locked), opacity:Number(layer.opacity ?? 100)
                }));
            }
            if (method === 'layers.export') return LayerExport.export(args || {});
            if (method === 'layers.rename') {
                const index = (OS.layers || []).findIndex(layer => layer.id === args.id);
                if (index < 0) throw new Error('Layer not found');
                const name = safeName(args.name, `Layer ${index + 1}`);
                OS.layers[index].name = name; OS.updateLayersPanel?.(); OS.saveHistory?.('Rename Layer');
                return { id:OS.layers[index].id, name };
            }
            if (method === 'layers.setVisible') {
                const index = (OS.layers || []).findIndex(layer => layer.id === args.id);
                if (index < 0) throw new Error('Layer not found');
                OS.layers[index].visible = Boolean(args.visible); OS._applyLayerInteractionState?.(); OS.updateLayersPanel?.(); OS.canvas?.renderAll?.();
                OS.saveHistory?.('Layer Visibility'); return true;
            }
            if (method === 'layers.active') {
                const index=OS.activeLayerIdx, layer=(OS.layers||[])[index]; if(!layer)return null;
                return { id:layer.id,index,name:String(layer.name||`Layer ${index+1}`),kind:layer.kind||'pixel',visible:layer.visible!==false,locked:Boolean(layer.locked),opacity:Number(layer.opacity??100) };
            }
            if (method === 'skin.info') return { params:{...Skin.params}, presets:Object.keys(Skin.presets), hasSession:Boolean(Skin.session), dirty:Boolean(Skin.session?.dirty) };
            if (method === 'skin.preset') return Skin.applyPreset(String(args.name||'natural'));
            if (method === 'selection.info') {
                const b = OS._selectionBounds;
                return { active:Boolean(OS._selectionMask || b), bounds:b ? { x:b.x, y:b.y, width:b.w, height:b.h } : null };
            }
            if (method === 'ui.toast') {
                OS.toast(String(args.message || '').slice(0, 240), ['success','error','info'].includes(args.type) ? args.type : 'info');
                return true;
            }
            throw new Error(`Script API method is not allowed: ${method}`);
        },
        _wrappedSource(source) {
            return `const host = globalThis.__openShopPluginHost;\n` +
`const pending = new Map(); let seq = 0;\n` +
`window.addEventListener('message', event => { const d = event.data; if (!d || d.type !== 'kanpaint:script-response' || d.token !== host.token) return; const p = pending.get(d.requestId); if (!p) return; pending.delete(d.requestId); d.ok ? p.resolve(d.result) : p.reject(new Error(d.error || 'Script request failed')); });\n` +
`const request = (method,args={}) => new Promise((resolve,reject)=>{ const requestId = 'kp-' + (++seq); pending.set(requestId,{resolve,reject}); window.parent.postMessage({type:'kanpaint:script-request',pluginId:host.pluginId,token:host.token,requestId,method,args},'*'); });\n` +
`const kan = Object.freeze({\n` +
`  version:'${VERSION}',\n` +
`  document:Object.freeze({info:()=>request('document.info')}),\n` +
`  layers:Object.freeze({list:()=>request('layers.list'),active:()=>request('layers.active'),export:(o={})=>request('layers.export',o),rename:(id,name)=>request('layers.rename',{id,name}),setVisible:(id,visible)=>request('layers.setVisible',{id,visible})}),\n` +
`  skin:Object.freeze({info:()=>request('skin.info'),preset:(name)=>request('skin.preset',{name})}),\n` +
`  selection:Object.freeze({info:()=>request('selection.info')}),\n` +
`  ui:Object.freeze({toast:(message,type='info')=>request('ui.toast',{message,type})})\n` +
`});\n` +
`(async()=>{ try {\n${source}\n; window.parent.postMessage({type:'kanpaint:script-complete',pluginId:host.pluginId,token:host.token,ok:true},'*'); } catch(error) { window.parent.postMessage({type:'kanpaint:script-complete',pluginId:host.pluginId,token:host.token,ok:false,error:String(error?.message||error)},'*'); } })();`;
        },
        run(source, { name = 'Script' } = {}) {
            const raw = String(source || '');
            if (!raw.trim()) return Promise.reject(new Error('Script is empty'));
            if (textBytes(raw) > SCRIPT_BYTES) return Promise.reject(new Error('Script exceeds the 256 KiB limit'));
            const id = `kanpaint.script.${Date.now()}.${Math.random().toString(36).slice(2)}`;
            const token = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
            const iframe = el('iframe', { title:`KanPaint script sandbox: ${safeName(name)}` });
            iframe.setAttribute('sandbox','allow-scripts'); iframe.style.display = 'none'; iframe.src = './plugin-sandbox.html';
            document.body.append(iframe);
            return new Promise((resolve, reject) => {
                let settled = false;
                const cleanup = () => { window.removeEventListener('message', onMessage); clearTimeout(timeout); iframe.remove(); };
                const finish = (ok, value) => { if (settled) return; settled = true; cleanup(); ok ? resolve(value) : reject(value instanceof Error ? value : new Error(String(value))); };
                const onMessage = event => {
                    if (event.source !== iframe.contentWindow) return;
                    const data = event.data || {};
                    if (data.pluginId !== id || data.token !== token) return;
                    if (data.type === 'kanpaint:script-request') {
                        Promise.resolve().then(() => this._bridge(String(data.method || ''), data.args || {})).then(
                            result => iframe.contentWindow?.postMessage({ type:'kanpaint:script-response', token, requestId:data.requestId, ok:true, result }, '*'),
                            error => iframe.contentWindow?.postMessage({ type:'kanpaint:script-response', token, requestId:data.requestId, ok:false, error:String(error?.message || error) }, '*')
                        );
                        return;
                    }
                    if (data.type === 'kanpaint:script-complete') {
                        if (data.ok) { try{localStorage.setItem(SCRIPT_RECENT_KEY,JSON.stringify({name:safeName(name),source:raw,ranAt:Date.now()}));}catch(_){} OS.toast(`Script finished: ${safeName(name)}`, 'success'); finish(true, true); }
                        else { OS.toast(`Script failed: ${data.error || 'Unknown error'}`, 'error'); finish(false, new Error(data.error || 'Script failed')); }
                    }
                };
                window.addEventListener('message', onMessage);
                const timeout = setTimeout(() => finish(false, new Error('Script timed out after 60 seconds')), 60000);
                iframe.addEventListener('load', () => {
                    iframe.contentWindow?.postMessage({
                        type:'openshop:host-init', protocolVersion:1, pluginId:id, token,
                        source:this._wrappedSource(raw), capabilities:[], api:{ version:1 },
                        manifest:{ id, version:'1.0.0', name:safeName(name), minApiVersion:1 }
                    }, '*');
                }, { once:true });
            });
        },
        runRecent() {
            try {
                const recent=JSON.parse(localStorage.getItem(SCRIPT_RECENT_KEY)||'null');
                if(!recent?.source) { OS.toast('No recently run script yet','info'); return Promise.resolve(false); }
                return this.run(recent.source,{name:recent.name||'Recent Script'});
            } catch(error) { OS.toast('Could not read recent script','error'); return Promise.reject(error); }
        },
        runFile() {
            const input = el('input', { type:'file', accept:'.js,.kan.js,text/javascript,application/javascript' });
            input.addEventListener('change', async () => {
                const file = input.files?.[0]; if (!file) return;
                if (file.size > SCRIPT_BYTES) { OS.toast('Script is larger than 256 KiB', 'error'); return; }
                try { await this.run(await file.text(), { name:file.name }); }
                catch (error) { console.error(error); }
            });
            input.click();
        },
        exportLibrary() {
            const payload = JSON.stringify({ format:'kanpaint-script-library', version:1, exportedAt:new Date().toISOString(), scripts:this._loadUser() }, null, 2);
            OS._downloadBlob(new Blob([payload], { type:'application/json' }), 'KanPaint-Script-Library.kanlib.json');
            OS.toast('Script Library backup exported', 'success');
        },
        importLibrary(onImported) {
            const input = el('input', { type:'file', accept:'.json,.kanlib,.kanlib.json,application/json' });
            input.addEventListener('change', async () => {
                const file=input.files?.[0]; if(!file)return;
                try {
                    if(file.size > SCRIPT_TOTAL_BYTES * 2) throw new Error('Library backup is too large');
                    const parsed=JSON.parse(await file.text());
                    const incoming=Array.isArray(parsed) ? parsed : parsed?.scripts;
                    if(!Array.isArray(incoming)) throw new Error('Not a KanPaint Script Library backup');
                    const current=this._loadUser();
                    const merged=[...current];
                    for(const item of incoming){
                        if(!item || typeof item.source!=='string')continue;
                        if(textBytes(item.source)>SCRIPT_BYTES)continue;
                        const clean={ id:`user.${Date.now()}.${Math.random().toString(36).slice(2)}`, name:safeName(item.name,'Imported Script'), description:String(item.description||'Imported from library backup').slice(0,240), source:item.source };
                        merged.push(clean);
                        if(merged.length>=SCRIPT_LIMIT)break;
                    }
                    this._saveUser(merged); OS.toast('Script Library backup imported', 'success'); onImported?.();
                } catch(error){ OS.toast(`Could not import Script Library: ${error.message}`, 'error'); }
            });
            input.click();
        },
        showLibrary() {
            const ui = modal('Script Library');
            ui.box.append(el('p',{text:'Built-in scripts are read-only. Imported or created scripts are stored locally in this browser for quick reuse. Scripts run in an isolated sandbox with a small allow-listed KanPaint API.'}));
            const search = el('input',{type:'search',class:'kp-script-search',placeholder:'Search scripts…','aria-label':'Search scripts'});
            const listRoot = el('div',{class:'kp-script-list'});
            const footer = el('div',{class:'kp-modal-actions'});
            const importBtn = button('Import .js'); const newBtn = button('New Script'); const backupBtn = button('Backup Library'); const restoreBtn = button('Restore Library'); const closeBtn = button('Close');
            footer.append(importBtn,newBtn,backupBtn,restoreBtn,closeBtn); ui.box.append(search,listRoot,footer);
            const render = () => {
                listRoot.replaceChildren();
                const q=search.value.trim().toLowerCase();
                this.list().filter(item=>!q || `${item.name} ${item.description||''}`.toLowerCase().includes(q)).forEach(item => {
                    const meta = el('div');
                    const title = el('strong',{text:item.name}); if (item.builtin) title.append(el('span',{class:'kp-badge',text:'Built-in'}));
                    meta.append(title, el('small',{text:item.description || (item.builtin ? 'KanPaint built-in script' : 'Saved locally')}));
                    const actions = el('div',{class:'kp-script-actions'});
                    const run = button('Run'); actions.append(run);
                    run.addEventListener('click', async () => { run.disabled = true; try { await this.run(item.source,{name:item.name}); } catch(e){ console.error(e); } finally { run.disabled=false; } });
                    if (item.builtin) {
                        const copy = button('Copy to Library'); actions.append(copy);
                        copy.addEventListener('click', () => {
                            const users=this._loadUser(); users.push({id:`user.${Date.now()}`,name:`${item.name} Copy`,description:item.description,source:item.source});
                            try { this._saveUser(users); render(); } catch(e){ OS.toast(e.message,'error'); }
                        });
                    } else {
                        const edit = button('Edit'); const del = button('Delete','btn btn-danger'); actions.append(edit,del);
                        edit.addEventListener('click',()=>this._showEditor(item, render));
                        del.addEventListener('click',()=>{ const users=this._loadUser().filter(x=>x.id!==item.id); this._saveUser(users); render(); });
                    }
                    listRoot.append(el('div',{class:'kp-script-row'},[meta,actions]));
                });
            };
            importBtn.addEventListener('click',()=>{
                const input=el('input',{type:'file',accept:'.js,.kan.js,text/javascript,application/javascript'});
                input.addEventListener('change',async()=>{ const file=input.files?.[0]; if(!file)return; if(file.size>SCRIPT_BYTES){OS.toast('Script is larger than 256 KiB','error');return;} const users=this._loadUser(); users.push({id:`user.${Date.now()}`,name:file.name.replace(/\.kan\.js$|\.js$/i,''),description:`Imported from ${file.name}`,source:await file.text()}); try{this._saveUser(users);render();}catch(e){OS.toast(e.message,'error');} }); input.click();
            });
            search.addEventListener('input',render); newBtn.addEventListener('click',()=>this._showEditor(null,render)); backupBtn.addEventListener('click',()=>this.exportLibrary()); restoreBtn.addEventListener('click',()=>this.importLibrary(render)); closeBtn.addEventListener('click',ui.close); render();
        },
        _showEditor(item, onSaved) {
            const ui=modal(item ? 'Edit Script' : 'New Script');
            const wrap=el('div',{class:'kp-script-editor'});
            const name=el('input',{type:'text',value:item?.name || 'My Script',maxlength:100});
            const source=el('textarea',{value:item?.source || `// KanPaint Script API example\nconst layers = await kan.layers.list();\nawait kan.ui.toast('Layers: ' + layers.length);`});
            wrap.append(el('label',{text:'Name'}),name,el('label',{text:'JavaScript'}),source);
            const actions=el('div',{class:'kp-modal-actions'}); const cancel=button('Cancel'); const runNow=button('Run'); const save=button('Save','btn btn-primary'); actions.append(cancel,runNow,save); ui.box.append(wrap,actions);
            cancel.addEventListener('click',ui.close); runNow.addEventListener('click',async()=>{runNow.disabled=true;try{await this.run(source.value,{name:name.value||'Unsaved Script'});}catch(e){console.error(e);}finally{runNow.disabled=false;}}); save.addEventListener('click',()=>{ try{ if(textBytes(source.value)>SCRIPT_BYTES) throw new Error('Script is larger than 256 KiB'); const users=this._loadUser(); const record={id:item?.id || `user.${Date.now()}.${Math.random().toString(36).slice(2)}`,name:safeName(name.value,'My Script'),description:item?.description || 'Saved locally',source:source.value}; const index=users.findIndex(x=>x.id===record.id); if(index>=0)users[index]=record; else users.push(record); this._saveUser(users); ui.close(); onSaved?.(); }catch(e){OS.toast(e.message,'error');} });
        }
    };
    kp.scripts = ScriptEngine;

    // ---------------------------------------------------------------------
    // Skin Retouch: selection-aware brush mask + non-destructive preview.
    // Sliders preview only on "change" (release), not on every mousemove.
    // Large images use a <=1.2 MP preview proxy; Apply renders full resolution
    // once and records one history state.
    // ---------------------------------------------------------------------
    const Skin = {
        params:{ size:70, hardness:35, flow:45, amount:65, smooth:35, light:0, shadows:18, shine:10, tone:12, warmth:0, texture:14, grainSize:1, preserve:72 },
        presets:{
            natural:{ amount:65,smooth:35,light:0,shadows:18,shine:10,tone:12,warmth:0,texture:14,grainSize:1,preserve:72 },
            soft:{ amount:58,smooth:52,light:2,shadows:20,shine:16,tone:18,warmth:2,texture:8,grainSize:1,preserve:82 },
            shadow:{ amount:72,smooth:22,light:2,shadows:48,shine:8,tone:10,warmth:1,texture:12,grainSize:1,preserve:78 },
            texture:{ amount:62,smooth:18,light:0,shadows:10,shine:8,tone:8,warmth:0,texture:38,grainSize:1.2,preserve:90 }
        },
        session:null, painting:false, _previewTicket:0, _scheduled:false,
        _selectionMask() { return OS._selectionMask || (OS._selectionBounds ? OS._maskFromMarqueeBounds?.() : null); },
        _setStatus(message='') { const node=document.getElementById('kp-skin-status'); if(node) node.textContent=message; },
        _syncControls() {
            document.querySelectorAll('[data-kp-skin-param]').forEach(input => {
                const key=input.dataset.kpSkinParam; if(!(key in this.params)) return;
                input.value=String(this.params[key]);
                const out=input.parentElement?.querySelector('output'); if(out) out.textContent=`${this.params[key]}${input.dataset.suffix||''}`;
            });
        },
        applyPreset(name) {
            const preset=this.presets[name]; if(!preset) throw new Error('Unknown Skin Retouch preset');
            Object.assign(this.params,preset); this._syncControls(); this._setStatus(`Preset: ${name}`);
            if(this.session?.dirty) void this.preview(); return { ...this.params };
        },
        _findTarget(ptr) {
            let target=OS.canvas?.getActiveObject?.();
            if (!target || target.type !== 'image') {
                const objs=(OS.canvas?.getObjects?.() || []).filter(o=>o.type==='image' && o.containsPoint?.(ptr)); target=objs.at(-1) || null;
            }
            return target?.type === 'image' ? target : null;
        },
        _sourceCanvas(target) {
            const image=target.getElement?.(); if(!image)return null;
            const canvas=document.createElement('canvas'); canvas.width=image.naturalWidth||image.width||target.width||1; canvas.height=image.naturalHeight||image.height||target.height||1;
            canvas.getContext('2d',{willReadFrequently:true}).drawImage(image,0,0,canvas.width,canvas.height); return canvas;
        },
        _startSession(target) {
            if (this.session?.target === target) return this.session;
            if (this.session) this.cancel({ silent:true });
            const source=this._sourceCanvas(target); if(!source) throw new Error('Could not read image pixels');
            this.session={ target, source, mask:new Uint8Array(source.width*source.height), dirty:false, bounds:null,
                guard:{ generation:OS._documentGeneration, revision:OS._documentRevision, targetId:OS._ensureObjectId?.(target) } };
            this._updatePanelState(); return this.session;
        },
        _displayToSource(target, ptr, source) {
            const matrix=target.calcTransformMatrix(); const inv=fabric.util.invertTransform(matrix); const local=fabric.util.transformPoint(ptr,inv);
            const currentW=Math.max(1,Number(target.width)||target.getElement?.()?.width||source.width); const currentH=Math.max(1,Number(target.height)||target.getElement?.()?.height||source.height);
            return { x:(local.x+currentW/2)*source.width/currentW, y:(local.y+currentH/2)*source.height/currentH, matrix, currentW, currentH };
        },
        _paint(ptr) {
            const s=this.session; if(!s)return;
            const mapped=this._displayToSource(s.target,ptr,s.source); const source=s.source;
            const m=mapped.matrix; const displayScaleX=Math.max(.001,Math.hypot(m[0]||1,m[1]||0)*mapped.currentW/source.width); const displayScaleY=Math.max(.001,Math.hypot(m[2]||0,m[3]||1)*mapped.currentH/source.height);
            const radiusDoc=Math.max(1,this.params.size/2); const rx=Math.ceil(radiusDoc/displayScaleX), ry=Math.ceil(radiusDoc/displayScaleY);
            const x0=Math.max(0,Math.floor(mapped.x-rx)), y0=Math.max(0,Math.floor(mapped.y-ry)), x1=Math.min(source.width,Math.ceil(mapped.x+rx)), y1=Math.min(source.height,Math.ceil(mapped.y+ry));
            const selection=this._selectionMask(); const docW=Math.max(1,Math.round(OS.canvasW||1)),docH=Math.max(1,Math.round(OS.canvasH||1)); const hard=clamp(this.params.hardness,0,100)/100; const flow=clamp(this.params.flow,1,100)/100;
            let bx0=source.width,by0=source.height,bx1=-1,by1=-1;
            for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++){
                const dx=(x+.5-mapped.x)*displayScaleX,dy=(y+.5-mapped.y)*displayScaleY,d=Math.sqrt(dx*dx+dy*dy)/radiusDoc; if(d>=1)continue;
                let edge=d<=hard?1:(1-(d-hard)/Math.max(.001,1-hard)); edge=clamp(edge,0,1); if(edge<=0)continue;
                const localX=(x+.5)/source.width*mapped.currentW-mapped.currentW/2, localY=(y+.5)/source.height*mapped.currentH-mapped.currentH/2;
                const doc=fabric.util.transformPoint({x:localX,y:localY},m); const sel=selection?OS._selectionCoverageAt(selection,Math.floor(doc.x),Math.floor(doc.y),docW,docH)/255:1; if(sel<=0)continue;
                const add=edge*flow*sel; const idx=y*source.width+x; const old=s.mask[idx]/255; const next=old+(1-old)*add; s.mask[idx]=Math.max(s.mask[idx],Math.round(next*255));
                bx0=Math.min(bx0,x);by0=Math.min(by0,y);bx1=Math.max(bx1,x);by1=Math.max(by1,y);
            }
            if(bx1>=bx0){ const b=s.bounds; s.bounds=b?{x:Math.min(b.x,bx0),y:Math.min(b.y,by0),x2:Math.max(b.x2,bx1),y2:Math.max(b.y2,by1)}:{x:bx0,y:by0,x2:bx1,y2:by1}; s.dirty=true; }
        },
        _hashNoise(x,y){
            const grain=Math.max(.5,Number(this.params.grainSize)||1);
            const gx=Math.floor(x/grain), gy=Math.floor(y/grain);
            let n=(gx*374761393+gy*668265263)>>>0; n=(n^(n>>>13))*1274126177>>>0; return ((n^(n>>>16))&1023)/511.5-1;
        },
        _render(scale=1) {
            const s=this.session; if(!s)return null; const sw=s.source.width,sh=s.source.height; const w=Math.max(1,Math.round(sw*scale)),h=Math.max(1,Math.round(sh*scale));
            const base=document.createElement('canvas');base.width=w;base.height=h;const bctx=base.getContext('2d',{willReadFrequently:true});bctx.drawImage(s.source,0,0,w,h);
            if(!s.dirty)return base;
            const blur=document.createElement('canvas');blur.width=w;blur.height=h;const blctx=blur.getContext('2d',{willReadFrequently:true}); const blurRadius=Math.max(.35,(0.6+this.params.smooth/22)*scale); blctx.filter=`blur(${blurRadius}px)`;blctx.drawImage(base,0,0);blctx.filter='none';
            const src=bctx.getImageData(0,0,w,h), blurred=blctx.getImageData(0,0,w,h); const d=src.data,bd=blurred.data;
            const amount=clamp(this.params.amount,0,100)/100, smooth=clamp(this.params.smooth,0,100)/100*amount, light=clamp(this.params.light,-50,50)/50*amount, shadows=clamp(this.params.shadows,0,100)/100*amount, shine=clamp(this.params.shine,0,100)/100*amount, tone=clamp(this.params.tone,0,100)/100*amount, warmth=clamp(this.params.warmth,-50,50)/50*amount, texture=clamp(this.params.texture,0,100)/100*amount, preserve=clamp(this.params.preserve,0,100)/100;
            for(let y=0;y<h;y++) for(let x=0;x<w;x++){
                const sx=Math.min(sw-1,Math.floor(x/scale)),sy=Math.min(sh-1,Math.floor(y/scale)); const mask=s.mask[sy*sw+sx]/255; if(mask<=0)continue; const blend=mask*amount; const i=(y*w+x)*4;
                const or=d[i],og=d[i+1],ob=d[i+2],br=bd[i],bg=bd[i+1],bb=bd[i+2]; const luma=(or*.2126+og*.7152+ob*.0722)/255, blurL=(br*.2126+bg*.7152+bb*.0722)/255;
                const edge=Math.min(1,Math.abs(luma-blurL)*5); const smoothMix=smooth*(1-edge*(.45+.5*preserve)); let r=or+(br-or)*smoothMix,g=og+(bg-og)*smoothMix,b=ob+(bb-ob)*smoothMix;
                const lightDelta=light*30; r+=lightDelta;g+=lightDelta;b+=lightDelta;
                const shadowWeight=Math.pow(Math.max(0,.62-luma)/.62,1.4); const shadowLift=shadows*shadowWeight*48; r+=shadowLift;g+=shadowLift;b+=shadowLift;
                const shineWeight=Math.pow(Math.max(0,luma-.68)/.32,1.5); const shineDrop=shine*shineWeight*44; r-=shineDrop;g-=shineDrop;b-=shineDrop;
                const avg=(r+g+b)/3, blurAvg=(br+bg+bb)/3, toneMix=tone*(1-edge*.55)*.38;
                r+=((br-blurAvg)-(r-avg))*toneMix; g+=((bg-blurAvg)-(g-avg))*toneMix; b+=((bb-blurAvg)-(b-avg))*toneMix;
                const warmShift=warmth*14; r+=warmShift; g+=warmShift*.22; b-=warmShift*.8;
                const detailR=or-br,detailG=og-bg,detailB=ob-bb; const detailRestore=smooth*preserve*.32+texture*.78; r+=detailR*detailRestore;g+=detailG*detailRestore;b+=detailB*detailRestore;
                const grain=this._hashNoise(sx,sy)*texture*3.2; r+=grain;g+=grain;b+=grain;
                d[i]=clamp(or+(r-or)*mask,0,255);d[i+1]=clamp(og+(g-og)*mask,0,255);d[i+2]=clamp(ob+(b-ob)*mask,0,255);
            }
            bctx.putImageData(src,0,0);return base;
        },
        async preview() {
            const s=this.session;if(!s||!s.dirty)return; const ticket=++this._previewTicket; const pixels=s.source.width*s.source.height; const scale=pixels>LIVE_PREVIEW_PIXELS?Math.sqrt(LIVE_PREVIEW_PIXELS/pixels):1;
            this._setStatus(scale<1?'Rendering fast preview…':'Rendering preview…');
            await nextFrame(); if(ticket!==this._previewTicket||!this.session)return; const preview=this._render(scale); if(ticket!==this._previewTicket||!preview)return; OS._swapImageElement(s.target,preview); this._updatePanelState(); this._setStatus(scale<1?'Preview ready · full quality on Apply':'Preview ready');
        },
        schedulePreview(){ if(this._scheduled)return; this._scheduled=true; requestAnimationFrame(()=>{this._scheduled=false;void this.preview();}); },
        async fillSelection(){
            const selection=this._selectionMask(); if(!selection){OS.toast('Create a skin selection first','info');return false;}
            let target=this.session?.target || OS.canvas?.getActiveObject?.(); if(!target||target.type!=='image'){OS.toast('Select an image layer first','info');return false;}
            if(!OS._guardObjectEdit?.(target))return false;
            const s=this._startSession(target), source=s.source, m=target.calcTransformMatrix();
            const currentW=Math.max(1,Number(target.width)||target.getElement?.()?.width||source.width), currentH=Math.max(1,Number(target.height)||target.getElement?.()?.height||source.height);
            const docW=Math.max(1,Math.round(OS.canvasW||1)),docH=Math.max(1,Math.round(OS.canvasH||1)); let bx0=source.width,by0=source.height,bx1=-1,by1=-1;
            this._setStatus('Building mask from selection…');
            for(let y=0;y<source.height;y++){
                const localY=(y+.5)/source.height*currentH-currentH/2;
                for(let x=0;x<source.width;x++){
                    const localX=(x+.5)/source.width*currentW-currentW/2, doc=fabric.util.transformPoint({x:localX,y:localY},m);
                    const coverage=OS._selectionCoverageAt(selection,Math.floor(doc.x),Math.floor(doc.y),docW,docH);
                    const idx=y*source.width+x; s.mask[idx]=coverage;
                    if(coverage>0){bx0=Math.min(bx0,x);by0=Math.min(by0,y);bx1=Math.max(bx1,x);by1=Math.max(by1,y);}
                }
                if(y%48===0) await tick();
            }
            s.dirty=bx1>=bx0; s.bounds=s.dirty?{x:bx0,y:by0,x2:bx1,y2:by1}:null; this._updatePanelState();
            if(s.dirty) await this.preview(); else this._setStatus('Selection does not overlap the selected image');
            return s.dirty;
        },
        clearMask(){
            const s=this.session;if(!s)return false; s.mask.fill(0);s.dirty=false;s.bounds=null;this._previewTicket++;
            try{OS._swapImageElement(s.target,s.source);}catch(_){} this._updatePanelState();this._setStatus('Retouch mask cleared');return true;
        },
        onDown(opt){ const ptr=OS.canvas.getScenePoint(opt.e); const target=this._findTarget(ptr); if(!target){OS.toast('Select or click an image before Skin Retouch','info');return;} if(!OS._guardObjectEdit?.(target))return; try{this._startSession(target);this.painting=true;this._paint(ptr);}catch(e){OS.toast(`Skin Retouch: ${e.message}`,'error');} },
        onMove(opt){ if(!this.painting||!(opt.e.buttons&1))return; this._paint(OS.canvas.getScenePoint(opt.e)); },
        onUp(){ if(!this.painting)return;this.painting=false;this.schedulePreview(); },
        async apply({silent=false}={}){
            const s=this.session;if(!s)return false; this._previewTicket++; if(!s.dirty){this.session=null;this._updatePanelState();return false;} OS._swapImageElement(s.target,s.source); await tick(); const full=this._render(1); if(!full)return false; const ok=await OS._replaceActiveImage(s.target,full.toDataURL('image/png'),'Skin Retouch',s.guard); this.session=null;this._updatePanelState(); if(ok&&!silent)OS.toast('Skin Retouch applied','success');return Boolean(ok);
        },
        cancel({silent=false}={}){ const s=this.session;if(!s)return false;this._previewTicket++;try{OS._swapImageElement(s.target,s.source);}catch(_){}this.session=null;this.painting=false;this._updatePanelState();if(!silent)OS.toast('Skin Retouch preview cancelled','info');return true; },
        before(show){ const s=this.session;if(!s)return;if(show)OS._swapImageElement(s.target,s.source);else void this.preview(); },
        _updatePanelState(){ const state=document.querySelector('#kp-skin-panel .kp-selection-state');if(state){const selected=Boolean(OS._selectionMask||OS._selectionBounds);state.textContent=`Selection: ${selected?'active — brush is clipped to selection':'none — brush can affect the whole image'}`;} const apply=document.getElementById('kp-skin-apply');if(apply)apply.disabled=!this.session?.dirty;const cancel=document.getElementById('kp-skin-cancel');if(cancel)cancel.disabled=!this.session; }
    };
    kp.skin = Skin;

    function addSkinUI() {
        const toolbar=document.getElementById('toolbar'); if(!toolbar||document.getElementById('kp-skin-tool'))return;
        const retouchGroup=toolbar.querySelector('.tool-group[data-group="retouch"]');
        const tool=el('button',{type:'button',id:'kp-skin-tool',class:'tool-btn','data-tool':'skin-retouch','data-tip':'Skin Retouch'}); tool.dataset.tool='skin-retouch'; tool.append(el('span',{class:'kp-tool-glyph',text:'SR'}));
        (retouchGroup || toolbar).after(tool);
        tool.addEventListener('click',()=>OS.setTool('skin-retouch'));

        const options=document.getElementById('tool-options'); const group=el('div',{class:'opt-group',id:'opt-kp-skin'}); group.style.display='none';
        const inlineSlider=(label,key,min,max,suffix='',step=1)=>{ const input=el('input',{type:'range',min:String(min),max:String(max),step:String(step),value:String(Skin.params[key]),dataset:{kpSkinParam:key,suffix}}); const out=el('output',{text:`${Skin.params[key]}${suffix}`}); input.addEventListener('input',()=>{Skin.params[key]=+input.value;out.textContent=`${input.value}${suffix}`;}); input.addEventListener('change',()=>{if(Skin.session?.dirty)void Skin.preview();}); return el('label',{class:'kp-inline-control'},[el('span',{text:label}),input,out]); };
        group.append(inlineSlider('Size','size',5,300,'px'),inlineSlider('Hardness','hardness',0,100,'%'),inlineSlider('Flow','flow',1,100,'%'),inlineSlider('Amount','amount',0,100,'%'));
        const settings=button('Retouch Settings…'); const apply=button('Apply','btn btn-primary');apply.id='kp-skin-apply';const cancel=button('Cancel');cancel.id='kp-skin-cancel';group.append(settings,apply,cancel); options.insertBefore(group,document.getElementById('tool-options-reset'));
        settings.addEventListener('click',()=>document.getElementById('kp-skin-panel')?.classList.toggle('visible')); apply.addEventListener('click',()=>void Skin.apply()); cancel.addEventListener('click',()=>Skin.cancel());

        const panel=el('aside',{id:'kp-skin-panel'}); const head=el('div',{class:'kp-panel-head'},[el('span',{text:'Skin Retouch'}),el('small',{text:'KanPaint v0.3'})]); const body=el('div',{class:'kp-panel-body'}); const selectionState=el('div',{class:'kp-selection-state',text:'Selection: none'}); body.append(selectionState);
        const preset=el('select'); [['natural','Natural'],['soft','Soft Portrait'],['shadow','Shadow Fix'],['texture','Texture Restore']].forEach(([value,label])=>preset.append(el('option',{value,text:label})));
        body.append(el('div',{class:'kp-form-row'},[el('label',{text:'Preset'}),preset]));
        const slider=(label,key,min,max,suffix='',step=1)=>{const input=el('input',{type:'range',min:String(min),max:String(max),step:String(step),value:String(Skin.params[key]),dataset:{kpSkinParam:key,suffix}});const output=el('output',{text:`${Skin.params[key]}${suffix}`});input.addEventListener('input',()=>{Skin.params[key]=+input.value;output.textContent=`${input.value}${suffix}`;});input.addEventListener('change',()=>{if(Skin.session?.dirty)void Skin.preview();});return el('div',{class:'kp-slider-row'},[el('label',{text:label}),input,output]);};
        body.append(slider('Smooth','smooth',0,100,'%'),slider('Light / Dark','light',-50,50,''),slider('Shadow Lift','shadows',0,100,'%'),slider('Shine Reduce','shine',0,100,'%'),slider('Even Skin Tone','tone',0,100,'%'),slider('Warm / Cool','warmth',-50,50,''),slider('Texture / Pores','texture',0,100,'%'),slider('Grain Size','grainSize',0.5,3,'',0.1),slider('Detail Preserve','preserve',0,100,'%'));
        const status=el('div',{id:'kp-skin-status',class:'kp-progress',text:'Paint a mask or use the current selection.'}); body.append(status);
        body.append(el('p',{class:'kp-help',text:'Paint only where you want the effect, or use the current selection as the mask. Slider values change immediately; the preview is re-rendered when you release the slider. Large images use a fast proxy preview and render full quality only on Apply.'}));
        const actions=el('div',{class:'kp-panel-actions'});const before=button('Hold: Before');const useSelection=button('Use Selection');const clearMask=button('Clear Mask');const pApply=button('Apply','btn btn-primary');const pCancel=button('Cancel');actions.append(before,useSelection,clearMask,pApply,pCancel);body.append(actions);panel.append(head,body);document.body.append(panel);
        preset.addEventListener('change',()=>Skin.applyPreset(preset.value)); useSelection.addEventListener('click',()=>void Skin.fillSelection()); clearMask.addEventListener('click',()=>Skin.clearMask());
        before.addEventListener('pointerdown',()=>{before.classList.add('kp-before-active');Skin.before(true);});const restore=()=>{before.classList.remove('kp-before-active');Skin.before(false);};before.addEventListener('pointerup',restore);before.addEventListener('pointerleave',restore);pApply.addEventListener('click',()=>void Skin.apply());pCancel.addEventListener('click',()=>Skin.cancel());
        Skin._updatePanelState();
    }

    function addFileMenu() {
        const fileMenu=[...document.querySelectorAll('.menu-item')].find(node=>node.firstChild?.textContent?.trim()==='File'); const dropdown=fileMenu?.querySelector(':scope > .menu-dropdown'); if(!dropdown)return;
        const exportAs=[...dropdown.children].find(node=>node.classList?.contains('dd-sub') && node.textContent.trim().startsWith('Export As'));
        const exportLayers=el('div',{class:'dd-item',text:'Export Layers…'}); exportLayers.addEventListener('click',()=>LayerExport.showDialog()); exportAs?.after(exportLayers);
        const scripts=el('div',{class:'dd-sub dd-item',text:'Scripts'}); const sub=el('div',{class:'menu-dropdown'}); const run=el('div',{class:'dd-item',text:'Run Script…'}); const recent=el('div',{class:'dd-item',text:'Run Last Script'}); const library=el('div',{class:'dd-item',text:'Script Library…'}); const note=el('div',{class:'dd-note',text:'Sandboxed · local library'}); run.addEventListener('click',()=>ScriptEngine.runFile()); recent.addEventListener('click',()=>void ScriptEngine.runRecent()); library.addEventListener('click',()=>ScriptEngine.showLibrary()); sub.append(run,recent,library,note); scripts.append(sub);
        const projectSep=[...dropdown.children].find((node,index,arr)=>node.classList?.contains('dd-sep') && arr[index+1]?.textContent?.includes('Templates'));
        if(projectSep) dropdown.insertBefore(scripts,projectSep); else dropdown.append(scripts);
    }

    function patchCoreForSkin() {
        const originalSetTool=OS.setTool;
        OS.setTool=function(tool){
            if(tool!=='skin-retouch'){
                if(this.state.tool==='skin-retouch' && Skin.session?.dirty){
                    const apply = window.confirm('Skin Retouch has unapplied changes. Apply them before switching tools?');
                    if(apply){
                        void Skin.apply({silent:true}).then(()=>{
                            document.getElementById('kp-skin-panel')?.classList.remove('visible');
                            originalSetTool.call(OS,tool);
                        });
                        return true;
                    }
                    Skin.cancel({silent:true});
                }
                document.getElementById('kp-skin-panel')?.classList.remove('visible');
                return originalSetTool.call(this,tool);
            }
            // Reuse Dodge's cursor / interaction setup, then replace the UI state.
            const ok=originalSetTool.call(this,'dodge'); if(ok===false)return false; this.state.tool='skin-retouch';
            document.querySelectorAll('.tool-btn').forEach(b=>{const active=b.dataset.tool==='skin-retouch';b.classList.toggle('active',active);b.setAttribute('aria-pressed',active?'true':'false');});
            document.querySelectorAll('#tool-options .opt-group').forEach(g=>{g.style.display='none';}); const options=document.getElementById('opt-kp-skin');if(options)options.style.display='flex';
            if(this.canvas){this.canvas.isDrawingMode=false;this.canvas.selection=false;this.canvas.defaultCursor='crosshair';this.canvas.hoverCursor='crosshair';this.canvas.forEachObject(o=>{o.selectable=false;o.evented=false;});}
            const display=document.getElementById('tool-display');if(display)display.textContent='Skin Retouch';document.getElementById('kp-skin-panel')?.classList.add('visible');Skin._updatePanelState();return true;
        };
        const down=OS.onMouseDown,move=OS.onMouseMove,up=OS.onMouseUp;
        OS.onMouseDown=function(opt){if(this.state.tool==='skin-retouch')return Skin.onDown(opt);return down.call(this,opt);};
        OS.onMouseMove=function(opt){if(this.state.tool==='skin-retouch'){const ptr=this.canvas.getScenePoint(opt.e);const pos=document.getElementById('cursor-pos');if(pos)pos.textContent=`X: ${Math.round(ptr.x)} Y: ${Math.round(ptr.y)}`;return Skin.onMove(opt);}return move.call(this,opt);};
        OS.onMouseUp=function(opt){if(this.state.tool==='skin-retouch')return Skin.onUp(opt);return up.call(this,opt);};
    }

    function addCommandPaletteEntries() {
        // _getCommands caches its array; append after init so existing command
        // palette internals remain untouched.
        const commands=OS._getCommands?.(); if(!Array.isArray(commands))return;
        const add=(label,cat,fn)=>{if(!commands.some(c=>c.label===label))commands.push({label,cat,fn});};
        add('Export Layers…','File',()=>LayerExport.showDialog()); add('Run Script…','File',()=>ScriptEngine.runFile()); add('Run Last Script','File',()=>void ScriptEngine.runRecent()); add('Script Library…','File',()=>ScriptEngine.showLibrary()); add('Tool: Skin Retouch','Tool',()=>OS.setTool('skin-retouch'));
    }

    function brandVisibleShell() {
        const logo=document.querySelector('.logo'); if(logo){logo.setAttribute('aria-label','KanPaint version 0.2');const mark=logo.querySelector('.logo-mark');const word=logo.querySelector('.logo-word');const ver=logo.querySelector('.logo-version');if(mark)mark.textContent='KP';if(word)word.textContent='KanPaint';if(ver)ver.textContent='v0.3';}
        document.title='KanPaint v0.3 | Browser Image Editor';
    }

    // Patch methods before OS.init binds them to Fabric events.
    patchCoreForSkin();
    addFileMenu();
    addSkinUI();
    brandVisibleShell();
    window.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{addCommandPaletteEntries();Skin._updatePanelState();},0));
})();
