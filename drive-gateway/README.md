# Private Google Drive download gateway

This Cloudflare Worker lets the public catalogue link to documents that remain private in Google Drive. A browser must register with the access code, retain a valid device cookie, and enter the access code for each download. The Worker retrieves the file from Drive only after those checks pass.

No PDF, Google credential, access code, Drive file ID, or Cloudflare namespace ID belongs in this repository.

## Prerequisites

1. Create a Google Cloud project and enable the Google Drive API.
2. Create a service account and a JSON private key. Do **not** commit the JSON file.
3. Create a dedicated Drive folder, upload only documents you are allowed to distribute, set General access to **Restricted**, and share that folder with the service account email as Viewer.
4. Create a free Cloudflare Workers account. No R2 subscription is needed.
5. Install Node.js LTS and Wrangler on the deployment machine.

## Deploy the Worker

From this directory, authenticate and create two KV namespaces:

```powershell
npx wrangler login
npx wrangler kv namespace create DOCUMENTS
npx wrangler kv namespace create ACCESS_STATE
```

Copy the two returned namespace IDs into `wrangler.toml`, then deploy once:

```powershell
npx wrangler deploy
```

Set secrets through prompts or standard input. None of these values may be added to `wrangler.toml`, JavaScript, or Git:

```powershell
Get-Content 'C:\path\to\service-account.json' -Raw | npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
.\scripts\new-access-code.ps1
npx wrangler secret put AUTH_CODE_SALT
npx wrangler secret put AUTH_CODE_SHA256
```

Use the two values printed by `new-access-code.ps1` at the matching secret prompts. Use a random access code of at least 16 characters, and keep it outside the repository.

## Add documents

For each PDF, copy its Drive file ID and store the private mapping in the `DOCUMENTS` namespace. The document key is the value that will later be placed in a catalogue item's `privateDocumentId` field.

```powershell
npx wrangler kv key put --binding=DOCUMENTS 'document:article-1' '{"fileId":"GOOGLE_DRIVE_FILE_ID","label":"文献1","filename":"文献1.pdf"}'
```

The mapping in `documents.example.json` is only a template; it must not receive real IDs before publication. One shared source paper should have one document key and may be assigned to multiple species.

## Connect the catalogue

After deployment, set the Worker URL in `gateway-config.js`, for example:

```js
window.RHINOGOBIUS_PRIVATE_GATEWAY = 'https://rhinogobius-private-library.<account>.workers.dev';
```

For every catalogue item that has an approved document, add its matching `privateDocumentId` to `data/species.json`. The site will then show `下载`; unmatched local entries remain labelled `本地文献` and do not expose a link.

## Revoking devices and documents

- Remove `device:<token>` entries from `ACCESS_STATE` to revoke a browser. Device entries expire after 90 days by default.
- Remove `document:<key>` from `DOCUMENTS` to disable a document immediately.
- Change both access-code secrets to invalidate the old code.

This gate controls access before download. It cannot prevent an authorized recipient from saving or forwarding a downloaded file.
