const tableBody = document.querySelector('#species-table');
const searchInput = document.querySelector('#search');
const referenceFilter = document.querySelector('#reference-filter');
const resultCount = document.querySelector('#result-count');
const privateGateway = (window.RHINOGOBIUS_PRIVATE_GATEWAY || '').replace(/\/$/, '');
const root = document.documentElement;
const hero = document.querySelector('.compact-hero');
const heroFish = document.querySelector('.hero-fish');
const customLayer = document.querySelector('#custom-elements-layer');
const themeToggle = document.querySelector('#theme-toggle');
const themePopover = document.querySelector('#theme-popover');
const themeMenu = themeToggle.closest('.menu-wrap');
const languageToggle = document.querySelector('#language-toggle');
const languageLabel = document.querySelector('#language-label');
const colourInput = document.querySelector('#custom-colour');
const opacityInput = document.querySelector('#background-opacity');
const opacityValue = document.querySelector('#opacity-value');

const messages = {
  zh: {
    catalogueSubtitle: '物种目录', validSpecies: '有效物种', updated: '更新时间', theme: '主题', presetThemes: '预设主题',
    themePaper: '纸张', themeMist: '薄雾', themeDusk: '暮色', themeNight: '夜间', customColor: '自定义颜色', opacity: '透明度',
    search: '检索', searchPlaceholder: '学名、中文正式名、作者或原始组合', referenceStatus: '文献状态', all: '全部',
    library: '本地图书馆', reset: '重置筛选', scientificName: '学名', chineseName: '中文正式名', authorship: '命名作者',
    originalCombination: '原始组合', reference: '文献入口', download: '下载', localLibrary: '本地图书馆', unavailable: '—',
    loading: '加载中…', failure: '数据加载失败，请通过静态网页服务打开本站。', results: (count, total) => `显示 ${count} / ${total} 个物种`,
    switchLanguage: '切换至 English', pageTitle: 'Rhinogobius 物种目录',
  },
  en: {
    catalogueSubtitle: 'Species Catalogue', validSpecies: 'Valid species', updated: 'Updated', theme: 'Theme', presetThemes: 'Preset themes',
    themePaper: 'Paper', themeMist: 'Mist', themeDusk: 'Dusk', themeNight: 'Night', customColor: 'Custom colour', opacity: 'Opacity',
    search: 'Search', searchPlaceholder: 'Scientific name, Chinese name, authorship or original combination', referenceStatus: 'Reference status',
    all: 'All', library: 'Library', reset: 'Reset', scientificName: 'Scientific name', chineseName: 'Standard Chinese name',
    authorship: 'Authorship', originalCombination: 'Original combination', reference: 'Reference', download: 'Download',
    localLibrary: 'Library', unavailable: '—', loading: 'Loading…', failure: 'Species data could not be loaded.',
    results: (count, total) => `Showing ${count} of ${total} species`, switchLanguage: 'Switch to Chinese',
    pageTitle: 'Rhinogobius Species Catalogue',
  },
};

const layoutDefaults = {
  shellWidth: 1540, shellTop: 26, heroHeight: 164, heroGap: 14,
  brandX: 0, brandY: 0, brandScale: 100, brandZ: 2,
  statsX: 0, statsY: 0, statsScale: 100, statsZ: 2,
  utilitiesX: 0, utilitiesY: 0, utilitiesScale: 100, utilitiesZ: 2,
  fishX: 0, fishY: 0, fishScale: 100, fishOpacity: 70, fishZ: 1,
  controlsPadding: 16, tableHeight: 70, customElements: [],
};
const layoutLimits = {
  shellWidth: [900, 1900], shellTop: [0, 160], heroHeight: [80, 720], heroGap: [0, 120],
  brandX: [-600, 600], brandY: [-300, 300], brandScale: [45, 180], brandZ: [-20, 40],
  statsX: [-600, 600], statsY: [-300, 300], statsScale: [45, 180], statsZ: [-20, 40],
  utilitiesX: [-600, 600], utilitiesY: [-300, 300], utilitiesScale: [45, 180], utilitiesZ: [-20, 40],
  fishX: [-700, 700], fishY: [-360, 500], fishScale: [25, 220], fishOpacity: [5, 100], fishZ: [-20, 40],
  controlsPadding: [0, 56], tableHeight: [35, 90],
};

let species = [];
let language = 'zh';
let currentTheme = 'paper';
let layout = { ...layoutDefaults };
let layoutEditing = false;
let layoutSelection = null;
let dragState = null;
let themePopoverPortaled = false;

function t(key) { return messages[language][key] ?? messages.en[key] ?? key; }
function readPreferences() { try { return JSON.parse(localStorage.getItem('rhinogobius-ui-preferences')) || {}; } catch { return {}; } }
function readLayoutPreferences() { try { return JSON.parse(localStorage.getItem('rhinogobius-layout-config')) || {}; } catch { return {}; } }
function saveLayoutPreferences() { try { localStorage.setItem('rhinogobius-layout-config', JSON.stringify(layout)); } catch { /* Optional. */ } }
function savePreferences() { try { localStorage.setItem('rhinogobius-ui-preferences', JSON.stringify({ language, theme: currentTheme, colour: colourInput.value, opacity: opacityInput.value })); } catch { /* Optional. */ } }
function bound(key, value) { const [minimum, maximum] = layoutLimits[key]; return Math.min(maximum, Math.max(minimum, Number(value))); }

function normaliseCustom(item) {
  return {
    id: item.id || `element-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: ['operation', 'text', 'shape'].includes(item.type) ? item.type : 'text',
    shape: item.shape === 'ellipse' ? 'ellipse' : 'rectangle', text: String(item.text ?? 'New element'),
    action: item.action || 'scroll', url: String(item.url || ''), x: Number(item.x) || 0, y: Number(item.y) || 0,
    width: Math.max(20, Number(item.width) || 160), height: Math.max(20, Number(item.height) || 42),
    fontSize: Math.max(8, Number(item.fontSize) || 16), colour: item.colour || '#0c6570', textColour: item.textColour || '#ffffff',
    opacity: Number.isFinite(Number(item.opacity)) ? Math.min(100, Math.max(0, Number(item.opacity))) : 100,
    radius: Math.max(0, Number(item.radius) || 10),
    z: Number.isFinite(Number(item.z)) ? Math.min(40, Math.max(-20, Number(item.z))) : 3,
    hidden: Boolean(item.hidden),
  };
}

function renderCustomElements() {
  customLayer.replaceChildren();
  layout.customElements.forEach((item) => {
    const element = document.createElement(item.type === 'operation' ? 'button' : 'div');
    element.className = `custom-element ${item.type} ${item.shape}`;
    element.dataset.layoutSelect = 'custom';
    element.dataset.customId = item.id;
    element.style.setProperty('--custom-x', `${item.x}px`);
    element.style.setProperty('--custom-y', `${item.y}px`);
    element.style.setProperty('--custom-width', `${item.width}px`);
    element.style.setProperty('--custom-height', `${item.height}px`);
    element.style.setProperty('--custom-font-size', `${item.fontSize}px`);
    element.style.setProperty('--custom-colour', item.colour);
    element.style.setProperty('--custom-text-colour', item.textColour);
    element.style.setProperty('--custom-opacity', item.opacity / 100);
    element.style.setProperty('--custom-radius', `${item.radius}px`);
    element.style.zIndex = String(item.z);
    if (item.hidden) element.hidden = true;
    if (item.type !== 'shape') element.textContent = item.text;
    if (item.type === 'operation') element.type = 'button';
    customLayer.append(element);
  });
}

function updateHeroClearance() {
  requestAnimationFrame(() => {
    const heroBox = hero.getBoundingClientRect();
    let requiredHeight = layout.heroHeight;
    hero.querySelectorAll('[data-layout-select]').forEach((element) => {
      if (element === hero) return;
      requiredHeight = Math.max(requiredHeight, Math.ceil(element.getBoundingClientRect().bottom - heroBox.top + 18));
    });
    root.style.setProperty('--layout-hero-clearance', `${Math.max(0, requiredHeight)}px`);
  });
}

function applyLayout(values = {}, shouldSave = true) {
  const next = { ...layoutDefaults, ...layout, ...values };
  if (values.statsX === undefined && values.sideX !== undefined) next.statsX = values.sideX;
  if (values.statsY === undefined && values.sideY !== undefined) next.statsY = values.sideY;
  Object.keys(layoutLimits).forEach((key) => { next[key] = Number.isFinite(Number(next[key])) ? bound(key, next[key]) : layoutDefaults[key]; });
  next.customElements = Array.isArray(next.customElements) ? next.customElements.map(normaliseCustom) : [];
  layout = next;
  const cssValues = {
    '--layout-shell-width': `${layout.shellWidth}px`, '--layout-shell-top': `${layout.shellTop}px`, '--layout-hero-height': `${layout.heroHeight}px`,
    '--layout-hero-gap': `${layout.heroGap}px`, '--layout-brand-x': `${layout.brandX}px`, '--layout-brand-y': `${layout.brandY}px`,
    '--layout-brand-scale': layout.brandScale / 100, '--layout-brand-z': layout.brandZ, '--layout-stats-x': `${layout.statsX}px`, '--layout-stats-y': `${layout.statsY}px`,
    '--layout-stats-scale': layout.statsScale / 100, '--layout-stats-z': layout.statsZ, '--layout-utilities-x': `${layout.utilitiesX}px`, '--layout-utilities-y': `${layout.utilitiesY}px`,
    '--layout-utilities-scale': layout.utilitiesScale / 100, '--layout-utilities-z': layout.utilitiesZ, '--fish-offset-x': `${layout.fishX}px`, '--fish-offset-y': `${layout.fishY}px`,
    '--fish-scale': layout.fishScale / 100, '--fish-opacity': layout.fishOpacity / 100, '--fish-z': layout.fishZ,
    '--layout-controls-padding': `${layout.controlsPadding}px`, '--layout-table-height': `${layout.tableHeight}vh`,
  };
  Object.entries(cssValues).forEach(([key, value]) => root.style.setProperty(key, value));
  renderCustomElements();
  updateHeroClearance();
  if (shouldSave) saveLayoutPreferences();
  return { ...layout };
}

function setLayoutSelection(selection, notifyParent = true) {
  layoutSelection = selection || null;
  hero.querySelectorAll('.layout-selected').forEach((element) => element.classList.remove('layout-selected'));
  if (layoutSelection) {
    const target = layoutSelection.startsWith('custom:')
      ? hero.querySelector(`[data-custom-id="${CSS.escape(layoutSelection.slice(7))}"]`)
      : hero.querySelector(`[data-layout-select="${layoutSelection}"]`);
    target?.classList.add('layout-selected');
  }
  if (notifyParent && window.parent !== window) window.parent.postMessage({ type: 'rhinogobius-layout:selected', selection: layoutSelection }, window.location.origin);
}

function setLayoutEditing(enabled) {
  layoutEditing = Boolean(enabled);
  hero.classList.toggle('is-layout-editing', layoutEditing);
  if (!layoutEditing) setLayoutSelection(null, false);
}

function makeCell(value, className = '') { const cell = document.createElement('td'); if (className) cell.className = className; cell.textContent = value || t('unavailable'); return cell; }
function referenceCell(item) {
  const cell = document.createElement('td');
  if (item.referenceUrl) { const link = document.createElement('a'); link.className = 'cas-link'; link.href = item.referenceUrl; link.target = '_blank'; link.rel = 'noreferrer'; link.textContent = 'CASlink'; cell.append(link); }
  else if (item.hasLocalPdf && privateGateway && item.privateDocumentId) { const link = document.createElement('a'); link.className = 'cas-link'; link.href = `${privateGateway}/download/${encodeURIComponent(item.privateDocumentId)}`; link.textContent = t('download'); cell.append(link); }
  else if (item.hasLocalPdf) { const tag = document.createElement('span'); tag.className = 'tag local'; tag.textContent = t('localLibrary'); cell.append(tag); }
  else cell.textContent = t('unavailable');
  return cell;
}
function currentItems() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  return species.filter((item) => {
    const referenceMatches = referenceFilter.value === 'all' || (referenceFilter.value === 'local' && item.hasLocalPdf) || (referenceFilter.value === 'cas' && Boolean(item.referenceUrl));
    return referenceMatches && (!query || [item.scientificName, item.chineseName, item.authorship, item.originalCombination].join(' ').toLocaleLowerCase().includes(query));
  });
}
function render() {
  const items = currentItems(); tableBody.replaceChildren(); const fragment = document.createDocumentFragment();
  items.forEach((item) => { const row = document.createElement('tr'); row.append(makeCell(item.number, 'number'), makeCell(item.scientificName, 'scientific'), makeCell(item.chineseName, 'chinese'), makeCell(item.authorship), makeCell(item.originalCombination, 'original'), referenceCell(item)); fragment.append(row); });
  tableBody.append(fragment); resultCount.textContent = t('results')(items.length, species.length);
}
function applyLanguage(nextLanguage) {
  language = nextLanguage; root.lang = language === 'zh' ? 'zh-CN' : 'en'; document.title = t('pageTitle');
  document.querySelectorAll('[data-i18n]').forEach((element) => { element.textContent = t(element.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => { element.placeholder = t(element.dataset.i18nPlaceholder); });
  languageLabel.textContent = language === 'zh' ? '中文' : 'EN'; languageToggle.setAttribute('aria-label', t('switchLanguage')); if (species.length) render(); savePreferences();
}
function hexToRgba(hex, alpha) { const value = hex.replace('#', ''); const normalized = value.length === 3 ? value.split('').map((part) => part + part).join('') : value; const number = Number.parseInt(normalized, 16); return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`; }
function applyTheme(theme, shouldSave = true) {
  currentTheme = theme; root.dataset.theme = theme; root.style.removeProperty('--paper'); root.style.removeProperty('--page-glow');
  if (theme === 'custom') { const opacity = Number(opacityInput.value) / 100; root.style.setProperty('--paper', hexToRgba(colourInput.value, opacity)); root.style.setProperty('--page-glow', hexToRgba(colourInput.value, Math.min(opacity * .32, .32))); }
  opacityValue.textContent = `${opacityInput.value}%`; document.querySelectorAll('[data-theme-choice]').forEach((button) => button.classList.toggle('is-selected', button.dataset.themeChoice === currentTheme)); if (shouldSave) savePreferences();
}
function resetFilters() { searchInput.value = ''; referenceFilter.value = 'all'; render(); }
function positionThemePopover() {
  const toggleBox = themeToggle.getBoundingClientRect();
  themePopover.style.top = `${toggleBox.bottom + 8}px`;
  themePopover.style.left = `${Math.max(12, toggleBox.right - themePopover.offsetWidth)}px`;
}
function setThemePopover(open) {
  if (open) {
    if (!themePopoverPortaled) {
      document.body.append(themePopover);
      themePopover.classList.add('is-portal');
      themePopoverPortaled = true;
    }
    themePopover.hidden = false;
    positionThemePopover();
  } else {
    themePopover.hidden = true;
    if (themePopoverPortaled) {
      themeMenu.append(themePopover);
      themePopover.classList.remove('is-portal');
      themePopover.style.removeProperty('top');
      themePopover.style.removeProperty('left');
      themePopoverPortaled = false;
    }
  }
  themeToggle.setAttribute('aria-expanded', String(open));
}
function runCustomAction(item) {
  if (item.action === 'scroll') document.querySelector('.controls').scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (item.action === 'theme') themeToggle.click();
  if (item.action === 'language') languageToggle.click();
  if (item.action === 'reset') resetFilters();
  if (item.action === 'url' && /^https?:\/\//i.test(item.url)) window.open(item.url, '_blank', 'noopener,noreferrer');
  if (item.action === 'ai') window.open('https://chatgpt.com/', '_blank', 'noopener,noreferrer');
}

async function initialize() {
  const preferences = readPreferences(); if (preferences.colour) colourInput.value = preferences.colour; if (preferences.opacity) opacityInput.value = preferences.opacity;
  applyTheme(preferences.theme || 'paper', false); applyLayout(readLayoutPreferences(), false); applyLanguage(preferences.language === 'en' ? 'en' : 'zh');
  const response = await fetch('data/species.json'); if (!response.ok) throw new Error('Species data could not be loaded.'); species = await response.json(); document.querySelector('#species-count').textContent = species.length; render(); updateHeroClearance();
}

searchInput.addEventListener('input', render); referenceFilter.addEventListener('change', render); document.querySelector('#reset').addEventListener('click', resetFilters);
themeToggle.addEventListener('click', () => setThemePopover(themePopover.hidden));
document.querySelectorAll('[data-theme-choice]').forEach((button) => button.addEventListener('click', () => applyTheme(button.dataset.themeChoice)));
colourInput.addEventListener('input', () => applyTheme('custom')); opacityInput.addEventListener('input', () => applyTheme('custom')); languageToggle.addEventListener('click', () => applyLanguage(language === 'zh' ? 'en' : 'zh'));
document.addEventListener('pointerdown', (event) => {
  if (!layoutEditing) { if (!event.target.closest('.menu-wrap') && !themePopover.contains(event.target)) setThemePopover(false); return; }
  const custom = event.target.closest('[data-custom-id]'); const selectable = event.target.closest('[data-layout-select]'); const selection = custom ? `custom:${custom.dataset.customId}` : selectable?.dataset.layoutSelect;
  if (!selection) return;
  event.preventDefault(); event.stopPropagation(); setLayoutSelection(selection);
  if (selection === 'fish' || selection.startsWith('custom:')) {
    const item = selection === 'fish' ? null : layout.customElements.find((element) => element.id === custom.dataset.customId);
    dragState = { pointerId: event.pointerId, selection, startX: event.clientX, startY: event.clientY, x: item ? item.x : layout.fishX, y: item ? item.y : layout.fishY };
    event.target.setPointerCapture?.(event.pointerId);
  }
}, true);
document.addEventListener('pointermove', (event) => {
  if (!dragState || dragState.pointerId !== event.pointerId) return;
  const x = dragState.x + event.clientX - dragState.startX; const y = dragState.y + event.clientY - dragState.startY;
  if (dragState.selection === 'fish') applyLayout({ fishX: x, fishY: y });
  else applyLayout({ customElements: layout.customElements.map((item) => item.id === dragState.selection.slice(7) ? { ...item, x, y } : item) });
});
document.addEventListener('pointerup', (event) => { if (dragState?.pointerId === event.pointerId) dragState = null; });
customLayer.addEventListener('click', (event) => { if (layoutEditing) return; const item = layout.customElements.find((element) => element.id === event.target.closest('[data-custom-id]')?.dataset.customId); if (item?.type === 'operation') runCustomAction(item); });
window.addEventListener('resize', () => { updateHeroClearance(); if (themePopoverPortaled) positionThemePopover(); }); heroFish.addEventListener('load', updateHeroClearance);
window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;
  if (event.data?.type === 'rhinogobius-layout:apply') applyLayout(event.data.layout, Boolean(event.data.persist));
  if (event.data?.type === 'rhinogobius-layout:editing') setLayoutEditing(event.data.enabled);
  if (event.data?.type === 'rhinogobius-layout:select') setLayoutSelection(event.data.selection, false);
});
initialize().catch((error) => { resultCount.textContent = t('failure'); console.error(error); });
