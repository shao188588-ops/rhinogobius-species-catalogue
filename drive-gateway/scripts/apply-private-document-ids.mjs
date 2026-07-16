#!/usr/bin/env node
import fs from 'node:fs';

const [speciesPath, mappingPath] = process.argv.slice(2);
if (!speciesPath || !mappingPath) throw new Error('Usage: apply-private-document-ids.mjs SPECIES_JSON MAPPING_JSON');

const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
const documentsBySpecies = new Map(mapping
  .filter((item) => item.privateDocumentId)
  .map((item) => [item.scientificName, item.privateDocumentId]));
const species = JSON.parse(fs.readFileSync(speciesPath, 'utf8'));
let attached = 0;
for (const item of species) {
  const documentId = documentsBySpecies.get(item.scientificName);
  if (documentId) {
    item.privateDocumentId = documentId;
    attached++;
  } else {
    delete item.privateDocumentId;
  }
  if (item.hasLocalPdf !== Boolean(documentId)) {
    throw new Error(`Local-document mismatch for ${item.scientificName}.`);
  }
}
if (attached !== documentsBySpecies.size) throw new Error('Some mapped species are absent from the site data.');
fs.writeFileSync(speciesPath, JSON.stringify(species, null, 2) + '\n');
process.stdout.write(`Attached ${attached} private document references.\n`);
