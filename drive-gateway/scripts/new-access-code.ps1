$code = Read-Host 'Enter a new access code (at least 16 characters)' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($code)
try {
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  if ($plain.Length -lt 16) { throw 'The access code must be at least 16 characters.' }
  $saltBytes = [byte[]]::new(32)
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($saltBytes) } finally { $rng.Dispose() }
  $salt = [Convert]::ToBase64String($saltBytes)
  $bytes = [Text.Encoding]::UTF8.GetBytes("$salt`:$plain")
  $sha = [Security.Cryptography.SHA256]::Create()
  try { $hashBytes = $sha.ComputeHash($bytes) } finally { $sha.Dispose() }
  $hash = ([BitConverter]::ToString($hashBytes) -replace '-', '').ToLowerInvariant()
  Write-Host 'Set these values with Wrangler secret prompts. Do not commit them.'
  Write-Host "AUTH_CODE_SALT=$salt"
  Write-Host "AUTH_CODE_SHA256=$hash"
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
}
