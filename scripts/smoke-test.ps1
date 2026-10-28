param(
  [string]$BaseUrl = 'http://localhost:8787'
)
$ErrorActionPreference = 'Stop'
if ($BaseUrl -notmatch '^http://(localhost|127\.0\.0\.1):') {
    throw '安全限制：此 Smoke Test 只允許 localhost，不會向正式網站建立或刪除資料。'
}
$devVars = Join-Path (Split-Path $PSScriptRoot -Parent) '.dev.vars'
if (-not (Test-Path $devVars)) { throw '.dev.vars 不存在，請先依 README 設定 LOCAL_ADMIN_TOKEN。' }
$line = Get-Content $devVars | Where-Object { $_ -match '^LOCAL_ADMIN_TOKEN=' } | Select-Object -First 1
if (-not $line) { throw '.dev.vars 找不到 LOCAL_ADMIN_TOKEN' }
$token = $line.Substring('LOCAL_ADMIN_TOKEN='.Length)
$headers = @{ Authorization = "Bearer $token" }

$unauthorized = $false
try { Invoke-RestMethod "$BaseUrl/notes/api/admin/" -ErrorAction Stop | Out-Null } catch {
  if ([int]$_.Exception.Response.StatusCode -eq 401) { $unauthorized = $true } else { throw }
}
if (-not $unauthorized) { throw '安全檢查失敗：未登入仍可存取管理 API。' }
Write-Host '[PASS] 未授權讀取管理 API 回應 401'

$body = @{ title='本機整合測試'; markdown='**粗體** 與 [連結](https://example.org)';status='published';tags=@('ai') } | ConvertTo-Json -Compress
$new = Invoke-RestMethod "$BaseUrl/notes/api/admin/" -Method Post -Headers $headers -ContentType 'application/json' -Body ([Text.Encoding]::UTF8.GetBytes($body))
$id = $new.id
try {
  if (-not $id) { throw '建立失敗' }
  Write-Host "[PASS] 建立 Note $id"
  $public = Invoke-RestMethod "$BaseUrl/notes/api/$id"
  if ($public.markdown -notmatch '\*\*粗體\*\*') {throw 'API 內容不正確'}
  $web = (Invoke-WebRequest "$BaseUrl/notes/$id/").Content
  if ($web -notmatch '<strong>粗體</strong>') { throw 'SSR HTML 未包含 Markdown 強調內容' }
  Write-Host '[PASS] D1 JSON + SSR HTML'
  $rss = (Invoke-WebRequest "$BaseUrl/notes/feed.xml").Content
  if ($rss -notmatch [regex]::Escape($id)) { throw 'RSS 找不到這筆 Note' }
  $sitemap = (Invoke-WebRequest "$BaseUrl/notes/sitemap.xml").Content
  if ($sitemap -notmatch [regex]::Escape($id)) { throw 'Sitemap 找不到這筆 Note' }
  Write-Host '[PASS] RSS + Sitemap'
  $update = @{ title='本機整合測試更新'; markdown='更新內容'; status='draft';tags=@('music') } | ConvertTo-Json -Compress
  Invoke-RestMethod "$BaseUrl/notes/api/admin/$id/" -Method Put -Headers $headers -ContentType 'application/json' -Body ([Text.Encoding]::UTF8.GetBytes($update)) | Out-Null
  $notFound = $false
  try { Invoke-RestMethod "$BaseUrl/notes/api/$id" | Out-Null } catch { if ([int]$_.Exception.Response.StatusCode -eq 404) {$notFound=$true} else { throw } }
  if (-not $notFound) { throw '草稿外洩：公開 API 仍能讀取此 Note' }
  Write-Host '[PASS] 草稿不會公開'
} finally {
  if ($id) { Invoke-RestMethod "$BaseUrl/notes/api/admin/$id/" -Method Delete -Headers $headers | Out-Null }
}
Write-Host '[PASS] 測試資料已刪除'
