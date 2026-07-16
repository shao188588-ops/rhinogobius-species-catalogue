#!/usr/bin/env node
import fs from 'node:fs';

const [mapPath, bulkPath] = process.argv.slice(2);
if (!mapPath || !bulkPath) throw new Error('Usage: prepare-kv-bulk-file.mjs MAP_PATH BULK_PATH');

const documentMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const entries = Object.entries(documentMap).map(([documentId, document]) => ({
  key: `document:${documentId}`,
  value: JSON.stringify(document),
}));
fs.writeFileSync(bulkPath, JSON.stringify(entries));
process.stdout.write(`Prepared ${entries.length} private KV entries.\n`);
