# 14_setupweg_run.ps1
#
# Prueft den vorbereiteten Einrichtungsweg VOLLSTAENDIG und in der richtigen
# Reihenfolge gegen eine lokale, isolierte PostgreSQL-Instanz:
#
#   Basisskript -> Trigger-Nachtrag -> Storage-Policies (Dashboard)
#
# Nachgebildet wird dabei die Rechtelage aus der Diagnose des Testprojekts
# (02_plattform_shim.sql): Die Projektrolle ist NICHT Eigentuemerin von
# storage.objects, hat aber BYPASSRLS und das TRIGGER-Recht.
#
# NUR LOKAL. Ausschliesslich 127.0.0.1, kein Windows-Dienst, kein Kontakt zu
# irgendeinem Supabase-Projekt.
#
# Aufruf:  powershell -File 14_setupweg_run.ps1

# psql schreibt NOTICE nach stderr; mit 'Stop' wuerde das den Lauf abbrechen.
$ErrorActionPreference = 'Continue'

$PgRoot   = "$env:USERPROFILE\pgtest-tg"
$PgBin    = "$PgRoot\pgsql\bin"
$PgData   = "$PgRoot\data"
$PgPort   = 55432
$PgLog    = "$PgRoot\server.log"
$Db       = 'tgsetup'
$RepoRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
$env:PGPASSWORD = 'tgtestlocal'

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

Write-Host '=== 1. Server starten ===' -ForegroundColor Cyan
if (-not (Test-Path "$PgData\PG_VERSION")) { throw "Kein Cluster unter $PgData. Zuerst run-local-tests.ps1 ausfuehren." }
$istAn = (Test-NetConnection -ComputerName 127.0.0.1 -Port $PgPort -WarningAction SilentlyContinue).TcpTestSucceeded
if (-not $istAn) {
    Start-Process -FilePath "$PgBin\pg_ctl.exe" -ArgumentList @('-D', $PgData, '-l', $PgLog, 'start') -NoNewWindow
    Start-Sleep -Seconds 5
}
Write-Host "  Port $PgPort erreichbar."

try {
    Write-Host '=== 2. Frische Datenbank ===' -ForegroundColor Cyan
    & "$PgBin\psql.exe" -h 127.0.0.1 -p $PgPort -U postgres -d postgres -q -c "drop database if exists $Db;" -c "create database $Db;" 2>&1 | Out-Null
    Write-Host "  $Db neu angelegt."

    Write-Host '=== 3. Shims: Supabase, Storage, Plattformrechte ===' -ForegroundColor Cyan
    Invoke-Psql -File "$PSScriptRoot\00_supabase_shim.sql" -Stop | Out-Null
    Invoke-Psql -File "$PSScriptRoot\01_storage_shim.sql"  -Stop | Out-Null
    $lage = Invoke-Psql -File "$PSScriptRoot\02_plattform_shim.sql" -Stop
    Write-Host $lage

    # Die nachgebildete Lage muss der Diagnose entsprechen, sonst testet der
    # Lauf etwas anderes als das Projekt.
    $eig    = Get-Wert "select pg_get_userbyid(relowner) from pg_class where oid = to_regclass('storage.objects');"
    $usage  = Get-Wert "select pg_has_role('tg_projekt','supabase_storage_admin','USAGE');"
    $member = Get-Wert "select pg_has_role('tg_projekt','supabase_storage_admin','MEMBER');"
    $trig   = Get-Wert "select has_table_privilege('tg_projekt','storage.objects','TRIGGER');"
    $byp    = Get-Wert "select rolbypassrls from pg_roles where rolname='tg_projekt';"
    $anonR  = Get-Wert "select concat_ws('/',has_table_privilege('anon','storage.objects','SELECT'),has_table_privilege('anon','storage.objects','INSERT'),has_table_privilege('anon','storage.objects','UPDATE'),has_table_privilege('anon','storage.objects','DELETE'));"
    $authR  = Get-Wert "select concat_ws('/',has_table_privilege('authenticated','storage.objects','SELECT'),has_table_privilege('authenticated','storage.objects','INSERT'),has_table_privilege('authenticated','storage.objects','UPDATE'),has_table_privilege('authenticated','storage.objects','DELETE'));"
    Add-Befund 'Nachgebildete Lage = Diagnose' ($eig -eq 'supabase_storage_admin' -and $usage -eq 'f' -and $member -eq 'f' -and $trig -eq 't' -and $byp -eq 't' -and $anonR -eq 't/t/t/t' -and $authR -eq 't/t/t/t') "Eigentuemer=$eig USAGE=$usage MEMBER=$member TRIGGER=$trig BYPASSRLS=$byp anon=$anonR auth=$authR"

    # Plattform-Trigger vor dem Einrichtungsweg festhalten.
    $trigVorher = Get-Wert "select string_agg(tgname || ' :: ' || pg_get_triggerdef(oid), ' | ' order by tgname) from pg_trigger where tgrelid = to_regclass('storage.objects') and not tgisinternal;"
    Write-Host "  Plattform-Trigger vorher: $trigVorher"

    Write-Host '=== 4. Basisskript (als tg_projekt) ===' -ForegroundColor Yellow
    $basis = Invoke-Psql -File "$RepoRoot\supabase\setup\testprojekt-einrichtung-ohne-storage-trigger.sql" -User 'tg_projekt'
    $basisAuszug = ($basis -split "`r?`n" | Where-Object { $_ -match 'NOTICE|FEHLER|ERROR|ABBRUCH|UEBERSPRUNGEN|OK:' }) -join "`n"
    Write-Host $basisAuszug
    $basisFehler = ($basis -split "`r?`n" | Where-Object { $_ -match '(ERROR|FEHLER):' } | Select-Object -First 1)
    Add-Befund 'Basisskript laeuft ohne Fehler durch' ([string]::IsNullOrWhiteSpace($basisFehler)) $(if ($basisFehler) { $basisFehler } else { 'kein ERROR in der Ausgabe' })
    Add-Befund 'Basisskript scheitert NICHT an GRANT/REVOKE' ([bool]($basis -match 'UEBERSPRUNGEN: GRANT/REVOKE')) 'GRANT/REVOKE erkannt und uebersprungen statt gescheitert'
    Add-Befund 'Basisskript scheitert NICHT an der Eigentuemerpruefung' ([bool]($basis -match 'UEBERSPRUNGEN: Storage-Policies')) 'Policies erkannt und uebersprungen statt gescheitert'
    $bucket = Get-Wert "select coalesce((select id from storage.buckets where id='employee-documents'),'fehlt');"
    Add-Befund 'Bucket per SQL angelegt' ($bucket -eq 'employee-documents') "storage.buckets: $bucket"
    $tabellen = Get-Wert "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r';"
    Add-Befund 'Schema public eingerichtet' ([int]$tabellen -gt 10) "$tabellen Tabellen"

    Write-Host '=== 5. Trigger-Nachtrag (als tg_projekt) ===' -ForegroundColor Yellow
    $nach = Invoke-Psql -File "$RepoRoot\supabase\setup\storage-trigger-nachtragen.sql" -User 'tg_projekt'
    Write-Host $nach
    $nachFehler = ($nach -split "`r?`n" | Where-Object { $_ -match '(ERROR|FEHLER):' } | Select-Object -First 1)
    Add-Befund 'Trigger-Nachtrag laeuft ohne Fehler durch' ([string]::IsNullOrWhiteSpace($nachFehler)) $(if ($nachFehler) { $nachFehler } else { 'kein ERROR in der Ausgabe' })
    $guard = Get-Wert "select count(*) from pg_trigger where tgrelid=to_regclass('storage.objects') and tgname='storage_objects_guard_delete' and not tgisinternal;"
    Add-Befund 'Trigger-Nachtrag legt storage_objects_guard_delete an' ($guard -eq '1') "Trigger vorhanden: $guard"

    Write-Host '=== 5b. Trigger-Nachtrag ein zweites Mal (Wiederholbarkeit) ===' -ForegroundColor Yellow
    $nach2 = Invoke-Psql -File "$RepoRoot\supabase\setup\storage-trigger-nachtragen.sql" -User 'tg_projekt'
    Write-Host $nach2
    $nach2Fehler = ($nach2 -split "`r?`n" | Where-Object { $_ -match '(ERROR|FEHLER):' } | Select-Object -First 1)
    Add-Befund 'Trigger-Nachtrag ist wiederholbar' ([string]::IsNullOrWhiteSpace($nach2Fehler)) $(if ($nach2Fehler) { $nach2Fehler } else { 'zweiter Lauf ohne Fehler' })

    Write-Host '=== 6. Storage-Policies (Dashboard, als supabase_storage_admin) ===' -ForegroundColor Yellow
    # Die Dashboard-Rolle muss die Namen im Policy-Ausdruck aufloesen koennen.
    # Schema private gehoert der Projektrolle, USAGE darf sie selbst vergeben.
    # Das ist keine Rechteausweitung fuer uns, sondern eine Freigabe nach aussen.
    Invoke-Psql -User 'tg_projekt' -Pre @("grant usage on schema private to supabase_storage_admin;") | Out-Null
    $pol = Invoke-Psql -File "$PSScriptRoot\14_dashboard_policies.sql" -User 'postgres' -Pre @("set role supabase_storage_admin;")
    Write-Host $pol
    $polAnz = Get-Wert "select count(*) from pg_policies where schemaname='storage' and tablename='objects';"
    Add-Befund 'Vier Storage-Policies vorhanden' ($polAnz -eq '4') "Anzahl: $polAnz"
    $polRollen = Get-Wert "select coalesce(string_agg(distinct roles::text,','),'-') from pg_policies where schemaname='storage' and tablename='objects';"
    Add-Befund 'Alle Policies gelten nur fuer authenticated' ($polRollen -eq '{authenticated}') "Rollen: $polRollen"

    Write-Host '=== 7. Plattform-Trigger unveraendert? ===' -ForegroundColor Yellow
    $trigNachher = Get-Wert "select string_agg(tgname || ' :: ' || pg_get_triggerdef(oid), ' | ' order by tgname) from pg_trigger where tgrelid=to_regclass('storage.objects') and not tgisinternal and tgname in ('protect_objects_delete','update_objects_updated_at');"
    Add-Befund 'protect_objects_delete und update_objects_updated_at unveraendert' ($trigNachher -eq $trigVorher) "vorher/nachher gleich: $($trigNachher -eq $trigVorher)"
    $trigAlle = Get-Wert "select string_agg(tgname,', ' order by tgname) from pg_trigger where tgrelid=to_regclass('storage.objects') and not tgisinternal;"
    Add-Befund 'Genau drei Trigger auf storage.objects' ($trigAlle -eq 'protect_objects_delete, storage_objects_guard_delete, update_objects_updated_at') $trigAlle

    Write-Host '=== 8. Testdaten ===' -ForegroundColor Cyan
    Invoke-Psql -File "$RepoRoot\supabase\tests\010_rewards_read_function_guards_seed.sql" -Pre @("set tg.test_env = 'ICH-BESTAETIGE-ISOLIERTE-TESTUMGEBUNG';") -Stop | Out-Null
    Write-Host '  eingespielt.'

    Write-Host '=== 9. Verhaltenstests gegen den Endzustand (12_document_upload_test.sql) ===' -ForegroundColor Green
    $t12 = Invoke-Psql -File "$PSScriptRoot\12_document_upload_test.sql"
    Write-Host $t12
    $fehl = ([regex]::Matches($t12, 'FEHLGESCHLAGEN')).Count
    $best = ([regex]::Matches($t12, 'BESTANDEN')).Count
    Add-Befund 'Dokumenten-Verhaltenstests' ($fehl -eq 0 -and $best -gt 0) "$best bestanden, $fehl fehlgeschlagen"

    Write-Host '=== 10. Anon-Gegenprobe trotz voller Grants ===' -ForegroundColor Green
    $anonSel = Get-Wert "begin; set local role anon; select count(*) from storage.objects; commit;"
    Add-Befund 'anon sieht trotz SELECT-Grant nichts (RLS)' ($anonSel -match '^0$') "sichtbare Zeilen: $anonSel"
    $anonIns = Invoke-Psql -Pre @("begin; set local role anon; insert into storage.objects (bucket_id,name) values ('employee-documents','anon/probe.pdf'); commit;")
    $anonInsZeile = ($anonIns -split "`r?`n" | Where-Object { $_ -match 'ERROR|FEHLER' } | Select-Object -First 1)
    Add-Befund 'anon kann trotz INSERT-Grant nicht schreiben' ([bool]($anonIns -match 'row-level security|permission denied')) $anonInsZeile

    Write-Host '=== 11. Nebenlaeufigkeit, beide Faelle ===' -ForegroundColor Green
    & powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\13_concurrency_run.ps1" -Db $Db
    $nlOk = ($LASTEXITCODE -eq 0)
    Add-Befund 'Nebenlaeufigkeit Fall A und Fall B' $nlOk "Exitcode $LASTEXITCODE"
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
