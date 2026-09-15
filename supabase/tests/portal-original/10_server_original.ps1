# 10_server_original.ps1
#
# Liefert die Seiten dieses Projekts UNVERAENDERT von der Platte aus, exakt
# so wie sie im Arbeitsverzeichnis liegen - einschliesslich der echten
# admin/supabase-config.js, die fest auf das ORIGINALPROJEKT zeigt. Anders
# als supabase/tests/portal-lokal/10_testserver.ps1 wird HIER NICHTS ersetzt
# und NICHTS auf ein Testprojekt umgeleitet. Das ist Absicht: dieser Server
# dient dem einmaligen, ausdruecklich freigegebenen Funktionstest gegen das
# Originalprojekt, nicht dem wiederholbaren Testlauf gegen das Testprojekt.
#
# Nur lesend auf der Platte. Kein Build, keine zusaetzliche Installation -
# reines PowerShell mit System.Net.HttpListener, gebunden ausschliesslich an
# 127.0.0.1.
#
# ZUGRIFFSSCHUTZ FUER LOKALE KONFIGURATIONS- UND GEHEIMNISDATEIEN
#   Nicht jede Datei im Arbeitsverzeichnis darf ueber HTTP herausgehen, auch
#   wenn sie fuer den Portalcode selbst unerheblich ist. Gesperrt sind:
#     - alle Pfadsegmente, die mit einem Punkt beginnen (.git, .claude, .env*)
#     - der gesamte Ordner supabase/ (Migrationen, Setup-Skripte,
#       Testkonfigurationen wie konfiguration.json, projekt-freigabe.txt)
#     - jede Datei mit den Endungen .ps1, .sql, .md, .json aus Sicherheitsgruenden
#       pauschal, weil dort erfahrungsgemaess Zugangsdaten oder interne
#       Notizen liegen koennen und keine davon vom Portalcode angefordert wird
#   Alles andere wird unveraendert ausgeliefert, wie es auf der Platte liegt.
#
# Aufruf:
#   powershell -File 10_server_original.ps1 -Bestaetigung
#   powershell -File 10_server_original.ps1 -Bestaetigung -Port 8792
#
# Beenden: Strg+C oder die Datei stop.txt neben diesem Skript anlegen.

[CmdletBinding()]
param(
    [switch]$Bestaetigung,
    [int]$Port = 8792
)

$ErrorActionPreference = 'Stop'
$Wurzel = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))

if (-not $Bestaetigung) {
    Write-Host 'ABBRUCH: Dieser Server liefert den echten Portalcode MIT DER ECHTEN' -ForegroundColor Red
    Write-Host 'Konfiguration des Originalprojekts aus. Nur fuer den ausdruecklich' -ForegroundColor Red
    Write-Host 'freigegebenen Funktionstest. Mit -Bestaetigung starten.' -ForegroundColor Red
    exit 2
}

$ProdDatei = Join-Path $Wurzel 'admin\supabase-config.js'
if (-not (Test-Path $ProdDatei)) {
    Write-Host "ABBRUCH: $ProdDatei fehlt." -ForegroundColor Red
    exit 2
}
$prodInhalt = Get-Content $ProdDatei -Raw
$ProjektRef = $null
if ($prodInhalt -match 'https://([a-z0-9]+)\.supabase\.co') { $ProjektRef = $Matches[1] }

# Gesperrte Pfadsegmente. Ein Treffer auf irgendeiner Ebene sperrt den Zugriff.
$GesperrteOrdner = @('supabase', '.git', '.claude')
$GesperrteEndungen = @('.ps1', '.sql', '.md', '.json', '.env')

function Test-Gesperrt([string]$RelPfad) {
    $segmente = $RelPfad.TrimStart('/').Split('/')
    foreach ($s in $segmente) {
        if ($s.StartsWith('.') -and $s -ne '') { return $true }
        if ($GesperrteOrdner -contains $s) { return $true }
    }
    $endung = [System.IO.Path]::GetExtension($RelPfad).ToLower()
    if ($GesperrteEndungen -contains $endung) { return $true }
    return $false
}

$Typen = @{
    '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
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

Write-Host "Server laeuft NUR auf 127.0.0.1:$Port - Zielprojekt: $ProjektRef" -ForegroundColor Yellow
Write-Host "  Mitarbeiter-Login:  http://127.0.0.1:$Port/fahrer/index.html" -ForegroundColor Green
Write-Host "  Admin-Login:        http://127.0.0.1:$Port/admin/login.html" -ForegroundColor Green
Write-Host "  Wurzel: $Wurzel" -ForegroundColor DarkGray
Write-Host "  Gesperrt: Ordner supabase/, .git/, .claude/, sowie *.ps1 *.sql *.md *.json *.env ueberall." -ForegroundColor DarkGray
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
        if ($pfad -eq '/') { $pfad = '/fahrer/index.html' }
        if (Test-Gesperrt $pfad) {
            $kontext.Response.StatusCode = 403
            Write-Host "  403 $pfad (gesperrt)" -ForegroundColor DarkRed
        }
        else {
            $datei = Join-Path $Wurzel ($pfad.TrimStart('/') -replace '/', '\')
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
Write-Host 'Server beendet.' -ForegroundColor Green
