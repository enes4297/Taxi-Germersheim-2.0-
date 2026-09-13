# 20_storage_api_test.ps1
#
# Testet den Dokumentenupload gegen die ECHTE Supabase-Storage-API des
# TESTPROJEKTS. Das ist der Punkt, den kein lokaler Lauf abdecken kann:
# Lokal wurde per SQL "delete from storage.objects" geloescht. Ob die
# Storage-API denselben Weg nimmt, den BEFORE-DELETE-Trigger ausloest und die
# Datei wirklich aus dem Objektspeicher entfernt, entscheidet sich nur hier.
#
# KEIN BROWSER, KEIN NODE. Nur Invoke-WebRequest gegen die REST-Schnittstellen
# auth/v1, rest/v1 und storage/v1. Die aufgerufenen Endpunkte entsprechen dem,
# was supabase-js in fahrer/employee-supabase.js absetzt.
#
# VORAUSSETZUNGEN
#   1. Basisskript, Trigger-Nachtrag und DELETE-Policy sind eingespielt.
#   2. Die vier Auth-Konten bestehen (Dashboard) und 10_testkonten.sql lief.
#   3. konfiguration.json liegt neben dieser Datei (Vorlage:
#      konfiguration.beispiel.json). Sie ist per .gitignore ausgeschlossen.
#
#   4. projekt-freigabe.txt liegt daneben und nennt die Kennung genau dieses
#      Testprojekts (Vorlage: projekt-freigabe.beispiel.txt). Ebenfalls per
#      .gitignore ausgeschlossen.
#
# SICHERHEIT
#   - Der Lauf laeuft nur gegen das Projekt, das in projekt-freigabe.txt steht.
#     Weicht projektUrl davon ab, bricht er ab, bevor irgendeine Verbindung
#     aufgebaut wird. Die Kennung stammt bewusst aus einer zweiten Datei.
#   - Zusaetzlich verweigert er den Dienst, wenn die konfigurierte Projekt-URL
#     mit der aus admin/supabase-config.js uebereinstimmt. Das ist die
#     Produktivinstanz.
#   - Er laeuft nur mit -Bestaetigung. Ohne sie passiert nichts.
#   - Kennwoerter, Token und Schluessel werden aus jeder Ausgabe entfernt.
#   - Hochgeladen werden ausschliesslich synthetisch erzeugte PDF-Bytes.
#   - Es wird kein Service-Role-Key verwendet. Nur der Publishable-Key und
#     Sitzungen der vier Testkonten.
#
# Aufruf:
#   powershell -File 20_storage_api_test.ps1 -NurPruefen      (nur die Dateien)
#   powershell -File 20_storage_api_test.ps1 -Bestaetigung
#   powershell -File 20_storage_api_test.ps1 -Bestaetigung -Aufraeumen

[CmdletBinding()]
param(
    [switch]$Bestaetigung,
    [switch]$Aufraeumen,
    [switch]$NurPruefen,
    [string]$Konfiguration = ''
)

$ErrorActionPreference = 'Stop'

# Achtung: In einem Skript mit [CmdletBinding()] ist $PSScriptRoot im
# Vorgabewert eines Parameters noch leer. Der Pfad wird deshalb erst hier
# gebildet - sonst suchte der Lauf die Konfiguration im Wurzelverzeichnis.
if ([string]::IsNullOrWhiteSpace($Konfiguration)) {
    $Konfiguration = Join-Path $PSScriptRoot 'konfiguration.json'
}

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Bucket = 'employee-documents'

# --------------------------------------------------------------------------
# Befunde
# --------------------------------------------------------------------------
$script:Befunde = @()
function Add-Befund([string]$Name, [bool]$Ok, [string]$Detail) {
    $script:Befunde += [pscustomobject]@{ Pruefung = $Name; Ok = $Ok; Detail = $Detail }
    $farbe = if ($Ok) { 'Green' } else { 'Red' }
    $wort  = if ($Ok) { 'BESTANDEN' } else { 'FEHLGESCHLAGEN' }
    Write-Host ("  [{0}] {1} - {2}" -f $wort, $Name, $Detail) -ForegroundColor $farbe
}

# --------------------------------------------------------------------------
# HTTP ohne Ausnahmen: 4xx ist hier ein Messwert, kein Programmfehler.
# --------------------------------------------------------------------------
function Invoke-Api {
    param(
        [string]$Methode,
        [string]$Adresse,
        [hashtable]$Kopf = @{},
        $Koerper = $null,
        [string]$InhaltsTyp = 'application/json'
    )
    try {
        $p = @{ Method = $Methode; Uri = $Adresse; Headers = $Kopf; UseBasicParsing = $true; TimeoutSec = 60 }
        if ($null -ne $Koerper) { $p.Body = $Koerper; $p.ContentType = $InhaltsTyp }
        $r = Invoke-WebRequest @p
        return [pscustomobject]@{ Status = [int]$r.StatusCode; Text = $r.Content; Bytes = $r.RawContentLength; Ok = $true }
    }
    catch {
        $antwort = $_.Exception.Response
        if ($antwort) {
            $code = [int]$antwort.StatusCode
            $leser = New-Object System.IO.StreamReader($antwort.GetResponseStream())
            $text  = $leser.ReadToEnd()
            return [pscustomobject]@{ Status = $code; Text = $text; Bytes = 0; Ok = $false }
        }
        return [pscustomobject]@{ Status = 0; Text = $_.Exception.Message; Bytes = 0; Ok = $false }
    }
}

# Nichts Vertrauliches in die Ausgabe. Antworten der API koennen Token oder
# Schluessel enthalten; Kennwoerter stehen in der Konfiguration.
function Protect-Geheimnis([string]$Text) {
    if ([string]::IsNullOrEmpty($Text)) { return $Text }
    $t = $Text
    $t = $t -replace 'eyJ[A-Za-z0-9_\-\.]{20,}', '<Token entfernt>'
    $t = $t -replace 'sb_(publishable|secret)_[A-Za-z0-9_\-]+', '<Schluessel entfernt>'
    if ($script:Geheimnisse) {
        foreach ($g in $script:Geheimnisse) {
            if ($g -and $g.Length -ge 4) { $t = $t.Replace($g, '<Kennwort entfernt>') }
        }
    }
    return $t
}

# Windows PowerShell gibt ein JSON-Array aus ConvertFrom-Json als EIN Objekt
# weiter; @() wickelt es dann nur zusaetzlich ein und jede Zaehlung ergibt 1.
# Deshalb wird hier ausdruecklich entfaltet.
# Das fuehrende Komma ist nicht schmueckend: ohne es entfaltet PowerShell die
# Rueckgabe wieder, und ein Array mit genau einem Eintrag kaeme als blosses
# Objekt ohne .Count zurueck.
function ConvertTo-Zeilen([string]$Text) {
    if ([string]::IsNullOrWhiteSpace($Text)) { return ,@() }
    $d = $null
    try { $d = $Text | ConvertFrom-Json } catch { return ,@() }
    if ($null -eq $d) { return ,@() }
    return ,@($d | ForEach-Object { $_ })
}

function Get-Kurz([string]$Text, [int]$Laenge = 120) {
    if ([string]::IsNullOrWhiteSpace($Text)) { return '(leer)' }
    $t = (Protect-Geheimnis $Text) -replace '\s+', ' '
    $t = $t.Trim()
    if ($t.Length -le $Laenge) { return $t }
    return $t.Substring(0, $Laenge) + ' ...'
}

# --------------------------------------------------------------------------
# Konfiguration und Schutzabfragen
# --------------------------------------------------------------------------
if (-not $Bestaetigung -and -not $NurPruefen) {
    Write-Host 'ABBRUCH: Dieser Lauf schreibt in ein echtes Supabase-Projekt.' -ForegroundColor Red
    Write-Host 'Mit -Bestaetigung erneut aufrufen, nachdem die Projekt-URL geprueft wurde.' -ForegroundColor Red
    Write-Host 'Nur die Konfiguration pruefen, ohne jede Verbindung: -NurPruefen' -ForegroundColor DarkGray
    exit 2
}
if (-not (Test-Path $Konfiguration)) {
    Write-Host "ABBRUCH: $Konfiguration fehlt. Vorlage: konfiguration.beispiel.json" -ForegroundColor Red
    exit 2
}

$cfg = Get-Content $Konfiguration -Raw -Encoding UTF8 | ConvertFrom-Json
$Url = ($cfg.projektUrl).TrimEnd('/')
$Key = $cfg.publishableKey

if ($Url -match 'HIER_' -or $Key -match 'HIER_') {
    Write-Host 'ABBRUCH: konfiguration.json ist nicht ausgefuellt.' -ForegroundColor Red
    exit 2
}

# Kennwoerter merken, damit sie in keiner Ausgabe landen koennen.
$script:Geheimnisse = @()
foreach ($n in 'mitarbeiterA', 'mitarbeiterB', 'admin', 'inaktiv') {
    $k = $cfg.konten.$n
    if ($k -and $k.passwort) {
        if ($k.passwort -match 'HIER_') {
            Write-Host "ABBRUCH: Kennwort fuer '$n' ist noch ein Platzhalter." -ForegroundColor Red
            exit 2
        }
        $script:Geheimnisse += $k.passwort
    }
}
$script:Geheimnisse += $Key

# --------------------------------------------------------------------------
# Freigabe: nur das eine bekannte Testprojekt
# --------------------------------------------------------------------------
# Die Kennung kommt bewusst aus einer ZWEITEN Datei. Wer sich in
# konfiguration.json vertippt oder eine fremde URL hineinkopiert, wird hier
# gestoppt - eine Datei, die sich selbst bestaetigt, waere keine Schranke.
# Die Freigabe ist Pflicht: fehlt sie, laeuft nichts.
$FreigabeDatei = Join-Path $PSScriptRoot 'projekt-freigabe.txt'
if (-not (Test-Path $FreigabeDatei)) {
    Write-Host 'ABBRUCH: projekt-freigabe.txt fehlt.' -ForegroundColor Red
    Write-Host '  projekt-freigabe.beispiel.txt kopieren und die Kennung des Testprojekts eintragen.' -ForegroundColor Red
    exit 2
}

$FreigabeZeile = Get-Content $FreigabeDatei -Encoding UTF8 |
    Where-Object { $_.Trim() -ne '' -and -not $_.TrimStart().StartsWith('#') } |
    Select-Object -First 1

if ([string]::IsNullOrWhiteSpace($FreigabeZeile) -or $FreigabeZeile -match 'HIER_') {
    Write-Host 'ABBRUCH: projekt-freigabe.txt enthaelt keine Projektkennung (Platzhalter steht noch drin).' -ForegroundColor Red
    exit 2
}

function Get-ProjektKennung([string]$Wert) {
    $w = $Wert.Trim().TrimEnd('/')
    if ($w -match 'https?://([A-Za-z0-9\-]+)\.supabase\.co') { return $Matches[1].ToLower() }
    if ($w -match '^[A-Za-z0-9\-]+$')                        { return $w.ToLower() }
    return $null
}

$FreigabeRef = Get-ProjektKennung $FreigabeZeile
$ZielRef     = Get-ProjektKennung $Url

if (-not $FreigabeRef) {
    Write-Host 'ABBRUCH: Die Zeile in projekt-freigabe.txt ist keine Projektkennung und keine Supabase-URL.' -ForegroundColor Red
    exit 2
}
if (-not $ZielRef) {
    Write-Host 'ABBRUCH: projektUrl aus konfiguration.json ist keine Supabase-Projekt-URL.' -ForegroundColor Red
    Write-Host '  Erwartet: https://<kennung>.supabase.co' -ForegroundColor Red
    exit 2
}
if ($ZielRef -ne $FreigabeRef) {
    Write-Host "ABBRUCH: konfiguration.json zeigt auf '$ZielRef', freigegeben ist nur '$FreigabeRef'." -ForegroundColor Red
    Write-Host '  Es laeuft nichts. Entweder die Konfiguration berichtigen oder die Freigabe bewusst aendern.' -ForegroundColor Red
    exit 2
}
Write-Host "  Freigabe geprueft: Lauf nur gegen Projekt $FreigabeRef." -ForegroundColor DarkGray

# Die Produktivinstanz steht in admin/supabase-config.js. Sie ist hier
# ausdruecklich gesperrt - auch gegen ein Versehen beim Kopieren.
$RepoWurzel = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
$ProdDatei  = Join-Path $RepoWurzel 'admin\supabase-config.js'
if (Test-Path $ProdDatei) {
    $prodInhalt = Get-Content $ProdDatei -Raw
    if ($prodInhalt -match 'https://([a-z0-9]+)\.supabase\.co') {
        $prodRef = $Matches[1]
        if ($Url -match [regex]::Escape($prodRef)) {
            Write-Host "ABBRUCH: $Url ist die Instanz aus admin/supabase-config.js (Produktiv). Hier laeuft nichts." -ForegroundColor Red
            exit 2
        }
        Write-Host "  Produktiv-Referenz $prodRef ist gesperrt, konfiguriert ist eine andere Instanz." -ForegroundColor DarkGray
    }
}

Write-Host ''
Write-Host "=== Ziel: $Url ===" -ForegroundColor Cyan
Write-Host "    Bucket: $Bucket - es werden ausschliesslich synthetische PDF-Bytes hochgeladen." -ForegroundColor DarkGray
Write-Host ''

# -NurPruefen endet hier: keine Anmeldung, keine Verbindung, kein Upload.
# Das prueft allein die Dateien auf der Platte - ob die Zugangsdaten stimmen,
# sagt es NICHT.
if ($NurPruefen) {
    Write-Host 'Konfiguration und Freigabe sind in sich schluessig.' -ForegroundColor Green
    Write-Host 'Es wurde KEINE Verbindung aufgebaut - ob Key und Kennwoerter gelten, ist damit ungeprueft.' -ForegroundColor DarkGray
    exit 0
}

# --------------------------------------------------------------------------
# Bausteine
# --------------------------------------------------------------------------
function Connect-Konto {
    param([string]$Email, [string]$Passwort)
    $a = Invoke-Api -Methode 'POST' -Adresse "$Url/auth/v1/token?grant_type=password" `
                    -Kopf @{ apikey = $Key } `
                    -Koerper (@{ email = $Email; password = $Passwort } | ConvertTo-Json -Compress)
    if (-not $a.Ok) { return $null }
    $d = $a.Text | ConvertFrom-Json
    return [pscustomobject]@{ Token = $d.access_token; Uid = $d.user.id; Email = $Email }
}

function Get-Kopf {
    param($Konto)
    return @{ apikey = $Key; Authorization = "Bearer $($Konto.Token)" }
}

function New-SynthetischesPdf {
    # Kleinstes brauchbares PDF. Kein Inhalt aus echten Unterlagen.
    $text = "%PDF-1.4`n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj`n" +
            "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj`n" +
            "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj`n" +
            "trailer<</Root 1 0 R>>`n%%EOF`n"
    return [System.Text.Encoding]::ASCII.GetBytes($text)
}

function Send-Datei {
    param($Konto, [string]$Pfad, [byte[]]$Bytes)
    return Invoke-Api -Methode 'POST' -Adresse "$Url/storage/v1/object/$Bucket/$Pfad" `
                      -Kopf ((Get-Kopf $Konto) + @{ 'x-upsert' = 'false' }) `
                      -Koerper $Bytes -InhaltsTyp 'application/pdf'
}

function New-SignierteUrl {
    param($Konto, [string]$Pfad, [int]$Sekunden = 60)
    return Invoke-Api -Methode 'POST' -Adresse "$Url/storage/v1/object/sign/$Bucket/$Pfad" `
                      -Kopf (Get-Kopf $Konto) `
                      -Koerper (@{ expiresIn = $Sekunden } | ConvertTo-Json -Compress)
}

function Remove-Datei {
    param($Konto, [string]$Pfad)
    # Genau der Aufruf, den supabase-js remove([pfad]) absetzt.
    return Invoke-Api -Methode 'DELETE' -Adresse "$Url/storage/v1/object/$Bucket" `
                      -Kopf (Get-Kopf $Konto) `
                      -Koerper (@{ prefixes = @($Pfad) } | ConvertTo-Json -Compress)
}

function Test-DateiAbrufbar {
    # Nachweis ueber den Admin: signierte URL erzeugen UND die Bytes holen.
    # Nur wenn beides klappt, liegt die Datei wirklich noch im Speicher.
    # GRENZE: Der umgekehrte Fall - Katalogeintrag weg, Objekt verwaist im
    # Speicher - ist von aussen nicht messbar.
    param($Admin, [string]$Pfad)
    $s = New-SignierteUrl -Konto $Admin -Pfad $Pfad
    if (-not $s.Ok) { return $false }
    $signiert = ($s.Text | ConvertFrom-Json).signedURL
    if (-not $signiert) { return $false }
    $abruf = Invoke-Api -Methode 'GET' -Adresse "$Url/storage/v1$signiert" -Kopf @{ apikey = $Key }
    return $abruf.Ok
}

function Get-DateiBytes {
    # Laedt die Datei ueber die signierte URL DES ANGEGEBENEN KONTOS.
    # Rueckgabe: Anzahl gelieferter Bytes, 0 wenn schon die URL verweigert wird.
    # Die signierte URL selbst wird nirgends ausgegeben - sie ist ein Schluessel.
    param($Konto, [string]$Pfad, [int]$Sekunden = 60)
    $s = New-SignierteUrl -Konto $Konto -Pfad $Pfad -Sekunden $Sekunden
    if (-not $s.Ok) { return 0 }
    $signiert = ($s.Text | ConvertFrom-Json).signedURL
    if (-not $signiert) { return 0 }
    $abruf = Invoke-Api -Methode 'GET' -Adresse "$Url/storage/v1$signiert" -Kopf @{ apikey = $Key }
    if (-not $abruf.Ok) { return 0 }
    if ($abruf.Bytes -gt 0) { return [int]$abruf.Bytes }
    return [System.Text.Encoding]::ASCII.GetByteCount([string]$abruf.Text)
}

# --------------------------------------------------------------------------
# 1. Anmeldung
# --------------------------------------------------------------------------
Write-Host '=== 1. Anmeldung der vier Testkonten ===' -ForegroundColor Cyan
$A       = Connect-Konto -Email $cfg.konten.mitarbeiterA.email -Passwort $cfg.konten.mitarbeiterA.passwort
$B       = Connect-Konto -Email $cfg.konten.mitarbeiterB.email -Passwort $cfg.konten.mitarbeiterB.passwort
$Admin   = Connect-Konto -Email $cfg.konten.admin.email        -Passwort $cfg.konten.admin.passwort
$Inaktiv = Connect-Konto -Email $cfg.konten.inaktiv.email      -Passwort $cfg.konten.inaktiv.passwort

$alleDa = ($A -and $B -and $Admin -and $Inaktiv)
Add-Befund 'Alle vier Testkonten koennen sich anmelden' $alleDa $(if ($alleDa) { "A=$($A.Uid)" } else { 'mindestens eine Anmeldung gescheitert - Konten und Kennwoerter pruefen' })
if (-not $alleDa) {
    Write-Host 'Ohne Anmeldung ist kein weiterer Test moeglich.' -ForegroundColor Red
    exit 1
}

# --------------------------------------------------------------------------
# 1b. Ist das wirklich das vorbereitete Testprojekt?
# --------------------------------------------------------------------------
# Eine Abweichung von der Produktivinstanz genuegt nicht. Hier wird POSITIV
# gemessen: Die vier synthetischen Konten muessen vorhanden sein, und zwar
# genau in dem Zustand, den 10_testkonten.sql herstellt. Vorher wird nichts
# hochgeladen.
#
# GRENZE: Der ANZEIGENAME des Projekts (taxi-germersheim-test) ist ueber die
# Datenschnittstelle nicht lesbar - dafuer braeuchte es die Management-API und
# ein persoenliches Zugriffstoken. Gemessen wird der Inhalt, nicht der Name.
Write-Host '=== 1b. Kennzeichen des Zielprojekts ===' -ForegroundColor Cyan

$erwartet = @{
    $cfg.konten.mitarbeiterA.email = @{ rolle = 'employee'; portal = $true  }
    $cfg.konten.mitarbeiterB.email = @{ rolle = 'employee'; portal = $true  }
    $cfg.konten.admin.email        = @{ rolle = 'admin';    portal = $true  }
    $cfg.konten.inaktiv.email      = @{ rolle = 'employee'; portal = $false }
}

$mitarbeiter = Invoke-Api -Methode 'GET' `
    -Adresse "$Url/rest/v1/employees?select=id,email,active,portal_active&email=like.tg-test-%25%40example.invalid&order=email" `
    -Kopf (Get-Kopf $Admin)

$gefunden = @()
if ($mitarbeiter.Ok) { $gefunden = ConvertTo-Zeilen $mitarbeiter.Text }

$abweichung = @()
foreach ($adresse in $erwartet.Keys) {
    $zeile = $gefunden | Where-Object { $_.email -eq $adresse } | Select-Object -First 1
    if (-not $zeile) {
        $abweichung += "$adresse fehlt"
    }
    elseif ($zeile.portal_active -ne $erwartet[$adresse].portal -or -not $zeile.active) {
        $abweichung += "$adresse hat einen anderen Zustand"
    }
}

$kennzeichenOk = ($abweichung.Count -eq 0 -and $gefunden.Count -eq 4)
Add-Befund 'Zielprojekt traegt die vier synthetischen Testkonten' $kennzeichenOk `
    $(if ($kennzeichenOk) { "4 von 4 Konten wie erwartet, inaktives Konto mit portal_active=false" } else { ($abweichung -join '; ') + " (gefunden: $($gefunden.Count))" })

if (-not $kennzeichenOk) {
    Write-Host 'ABBRUCH: Das Ziel ist nicht das vorbereitete Testprojekt - es wird nichts geschrieben.' -ForegroundColor Red
    exit 1
}

# employee_id fuer die spaetere Verknuepfung. profiles_select_self erlaubt das.
$profilA = Invoke-Api -Methode 'GET' -Adresse "$Url/rest/v1/profiles?select=employee_id&auth_user_id=eq.$($A.Uid)" -Kopf (Get-Kopf $A)
$employeeA = $null
if ($profilA.Ok) { $employeeA = ((ConvertTo-Zeilen $profilA.Text) | Select-Object -First 1).employee_id }
Add-Befund 'Eigenes Profil lesbar (employee_id)' ([bool]$employeeA) $(if ($employeeA) { "employee_id=$employeeA" } else { Get-Kurz $profilA.Text })

# --------------------------------------------------------------------------
# 2. Hochladen
# --------------------------------------------------------------------------
Write-Host '=== 2. Hochladen ===' -ForegroundColor Cyan
$pdf   = New-SynthetischesPdf
$jahr  = (Get-Date).Year
$lauf  = [guid]::NewGuid().ToString('N').Substring(0, 8)
$pfadA = "$($A.Uid)/$jahr/tg-test-$lauf-1.pdf"
$pfadA2 = "$($A.Uid)/$jahr/tg-test-$lauf-2.pdf"
$pfadFremd = "$($B.Uid)/$jahr/tg-test-$lauf-fremd.pdf"

$up1 = Send-Datei -Konto $A -Pfad $pfadA -Bytes $pdf
Add-Befund 'A laedt in den EIGENEN Ordner hoch' $up1.Ok "HTTP $($up1.Status) $(Get-Kurz $up1.Text 80)"

$up2 = Send-Datei -Konto $A -Pfad $pfadFremd -Bytes $pdf
Add-Befund 'A kann NICHT in den Ordner von B hochladen' (-not $up2.Ok) "HTTP $($up2.Status) $(Get-Kurz $up2.Text 80)"

$pfadInaktiv = "$($Inaktiv.Uid)/$jahr/tg-test-$lauf-inaktiv.pdf"
$up3 = Send-Datei -Konto $Inaktiv -Pfad $pfadInaktiv -Bytes $pdf
Add-Befund 'Gesperrtes Portalkonto kann NICHT hochladen' (-not $up3.Ok) "HTTP $($up3.Status) $(Get-Kurz $up3.Text 80)"

$up4 = Invoke-Api -Methode 'POST' -Adresse "$Url/storage/v1/object/$Bucket/anon/$lauf.pdf" `
                  -Kopf @{ apikey = $Key } -Koerper $pdf -InhaltsTyp 'application/pdf'
Add-Befund 'Ohne Anmeldung kann niemand hochladen' (-not $up4.Ok) "HTTP $($up4.Status) $(Get-Kurz $up4.Text 80)"

# --------------------------------------------------------------------------
# 2b. Grenzen des Buckets: Groesse und Dateityp
# --------------------------------------------------------------------------
# Beides sind Einstellungen des Buckets, keine Policy. Sie werden hier
# gemessen, nicht angenommen.
Write-Host '=== 2b. Groesse und Dateityp ===' -ForegroundColor Cyan

# Rund 11 MB synthetischer Fuellstoff mit PDF-Kopf. Ueber der 10-MB-Grenze.
$grossPfad  = "$($A.Uid)/$jahr/tg-test-$lauf-gross.pdf"
$grossBytes = New-Object byte[] (11 * 1024 * 1024)
[System.Text.Encoding]::ASCII.GetBytes('%PDF-1.4').CopyTo($grossBytes, 0)
$upGross = Send-Datei -Konto $A -Pfad $grossPfad -Bytes $grossBytes
Add-Befund 'Datei ueber der Groessengrenze wird abgewiesen' (-not $upGross.Ok) "11 MB -> HTTP $($upGross.Status) $(Get-Kurz $upGross.Text 80)"
$grossBytes = $null

# Unerlaubter Typ: text/plain steht nicht in der Positivliste des Buckets.
$textPfad = "$($A.Uid)/$jahr/tg-test-$lauf-typ.txt"
$upTyp = Invoke-Api -Methode 'POST' -Adresse "$Url/storage/v1/object/$Bucket/$textPfad" `
                  -Kopf ((Get-Kopf $A) + @{ 'x-upsert' = 'false' }) `
                  -Koerper ([System.Text.Encoding]::ASCII.GetBytes('synthetischer Text, keine echten Daten')) `
                  -InhaltsTyp 'text/plain'
Add-Befund 'Unerlaubter Dateityp wird abgewiesen' (-not $upTyp.Ok) "text/plain -> HTTP $($upTyp.Status) $(Get-Kurz $upTyp.Text 80)"

# --------------------------------------------------------------------------
# 3. Lesen
# --------------------------------------------------------------------------
Write-Host '=== 3. Lesen ===' -ForegroundColor Cyan
$s1 = New-SignierteUrl -Konto $A -Pfad $pfadA
Add-Befund 'A erhaelt eine signierte URL fuer die eigene Datei' $s1.Ok "HTTP $($s1.Status)"

$s2 = New-SignierteUrl -Konto $B -Pfad $pfadA
Add-Befund 'B erhaelt KEINE signierte URL fuer die Datei von A' (-not $s2.Ok) "HTTP $($s2.Status) $(Get-Kurz $s2.Text 80)"

$s3 = New-SignierteUrl -Konto $Admin -Pfad $pfadA
Add-Befund 'Admin erhaelt eine signierte URL fuer fremde Dateien' $s3.Ok "HTTP $($s3.Status)"

Add-Befund 'Datei ist tatsaechlich abrufbar' (Test-DateiAbrufbar -Admin $Admin -Pfad $pfadA) 'signierte URL erzeugt und Bytes geholt'

# Herunterladen durch den Eigentuemer - und zwar die richtigen Bytes.
$eigeneBytes = Get-DateiBytes -Konto $A -Pfad $pfadA
Add-Befund 'A laedt die eigene Datei vollstaendig herunter' ($eigeneBytes -eq $pdf.Length) "$eigeneBytes von $($pdf.Length) Bytes"

$adminBytes = Get-DateiBytes -Konto $Admin -Pfad $pfadA
Add-Befund 'Admin laedt die fremde Datei vollstaendig herunter' ($adminBytes -eq $pdf.Length) "$adminBytes von $($pdf.Length) Bytes"

# Direkter Objektabruf ohne signierte URL: der Bucket ist privat.
$direktB = Invoke-Api -Methode 'GET' -Adresse "$Url/storage/v1/object/$Bucket/$pfadA" -Kopf (Get-Kopf $B)
Add-Befund 'B erhaelt die Datei von A auch nicht direkt' (-not $direktB.Ok) "HTTP $($direktB.Status) $(Get-Kurz $direktB.Text 80)"

$direktAnon = Invoke-Api -Methode 'GET' -Adresse "$Url/storage/v1/object/$Bucket/$pfadA" -Kopf @{ apikey = $Key }
Add-Befund 'Ohne Anmeldung ist die Datei nicht abrufbar' (-not $direktAnon.Ok) "HTTP $($direktAnon.Status) $(Get-Kurz $direktAnon.Text 80)"

$anonListe = Invoke-Api -Methode 'POST' -Adresse "$Url/storage/v1/object/list/$Bucket" `
                        -Kopf @{ apikey = $Key } `
                        -Koerper (@{ prefix = ''; limit = 5 } | ConvertTo-Json -Compress)
$anonLeer = (-not $anonListe.Ok) -or ((ConvertTo-Zeilen $anonListe.Text).Count -eq 0)
Add-Befund 'Ohne Anmeldung ist der Bucket nicht auflistbar' $anonLeer "HTTP $($anonListe.Status) $(Get-Kurz $anonListe.Text 60)"

# Ablauf der signierten URL: kurze Gueltigkeit, danach muss sie tot sein.
Write-Host '=== 3b. Ablauf signierter URLs ===' -ForegroundColor Cyan
$kurz = New-SignierteUrl -Konto $A -Pfad $pfadA -Sekunden 1
$kurzOk = $false
$nachAblauf = $null
if ($kurz.Ok) {
    $kurzUrl = ($kurz.Text | ConvertFrom-Json).signedURL
    Start-Sleep -Seconds 5
    $nachAblauf = Invoke-Api -Methode 'GET' -Adresse "$Url/storage/v1$kurzUrl" -Kopf @{ apikey = $Key }
    $kurzOk = -not $nachAblauf.Ok
    $kurzUrl = $null
}
Add-Befund 'Signierte URL ist nach Ablauf der Gueltigkeit wertlos' $kurzOk `
    $(if ($null -ne $nachAblauf) { "Gueltigkeit 1 s, Abruf nach 5 s -> HTTP $($nachAblauf.Status)" } else { 'die kurze URL wurde gar nicht erst erstellt' })

# --------------------------------------------------------------------------
# 4. Loeschen - der eigentliche Punkt
# --------------------------------------------------------------------------
Write-Host '=== 4. Loeschen ueber die Storage-API ===' -ForegroundColor Cyan

$d1 = Remove-Datei -Konto $B -Pfad $pfadA
$nochDa = Test-DateiAbrufbar -Admin $Admin -Pfad $pfadA
Add-Befund 'B kann die Datei von A NICHT loeschen' $nochDa "HTTP $($d1.Status), Datei danach noch abrufbar: $nochDa"

# Zweite Datei: wird verknuepft und darf danach NICHT mehr loeschbar sein.
$up5 = Send-Datei -Konto $A -Pfad $pfadA2 -Bytes $pdf
Add-Befund 'Zweite Datei fuer den Verknuepfungsfall hochgeladen' $up5.Ok "HTTP $($up5.Status)"

$typ = Invoke-Api -Methode 'GET' -Adresse "$Url/rest/v1/document_types?select=id&key=eq.$($cfg.dokumenttypSchluessel)" -Kopf (Get-Kopf $A)
$typId = $null
if ($typ.Ok) { $typId = ((ConvertTo-Zeilen $typ.Text) | Select-Object -First 1).id }

$eintrag = Invoke-Api -Methode 'POST' -Adresse "$Url/rest/v1/document_submissions" `
                      -Kopf ((Get-Kopf $A) + @{ Prefer = 'return=representation' }) `
                      -Koerper (@{
                          employee_id      = $employeeA
                          document_type_id = $typId
                          file_path        = $pfadA2
                          file_name        = 'tg-test-synthetisch.pdf'
                          mime_type        = 'application/pdf'
                          status           = 'submitted'
                      } | ConvertTo-Json -Compress)
$eintragId = $null
if ($eintrag.Ok) { $eintragId = ((ConvertTo-Zeilen $eintrag.Text) | Select-Object -First 1).id }
Add-Befund 'Verknuepfung in document_submissions angelegt' ([bool]$eintragId) $(if ($eintragId) { "id=$eintragId" } else { Get-Kurz $eintrag.Text })

$d2 = Remove-Datei -Konto $A -Pfad $pfadA2
$verknuepftNochDa = Test-DateiAbrufbar -Admin $Admin -Pfad $pfadA2
Add-Befund 'VERKNUEPFTE Datei bleibt beim Loeschversuch erhalten' $verknuepftNochDa "HTTP $($d2.Status) $(Get-Kurz $d2.Text 100); danach abrufbar: $verknuepftNochDa"
# Gemessen am 12.09.2026 im Testprojekt: Die Antwort ist HTTP 200 mit einem
# LEEREN Array - kein Fehler, keine Trigger-Meldung. Erklaerung durch den
# Gegenversuch: Beim Loeschen einer unverknuepften Datei nennt dieselbe
# Antwort einen Eintrag. Die DELETE-Policy blendet die verknuepfte Zeile also
# schon vor dem Trigger aus; der Trigger kommt gar nicht zu Wort. Er bleibt
# die zweite Reihe - ueber die API ist er deshalb nicht sichtbar zu machen.
#
# FOLGE FUER DIE OBERFLAECHE: supabase-js .remove() liefert hier KEINEN
# Fehler, sondern data = []. Wer nur auf error prueft, meldet faelschlich
# Erfolg. fahrer/employee-supabase.js wertet an dieser Stelle bereits
# data.length aus - geprueft am 12.09.2026, dort ist nichts zu aendern.
$geloeschteEintraege = (ConvertTo-Zeilen $d2.Text).Count
Add-Befund 'Loeschversuch entfernt nachweislich nichts (0 Eintraege gemeldet)' ($geloeschteEintraege -eq 0) "HTTP $($d2.Status), gemeldete Eintraege: $geloeschteEintraege"

# Nicht nur der Katalogeintrag: nach dem abgewiesenen Loeschen muessen die
# Bytes noch da sein. Sonst waere die Datei eine Leiche im Speicher.
$verknuepftBytes = Get-DateiBytes -Konto $A -Pfad $pfadA2
Add-Befund 'Verknuepfte Datei ist danach unveraendert herunterladbar' ($verknuepftBytes -eq $pdf.Length) "$verknuepftBytes von $($pdf.Length) Bytes"

# Unverknuepfte eigene Datei: muss sich loeschen lassen, und zwar wirklich.
$d3 = Remove-Datei -Konto $A -Pfad $pfadA
$wegA = -not (Test-DateiAbrufbar -Admin $Admin -Pfad $pfadA)
Add-Befund 'UNVERKNUEPFTE eigene Datei laesst sich loeschen' $wegA "HTTP $($d3.Status), danach abrufbar: $(-not $wegA)"

# Der Gegensatz zum verknuepften Fall: hier nennt die Antwort einen Eintrag.
# Erst dieser Vergleich macht das leere Array oben zu einem Messwert.
$freiEintraege = (ConvertTo-Zeilen $d3.Text).Count
Add-Befund 'Erfolgreiches Loeschen meldet den entfernten Eintrag' ($freiEintraege -ge 1) "gemeldete Eintraege: $freiEintraege (verknuepfter Fall: $geloeschteEintraege)"

# Verknuepfung loesen (Admin darf das), danach muss das Loeschen gelingen.
if ($eintragId) {
    $weg = Invoke-Api -Methode 'DELETE' -Adresse "$Url/rest/v1/document_submissions?id=eq.$eintragId" -Kopf (Get-Kopf $Admin)
    $d4  = Remove-Datei -Konto $A -Pfad $pfadA2
    $wegA2 = -not (Test-DateiAbrufbar -Admin $Admin -Pfad $pfadA2)
    Add-Befund 'Nach dem Loesen der Verknuepfung ist die Datei loeschbar' $wegA2 "Verknuepfung HTTP $($weg.Status), Loeschen HTTP $($d4.Status)"
}

# --------------------------------------------------------------------------
# 5. Aufraeumen
# --------------------------------------------------------------------------
if ($Aufraeumen) {
    Write-Host '=== 5. Aufraeumen ===' -ForegroundColor Cyan
    foreach ($p in @($pfadA, $pfadA2, $pfadFremd, $pfadInaktiv, $grossPfad, $textPfad)) {
        $r = Remove-Datei -Konto $A -Pfad $p
        Write-Host "  $p -> HTTP $($r.Status)"
    }
    # Gegenprobe: was danach noch im eigenen Ordner liegt, wird benannt.
    $rest = Invoke-Api -Methode 'POST' -Adresse "$Url/storage/v1/object/list/$Bucket" `
                       -Kopf (Get-Kopf $A) `
                       -Koerper (@{ prefix = "$($A.Uid)/$jahr"; limit = 100 } | ConvertTo-Json -Compress)
    if ($rest.Ok) {
        $uebrig = @((ConvertTo-Zeilen $rest.Text) | Where-Object { $_.name -like "tg-test-*" })
        if ($uebrig.Count -eq 0) {
            Write-Host '  Im Ordner von A liegt keine tg-test-Datei mehr.' -ForegroundColor Green
        } else {
            Write-Host "  ACHTUNG, noch vorhanden: $($uebrig.name -join ', ')" -ForegroundColor Yellow
        }
    }
    Write-Host '  Stammdaten raeumt Abschnitt 5 von 10_testkonten.sql weg.' -ForegroundColor DarkGray
} else {
    Write-Host ''
    Write-Host 'Hinweis: Fuer einen erneuten Lauf bleiben Reste im Bucket liegen.' -ForegroundColor DarkGray
    Write-Host 'Mit -Aufraeumen laufen lassen oder die Pfade im Dashboard entfernen:' -ForegroundColor DarkGray
    Write-Host "  $pfadA2" -ForegroundColor DarkGray
}

# --------------------------------------------------------------------------
Write-Host ''
Write-Host '================ GESAMTERGEBNIS ================' -ForegroundColor Cyan
$script:Befunde | ForEach-Object {
    $w = if ($_.Ok) { 'BESTANDEN     ' } else { 'FEHLGESCHLAGEN' }
    Write-Host ("{0}  {1}" -f $w, $_.Pruefung)
}
$offen = ($script:Befunde | Where-Object { -not $_.Ok }).Count
Write-Host ''
if ($offen -eq 0) {
    Write-Host "ALLE $($script:Befunde.Count) PRUEFUNGEN BESTANDEN" -ForegroundColor Green
    exit 0
} else {
    Write-Host "$offen VON $($script:Befunde.Count) PRUEFUNGEN FEHLGESCHLAGEN" -ForegroundColor Red
    exit 1
}
