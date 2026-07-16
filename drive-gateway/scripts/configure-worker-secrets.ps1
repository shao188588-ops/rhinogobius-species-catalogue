param([string]$KeyPath)

$ErrorActionPreference = 'Stop'
$env:Path = 'C:\Program Files\nodejs;' + $env:Path
$gatewayRoot = Split-Path $PSScriptRoot -Parent
Set-Location $gatewayRoot
$npx = 'C:\Program Files\nodejs\npx.cmd'

function Set-WorkerSecret([string]$name, [string]$value) {
  $value | & $npx --yes wrangler secret put $name
  if ($LASTEXITCODE -ne 0) { throw "Failed to set $name." }
}

$keyPath = if ($KeyPath) { $KeyPath } else { Read-Host 'Paste the full path to the downloaded Google service-account JSON file' }
$keyPath = $keyPath.Trim().Trim('"')
if (-not (Test-Path -LiteralPath $keyPath -PathType Leaf)) { throw 'The JSON file path was not found.' }
$serviceAccountJson = Get-Content -LiteralPath $keyPath -Raw -Encoding utf8
$serviceAccount = $serviceAccountJson | ConvertFrom-Json
if ($serviceAccount.type -ne 'service_account' -or -not $serviceAccount.client_email -or -not $serviceAccount.private_key) {
  throw 'This does not appear to be a Google service-account JSON key.'
}

$code = Read-Host 'Enter a new private-download access code (at least 16 characters)' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($code)
try {
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  if ($plain.Length -lt 16) { throw 'The access code must be at least 16 characters.' }
  $saltBytes = [byte[]]::new(32)
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($saltBytes) } finally { $rng.Dispose() }
  $salt = [Convert]::ToBase64String($saltBytes)
  $sha = [Security.Cryptography.SHA256]::Create()
  try { $hashBytes = $sha.ComputeHash([Text.Encoding]::UTF8.GetBytes("$salt`:$plain")) } finally { $sha.Dispose() }
  $hash = ([BitConverter]::ToString($hashBytes) -replace '-', '').ToLowerInvariant()

  Set-WorkerSecret 'GOOGLE_SERVICE_ACCOUNT_JSON' $serviceAccountJson
  Set-WorkerSecret 'AUTH_CODE_SALT' $salt
  Set-WorkerSecret 'AUTH_CODE_SHA256' $hash
  Write-Host 'All Worker secrets were set successfully. No secret values were printed.' -ForegroundColor Green
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
}
