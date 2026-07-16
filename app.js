const tableBody = document.querySelector('#species-table');
const searchInput = document.querySelector('#search');
const dnaFilter = document.querySelector('#dna-filter');
const referenceFilter = document.querySelector('#reference-filter');
const resultCount = document.querySelector('#result-count');

let species = [];

function makeCell(value, className = '') {
  const cell = document.createElement('td');
  if (className) cell.className = className;
  cell.textContent = value || '—';
  return cell;
}

function dnaTag(value) {
  const tag = document.createElement('span');
  const normalized = value === 'Yes' ? 'yes' : value === 'No' ? 'no' : 'blank';
  tag.className = `tag dna-${normalized}`;
  tag.textContent = value || '未标注';
  return tag;
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
    const tag = document.createElement('span');
    tag.className = 'tag local';
    tag.title = '该 PDF 仅保存在本地文献库，未随网页发布。';
    tag.textContent = '本地文献';
    cell.append(tag);
  } else {
    cell.textContent = '—';
  }
  return cell;
}

function currentItems() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  return species.filter((item) => {
    const referenceMatches = referenceFilter.value === 'all'
      || (referenceFilter.value === 'local' && item.hasLocalPdf)
      || (referenceFilter.value === 'cas' && Boolean(item.referenceUrl));
    const dnaMatches = dnaFilter.value === 'all'
      || (dnaFilter.value === 'blank' && !item.describedWithDna)
      || item.describedWithDna === dnaFilter.value;
    const haystack = [item.scientificName, item.chineseName, item.authorship, item.originalCombination, item.typeLocality, item.notes]
      .join(' ')
      .toLocaleLowerCase();
    return referenceMatches && dnaMatches && (!query || haystack.includes(query));
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
    row.append(makeCell(item.typeLocality, 'locality'));
    const dnaCell = document.createElement('td');
    dnaCell.append(dnaTag(item.describedWithDna));
    row.append(dnaCell);
    row.append(referenceCell(item));
    row.append(makeCell(item.notes));
    fragment.append(row);
  }
  tableBody.append(fragment);
  resultCount.textContent = `显示 ${items.length} / ${species.length} 个物种`;
}

function resetFilters() {
  searchInput.value = '';
  dnaFilter.value = 'all';
  referenceFilter.value = 'all';
  render();
}

async function initialize() {
  const response = await fetch('data/species.json');
  if (!response.ok) throw new Error('Species data could not be loaded.');
  species = await response.json();
  document.querySelector('#species-count').textContent = species.length;
  document.querySelector('#local-pdf-count').textContent = species.filter((item) => item.hasLocalPdf).length;
  document.querySelector('#cas-count').textContent = species.filter((item) => item.referenceUrl).length;
  render();
}

searchInput.addEventListener('input', render);
dnaFilter.addEventListener('change', render);
referenceFilter.addEventListener('change', render);
document.querySelector('#reset').addEventListener('click', resetFilters);

initialize().catch((error) => {
  resultCount.textContent = '数据加载失败，请通过静态网页服务器打开本站。';
  console.error(error);
});
