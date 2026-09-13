# 20_portal_ui_test.ps1
#
# Faehrt den ECHTEN Portalcode im echten Browser gegen das Supabase-
# TESTPROJEKT. Keine Stubs, keine Attrappen: geladen wird genau das, was
# 10_testserver.ps1 von der Platte ausliefert - mit der einzigen Ausnahme
# /admin/supabase-config.js, die auf das Testprojekt zeigt.
#
# Voraussetzung: 10_testserver.ps1 laeuft bereits auf -Port.
#
# Aufruf:
#   powershell -File 20_portal_ui_test.ps1 -Bestaetigung
#   powershell -File 20_portal_ui_test.ps1 -Bestaetigung -Sichtbar -Behalten
#
# Es werden ausschliesslich synthetische Daten verwendet: die vier Konten auf
# example.invalid und im Skript erzeugte PDF-Bytes. Schluessel, Kennwoerter,
# Token und signierte Adressen erscheinen nirgends in der Ausgabe.

[CmdletBinding()]
param(
    [switch]$Bestaetigung,
    [int]$Port = 8791,
    [int]$DebugPort = 9333,
    [switch]$Sichtbar,
    [switch]$Behalten,
    [string]$Konfiguration = ''
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# $PSScriptRoot ist in einem param-Vorgabewert leer, sobald [CmdletBinding()]
# gesetzt ist. Deshalb erst hier.
$EigenerOrdner = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($Konfiguration)) {
    $Konfiguration = Join-Path (Split-Path -Parent $EigenerOrdner) 'storage-api\konfiguration.json'
}
$FreigabeDatei = Join-Path (Split-Path -Parent $EigenerOrdner) 'storage-api\projekt-freigabe.txt'
$Wurzel        = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $EigenerOrdner))
$Basis         = "http://127.0.0.1:$Port"
$Bucket        = 'employee-documents'

. (Join-Path $EigenerOrdner 'cdp-hilfe.ps1')

# ---------------------------------------------------------------- Schranken

if (-not $Bestaetigung) {
    Write-Host 'ABBRUCH: Dieser Lauf meldet sich an einem echten Supabase-Projekt an.' -ForegroundColor Red
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
    $w = "$Wert".Trim().TrimEnd('/')
    if ($w -match 'https?://([A-Za-z0-9\-]+)\.supabase\.co') { return $Matches[1].ToLower() }
    if ($w -match '^[A-Za-z0-9\-]+$')                        { return $w.ToLower() }
    return $null
}

$FreigabeZeile = Get-Content $FreigabeDatei -Encoding UTF8 |
    Where-Object { $_.Trim() -ne '' -and -not $_.TrimStart().StartsWith('#') } | Select-Object -First 1
$FreigabeRef = Get-ProjektKennung $FreigabeZeile
$ZielRef     = Get-ProjektKennung $Url
if (-not $FreigabeRef -or $FreigabeZeile -match 'HIER_') {
    Write-Host 'ABBRUCH: projekt-freigabe.txt nennt keine Projektkennung.' -ForegroundColor Red; exit 2
}
if ($ZielRef -ne $FreigabeRef) {
    Write-Host 'ABBRUCH: konfiguration.json zeigt auf ein nicht freigegebenes Projekt.' -ForegroundColor Red; exit 2
}
$ProdDatei = Join-Path $Wurzel 'admin\supabase-config.js'
if (Test-Path $ProdDatei) {
    $prodInhalt = Get-Content $ProdDatei -Raw
    if ($prodInhalt -match 'https://([a-z0-9]+)\.supabase\.co' -and $ZielRef -eq $Matches[1]) {
        Write-Host 'ABBRUCH: Das waere die Produktivinstanz. Hier laeuft nichts.' -ForegroundColor Red; exit 2
    }
}

# Laeuft der Testserver? Ohne ihn misst der Lauf nichts.
try {
    $probe = Invoke-WebRequest "$Basis/fahrer/index.html" -UseBasicParsing -TimeoutSec 5
    if ([int]$probe.StatusCode -ne 200) { throw 'unerwarteter Status' }
} catch {
    Write-Host "ABBRUCH: Der Testserver antwortet nicht auf $Basis. Zuerst 10_testserver.ps1 starten." -ForegroundColor Red
    exit 2
}
$probeCfg = (Invoke-WebRequest "$Basis/admin/supabase-config.js" -UseBasicParsing -TimeoutSec 5).Content
if ($probeCfg -notmatch 'TaxiTestumgebung') {
    Write-Host 'ABBRUCH: Der Server liefert nicht die Testfassung der Konfiguration.' -ForegroundColor Red
    exit 2
}

# ------------------------------------------------------- REST-Gegenmessung
# Der Browser ist der Pruefling. Gemessen wird zusaetzlich von aussen ueber
# dieselben REST-Endpunkte - so haengt kein Befund allein an der Anzeige.

function Ruf {
    param([string]$Methode, [string]$Adresse, $Kopf, $Koerper, [string]$Typ = 'application/json')
    try {
        $p = @{ Method = $Methode; Uri = $Adresse; Headers = $Kopf; UseBasicParsing = $true; TimeoutSec = 60 }
        if ($null -ne $Koerper) { $p.Body = $Koerper; $p.ContentType = $Typ }
        $r = Invoke-WebRequest @p
        return [pscustomobject]@{ Ok = $true; Status = [int]$r.StatusCode; Text = $r.Content; Bytes = $r.RawContentLength }
    } catch {
        $a = $_.Exception.Response
        if ($a) {
            $t = ''
            try { $t = (New-Object System.IO.StreamReader($a.GetResponseStream())).ReadToEnd() } catch { }
            return [pscustomobject]@{ Ok = $false; Status = [int]$a.StatusCode; Text = $t; Bytes = 0 }
        }
        return [pscustomobject]@{ Ok = $false; Status = 0; Text = $_.Exception.Message; Bytes = 0 }
    }
}

# ConvertFrom-Json liefert ein JSON-Array in Windows PowerShell als EIN Objekt.
# Ohne das fuehrende Komma zaehlt jede Liste als 1.
function ConvertTo-Zeilen([string]$Text) {
    if ([string]::IsNullOrWhiteSpace($Text)) { return , @() }
    $d = $null
    try { $d = $Text | ConvertFrom-Json } catch { return , @() }
    if ($null -eq $d) { return , @() }
    return , @($d | ForEach-Object { $_ })
}

function Anmelden($Konto) {
    $r = Ruf 'POST' "$Url/auth/v1/token?grant_type=password" @{ apikey = $Key } `
        (@{ email = $Konto.email; password = $Konto.passwort } | ConvertTo-Json -Compress)
    if (-not $r.Ok) { throw "Anmeldung fehlgeschlagen fuer $($Konto.email) (HTTP $($r.Status))." }
    $d = $r.Text | ConvertFrom-Json
    return [pscustomobject]@{
        Kopf  = @{ apikey = $Key; Authorization = "Bearer $($d.access_token)" }
        Uid   = $d.user.id
        Email = $Konto.email
    }
}

function Get-Dateien($Sitzung, [string]$Prefix) {
    $r = Ruf 'POST' "$Url/storage/v1/object/list/$Bucket" $Sitzung.Kopf (@{ prefix = $Prefix; limit = 200 } | ConvertTo-Json -Compress)
    # Ein einelementiges Feld wuerde beim return auseinanderfallen - das
    # fuehrende Komma haelt es zusammen.
    return , (ConvertTo-Zeilen $r.Text)
}

# ------------------------------------------------------------------ Befunde

$Befunde = New-Object System.Collections.ArrayList
function Add-Befund([string]$Titel, [bool]$Bestanden, [string]$Hinweis = '') {
    [void]$Befunde.Add([pscustomobject]@{ Titel = $Titel; Ok = $Bestanden; Hinweis = $Hinweis })
    $zeichen = if ($Bestanden) { '[OK]  ' } else { '[FEHL]' }
    $farbe   = if ($Bestanden) { 'Green' } else { 'Red' }
    Write-Host "$zeichen $Titel" -ForegroundColor $farbe
    if ($Hinweis) { Write-Host "        $Hinweis" -ForegroundColor DarkGray }
}
function Write-Abschnitt([string]$Text) {
    Write-Host ''
    Write-Host "== $Text ==" -ForegroundColor Cyan
}

# JS-Zeichenkette sicher einbetten - ConvertTo-Json maskiert vollstaendig.
function Js-Text([string]$Wert) { return ($Wert | ConvertTo-Json -Compress) }

function Set-Feld([string]$Sitzung, [string]$Waehler, [string]$Wert) {
    $js = @"
(() => {
  const el = document.querySelector($(Js-Text $Waehler));
  if (!el) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(el, $(Js-Text $Wert));
  el.dispatchEvent(new Event('input',  { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
})()
"@
    return (Invoke-Js $Sitzung $js)
}

function Invoke-Klick([string]$Sitzung, [string]$Waehler) {
    $js = "(() => { const el = document.querySelector($(Js-Text $Waehler)); if (!el) return false; el.click(); return true; })()"
    return (Invoke-Js $Sitzung $js)
}

function Get-Text([string]$Sitzung, [string]$Waehler) {
    $js = "(() => { const el = document.querySelector($(Js-Text $Waehler)); return el ? (el.textContent || '').trim() : ''; })()"
    return (Invoke-Js $Sitzung $js)
}

# ------------------------------------------------------------ Testunterlagen

$TestOrdner = Join-Path $EigenerOrdner 'testdateien'
if (-not (Test-Path $TestOrdner)) { New-Item -ItemType Directory -Path $TestOrdner -Force | Out-Null }

function New-TestPdf([string]$Pfad, [string]$Zeile) {
    $inhalt = "%PDF-1.4`n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj`n" +
              "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj`n" +
              "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 100]>>endobj`n" +
              "% $Zeile`ntrailer<</Root 1 0 R>>`n%%EOF`n"
    [System.IO.File]::WriteAllBytes($Pfad, [Text.Encoding]::ASCII.GetBytes($inhalt))
    return (Get-Item $Pfad).Length
}

$Stempel      = Get-Date -Format 'yyyyMMdd-HHmmss'
$DokPdf       = Join-Path $TestOrdner "tg-test-nachweis-$Stempel.pdf"
$KrankPdf     = Join-Path $TestOrdner "tg-test-krankenschein-$Stempel.pdf"
$DokBytes     = New-TestPdf $DokPdf   "synthetischer Testnachweis $Stempel"
$KrankBytes   = New-TestPdf $KrankPdf "synthetischer Krankenschein $Stempel"
$DokName      = Split-Path $DokPdf -Leaf
$KrankName    = Split-Path $KrankPdf -Leaf

Write-Host ''
Write-Host 'Portal-Oberflaechentest gegen das Supabase-Testprojekt' -ForegroundColor White
Write-Host "  Server:  $Basis  (Dateien aus $Wurzel)" -ForegroundColor DarkGray
Write-Host "  Browser: Chrome ueber das DevTools-Protokoll, Anschluss $DebugPort" -ForegroundColor DarkGray
Write-Host "  Dateien: zwei im Skript erzeugte PDF ($DokBytes / $KrankBytes Byte)" -ForegroundColor DarkGray

# ------------------------------------------------- Vorpruefung des Ziels

Write-Abschnitt 'Vorpruefung: traegt das Ziel die synthetischen Testkonten?'

$A     = Anmelden $cfg.konten.mitarbeiterA
$B     = Anmelden $cfg.konten.mitarbeiterB
$Admin = Anmelden $cfg.konten.admin

$rFinger = Ruf 'GET' "$Url/rest/v1/employees?select=email,active,portal_active&email=like.tg-test-%25%40example.invalid" $Admin.Kopf $null
$finger  = ConvertTo-Zeilen $rFinger.Text
$fingerOk = ($finger.Count -eq 4) -and (@($finger | Where-Object { -not $_.portal_active }).Count -eq 1)
Add-Befund 'Zielprojekt traegt die vier synthetischen Testkonten' $fingerOk "gefunden: $($finger.Count), davon ohne Portalrecht: $(@($finger | Where-Object { -not $_.portal_active }).Count)"
if (-not $fingerOk) {
    Write-Host 'ABBRUCH: Das Ziel ist nicht das vorbereitete Testprojekt.' -ForegroundColor Red
    exit 1
}

$Jahr     = (Get-Date).Year
$vorherA  = (Get-Dateien $A "$($A.Uid)/$Jahr").Count
$rSubsVor = Ruf 'GET' "$Url/rest/v1/document_submissions?select=id" $Admin.Kopf $null
$subsVor  = (ConvertTo-Zeilen $rSubsVor.Text).Count
Write-Host "  Ausgangslage: $vorherA Datei(en) im Ordner von A, $subsVor Einreichung(en) gesamt." -ForegroundColor DarkGray

# --------------------------------------------------------------- Browser

$Browser = $null
$Beendet = $false
try {
$Browser = Start-Chrome -Port $DebugPort -Profilordner (Join-Path $EigenerOrdner 'chrome-profil') -Sichtbar:$Sichtbar
Connect-Cdp $Browser.BrowserWs | Out-Null

# Eigene Browsersitzungen je Konto - sonst wuerde die naechste Anmeldung die
# vorige aus dem Speicher werfen.
$sA     = New-Browsersitzung
$sB     = New-Browsersitzung
$sAdmin = New-Browsersitzung

function Invoke-PortalAnmeldung([string]$Sitzung, $Konto) {
    Open-Seite $Sitzung "$Basis/fahrer/index.html" | Out-Null
    Wait-Bedingung $Sitzung 'Boolean(window.EmployeeSupabase && window.EmployeeSupabase.isConfigured())' 20000 | Out-Null
    Set-Feld $Sitzung '[data-employee-login-form] input[name="email"]'    $Konto.email    | Out-Null
    Set-Feld $Sitzung '[data-employee-login-form] input[name="password"]' $Konto.passwort | Out-Null
    Invoke-Klick $Sitzung '[data-employee-login-form] button[type="submit"]' | Out-Null
    $da = Wait-Bedingung $Sitzung "location.pathname.indexOf('mitarbeiter.html') !== -1 && document.readyState === 'complete'" 30000
    if ($da) { Wait-Bedingung $Sitzung 'Boolean(document.querySelector("[data-portal-quick-action=\"dokumente\"]"))' 20000 | Out-Null }
    return $da
}

# Die Schnellaktionen haengen an einem Klickhorcher, der erst nach dem Laden
# der Portaldaten gesetzt wird. Ein einzelner Klick kann deshalb ins Leere
# gehen - also wiederholen, bis der Bereich offen ist.
function Open-Bereich([string]$Sitzung, [string]$Name, [int]$Versuche = 12) {
    for ($i = 0; $i -lt $Versuche; $i++) {
        Invoke-Klick $Sitzung "[data-portal-quick-action=`"$Name`"]" | Out-Null
        if (Wait-Bedingung $Sitzung "document.querySelector('[data-portal-section=`"$Name`"]').hidden === false" 2000) {
            return $true
        }
    }
    return $false
}

# =====================================================================
Write-Abschnitt '1. Mitarbeiter A meldet sich an und reicht ein Dokument ein'

$anmeldungA = Invoke-PortalAnmeldung $sA.Sitzung $cfg.konten.mitarbeiterA
Add-Befund 'Mitarbeiter A meldet sich ueber das Anmeldeformular an' $anmeldungA 'Portalseite mitarbeiter.html erreicht'
if (-not $anmeldungA) { throw 'Ohne Anmeldung von A ist der Rest nicht messbar.' }

$offen = Open-Bereich $sA.Sitzung 'dokumente'
Add-Befund 'Bereich "Dokument senden" laesst sich oeffnen' $offen

$typenDa = Wait-Bedingung $sA.Sitzung 'document.querySelectorAll(''[data-portal-doc-form] [data-doc-type-label]'').length > 0' 20000
$typJs = @"
(() => {
  const karten = Array.from(document.querySelectorAll('[data-portal-doc-form] [data-doc-type-label]'));
  const k = karten.find(e => /Testnachweis/i.test(e.getAttribute('data-doc-type-label'))) || karten[0];
  if (!k) return '';
  k.click();
  const h = document.querySelector('[data-portal-doc-type-hidden]');
  return (h && h.value === k.getAttribute('data-doc-type')) ? k.getAttribute('data-doc-type-label') : '';
})()
"@
$gewaehlt = if ($typenDa) { Invoke-Js $sA.Sitzung $typJs } else { '' }
Add-Befund 'Dokumentarten kommen aus der Datenbank und lassen sich waehlen' ([bool]$gewaehlt) "gewaehlt: $gewaehlt"

Set-Dateiauswahl $sA.Sitzung '[data-portal-doc-form] input[type="file"]' $DokPdf
$dateiDa = Invoke-Js $sA.Sitzung '(() => { const i = document.querySelector(''[data-portal-doc-form] input[type="file"]''); return i && i.files.length === 1 ? i.files[0].name : ""; })()'
Add-Befund 'Synthetische PDF-Datei ist im Formular ausgewaehlt' ($dateiDa -eq $DokName) "Dateiname: $dateiDa"
Set-Feld $sA.Sitzung '[data-portal-doc-form] input[name="note"]' 'Synthetischer Oberflaechentest' | Out-Null

# Der Kern der Pruefung: Die Verknuepfung wird an der Leitung angehalten.
# Waehrend sie haengt, ist die Datei bereits hochgeladen - die Oberflaeche
# darf trotzdem KEINEN Erfolg melden. Kein Stub: Es ist dieselbe Anfrage an
# dieselbe Datenbank, nur spaeter durchgelassen.
Clear-CdpEreignisse
Send-Cdp 'Fetch.enable' @{ patterns = @(@{ urlPattern = '*document_submissions*'; requestStage = 'Request' }) } $sA.Sitzung | Out-Null
Invoke-Klick $sA.Sitzung '[data-portal-doc-form] button[type="submit"]' | Out-Null

$angehalten = $null
$erledigt = @{}
$ziel = (Get-Date).AddSeconds(45)
while ((Get-Date) -lt $ziel -and -not $angehalten) {
    Update-CdpEreignisse 400
    foreach ($e in @(Get-CdpEreignisse 'Fetch.requestPaused')) {
        $rid = "$($e.params.requestId)"
        if ($erledigt.ContainsKey($rid)) { continue }
        if ($e.params.request.method -eq 'POST') { $angehalten = $e; break }
        # Vorabfragen und Lesezugriffe interessieren hier nicht - sofort weiter.
        $erledigt[$rid] = $true
        try { Send-Cdp 'Fetch.continueRequest' @{ requestId = $rid } $sA.Sitzung | Out-Null } catch { }
    }
}

$zwischenstand = @{ Erfolgstext = ''; DateienWaehrend = 0; ZeilenWaehrend = 0 }
if ($angehalten) {
    $zwischenstand.Erfolgstext     = Get-Text $sA.Sitzung '[data-portal-doc-feedback]'
    $zwischenstand.DateienWaehrend = (Get-Dateien $A "$($A.Uid)/$Jahr").Count
    $rZ = Ruf 'GET' "$Url/rest/v1/document_submissions?select=id" $Admin.Kopf $null
    $zwischenstand.ZeilenWaehrend  = (ConvertTo-Zeilen $rZ.Text).Count
}
Add-Befund 'Die Verknuepfung liess sich zum Messen anhalten' ([bool]$angehalten)

$uploadVorEintrag = $angehalten -and ($zwischenstand.DateienWaehrend -eq ($vorherA + 1)) -and ($zwischenstand.ZeilenWaehrend -eq $subsVor)
Add-Befund 'Datei liegt bereits im Speicher, waehrend die Verknuepfung noch aussteht' $uploadVorEintrag `
    "Dateien im Ordner von A: $($zwischenstand.DateienWaehrend) (vorher $vorherA), Einreichungen: $($zwischenstand.ZeilenWaehrend) (vorher $subsVor)"

$keinFruehErfolg = $angehalten -and ($zwischenstand.Erfolgstext -notmatch '(?i)bermittelt')
Add-Befund 'Solange die Verknuepfung aussteht, meldet die Oberflaeche KEINEN Erfolg' $keinFruehErfolg `
    "Rueckmeldung in diesem Moment: '$($zwischenstand.Erfolgstext)'"

if ($angehalten) {
    Send-Cdp 'Fetch.continueRequest' @{ requestId = $angehalten.params.requestId } $sA.Sitzung | Out-Null
}
try { Send-Cdp 'Fetch.disable' @{} $sA.Sitzung | Out-Null } catch { }

$erfolgDa = Wait-Bedingung $sA.Sitzung '/bermittelt/i.test((document.querySelector("[data-portal-doc-feedback]")||{}).textContent||"")' 30000
$erfolgstext = Get-Text $sA.Sitzung '[data-portal-doc-feedback]'
Add-Befund 'Erfolg erscheint erst nach gespeicherter Verknuepfung' $erfolgDa "Rueckmeldung: '$erfolgstext'"

$rSubs = Ruf 'GET' "$Url/rest/v1/document_submissions?select=id,file_path,file_name,status,document_type_id,employee_id&order=submitted_at.desc" $Admin.Kopf $null
$subs  = ConvertTo-Zeilen $rSubs.Text
$eintragA = $subs | Where-Object { $_.file_name -eq $DokName } | Select-Object -First 1
Add-Befund 'Die Einreichung steht in der Datenbank' ([bool]$eintragA) "Einreichungen gesamt: $($subs.Count)"

$nachherA = (Get-Dateien $A "$($A.Uid)/$Jahr").Count
Add-Befund 'Die Datei liegt im privaten Ordner von A' ($nachherA -eq ($vorherA + 1)) "Dateien: $nachherA"

Invoke-Klick $sA.Sitzung '[data-portal-modal] [data-portal-close]' | Out-Null

# =====================================================================
Write-Abschnitt '2. Nach dem Neuladen bleibt der Eintrag sichtbar'

Open-Seite $sA.Sitzung "$Basis/fahrer/mitarbeiter.html" | Out-Null
Wait-Bedingung $sA.Sitzung 'Boolean(document.querySelector("[data-portal-quick-action=\"dokumente\"]"))' 20000 | Out-Null
Open-Bereich $sA.Sitzung 'dokumente' | Out-Null
$sichtbarNach = Wait-Bedingung $sA.Sitzung "((document.querySelector('[data-portal-doc-list]')||{}).textContent||'').indexOf($(Js-Text $DokName)) !== -1" 25000
$listeA = Get-Text $sA.Sitzung '[data-portal-doc-list]'
Add-Befund 'Nach dem Neuladen ist die Einreichung weiterhin gelistet' $sichtbarNach `
    "Liste enthaelt 'Uebermittelt': $([bool]($listeA -match '(?i)bermittelt'))"

$eigenOeffnen = Invoke-Js $sA.Sitzung "(async () => { const u = await window.EmployeeSupabase.getSignedDocumentUrl($(Js-Text $eintragA.file_path), 60); return typeof u === 'string' && u.length > 0; })()" -Warten
Add-Befund 'A kann die eigene Datei ueber das Portal oeffnen (signierte Adresse)' ($eigenOeffnen -eq $true)

# =====================================================================
Write-Abschnitt '3. Der Admin sieht und oeffnet das eingereichte Dokument'

Open-Seite $sAdmin.Sitzung "$Basis/admin/login.html" | Out-Null
Wait-Bedingung $sAdmin.Sitzung 'Boolean(document.querySelector("[data-login-form]"))' 15000 | Out-Null
Set-Feld $sAdmin.Sitzung '[data-login-form] input[name="username"]' $cfg.konten.admin.email    | Out-Null
Set-Feld $sAdmin.Sitzung '[data-login-form] input[name="password"]' $cfg.konten.admin.passwort | Out-Null
Invoke-Klick $sAdmin.Sitzung '[data-login-form] button[type="submit"]' | Out-Null
$adminDrin = Wait-Bedingung $sAdmin.Sitzung "location.pathname.indexOf('login.html') === -1" 30000
Add-Befund 'Admin meldet sich im Verwaltungsbereich an' $adminDrin

Open-Seite $sAdmin.Sitzung "$Basis/admin/dokumentfristen.html" | Out-Null
$tabelleDa = Wait-Bedingung $sAdmin.Sitzung '((document.querySelector("[data-dokumenteingang-supabase]")||{}).textContent||"").indexOf("wird geladen") === -1' 30000
$adminSieht = Wait-Bedingung $sAdmin.Sitzung "((document.querySelector('[data-dokumenteingang-supabase]')||{}).textContent||'').indexOf($(Js-Text $DokName)) !== -1" 20000
Add-Befund 'Admin sieht die Einreichung von A im Dokumenteingang' $adminSieht
$geblieben = Invoke-Js $sAdmin.Sitzung "location.pathname.indexOf('dokumentfristen.html') !== -1"
Add-Befund 'Der Verwaltungsbereich weist den Admin nicht ab' ($geblieben -eq $true)

$zieleVor = @((Send-Cdp 'Target.getTargets' @{}).targetInfos | Where-Object { $_.browserContextId -eq $sAdmin.Kontext })
$klickOk = Invoke-Js $sAdmin.Sitzung @"
(() => {
  const b = Array.from(document.querySelectorAll('[data-dokument-oeffnen]'));
  const zeilen = Array.from(document.querySelectorAll('[data-dokumenteingang-supabase] tbody tr'));
  const z = zeilen.find(tr => tr.textContent.indexOf($(Js-Text $DokName)) !== -1);
  const knopf = z ? z.querySelector('[data-dokument-oeffnen]') : b[0];
  if (!knopf) return false;
  knopf.click();
  return true;
})()
"@
$fensterUrl = ''
$ziel = (Get-Date).AddSeconds(30)
while ((Get-Date) -lt $ziel -and -not $fensterUrl) {
    Start-Sleep -Milliseconds 500
    $neu = @((Send-Cdp 'Target.getTargets' @{}).targetInfos |
        Where-Object { $_.browserContextId -eq $sAdmin.Kontext -and $_.targetId -ne $sAdmin.Ziel -and $_.type -eq 'page' })
    foreach ($t in $neu) { if ("$($t.url)" -match '/storage/v1/object/sign/') { $fensterUrl = $t.url; $neuesZiel = $t.targetId } }
}
Add-Befund 'Der Klick auf "Oeffnen" fuehrt zu einem Fenster mit signierter Adresse' ([bool]$fensterUrl) `
    'Adresse wird bewusst nicht ausgegeben'

$abrufOk = $false; $abrufBytes = 0
if ($fensterUrl) {
    $r = Ruf 'GET' $fensterUrl @{} $null
    $abrufOk = $r.Ok -and ($r.Status -eq 200)
    $abrufBytes = $r.Bytes
    try { Send-Cdp 'Target.closeTarget' @{ targetId = $neuesZiel } | Out-Null } catch { }
}
Add-Befund 'Diese Adresse liefert die Datei tatsaechlich aus' ($abrufOk -and $abrufBytes -eq $DokBytes) `
    "HTTP $(if ($abrufOk) { '200' } else { 'nicht 200' }), $abrufBytes von $DokBytes Byte"

# =====================================================================
Write-Abschnitt '4. Mitarbeiter B kommt an das fremde Dokument nicht heran'

$anmeldungB = Invoke-PortalAnmeldung $sB.Sitzung $cfg.konten.mitarbeiterB
Add-Befund 'Mitarbeiter B meldet sich an' $anmeldungB
Open-Bereich $sB.Sitzung 'dokumente' | Out-Null
Wait-Bedingung $sB.Sitzung 'Boolean(document.querySelector("[data-portal-doc-list]").textContent.trim())' 20000 | Out-Null
$listeB = Get-Text $sB.Sitzung '[data-portal-doc-list]'
Add-Befund 'Die Einreichung von A taucht bei B nicht in der Liste auf' ($listeB -notmatch [regex]::Escape($DokName)) `
    "Anzeige bei B: '$($listeB.Substring(0, [Math]::Min(60, $listeB.Length)))'"

$bOeffnen = Invoke-Js $sB.Sitzung "(async () => { const u = await window.EmployeeSupabase.getSignedDocumentUrl($(Js-Text $eintragA.file_path), 60); return u === null || u === undefined || u === ''; })()" -Warten
Add-Befund 'B erhaelt fuer die Datei von A keine signierte Adresse' ($bOeffnen -eq $true) 'ueber den echten Portalcode aufgerufen'

$rB = Ruf 'GET' "$Url/rest/v1/document_submissions?select=id,file_name" $B.Kopf $null
$zeilenB = ConvertTo-Zeilen $rB.Text
Add-Befund 'B sieht die Einreichung auch in der Datenschnittstelle nicht' (@($zeilenB | Where-Object { $_.file_name -eq $DokName }).Count -eq 0) `
    "sichtbare Einreichungen fuer B: $($zeilenB.Count)"

# =====================================================================
Write-Abschnitt '5. Krankmeldung mit synthetischem Anhang'

$heute = (Get-Date).ToString('yyyy-MM-dd')
$bis   = (Get-Date).AddDays(2).ToString('yyyy-MM-dd')
$krankOffen = Open-Bereich $sA.Sitzung 'krank'
Add-Befund 'Bereich "Krankmeldung senden" laesst sich oeffnen' $krankOffen
Set-Feld $sA.Sitzung '[data-portal-absence-form] input[name="start"]'       $heute | Out-Null
Set-Feld $sA.Sitzung '[data-portal-absence-form] input[name="expectedEnd"]' $bis   | Out-Null
Set-Feld $sA.Sitzung '[data-portal-absence-form] input[name="note"]'        'Synthetischer Oberflaechentest' | Out-Null
Set-Dateiauswahl $sA.Sitzung '[data-portal-absence-form] input[type="file"]' $KrankPdf
$anhangDa = Invoke-Js $sA.Sitzung '(() => { const i = document.querySelector(''[data-portal-absence-form] input[type="file"]''); return i && i.files.length === 1 ? i.files[0].name : ""; })()'
Add-Befund 'Krankenschein ist als Anhang ausgewaehlt' ($anhangDa -eq $KrankName)

Invoke-Klick $sA.Sitzung '[data-portal-absence-form] button[type="submit"]' | Out-Null
$krankOk = Wait-Bedingung $sA.Sitzung '/bermittelt/i.test((document.querySelector("[data-portal-absence-feedback]")||{}).textContent||"")' 45000
$krankText = Get-Text $sA.Sitzung '[data-portal-absence-feedback]'
Add-Befund 'Krankmeldung wird als uebermittelt gemeldet' $krankOk "Rueckmeldung: '$krankText'"
Add-Befund 'Die Rueckmeldung nennt den angehaengten Krankenschein' ($krankText -match '(?i)krankenschein')

$rKrank = Ruf 'GET' "$Url/rest/v1/sickness_reports?select=id,employee_id,start_date,document_submission_id,status&order=created_at.desc" $Admin.Kopf $null
$krankZeilen = ConvertTo-Zeilen $rKrank.Text
$krankZeile = $krankZeilen | Where-Object { $_.start_date -eq $heute -and $_.document_submission_id } | Select-Object -First 1
Add-Befund 'Krankmeldung steht mit verknuepftem Nachweis in der Datenbank' ([bool]$krankZeile) `
    "Krankmeldungen gesamt: $($krankZeilen.Count)"

$rSubs2 = Ruf 'GET' "$Url/rest/v1/document_submissions?select=id,file_path,file_name" $Admin.Kopf $null
$subs2 = ConvertTo-Zeilen $rSubs2.Text
$anhangZeile = $subs2 | Where-Object { $_.file_name -eq $KrankName } | Select-Object -First 1
Add-Befund 'Der Anhang ist als eigene Einreichung gespeichert' ([bool]$anhangZeile)
Add-Befund 'Krankmeldung und Anhang zeigen auf denselben Datensatz' ([bool]($krankZeile -and $anhangZeile -and $krankZeile.document_submission_id -eq $anhangZeile.id))

$dateienEnde = (Get-Dateien $A "$($A.Uid)/$Jahr").Count
Add-Befund 'Beide synthetischen Dateien liegen im Ordner von A' ($dateienEnde -eq ($vorherA + 2)) "Dateien: $dateienEnde"

$Beendet = $true
}
catch {
    # Ein Abbruch wird als Befund festgehalten, damit das Aufraeumen trotzdem
    # laeuft und der Endstand messbar bleibt.
    Add-Befund "Lauf vorzeitig abgebrochen: $($_.Exception.Message)" $false
}
finally {
    if (-not $Beendet) { Write-Host '' ; Write-Host 'Der Lauf wurde vorzeitig beendet - die folgenden Angaben sind unvollstaendig.' -ForegroundColor Yellow }
    try { if ($script:CdpSocket) { Send-Cdp 'Browser.close' @{} | Out-Null } } catch { }
    try { if ($Browser -and -not $Browser.Prozess.HasExited) { Start-Sleep -Milliseconds 500; $Browser.Prozess.Kill() } } catch { }
}

# =====================================================================
Write-Abschnitt '6. Aufraeumen und Endstand'

if ($Behalten) {
    Write-Host '  -Behalten gesetzt: Testdaten bleiben liegen.' -ForegroundColor Yellow
} else {
    # Reihenfolge: erst die Krankmeldung, dann die Verknuepfung, erst danach
    # die Datei. Andersherum blockt die DELETE-Policy den Loeschversuch - und
    # das zu Recht.
    foreach ($k in @($krankZeile)) {
        if ($k) { Ruf 'DELETE' "$Url/rest/v1/sickness_reports?id=eq.$($k.id)" $Admin.Kopf $null | Out-Null }
    }
    foreach ($s in @($eintragA, $anhangZeile)) {
        if ($s) { Ruf 'DELETE' "$Url/rest/v1/document_submissions?id=eq.$($s.id)" $Admin.Kopf $null | Out-Null }
    }
    $pfade = @($eintragA, $anhangZeile) | Where-Object { $_ } | ForEach-Object { $_.file_path }
    if ($pfade.Count -gt 0) {
        Ruf 'DELETE' "$Url/storage/v1/object/$Bucket" $A.Kopf (@{ prefixes = @($pfade) } | ConvertTo-Json -Compress) | Out-Null
    }
}

$restDateien = (Get-Dateien $A "$($A.Uid)/$Jahr").Count
$rRest = Ruf 'GET' "$Url/rest/v1/document_submissions?select=id" $Admin.Kopf $null
$restSubs = (ConvertTo-Zeilen $rRest.Text).Count
$rRestK = Ruf 'GET' "$Url/rest/v1/sickness_reports?select=id" $Admin.Kopf $null
$restKrank = (ConvertTo-Zeilen $rRestK.Text).Count
$rRestE = Ruf 'GET' "$Url/rest/v1/employee_documents?select=id" $Admin.Kopf $null
$restEmpDok = (ConvertTo-Zeilen $rRestE.Text).Count

Write-Host "  Dateien im Ordner von A:        $restDateien" -ForegroundColor DarkGray
Write-Host "  Zeilen in document_submissions: $restSubs" -ForegroundColor DarkGray
Write-Host "  Zeilen in sickness_reports:     $restKrank" -ForegroundColor DarkGray
Write-Host "  Zeilen in employee_documents:   $restEmpDok" -ForegroundColor DarkGray

if (-not $Behalten) {
    Add-Befund 'Nach dem Aufraeumen liegen keine Testdateien mehr im Bucket' ($restDateien -eq $vorherA) "erwartet $vorherA, gefunden $restDateien"
    Add-Befund 'Nach dem Aufraeumen stehen keine Testeinreichungen mehr in der Tabelle' ($restSubs -eq $subsVor) "erwartet $subsVor, gefunden $restSubs"
}

Remove-Item $DokPdf, $KrankPdf -Force -ErrorAction SilentlyContinue

# ---------------------------------------------------------------- Ergebnis

$bestanden = @($Befunde | Where-Object { $_.Ok }).Count
$gesamt    = $Befunde.Count
Write-Host ''
Write-Host "Ergebnis: $bestanden von $gesamt Pruefungen bestanden." -ForegroundColor $(if ($bestanden -eq $gesamt) { 'Green' } else { 'Red' })
if ($bestanden -lt $gesamt) {
    Write-Host 'Nicht bestanden:' -ForegroundColor Red
    $Befunde | Where-Object { -not $_.Ok } | ForEach-Object { Write-Host "  - $($_.Titel)" -ForegroundColor Red }
}

$bericht = Join-Path $EigenerOrdner "ergebnis-ui-$Stempel.txt"
$zeilen = @("Portal-Oberflaechentest $Stempel", "Ergebnis: $bestanden von $gesamt bestanden", '')
$zeilen += $Befunde | ForEach-Object { "$(if ($_.Ok) { 'OK  ' } else { 'FEHL' })  $($_.Titel)  $($_.Hinweis)" }
$zeilen | Set-Content -Path $bericht -Encoding UTF8
Write-Host "Aufzeichnung: $bericht" -ForegroundColor DarkGray

exit $(if ($bestanden -eq $gesamt) { 0 } else { 1 })
