import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createPrivateKey, createSign } from 'node:crypto';

const [keyPath, rootFolderId, outputPath = 'drive-inventory.private.json'] = process.argv.slice(2);
if (!keyPath || !rootFolderId) {
  console.error('Usage: node export-drive-inventory.mjs <service-account.json> <root-folder-id> [output.json]');
  process.exit(1);
}

const account = JSON.parse(await readFile(resolve(keyPath), 'utf8'));
if (account.type !== 'service_account' || !account.client_email || !account.private_key) {
  throw new Error('The supplied file is not a Google service-account JSON key.');
}

const accessToken = await getAccessToken(account);
const documents = [];
await visitFolder(rootFolderId, '');
documents.sort((left, right) => left.relativePath.localeCompare(right.relativePath));

const output = {
  generatedAt: new Date().toISOString(),
  rootFolderId,
  pdfCount: documents.length,
  documents,
};
await writeFile(resolve(outputPath), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`Wrote ${documents.length} PDF record(s) to ${resolve(outputPath)}.`);

async function visitFolder(folderId, relativeDirectory) {
  let pageToken = '';
  do {
    const query = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken,files(id,name,mimeType,shortcutDetails)',
      pageSize: '1000',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    });
    if (pageToken) query.set('pageToken', pageToken);
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${query}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error(`Drive folder listing failed with HTTP ${response.status}.`);
    const page = await response.json();
    for (const item of page.files || []) {
      const itemPath = relativeDirectory ? `${relativeDirectory}/${item.name}` : item.name;
      if (item.mimeType === 'application/vnd.google-apps.folder') {
        await visitFolder(item.id, itemPath);
      } else if (item.mimeType === 'application/pdf') {
        documents.push({ driveFileId: item.id, fileName: item.name, mimeType: item.mimeType, relativePath: itemPath });
      }
    }
    pageToken = page.nextPageToken || '';
  } while (pageToken);
}

async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const jwt = signJwt({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }, serviceAccount.private_key);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  if (!response.ok) throw new Error(`Google token request failed with HTTP ${response.status}.`);
  const body = await response.json();
  return body.access_token;
}

function signJwt(payload, privateKeyPem) {
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = base64Url(JSON.stringify(payload));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${body}`);
  signer.end();
  const signature = signer.sign(createPrivateKey(privateKeyPem));
  return `${header}.${body}.${base64Url(signature)}`;
}

function base64Url(value) {
  return Buffer.from(value).toString('base64url');
}
