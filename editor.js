const defaults = {
  shellWidth: 1540, shellTop: 26, heroHeight: 164, heroGap: 14,
  brandX: 0, brandY: 0, brandScale: 100, sideX: 0, sideY: 0,
  fishX: 0, fishY: 0, fishScale: 100, fishOpacity: 70,
  controlsPadding: 16, tableHeight: 70,
};
const storageKey = 'rhinogobius-layout-config';
const preview = document.querySelector('#catalogue-preview');
const status = document.querySelector('#studio-status');
const fields = [...document.querySelectorAll('[data-layout-control]')];
let layout = readLayout();

function readLayout() {
  try { return { ...defaults, ...(JSON.parse(localStorage.getItem(storageKey)) || {}) }; } catch { return { ...defaults }; }
}

function unitFor(key) {
  if (key === 'brandScale' || key === 'fishScale' || key === 'fishOpacity') return '%';
  if (key === 'tableHeight') return 'vh';
  return 'px';
}

function sync({ persist = true } = {}) {
  fields.forEach((field) => {
    field.value = layout[field.dataset.layoutControl];
    document.querySelector(`[data-output="${field.dataset.layoutControl}"]`).value = `${field.value}${unitFor(field.dataset.layoutControl)}`;
  });
  if (persist) localStorage.setItem(storageKey, JSON.stringify(layout));
  preview.contentWindow?.postMessage({ type: 'rhinogobius-layout:apply', layout, persist: false }, window.location.origin);
}

fields.forEach((field) => {
  field.addEventListener('input', () => {
    layout[field.dataset.layoutControl] = Number(field.value);
    sync();
  });
});

preview.addEventListener('load', () => {
  sync({ persist: false });
  preview.contentWindow?.postMessage({ type: 'rhinogobius-layout:editing', enabled: true }, window.location.origin);
});

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin || event.data?.type !== 'rhinogobius-layout:changed') return;
  layout = { ...layout, ...event.data.layout };
  sync();
});

document.querySelector('#reset-layout').addEventListener('click', () => {
  layout = { ...defaults };
  sync();
  status.textContent = '已恢复默认排版。';
});

document.querySelector('#copy-layout').addEventListener('click', async () => {
  const text = JSON.stringify(layout, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    status.textContent = '配置已复制；把它发给我即可固化为网站默认值。';
  } catch {
    status.textContent = '复制被浏览器阻止。请从浏览器开发者工具的 Local Storage 中复制 rhinogobius-layout-config。';
  }
});

sync({ persist: false });
