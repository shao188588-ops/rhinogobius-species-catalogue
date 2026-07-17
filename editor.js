const defaults = {
  shellWidth: 1540, shellTop: 26, heroHeight: 164, heroGap: 14,
  brandX: 0, brandY: 0, brandScale: 100, brandZ: 2, statsX: 0, statsY: 0, statsScale: 100, statsZ: 2,
  utilitiesX: 0, utilitiesY: 0, utilitiesScale: 100, utilitiesZ: 2, fishX: 0, fishY: 0, fishScale: 100, fishOpacity: 70, fishZ: 1,
  controlsPadding: 16, tableHeight: 70, customElements: [],
};
const storageKey = 'rhinogobius-layout-config';
const preview = document.querySelector('#catalogue-preview');
const inspector = document.querySelector('#inspector');
const status = document.querySelector('#studio-status');
const layersPanel = document.querySelector('#layers');
let layout = readLayout();
let selection = null;

const groups = {
  hero: { title: '标题区', fields: [['shellWidth', '页面内容宽度', 900, 1900, 10], ['shellTop', '页面顶部留白', 0, 160], ['heroHeight', '基础高度', 80, 720], ['heroGap', '标题区下间距', 0, 120], ['controlsPadding', '搜索栏内边距', 0, 56], ['tableHeight', '表格可视高度', 35, 90, 1, 'vh']] },
  brand: { title: '主标题', fields: [['brandX', '水平位置', -600, 600], ['brandY', '垂直位置', -300, 300], ['brandScale', '尺寸', 45, 180, 1, '%'], ['brandZ', '图层顺序', -20, 40]] },
  fish: { title: '鱼图', fields: [['fishX', '水平位置', -700, 700], ['fishY', '垂直位置', -360, 500], ['fishScale', '尺寸', 25, 220, 1, '%'], ['fishOpacity', '透明度', 5, 100, 1, '%'], ['fishZ', '图层顺序', -20, 40]] },
  stats: { title: '有效物种与更新时间', fields: [['statsX', '水平位置', -600, 600], ['statsY', '垂直位置', -300, 300], ['statsScale', '尺寸', 45, 180, 1, '%'], ['statsZ', '图层顺序', -20, 40]] },
  utilities: { title: '主题与语言按钮', fields: [['utilitiesX', '水平位置', -600, 600], ['utilitiesY', '垂直位置', -300, 300], ['utilitiesScale', '尺寸', 45, 180, 1, '%'], ['utilitiesZ', '图层顺序', -20, 40]] },
};

function readLayout() { try { return { ...defaults, ...(JSON.parse(localStorage.getItem(storageKey)) || {}), customElements: (JSON.parse(localStorage.getItem(storageKey)) || {}).customElements || [] }; } catch { return { ...defaults }; } }
function saveLayout() { try { localStorage.setItem(storageKey, JSON.stringify(layout)); } catch { status.textContent = '浏览器未允许保存配置，但当前预览仍可继续调整。'; } }
function unitFor(key, fallback = 'px') { return key.endsWith('Scale') || key.endsWith('Opacity') ? '%' : fallback; }
function post(type, payload = {}) { preview.contentWindow?.postMessage({ type, ...payload }, window.location.origin); }
function sync({ persist = true } = {}) { if (persist) saveLayout(); post('rhinogobius-layout:apply', { layout, persist: false }); updateInspectorValues(); renderLayers(); }
function customById(id) { return layout.customElements.find((item) => item.id === id); }
function fieldRange(key, label, min, max, step = 1, unit) { return `<label class="field">${label}<output data-output="${key}"></output><input data-layout-key="${key}" type="range" min="${min}" max="${max}" step="${step}" data-unit="${unit || unitFor(key)}" /></label>`; }
function fieldCustomRange(key, label, min, max, step = 1, unit) { return `<label class="field">${label}<output data-output="${key}"></output><input data-custom-key="${key}" type="range" min="${min}" max="${max}" step="${step}" data-unit="${unit || unitFor(key)}" /></label>`; }
function fieldText(key, label, value, type = 'text') { return `<label class="field">${label}<input data-custom-key="${key}" type="${type}" value="${String(value ?? '').replaceAll('&', '&amp;').replaceAll('"', '&quot;')}" /></label>`; }
function fieldSelect(key, label, value, options) { return `<label class="field">${label}<select data-custom-key="${key}">${options.map(([item, name]) => `<option value="${item}"${item === value ? ' selected' : ''}>${name}</option>`).join('')}</select></label>`; }
function customInspector(item) {
  const base = `${fieldCustomRange('x', '水平位置', -700, 700)}${fieldCustomRange('y', '垂直位置', -400, 600)}${fieldCustomRange('width', '宽度', 20, 900)}${fieldCustomRange('height', '高度', 20, 500)}${fieldCustomRange('opacity', '透明度', 0, 100, 1, '%')}${fieldCustomRange('z', '图层顺序', -20, 40)}${fieldText('colour', '主颜色', item.colour, 'color')}${fieldText('textColour', '文字颜色', item.textColour, 'color')}`;
  if (item.type === 'operation') return `${fieldText('text', '按钮文字', item.text)}${base}${fieldCustomRange('fontSize', '文字尺寸', 8, 64)}${fieldCustomRange('radius', '圆角', 0, 80)}${fieldSelect('action', '操作逻辑', item.action, [['scroll', '滚动到检索区'], ['theme', '打开主题设置'], ['language', '切换语言'], ['reset', '重置筛选'], ['url', '跳转链接'], ['ai', '跳转 AI 编程']])}${fieldText('url', '链接（跳转链接时使用）', item.url, 'url')}`;
  return `${fieldSelect('type', '元素类型', item.type, [['text', '文字'], ['shape', '图形']])}${item.type === 'shape' ? fieldSelect('shape', '图形形状', item.shape, [['rectangle', '矩形'], ['ellipse', '椭圆']]) : fieldText('text', '文字内容', item.text)}${base}${item.type === 'text' ? fieldCustomRange('fontSize', '文字尺寸', 8, 96) : fieldCustomRange('radius', '圆角', 0, 120)}`;
}
function renderInspector() {
  if (!selection) { inspector.innerHTML = '<p class="empty-state">尚未选择元素。预览中的表格与搜索栏不会进入排版编辑。</p>'; return; }
  const custom = selection.startsWith('custom:') ? customById(selection.slice(7)) : null;
  if (selection.startsWith('custom:') && !custom) { selection = null; renderInspector(); return; }
  const group = groups[selection]; const title = custom ? (custom.type === 'operation' ? '操作 UI' : '图形/文字元素') : group.title;
  const body = custom ? customInspector(custom) : group.fields.map(([key, label, min, max, step, unit]) => fieldRange(key, label, min, max, step, unit)).join('');
  const customActions = custom ? '<span><button id="top-custom" type="button">置顶</button> <button id="raise-custom" type="button">上移</button> <button id="lower-custom" type="button">下移</button> <button id="bottom-custom" type="button">置底</button> <button id="remove-custom" type="button">删除</button></span>' : '';
  inspector.innerHTML = `<div class="inspector-card"><h2 class="inspector-title">${title}${customActions}</h2>${body}</div>`;
  updateInspectorValues();
  inspector.querySelector('#remove-custom')?.addEventListener('click', () => { layout.customElements = layout.customElements.filter((item) => item.id !== custom.id); setSelection(null); sync(); });
  inspector.querySelector('#top-custom')?.addEventListener('click', () => shiftCustomZ(custom.id, 40));
  inspector.querySelector('#raise-custom')?.addEventListener('click', () => shiftCustomZ(custom.id, custom.z + 1));
  inspector.querySelector('#lower-custom')?.addEventListener('click', () => shiftCustomZ(custom.id, custom.z - 1));
  inspector.querySelector('#bottom-custom')?.addEventListener('click', () => shiftCustomZ(custom.id, -20));
}
function updateInspectorValues() {
  const custom = selection?.startsWith('custom:') ? customById(selection.slice(7)) : null;
  inspector.querySelectorAll('[data-layout-key]').forEach((input) => { input.value = layout[input.dataset.layoutKey]; const output = inspector.querySelector(`[data-output="${input.dataset.layoutKey}"]`); if (output) output.value = `${input.value}${input.dataset.unit || 'px'}`; });
  if (custom) inspector.querySelectorAll('[data-custom-key]').forEach((input) => { if (document.activeElement !== input) input.value = custom[input.dataset.customKey] ?? ''; const output = inspector.querySelector(`[data-output="${input.dataset.customKey}"]`); if (output) output.value = `${input.value}${input.dataset.unit || 'px'}`; });
}
function renderLayers() {
  const builtins = [['hero', '▦ 标题区'], ['brand', `T 主标题 · z ${layout.brandZ}`], ['fish', `◒ 鱼图 · z ${layout.fishZ}`], ['stats', `▤ 统计卡片 · z ${layout.statsZ}`], ['utilities', `◉ 主题/语言 · z ${layout.utilitiesZ}`]];
  const custom = layout.customElements.map((item) => [`custom:${item.id}`, item.type === 'operation' ? `▣ ${item.text || '操作 UI'} · z ${item.z}` : `◇ ${item.text || '图形/文字元素'} · z ${item.z}`, item]);
  layersPanel.innerHTML = [...builtins, ...custom].map(([id, label, item]) => `<div class="layer-row"><button class="layer-item${selection === id ? ' is-selected' : ''}" type="button" data-layer-select="${id}">${label}</button>${item ? `<button class="layer-visibility" type="button" data-layer-visibility="${item.id}" title="切换显示">${item.hidden ? '○' : '◉'}</button>` : ''}</div>`).join('');
}
function shiftCustomZ(id, z) { const item = customById(id); item.z = Math.min(40, Math.max(-20, z)); sync(); }
function setSelection(nextSelection, notify = true) { selection = nextSelection || null; renderInspector(); renderLayers(); if (notify) post('rhinogobius-layout:select', { selection }); }
function addCustom(type) {
  const id = `element-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const item = type === 'operation'
    ? { id, type, shape: 'rectangle', text: '新操作', action: 'scroll', url: '', x: 0, y: 0, width: 120, height: 40, fontSize: 15, colour: '#0c6570', textColour: '#ffffff', opacity: 100, radius: 10, z: 3 }
    : { id, type: 'text', shape: 'rectangle', text: '新文字', action: 'scroll', url: '', x: 0, y: 0, width: 160, height: 36, fontSize: 18, colour: '#0c6570', textColour: '#0c6570', opacity: 100, radius: 10, z: 3 };
  layout.customElements = [...layout.customElements, item]; sync(); setSelection(`custom:${id}`);
}

function updateInspectorInput(event) {
  const layoutKey = event.target.dataset.layoutKey; const customKey = event.target.dataset.customKey;
  if (layoutKey) { layout[layoutKey] = Number(event.target.value); sync(); return; }
  if (customKey && selection?.startsWith('custom:')) { const item = customById(selection.slice(7)); item[customKey] = event.target.type === 'range' ? Number(event.target.value) : event.target.value; sync(); }
}
inspector.addEventListener('input', updateInspectorInput);
inspector.addEventListener('change', (event) => { updateInspectorInput(event); if (event.target.dataset.customKey === 'type') renderInspector(); });
layersPanel.addEventListener('click', (event) => {
  const visibility = event.target.dataset.layerVisibility;
  if (visibility) { const item = customById(visibility); item.hidden = !item.hidden; sync(); return; }
  if (event.target.dataset.layerSelect) setSelection(event.target.dataset.layerSelect);
});
preview.addEventListener('load', () => { sync({ persist: false }); post('rhinogobius-layout:editing', { enabled: true }); post('rhinogobius-layout:select', { selection }); });
window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;
  if (event.data?.type === 'rhinogobius-layout:selected') setSelection(event.data.selection, false);
  if (event.data?.type === 'rhinogobius-layout:changed') { layout = { ...layout, ...event.data.layout }; sync(); }
});
document.querySelector('#add-operation').addEventListener('click', () => addCustom('operation'));
document.querySelector('#add-graphic').addEventListener('click', () => addCustom('text'));
document.querySelector('#deselect').addEventListener('click', () => setSelection(null));
document.querySelector('#reset-layout').addEventListener('click', () => { layout = { ...defaults, customElements: [] }; setSelection(null); sync(); status.textContent = '已恢复默认排版。'; });
document.querySelector('#copy-layout').addEventListener('click', async () => { try { await navigator.clipboard.writeText(JSON.stringify(layout, null, 2)); status.textContent = '配置已复制；把它发给我即可固化为网站默认值。'; } catch { status.textContent = '复制被浏览器阻止；请从浏览器 Local Storage 复制 rhinogobius-layout-config。'; } });
renderInspector(); sync({ persist: false });
