$ErrorActionPreference = 'Stop'

function Get-WindowsProxySettings {
  $key = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings'
  $settings = Get-ItemProperty -Path $key -Name ProxyEnable, ProxyServer, ProxyOverride -ErrorAction SilentlyContinue

  if (-not $settings -or $settings.ProxyEnable -ne 1 -or [string]::IsNullOrWhiteSpace($settings.ProxyServer)) {
    return $null
  }

  return [pscustomobject]@{
    ProxyServer   = [string]$settings.ProxyServer
    ProxyOverride = [string]$settings.ProxyOverride
  }
}

function Parse-ProxyServer([string]$proxyServer) {
  # Supports:
  #  - host:port
  #  - http=host:port;https=host:port;...
  $map = @{}

  if ($proxyServer -match '=') {
    foreach ($part in ($proxyServer -split ';')) {
      $p = $part.Trim()
      if (-not $p) { continue }
      $kv = $p -split '=', 2
      if ($kv.Count -eq 2) {
        $scheme = $kv[0].Trim().ToLowerInvariant()
        $value = $kv[1].Trim()
        if ($scheme -and $value) { $map[$scheme] = $value }
      }
    }
  } else {
    $map['http'] = $proxyServer.Trim()
    $map['https'] = $proxyServer.Trim()
  }

  return $map
}

function Build-NoProxy([string]$proxyOverride) {
  if ([string]::IsNullOrWhiteSpace($proxyOverride)) { return $null }

  # Windows uses ';' separator and special token <local>
  $items = @()
  foreach ($part in ($proxyOverride -split ';')) {
    $p = $part.Trim()
    if (-not $p) { continue }
    if ($p -ieq '<local>') { continue }
    $items += $p
  }

  if ($items.Count -eq 0) { return $null }
  # NO_PROXY expects comma-separated list
  return ($items -join ',')
}

$proxySettings = Get-WindowsProxySettings
if ($proxySettings) {
  $proxyMap = Parse-ProxyServer $proxySettings.ProxyServer

  $httpProxyHostPort = $proxyMap['http']
  $httpsProxyHostPort = $proxyMap['https']

  if ($httpProxyHostPort) { $env:HTTP_PROXY = "http://$httpProxyHostPort" }
  if ($httpsProxyHostPort) { $env:HTTPS_PROXY = "http://$httpsProxyHostPort" }

  $noProxy = Build-NoProxy $proxySettings.ProxyOverride
  if ($noProxy) { $env:NO_PROXY = $noProxy }

  Write-Host "[dist-win] Using proxy from Windows settings:" -ForegroundColor Cyan
  Write-Host "[dist-win] HTTP_PROXY=$($env:HTTP_PROXY)" -ForegroundColor Cyan
  Write-Host "[dist-win] HTTPS_PROXY=$($env:HTTPS_PROXY)" -ForegroundColor Cyan
  if ($env:NO_PROXY) { Write-Host "[dist-win] NO_PROXY=$($env:NO_PROXY)" -ForegroundColor Cyan }
} else {
  Write-Host "[dist-win] No Windows proxy detected (ProxyEnable=0)." -ForegroundColor Yellow
}

npm run build:desktop
