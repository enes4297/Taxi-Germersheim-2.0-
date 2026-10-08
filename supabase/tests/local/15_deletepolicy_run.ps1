# 15_deletepolicy_run.ps1
#
# Prueft den letzten Schritt des Einrichtungswegs gegen eine lokale, isolierte
# PostgreSQL-Instanz:
#
#   Basisskript -> Trigger-Nachtrag -> storage-delete-policy-nachtragen.sql
#
# Geprueft wird nicht nur der gute Fall, sondern vor allem, ob die Datei in den
# vier Faellen abbricht, in denen sie abbrechen MUSS:
#   A  Trigger fehlt            -> Policy darf nicht entstehen
#   B  Trigger abgeschaltet     -> Policy darf nicht entstehen
#   C  fremde zweite DELETE-Policy vorhanden -> Abbruch, weil permissive
#      Policies sich mit ODER verknuepfen
#   D  Wiederholter Lauf        -> muss fehlerfrei durchgehen
#
# NUR LOKAL. Ausschliesslich 127.0.0.1, kein Windows-Dienst, kein Kontakt zu
# irgendeinem Supabase-Projekt.
#
# Aufruf:  powershell -File 15_deletepolicy_run.ps1

$ErrorActionPreference = 'Continue'

$PgRoot   = "$env:USERPROFILE\pgtest-tg"
$PgBin    = "$PgRoot\pgsql\bin"
$PgData   = "$PgRoot\data"
$PgPort   = 55432
$PgLog    = "$PgRoot\server.log"
$Db       = 'tgdelpol'
$RepoRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
$env:PGPASSWORD = 'tgtestlocal'

$PolicyDatei = "$RepoRoot\supabase\setup\storage-delete-policy-nachtragen.sql"

$script:Befunde = @()
function Add-Befund([string]$Name, [bool]$Ok, [string]$Detail) {
    $script:Befunde += [pscustomobject]@{ Pruefung = $Name; Ok = $Ok; Detail = $Detail }
    $farbe = if ($Ok) { 'Green' } else { 'Red' }
    $wort  = if ($Ok) { 'BESTANDEN' } else { 'FEHLGESCHLAGEN' }
    Write-Host ("  [{0}] {1} - {2}" -f $wort, $Name, $Detail) -ForegroundColor $farbe
}

function Invoke-Psql {
    param([string]$File, [string]$User = 'postgres', [string[]]$Pre = @(), [switch]$Stop)
    $a = @('-h','127.0.0.1','-p',$PgPort,'-U',$User,'-d',$Db,'-P','pager=off','-q')
    if ($Stop) { $a += @('-v','ON_ERROR_STOP=1') } else { $a += @('-v','ON_ERROR_STOP=0') }
    foreach ($c in $Pre) { $a += @('-c', $c) }
    if ($File) { $a += @('-f', $File) }
    return (& "$PgBin\psql.exe" @a 2>&1 | Out-String)
}

function Get-Wert {
    param([string]$Sql, [string]$User = 'postgres')
    $a = @('-h','127.0.0.1','-p',$PgPort,'-U',$User,'-d',$Db,'-q','-t','-A','-c',$Sql)
    return ((& "$PgBin\psql.exe" @a 2>&1 | Out-String).Trim())
}

function Get-DeletePolicyAnzahl {
    return (Get-Wert "select count(*) from pg_policies where schemaname='storage' and tablename='objects' and cmd='DELETE';")
}

Write-Host '=== 1. Server starten ===' -ForegroundColor Cyan
if (-not (Test-Path "$PgData\PG_VERSION")) { throw "Kein Cluster unter $PgData. Zuerst run-local-tests.ps1 ausfuehren." }
$istAn = (Test-NetConnection -ComputerName 127.0.0.1 -Port $PgPort -WarningAction SilentlyContinue).TcpTestSucceeded
if (-not $istAn) {
    Start-Process -FilePath "$PgBin\pg_ctl.exe" -ArgumentList @('-D', $PgData, '-l', $PgLog, 'start') -NoNewWindow
    Start-Sleep -Seconds 5
}
Write-Host "  Port $PgPort erreichbar."

try {
    Write-Host '=== 2. Frische Datenbank, Shims, Basisskript ===' -ForegroundColor Cyan
    & "$PgBin\psql.exe" -h 127.0.0.1 -p $PgPort -U postgres -d postgres -q -c "drop database if exists $Db;" -c "create database $Db;" 2>&1 | Out-Null
    Invoke-Psql -File "$PSScriptRoot\00_supabase_shim.sql" -Stop | Out-Null
    Invoke-Psql -File "$PSScriptRoot\01_storage_shim.sql"  -Stop | Out-Null
    Invoke-Psql -File "$PSScriptRoot\02_plattform_shim.sql" -Stop | Out-Null
    Invoke-Psql -File "$RepoRoot\supabase\setup\testprojekt-einrichtung-ohne-storage-trigger.sql" -User 'tg_projekt' | Out-Null
    Write-Host '  Basisskript gelaufen.'

    # Die Dashboard-/Eigentuemerrolle muss die Namen im Policy-Ausdruck
    # aufloesen koennen. Schema private gehoert der Projektrolle.
    Invoke-Psql -User 'tg_projekt' -Pre @("grant usage on schema private to supabase_storage_admin;") | Out-Null

    # Im Testprojekt gelingt CREATE POLICY der Projektrolle selbst. Lokal ist
    # sie NICHT Eigentuemerin, deshalb laeuft die Policy-Datei hier als
    # supabase_storage_admin. Geprueft wird die Logik der Datei, nicht die
    # Frage, welche Rolle im Testprojekt darf.
    $PolicyRolle = @('set role supabase_storage_admin;')

    # Ausgangslage wie im Testprojekt am 12.09.2026: Die drei SELECT-/INSERT-
    # Policies stehen, die DELETE-Policy wurde wieder entfernt. Lokal
    # uebersprungen das Basisskript die Policies (hier ist die Projektrolle
    # wirklich nicht Eigentuemerin), deshalb werden sie hier nachgestellt.
    Invoke-Psql -File "$PSScriptRoot\14_dashboard_policies.sql" -User 'postgres' -Pre $PolicyRolle | Out-Null
    Invoke-Psql -User 'postgres' -Pre @('set role supabase_storage_admin; drop policy employee_documents_delete_unlinked on storage.objects;') | Out-Null
    $vorher = Get-Wert "select string_agg(policyname,', ' order by policyname) from pg_policies where schemaname='storage' and tablename='objects';"
    Add-Befund 'Ausgangslage = Stand Testprojekt (drei Policies, keine DELETE-Policy)' ($vorher -eq 'employee_documents_insert_own, employee_documents_select_admin, employee_documents_select_own') $vorher

    Write-Host '=== 3. Fall A: Policy-Datei OHNE Trigger ===' -ForegroundColor Yellow
    $fallA = Invoke-Psql -File $PolicyDatei -User 'postgres' -Pre $PolicyRolle
    Write-Host $fallA
    $anzA = Get-DeletePolicyAnzahl
    Add-Befund 'Fall A bricht ab, wenn der Trigger fehlt' ([bool]($fallA -match 'Trigger storage_objects_guard_delete fehlt')) 'ABBRUCH-Meldung vorhanden'
    Add-Befund 'Fall A legt KEINE DELETE-Policy an' ($anzA -eq '0') "DELETE-Policies danach: $anzA"

    Write-Host '=== 4. Trigger-Nachtrag ===' -ForegroundColor Cyan
    Invoke-Psql -File "$RepoRoot\supabase\setup\storage-trigger-nachtragen.sql" -User 'tg_projekt' | Out-Null
    $guard = Get-Wert "select count(*) from pg_trigger where tgrelid=to_regclass('storage.objects') and tgname='storage_objects_guard_delete' and not tgisinternal;"
    Write-Host "  Guard-Trigger vorhanden: $guard"

    Write-Host '=== 5. Fall B: Trigger vorhanden, aber abgeschaltet ===' -ForegroundColor Yellow
    Invoke-Psql -User 'postgres' -Pre @('alter table storage.objects disable trigger storage_objects_guard_delete;') | Out-Null
    $fallB = Invoke-Psql -File $PolicyDatei -User 'postgres' -Pre $PolicyRolle
    Write-Host $fallB
    $anzB = Get-DeletePolicyAnzahl
    Add-Befund 'Fall B bricht bei abgeschaltetem Trigger ab' ([bool]($fallB -match 'NICHT aktiv \(tgenabled=D\)')) 'ABBRUCH-Meldung vorhanden'
    Add-Befund 'Fall B legt KEINE DELETE-Policy an' ($anzB -eq '0') "DELETE-Policies danach: $anzB"
    Invoke-Psql -User 'postgres' -Pre @('alter table storage.objects enable trigger storage_objects_guard_delete;') | Out-Null

    Write-Host '=== 6. Guter Fall: Policy anlegen ===' -ForegroundColor Green
    $gut = Invoke-Psql -File $PolicyDatei -User 'postgres' -Pre $PolicyRolle
    Write-Host $gut
    $gutFehler = ($gut -split "`r?`n" | Where-Object { $_ -match '(ERROR|FEHLER):' } | Select-Object -First 1)
    Add-Befund 'Policy-Datei laeuft ohne Fehler durch' ([string]::IsNullOrWhiteSpace($gutFehler)) $(if ($gutFehler) { $gutFehler } else { 'kein ERROR in der Ausgabe' })
    Add-Befund 'Drei Kontrollmeldungen' (([regex]::Matches($gut, 'KONTROLLE OK')).Count -eq 3) "KONTROLLE OK: $(([regex]::Matches($gut,'KONTROLLE OK')).Count)"
    $anzG = Get-DeletePolicyAnzahl
    Add-Befund 'Genau eine DELETE-Policy vorhanden' ($anzG -eq '1') "DELETE-Policies: $anzG"
    $polAlle = Get-Wert "select string_agg(policyname,', ' order by policyname) from pg_policies where schemaname='storage' and tablename='objects';"
    Add-Befund 'Alle vier Policies vorhanden' ($polAlle -eq 'employee_documents_delete_unlinked, employee_documents_insert_own, employee_documents_select_admin, employee_documents_select_own') $polAlle
    $polRollen = Get-Wert "select coalesce(string_agg(distinct roles::text,','),'-') from pg_policies where schemaname='storage' and tablename='objects';"
    Add-Befund 'Alle Policies gelten nur fuer authenticated' ($polRollen -eq '{authenticated}') "Rollen: $polRollen"
    $qual = Get-Wert "select qual from pg_policies where schemaname='storage' and tablename='objects' and policyname='employee_documents_delete_unlinked';"
    Add-Befund 'USING enthaelt is_unlinked_document' ([bool]($qual -match 'is_unlinked_document')) $qual

    Write-Host '=== 7. Fall D: Zweiter Lauf (Wiederholbarkeit) ===' -ForegroundColor Yellow
    $wdh = Invoke-Psql -File $PolicyDatei -User 'postgres' -Pre $PolicyRolle
    Write-Host $wdh
    $wdhFehler = ($wdh -split "`r?`n" | Where-Object { $_ -match '(ERROR|FEHLER):' } | Select-Object -First 1)
    Add-Befund 'Policy-Datei ist wiederholbar' ([string]::IsNullOrWhiteSpace($wdhFehler)) $(if ($wdhFehler) { $wdhFehler } else { 'zweiter Lauf ohne Fehler' })
    Add-Befund 'Nach dem zweiten Lauf weiterhin genau eine DELETE-Policy' ((Get-DeletePolicyAnzahl) -eq '1') "DELETE-Policies: $(Get-DeletePolicyAnzahl)"

    Write-Host '=== 8. Fall C: Fremde zweite DELETE-Policy ===' -ForegroundColor Yellow
    Invoke-Psql -User 'postgres' -Pre @("set role supabase_storage_admin; create policy tg_fremde_loeschregel on storage.objects as permissive for delete to authenticated using (true);") | Out-Null
    $fallC = Invoke-Psql -File $PolicyDatei -User 'postgres' -Pre $PolicyRolle
    Write-Host $fallC
    Add-Befund 'Fall C bricht bei zweiter DELETE-Policy ab' ([bool]($fallC -match 'DELETE-Policies auf storage.objects, erwartet ist genau eine')) 'ABBRUCH-Meldung vorhanden'
    $anzC = Get-DeletePolicyAnzahl
    Add-Befund 'Fall C schreibt nichts fest (Ruecklauf)' ($anzC -eq '2') "DELETE-Policies danach: $anzC (eigene + fremde, unveraendert)"
    Invoke-Psql -User 'postgres' -Pre @("set role supabase_storage_admin; drop policy tg_fremde_loeschregel on storage.objects;") | Out-Null

    Write-Host '=== 9. Plattform-Trigger unveraendert ===' -ForegroundColor Cyan
    $trigAlle = Get-Wert "select string_agg(tgname,', ' order by tgname) from pg_trigger where tgrelid=to_regclass('storage.objects') and not tgisinternal;"
    Add-Befund 'Genau drei Trigger auf storage.objects' ($trigAlle -eq 'protect_objects_delete, storage_objects_guard_delete, update_objects_updated_at') $trigAlle

    Write-Host '=== 10. Verhaltenstests gegen den Endzustand ===' -ForegroundColor Green
    Invoke-Psql -File "$RepoRoot\supabase\tests\010_rewards_read_function_guards_seed.sql" -Pre @("set tg.test_env = 'ICH-BESTAETIGE-ISOLIERTE-TESTUMGEBUNG';") -Stop | Out-Null
    $t12 = Invoke-Psql -File "$PSScriptRoot\12_document_upload_test.sql"
    $fehl = ([regex]::Matches($t12, 'FEHLGESCHLAGEN')).Count
    $best = ([regex]::Matches($t12, 'BESTANDEN')).Count
    Add-Befund 'Dokumenten-Verhaltenstests' ($fehl -eq 0 -and $best -gt 0) "$best bestanden, $fehl fehlgeschlagen"
}
finally {
    Write-Host '=== Server stoppen ===' -ForegroundColor Cyan
    & "$PgBin\pg_ctl.exe" -D $PgData -m fast stop 2>&1 | Out-Null
    Write-Host '  gestoppt.'
}

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
