# 10_testserver.ps1
#
# Liefert die Seiten dieses Projekts unveraendert von der Platte aus - mit
# GENAU EINER Ausnahme: /admin/supabase-config.js wird nicht von der Platte
# gelesen, sondern zur Laufzeit aus supabase/tests/storage-api/konfiguration.json
# erzeugt. So laeuft der echte Portalcode gegen das Testprojekt, ohne dass die
# Datei im Arbeitsverzeichnis angefasst wird.
#
# Die Originaldatei bleibt unberuehrt. Sie wird nur gelesen, um ihre Kennung
# zu sperren.
#
# Aufruf:
#   powershell -File 10_testserver.ps1 -Bestaetigung
#   powershell -File 10_testserver.ps1 -Bestaetigung -Port 8787
#
# Beenden: Strg+C oder die Datei stop.txt neben diesem Skript anlegen.

[CmdletBinding()]
param(
    [switch]$Bestaetigung,
    [int]$Port = 8787,
    [string]$Konfiguration = ''
)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($Konfiguration)) {
    $Konfiguration = Join-Path (Split-Path -Parent $PSScriptRoot) 'storage-api\konfiguration.json'
}
$FreigabeDatei = Join-Path (Split-Path -Parent $PSScriptRoot) 'storage-api\projekt-freigabe.txt'
$Wurzel        = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))

if (-not $Bestaetigung) {
    Write-Host 'ABBRUCH: Dieser Server verbindet den echten Portalcode mit einem echten Supabase-Projekt.' -ForegroundColor Red
    Write-Host 'Mit -Bestaetigung starten.' -ForegroundColor Red
    exit 2
}
foreach ($d in @($Konfiguration, $FreigabeDatei)) {
    if (-not (Test-Path $d)) { Write-Host "ABBRUCH: $d fehlt." -ForegroundColor Red; exit 2 }
}

$cfg = Get-Content $Konfiguration -Raw -Encoding UTF8 | ConvertFrom-Json
$Url = ($cfg.projektUrl).TrimEnd('/')
$Key = $cfg.publishableKey
if ($Url -match 'HIER_' -or $Key -match 'HIER_') {
    Write-Host 'ABBRUCH: konfiguration.json ist nicht ausgefuellt.' -ForegroundColor Red; exit 2
}

function Get-ProjektKennung([string]$Wert) {
    $w = $Wert.Trim().TrimEnd('/')
    if ($w -match 'https?://([A-Za-z0-9\-]+)\.supabase\.co') { return $Matches[1].ToLower() }
    if ($w -match '^[A-Za-z0-9\-]+$')                        { return $w.ToLower() }
    return $null
}

# Dieselbe Schranke wie beim Storage-API-Lauf: nur das freigegebene Projekt.
$FreigabeZeile = Get-Content $FreigabeDatei -Encoding UTF8 |
    Where-Object { $_.Trim() -ne '' -and -not $_.TrimStart().StartsWith('#') } | Select-Object -First 1
$FreigabeRef = Get-ProjektKennung $FreigabeZeile
$ZielRef     = Get-ProjektKennung $Url
if (-not $FreigabeRef -or $FreigabeZeile -match 'HIER_') {
    Write-Host 'ABBRUCH: projekt-freigabe.txt nennt keine Projektkennung.' -ForegroundColor Red; exit 2
}
if ($ZielRef -ne $FreigabeRef) {
    Write-Host "ABBRUCH: konfiguration.json zeigt auf '$ZielRef', freigegeben ist nur '$FreigabeRef'." -ForegroundColor Red; exit 2
}

# Die Produktivkennung aus der Originaldatei bleibt gesperrt.
$ProdDatei = Join-Path $Wurzel 'admin\supabase-config.js'
if (Test-Path $ProdDatei) {
    $prodInhalt = Get-Content $ProdDatei -Raw
    if ($prodInhalt -match 'https://([a-z0-9]+)\.supabase\.co' -and $ZielRef -eq $Matches[1]) {
        Write-Host 'ABBRUCH: Das waere die Produktivinstanz. Hier laeuft nichts.' -ForegroundColor Red; exit 2
    }
}

# Die Ersatzkonfiguration - gleiche Form wie das Original, andere Werte.
$ErsatzConfig = @"
(() => {
  /* Erzeugt von supabase/tests/portal-lokal/10_testserver.ps1.
     Nur fuer den lokalen Testlauf. Diese Datei liegt nirgends auf der Platte. */
  const config = {
    url: "$Url",
    publishableKey: "$Key"
  };
  const isConfigured = Boolean(config.url && config.publishableKey);
  window.TaxiSupabaseConfig = { ...config, isConfigured, client: null };
  window.TaxiTestumgebung = true;
})();
"@

$Typen = @{
    '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8';  '.json' = 'application/json; charset=utf-8'
    '.png'  = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'
    '.svg'  = 'image/svg+xml'; '.ico' = 'image/x-icon'; '.webmanifest' = 'application/manifest+json'
    '.woff2' = 'font/woff2'; '.pdf' = 'application/pdf'
}

$Zuhoerer = New-Object System.Net.HttpListener
$Zuhoerer.Prefixes.Add("http://127.0.0.1:$Port/")
try { $Zuhoerer.Start() }
catch {
    Write-Host "ABBRUCH: Port $Port laesst sich nicht belegen. $($_.Exception.Message)" -ForegroundColor Red
    exit 2
}

$StopDatei = Join-Path $PSScriptRoot 'stop.txt'
if (Test-Path $StopDatei) { Remove-Item $StopDatei -Force }

Write-Host "Testserver laeuft: http://127.0.0.1:$Port/fahrer/index.html" -ForegroundColor Green
Write-Host "  Wurzel: $Wurzel" -ForegroundColor DarkGray
Write-Host "  /admin/supabase-config.js wird durch die Testfassung ersetzt (Projekt $ZielRef)." -ForegroundColor DarkGray
Write-Host "  Beenden: stop.txt anlegen oder Strg+C." -ForegroundColor DarkGray

while ($Zuhoerer.IsListening) {
    $ergebnis = $Zuhoerer.BeginGetContext($null, $null)
    while (-not $ergebnis.AsyncWaitHandle.WaitOne(300)) {
        if (Test-Path $StopDatei) { $Zuhoerer.Stop(); break }
    }
    if (-not $Zuhoerer.IsListening) { break }
    $kontext = $Zuhoerer.EndGetContext($ergebnis)
    $pfad = [System.Uri]::UnescapeDataString($kontext.Request.Url.AbsolutePath)
    try {
        if ($pfad -eq '/admin/supabase-config.js') {
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($ErsatzConfig)
            $kontext.Response.ContentType = 'text/javascript; charset=utf-8'
            $kontext.Response.OutputStream.Write($bytes, 0, $bytes.Length)
            Write-Host "  200 $pfad (Testfassung)" -ForegroundColor DarkCyan
        }
        else {
            if ($pfad -eq '/') { $pfad = '/fahrer/index.html' }
            $datei = Join-Path $Wurzel ($pfad.TrimStart('/') -replace '/', '\')
            # Kein Ausbruch aus dem Projektverzeichnis.
            $voll = [System.IO.Path]::GetFullPath($datei)
            if (-not $voll.StartsWith($Wurzel, [StringComparison]::OrdinalIgnoreCase)) {
                $kontext.Response.StatusCode = 403
            }
            elseif (Test-Path $voll -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($voll)
                $endung = [System.IO.Path]::GetExtension($voll).ToLower()
                $kontext.Response.ContentType = $(if ($Typen.ContainsKey($endung)) { $Typen[$endung] } else { 'application/octet-stream' })
                $kontext.Response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            else {
                $kontext.Response.StatusCode = 404
                Write-Host "  404 $pfad" -ForegroundColor DarkYellow
            }
        }
    }
    catch { Write-Host "  FEHLER bei $pfad : $($_.Exception.Message)" -ForegroundColor Red }
    finally { try { $kontext.Response.Close() } catch { } }
}

$Zuhoerer.Close()
Write-Host 'Testserver beendet.' -ForegroundColor Green
