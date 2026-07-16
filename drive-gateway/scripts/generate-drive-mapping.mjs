#!/usr/bin/env node
/**
 * Read workbook hyperlinks and connect them to the private Drive inventory.
 * No workbook content is changed and generated files are intentionally ignored by Git.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [workbook, inventoryFile, outputDirectory] = process.argv.slice(2);
if (!workbook || !inventoryFile || !outputDirectory) {
  throw new Error('Usage: generate-drive-mapping.mjs WORKBOOK INVENTORY OUTPUT_DIRECTORY');
}

function decodeXml(value = '') {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function attributes(fragment) {
  const result = {};
  for (const match of fragment.matchAll(/([\w:.-]+)="([^"]*)"/g)) result[match[1]] = decodeXml(match[2]);
  return result;
}

function elementText(fragment) {
  return decodeXml(fragment.replace(/<[^>]+>/g, ''));
}

function normalise(value = '') {
  return decodeURIComponent(value).normalize('NFKC').replaceAll('；', ';').replaceAll('，', ',')
    .replace(/\s+/g, ' ').trim().toLocaleLowerCase('en-US');
}

function readFile(root, relativePath) {
  return fs.readFileSync(path.join(root, ...relativePath.split('/')), 'utf8');
}

function workbookRows(root) {
  const sharedXml = readFile(root, 'xl/sharedStrings.xml');
  const shared = [...sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) => elementText(match[1]));
  const workbookXml = readFile(root, 'xl/workbook.xml');
  const sheetTag = [...workbookXml.matchAll(/<sheet\b([^>]*)\/?>(?:<\/sheet>)?/g)]
    .map((match) => attributes(match[1])).find((item) => item.name === 'Valid species');
  if (!sheetTag) throw new Error("Worksheet 'Valid species' was not found.");
  const workbookRels = readFile(root, 'xl/_rels/workbook.xml.rels');
  const worksheetTarget = [...workbookRels.matchAll(/<Relationship\b([^>]*)\/?>(?:<\/Relationship>)?/g)]
    .map((match) => attributes(match[1])).find((item) => item.Id === sheetTag['r:id'])?.Target;
  if (!worksheetTarget) throw new Error('Could not resolve the Valid species worksheet.');
  const worksheetPath = `xl/${worksheetTarget}`;
  const worksheetXml = readFile(root, worksheetPath);
  const sheetName = path.posix.basename(worksheetPath);
  const relationshipPath = `${path.posix.dirname(worksheetPath)}/_rels/${sheetName}.rels`;
  const hyperlinkTargets = {};
  if (fs.existsSync(path.join(root, ...relationshipPath.split('/')))) {
    const relXml = readFile(root, relationshipPath);
    const rels = new Map([...relXml.matchAll(/<Relationship\b([^>]*)\/?>(?:<\/Relationship>)?/g)]
      .map((match) => attributes(match[1])).map((item) => [item.Id, item.Target]));
    for (const match of worksheetXml.matchAll(/<hyperlink\b([^>]*)\/?>(?:<\/hyperlink>)?/g)) {
      const item = attributes(match[1]);
      if (item.ref && rels.has(item['r:id'])) hyperlinkTargets[item.ref] = rels.get(item['r:id']);
    }
  }
  const rows = [];
  for (const rowMatch of worksheetXml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const rowNumber = Number(attributes(rowMatch[1]).r);
    const values = {};
    for (const cellMatch of rowMatch[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const cell = attributes(cellMatch[1]);
      const column = /^([A-Z]+)/.exec(cell.r)?.[1];
      if (!column) continue;
      const content = cellMatch[2] || '';
      const raw = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(content)?.[1] ?? '';
      const inline = /<is\b[^>]*>([\s\S]*?)<\/is>/.exec(content)?.[1];
      values[column] = cell.t === 's' ? (shared[Number(raw)] || '') : (inline === undefined ? decodeXml(raw) : elementText(inline));
    }
    rows.push({ rowNumber, values });
  }
  const header = rows.find((row) => Object.values(row.values).includes('Scientific name'));
  if (!header) throw new Error("Column 'Scientific name' was not found.");
  const columns = Object.fromEntries(Object.entries(header.values).map(([column, value]) => [value, column]));
  if (!columns.Reference) throw new Error("Column 'Reference' was not found.");
  return rows.filter((row) => row.rowNumber > header.rowNumber && row.values[columns['Scientific name']]?.startsWith('Rhinogobius '))
    .map((row) => ({ scientificName: row.values[columns['Scientific name']], referenceTarget: hyperlinkTargets[`${columns.Reference}${row.rowNumber}`] || '' }));
}

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rhinogobius-xlsx-'));
try {
  execFileSync('tar', ['-xf', path.resolve(workbook), '-C', temporaryDirectory], { stdio: 'pipe' });
  const catalogue = workbookRows(temporaryDirectory);
  const inventory = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'));
  const byName = new Map();
  for (const document of inventory.documents) {
    const key = normalise(document.fileName);
    byName.set(key, [...(byName.get(key) || []), document]);
  }
  const orderedDocuments = [...inventory.documents].sort((a, b) => normalise(a.fileName).localeCompare(normalise(b.fileName)));
  const linkedFileNames = new Set(catalogue.map((row) => {
    const decoded = decodeURIComponent(row.referenceTarget || '').replaceAll('\\', '/').split('?')[0];
    return normalise(decoded.slice(decoded.lastIndexOf('/') + 1));
  }));
  const referencedDocuments = orderedDocuments.filter((document) => linkedFileNames.has(normalise(document.fileName)));
  const documentKeys = new Map(referencedDocuments.map((document, index) => [normalise(document.fileName), `article-${index + 1}`]));
  const unmatched = [], ambiguous = [];
  const species = catalogue.map((row) => {
    const decoded = decodeURIComponent(row.referenceTarget || '').replaceAll('\\', '/').split('?')[0];
    const localFileName = decoded.slice(decoded.lastIndexOf('/') + 1);
    const candidates = byName.get(normalise(localFileName)) || [];
    const item = { ...row, localFileName };
    if (candidates.length === 1) {
      item.privateDocumentId = documentKeys.get(normalise(candidates[0].fileName));
      item.driveFileName = candidates[0].fileName;
    } else if (localFileName) {
      item.matchStatus = candidates.length ? 'ambiguous' : 'unmatched';
      (candidates.length ? ambiguous : unmatched).push(item);
    }
    return item;
  });
  const usedKeys = new Set(species.flatMap((item) => item.privateDocumentId ? [item.privateDocumentId] : []));
  const documentByKey = new Map(referencedDocuments.map((document) => [documentKeys.get(normalise(document.fileName)), document]));
  const kvMap = Object.fromEntries([...usedKeys].sort().map((key) => {
    const document = documentByKey.get(key);
    return [key, { fileId: document.driveFileId, label: `文献${Number(key.split('-').at(-1))}`, filename: document.fileName }];
  }));
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(path.join(outputDirectory, 'drive-species-mapping.private.json'), JSON.stringify(species, null, 2));
  fs.writeFileSync(path.join(outputDirectory, 'cloudflare-document-map.private.json'), JSON.stringify(kvMap, null, 2));
  const report = [
    `Catalogue species: ${catalogue.length}`,
    `Drive PDFs: ${inventory.documents.length}`,
    `Species linked to matched local PDFs: ${species.filter((item) => item.privateDocumentId).length}`,
    `Unique Drive PDFs used by catalogue: ${usedKeys.size}`,
    `Unmatched local links: ${unmatched.length}`,
    `Ambiguous local links: ${ambiguous.length}`,
    '',
    ...[...unmatched, ...ambiguous].map((item) => `${item.matchStatus}: ${item.scientificName} -> ${item.localFileName}`),
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(outputDirectory, 'drive-mapping-report.txt'), report);
  process.stdout.write(report);
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}
