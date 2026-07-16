const tableBody = document.querySelector('#species-table');
const searchInput = document.querySelector('#search');
const referenceFilter = document.querySelector('#reference-filter');
const resultCount = document.querySelector('#result-count');
const privateGateway = (window.RHINOGOBIUS_PRIVATE_GATEWAY || '').replace(/\/$/, '');
const root = document.documentElement;
const themeToggle = document.querySelector('#theme-toggle');
const themePopover = document.querySelector('#theme-popover');
const languageToggle = document.querySelector('#language-toggle');
const languageLabel = document.querySelector('#language-label');
const colourInput = document.querySelector('#custom-colour');
const opacityInput = document.querySelector('#background-opacity');
const opacityValue = document.querySelector('#opacity-value');
const hero = document.querySelector('.compact-hero');
const heroFish = document.querySelector('.hero-fish');

const messages = {
  zh: {
    catalogueSubtitle: '物种目录', validSpecies: '有效物种', updated: '更新时间', theme: '主题',
    presetThemes: '预设主题', themePaper: '纸张', themeMist: '薄雾', themeDusk: '暮色', themeNight: '夜间',
    customColor: '自定义颜色', opacity: '透明度', search: '检索',
    searchPlaceholder: '学名、中文正式名、作者或原始组合', referenceStatus: '文献状态', all: '全部',
    library: '本地图书馆', reset: '重置筛选', scientificName: '学名', chineseName: '中文正式名',
    authorship: '命名作者', originalCombination: '原始组合', reference: '文献入口',
    download: '下载', localLibrary: '本地图书馆', localTitle: '该 PDF 仅保存在本地图书馆中，尚未配置在线下载。',
    unavailable: '—', loading: '加载中…', failure: '数据加载失败，请通过静态网页服务器打开本站。',
    results: (count, total) => `显示 ${count} / ${total} 个物种`, switchLanguage: '切换为 English',
    pageTitle: 'Rhinogobius 物种目录',
  },
  en: {
    catalogueSubtitle: 'Species Catalogue', validSpecies: 'Valid species', updated: 'Updated', theme: 'Theme',
    presetThemes: 'Preset themes', themePaper: 'Paper', themeMist: 'Mist', themeDusk: 'Dusk', themeNight: 'Night',
    customColor: 'Custom colour', opacity: 'Opacity', search: 'Search',
    searchPlaceholder: 'Scientific name, Chinese name, authorship or original combination', referenceStatus: 'Reference status',
    all: 'All', library: 'Library', reset: 'Reset', scientificName: 'Scientific name',
    chineseName: 'Standard Chinese name', authorship: 'Authorship', originalCombination: 'Original combination',
    reference: 'Reference', download: 'Download', localLibrary: 'Library',
    localTitle: 'This PDF is stored in the local library and has not been configured for online download.',
    unavailable: '—', loading: 'Loading…', failure: 'Species data could not be loaded. Please open this site through a static web server.',
    results: (count, total) => `Showing ${count} of ${total} species`, switchLanguage: 'Switch to Chinese',
    pageTitle: 'Rhinogobius Species Catalogue',
  },
};

let species = [];
let language = 'zh';
let currentTheme = 'paper';
const layoutDefaults = {
  shellWidth: 1540, shellTop: 26, heroHeight: 164, heroGap: 14,
  brandX: 0, brandY: 0, brandScale: 100, sideX: 0, sideY: 0,
  fishX: 0, fishY: 0, fishScale: 100, fishOpacity: 70,
  controlsPadding: 16, tableHeight: 70,
};
const layoutLimits = {
  shellWidth: [900, 1900], shellTop: [0, 120], heroHeight: [90, 520], heroGap: [0, 80],
  brandX: [-500, 500], brandY: [-240, 240], brandScale: [55, 160], sideX: [-500, 500], sideY: [-240, 240],
  fishX: [-420, 420], fishY: [-240, 240], fishScale: [40, 170], fishOpacity: [15, 100],
  controlsPadding: [0, 40], tableHeight: [35, 90],
};
let layout = { ...layoutDefaults };

function readPreferences() {
  try { return JSON.parse(localStorage.getItem('rhinogobius-ui-preferences')) || {}; } catch { return {}; }
}

function readLayoutPreferences() {
  try { return JSON.parse(localStorage.getItem('rhinogobius-layout-config')) || {}; } catch { return {}; }
}

function saveLayoutPreferences() {
  try { localStorage.setItem('rhinogobius-layout-config', JSON.stringify(layout)); } catch { /* Saving layout is optional. */ }
}

function savePreferences() {
  try {
    localStorage.setItem('rhinogobius-ui-preferences', JSON.stringify({
      language, theme: currentTheme, colour: colourInput.value, opacity: opacityInput.value,
    }));
  } catch { /* Saving display choices is optional. */ }
}

function t(key) {
  return messages[language][key] ?? messages.en[key] ?? key;
}

function applyArtwork(values = {}, shouldSave = true) {
  const fish = {
    fishX: Number.isFinite(Number(values.x)) ? Number(values.x) : layout.fishX,
    fishY: Number.isFinite(Number(values.y)) ? Number(values.y) : layout.fishY,
    fishScale: Number.isFinite(Number(values.scale)) ? Number(values.scale) : layout.fishScale,
    fishOpacity: Number.isFinite(Number(values.opacity)) ? Number(values.opacity) : layout.fishOpacity,
  };
  Object.entries(fish).forEach(([key, value]) => {
    const [minimum, maximum] = layoutLimits[key];
    fish[key] = Math.min(maximum, Math.max(minimum, value));
  });
  layout = { ...layout, ...fish };
  root.style.setProperty('--fish-offset-x', `${layout.fishX}px`);
  root.style.setProperty('--fish-offset-y', `${layout.fishY}px`);
  root.style.setProperty('--fish-scale', layout.fishScale / 100);
  root.style.setProperty('--fish-opacity', layout.fishOpacity / 100);
  if (shouldSave) {
    saveLayoutPreferences();
    savePreferences();
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'rhinogobius-layout:changed', layout: { ...layout } }, window.location.origin);
    }
  }
}

function applyLayout(values = {}, shouldSave = true) {
  const next = { ...layoutDefaults, ...layout, ...values };
  Object.entries(layoutLimits).forEach(([key, [minimum, maximum]]) => {
    const numericValue = Number(next[key]);
    next[key] = Number.isFinite(numericValue)
      ? Math.min(maximum, Math.max(minimum, numericValue))
      : layoutDefaults[key];
  });
  layout = next;
  root.style.setProperty('--layout-shell-width', `${layout.shellWidth}px`);
  root.style.setProperty('--layout-shell-top', `${layout.shellTop}px`);
  root.style.setProperty('--layout-hero-height', `${layout.heroHeight}px`);
  root.style.setProperty('--layout-hero-gap', `${layout.heroGap}px`);
  root.style.setProperty('--layout-brand-x', `${layout.brandX}px`);
  root.style.setProperty('--layout-brand-y', `${layout.brandY}px`);
  root.style.setProperty('--layout-brand-scale', layout.brandScale / 100);
  root.style.setProperty('--layout-side-x', `${layout.sideX}px`);
  root.style.setProperty('--layout-side-y', `${layout.sideY}px`);
  root.style.setProperty('--layout-controls-padding', `${layout.controlsPadding}px`);
  root.style.setProperty('--layout-table-height', `${layout.tableHeight}vh`);
  applyArtwork({ x: layout.fishX, y: layout.fishY, scale: layout.fishScale, opacity: layout.fishOpacity }, false);
  if (shouldSave) saveLayoutPreferences();
  return { ...layout };
}

function makeCell(value, className = '') {
  const cell = document.createElement('td');
  if (className) cell.className = className;
  cell.textContent = value || t('unavailable');
  return cell;
}

function referenceCell(item) {
  const cell = document.createElement('td');
  if (item.referenceUrl) {
    const link = document.createElement('a');
    link.className = 'cas-link';
    link.href = item.referenceUrl;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = 'CASlink';
    cell.append(link);
  } else if (item.hasLocalPdf) {
    if (privateGateway && item.privateDocumentId) {
      const link = document.createElement('a');
      link.className = 'cas-link';
      link.href = `${privateGateway}/download/${encodeURIComponent(item.privateDocumentId)}`;
      link.textContent = t('download');
      cell.append(link);
      return cell;
    }
    const tag = document.createElement('span');
    tag.className = 'tag local';
    tag.title = t('localTitle');
    tag.textContent = t('localLibrary');
    cell.append(tag);
  } else {
    cell.textContent = t('unavailable');
  }
  return cell;
}

function currentItems() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  return species.filter((item) => {
    const referenceMatches = referenceFilter.value === 'all'
      || (referenceFilter.value === 'local' && item.hasLocalPdf)
      || (referenceFilter.value === 'cas' && Boolean(item.referenceUrl));
    const haystack = [item.scientificName, item.chineseName, item.authorship, item.originalCombination]
      .join(' ').toLocaleLowerCase();
    return referenceMatches && (!query || haystack.includes(query));
  });
}

function render() {
  const items = currentItems();
  tableBody.replaceChildren();
  const fragment = document.createDocumentFragment();
  for (const item of items) {
    const row = document.createElement('tr');
    row.append(makeCell(item.number, 'number'));
    row.append(makeCell(item.scientificName, 'scientific'));
    row.append(makeCell(item.chineseName, 'chinese'));
    row.append(makeCell(item.authorship));
    row.append(makeCell(item.originalCombination, 'original'));
    row.append(referenceCell(item));
    fragment.append(row);
  }
  tableBody.append(fragment);
  resultCount.textContent = t('results')(items.length, species.length);
}

function applyLanguage(nextLanguage) {
  language = nextLanguage;
  root.lang = language === 'zh' ? 'zh-CN' : 'en';
  document.title = t('pageTitle');
  document.querySelectorAll('[data-i18n]').forEach((element) => { element.textContent = t(element.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => { element.placeholder = t(element.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => { element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel)); });
  languageLabel.textContent = language === 'zh' ? '中文' : 'EN';
  languageToggle.setAttribute('aria-label', t('switchLanguage'));
  if (species.length) render();
  savePreferences();
}

function hexToRgba(hex, alpha) {
  const value = hex.replace('#', '');
  const normalized = value.length === 3 ? value.split('').map((part) => part + part).join('') : value;
  const number = Number.parseInt(normalized, 16);
  return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
}

function updateThemeChoices() {
  document.querySelectorAll('[data-theme-choice]').forEach((button) => {
    button.classList.toggle('is-selected', button.dataset.themeChoice === currentTheme);
  });
}

function applyTheme(theme, shouldSave = true) {
  currentTheme = theme;
  root.dataset.theme = theme;
  root.style.removeProperty('--paper');
  root.style.removeProperty('--page-glow');
  if (theme === 'custom') {
    const opacity = Number(opacityInput.value) / 100;
    root.style.setProperty('--paper', hexToRgba(colourInput.value, opacity));
    root.style.setProperty('--page-glow', hexToRgba(colourInput.value, Math.min(opacity * .32, .32)));
  }
  opacityValue.textContent = `${opacityInput.value}%`;
  updateThemeChoices();
  if (shouldSave) savePreferences();
}

function resetFilters() {
  searchInput.value = '';
  referenceFilter.value = 'all';
  render();
}

function setPopover(open) {
  themePopover.hidden = !open;
  themeToggle.setAttribute('aria-expanded', String(open));
}

async function initialize() {
  const preferences = readPreferences();
  const savedLayout = readLayoutPreferences();
  if (preferences.colour) colourInput.value = preferences.colour;
  if (preferences.opacity) opacityInput.value = preferences.opacity;
  applyTheme(preferences.theme || 'paper', false);
  applyLayout(Object.keys(savedLayout).length ? savedLayout : {
    fishX: preferences.artwork?.x, fishY: preferences.artwork?.y,
    fishScale: preferences.artwork?.scale, fishOpacity: preferences.artwork?.opacity,
  }, false);
  applyLanguage(preferences.language === 'en' ? 'en' : 'zh');
  const response = await fetch('data/species.json');
  if (!response.ok) throw new Error('Species data could not be loaded.');
  species = await response.json();
  document.querySelector('#species-count').textContent = species.length;
  render();
}

searchInput.addEventListener('input', render);
referenceFilter.addEventListener('change', render);
document.querySelector('#reset').addEventListener('click', resetFilters);
themeToggle.addEventListener('click', () => setPopover(themePopover.hidden));
document.querySelectorAll('[data-theme-choice]').forEach((button) => {
  button.addEventListener('click', () => applyTheme(button.dataset.themeChoice));
});
colourInput.addEventListener('input', () => applyTheme('custom'));
opacityInput.addEventListener('input', () => applyTheme('custom'));
languageToggle.addEventListener('click', () => applyLanguage(language === 'zh' ? 'en' : 'zh'));
let artworkDrag;
heroFish.addEventListener('pointerdown', (event) => {
  if (!hero.classList.contains('is-artwork-editing')) return;
  event.preventDefault();
  heroFish.setPointerCapture(event.pointerId);
  artworkDrag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, ...layout };
});
heroFish.addEventListener('pointermove', (event) => {
  if (!artworkDrag || artworkDrag.pointerId !== event.pointerId) return;
  applyArtwork({ x: artworkDrag.fishX + event.clientX - artworkDrag.startX, y: artworkDrag.fishY + event.clientY - artworkDrag.startY });
});
heroFish.addEventListener('pointerup', (event) => {
  if (artworkDrag?.pointerId === event.pointerId) artworkDrag = undefined;
});
document.addEventListener('pointerdown', (event) => {
  if (!event.target.closest('.menu-wrap')) setPopover(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setPopover(false);
});

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;
  if (event.data?.type === 'rhinogobius-layout:apply') {
    applyLayout(event.data.layout, Boolean(event.data.persist));
  }
  if (event.data?.type === 'rhinogobius-layout:editing') {
    hero.classList.toggle('is-artwork-editing', Boolean(event.data.enabled));
  }
});

initialize().catch((error) => {
  resultCount.textContent = t('failure');
  console.error(error);
});
