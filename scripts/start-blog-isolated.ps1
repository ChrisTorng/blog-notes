param([string]$BlogPath = (Join-Path $PSScriptRoot '../../christorng.github.io'))
$ErrorActionPreference = 'Stop'
$notesRoot = Split-Path $PSScriptRoot -Parent
$notesBlog = (Resolve-Path -LiteralPath $BlogPath).Path
$notesLocal = Join-Path $notesRoot '.local'
$notesCopy = Join-Path $notesLocal 'blog'
if (Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue) {
  throw 'Port 3000 is already in use. Keep that server or stop it yourself before starting this isolated copy.'
}
if (!(Test-Path -LiteralPath (Join-Path $notesCopy 'package.json'))) {
  New-Item -ItemType Directory -Force -Path $notesLocal | Out-Null
  $notesZip = Join-Path $notesLocal 'blog.zip'
  git -C $notesBlog archive HEAD --format=zip --output=$notesZip
  if ($LASTEXITCODE -ne 0) { throw 'Unable to archive the committed blog.' }
  Expand-Archive -LiteralPath $notesZip -DestinationPath $notesCopy
}
if (!(Test-Path -LiteralPath (Join-Path $notesCopy 'node_modules'))) {
  $notesModules = Join-Path $notesBlog 'node_modules'
  if (!(Test-Path -LiteralPath $notesModules)) { throw 'Install the original blog dependencies first.' }
  New-Item -ItemType Junction -Path (Join-Path $notesCopy 'node_modules') -Target $notesModules | Out-Null
}
node (Join-Path $notesRoot 'integration/install-blog.mjs') $notesCopy
if ($LASTEXITCODE -ne 0) { throw 'Unable to install local blog integration.' }
Push-Location $notesCopy
try { npm run start } finally { Pop-Location }
