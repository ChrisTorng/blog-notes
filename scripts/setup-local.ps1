$ErrorActionPreference = 'Stop'
$notesRoot = Split-Path $PSScriptRoot -Parent
$notesVars = Join-Path $notesRoot '.dev.vars'
if (Test-Path -LiteralPath $notesVars) {
  Write-Host '.dev.vars already exists; preserved.'
  exit 0
}
$notesExample = Get-Content -LiteralPath (Join-Path $notesRoot '.dev.vars.example') -Raw
$notesExample.Replace('REPLACE_WITH_A_LONG_RANDOM_VALUE', [guid]::NewGuid().ToString('N')) |
  Set-Content -LiteralPath $notesVars -Encoding utf8
Write-Host 'Created private .dev.vars. Use its LOCAL_ADMIN_TOKEN in the localhost editor.'
