[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string] $InputZipPath,

  [Parameter(Mandatory = $true)]
  [string] $OutputZipPath,

  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-fA-F]{40}$')]
  [string] $CertificateThumbprint,

  [Parameter(Mandatory = $true)]
  [uri] $TimestampUrl,

  [string] $SignToolPath
)

$ErrorActionPreference = 'Stop'

if ($TimestampUrl.Scheme -ne 'https') {
  throw 'Use an HTTPS timestamp service URL from your code-signing provider.'
}

$inputPath = (Resolve-Path -LiteralPath $InputZipPath).Path
$outputPath = [System.IO.Path]::GetFullPath($OutputZipPath)
$checksumPath = "$outputPath.sha256"
if ($inputPath -eq $outputPath) { throw 'Choose a new output path; the original release must remain unchanged.' }
if (Test-Path -LiteralPath $outputPath) { throw "Output already exists: $outputPath" }
if (Test-Path -LiteralPath $checksumPath) { throw "Checksum output already exists: $checksumPath" }

if (-not $SignToolPath) {
  $signTool = Get-Command signtool.exe -ErrorAction SilentlyContinue
  if (-not $signTool) { throw 'SignTool was not found. Install the Windows SDK or pass -SignToolPath.' }
  $SignToolPath = $signTool.Source
}
if (-not (Test-Path -LiteralPath $SignToolPath)) { throw "SignTool was not found at: $SignToolPath" }

$thumbprint = $CertificateThumbprint.Replace(' ', '').ToUpperInvariant()
$certificate = Get-ChildItem -LiteralPath 'Cert:\CurrentUser\My' |
  Where-Object { $_.Thumbprint -eq $thumbprint } |
  Select-Object -First 1
if (-not $certificate) { throw 'The signing certificate was not found in the current user certificate store.' }
if (-not $certificate.HasPrivateKey) { throw 'The selected certificate has no available private key. Keep private keys in the provider HSM/token.' }
$codeSigningOid = '1.3.6.1.5.5.7.3.3'
if ($certificate.EnhancedKeyUsageList.ObjectId.Value -notcontains $codeSigningOid) {
  throw 'The selected certificate is not valid for code signing.'
}

$workRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("floater-sign-" + [guid]::NewGuid().ToString('N'))
$stage = Join-Path $workRoot 'package'
New-Item -ItemType Directory -Path $stage -Force | Out-Null

try {
  Expand-Archive -LiteralPath $inputPath -DestinationPath $stage
  foreach ($name in @('Float.exe', 'Float-Setup.exe')) {
    $target = Join-Path $stage $name
    if (-not (Test-Path -LiteralPath $target -PathType Leaf)) { throw "Required release binary is missing: $name" }
    & $SignToolPath sign /fd SHA256 /td SHA256 /tr $TimestampUrl.AbsoluteUri /sha1 $thumbprint /d 'Floater Typist' $target
    if ($LASTEXITCODE -ne 0) { throw "SignTool could not sign $name (exit code $LASTEXITCODE)." }
    & $SignToolPath verify /pa /all /v $target
    if ($LASTEXITCODE -ne 0) { throw "SignTool could not verify $name (exit code $LASTEXITCODE)." }
    $signature = Get-AuthenticodeSignature -LiteralPath $target
    if ($signature.Status -ne 'Valid') { throw "$name signature status is $($signature.Status)." }
    if ($signature.SignerCertificate.Thumbprint -ne $thumbprint) { throw "$name was signed by a different publisher certificate." }
  }

  $manifestPath = Join-Path $stage 'SHA256SUMS.txt'
  if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) { throw 'The package SHA256SUMS.txt manifest is missing.' }
  $manifest = Get-ChildItem -LiteralPath $stage -File |
    Where-Object { $_.Name -ne 'SHA256SUMS.txt' } |
    Sort-Object Name |
    ForEach-Object {
      $hash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
      "$hash  $($_.Name)"
    }
  Set-Content -LiteralPath $manifestPath -Value $manifest -Encoding Ascii

  $parent = Split-Path -Parent $outputPath
  if (-not (Test-Path -LiteralPath $parent -PathType Container)) { throw "Output directory does not exist: $parent" }
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [System.IO.Compression.ZipFile]::CreateFromDirectory(
    $stage,
    $outputPath,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $false
  )
  $zipHash = (Get-FileHash -LiteralPath $outputPath -Algorithm SHA256).Hash
  Set-Content -LiteralPath $checksumPath -Value "$zipHash  $(Split-Path -Leaf $outputPath)" -Encoding Ascii
  Write-Output "Signed archive created: $outputPath"
  Write-Output "SHA-256: $zipHash"
} finally {
  if (Test-Path -LiteralPath $workRoot -PathType Container) {
    Remove-Item -LiteralPath $workRoot -Recurse -Force
  }
}

