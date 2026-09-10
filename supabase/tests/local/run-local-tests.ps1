# run-local-tests.ps1
#
# Richtet eine lokale, isolierte PostgreSQL-Testdatenbank ein und fuehrt die
# Berechtigungstests zu Migration 010 vor und nach dem Einspielen aus.
#
# NUR LOKAL. Es wird ausschliesslich 127.0.0.1 verwendet. Es wird kein
# Windows-Dienst eingerichtet und keine Firewall-Freigabe angelegt.
# Es besteht zu keinem Zeitpunkt eine Verbindung zur Produktivdatenbank.
#
# Voraussetzung: portable PostgreSQL-Binaries unter $PgRoot.
# Bezug (offizielle Anbieterquelle EnterpriseDB):
#   https://get.enterprisedb.com/postgresql/postgresql-17.6-1-windows-x64-binaries.zip
#   entpacken nach %USERPROFILE%\pgtest-tg  (ergibt %USERPROFILE%\pgtest-tg\pgsql)
#
# Aufruf:  powershell -File run-local-tests.ps1

$ErrorActionPreference = 'Stop'

$PgRoot   = "$env:USERPROFILE\pgtest-tg"
$PgBin    = "$PgRoot\pgsql\bin"
$PgData   = "$PgRoot\data"
$PgPort   = 55432
$PgLog    = "$PgRoot\server.log"
$Db       = 'tgtest'
$RepoRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))

# Wegwerf-Passwort einer rein lokalen Testinstanz.
$env:PGPASSWORD = 'tgtestlocal'

function Invoke-Psql {
    param([string]$File, [string[]]$Pre = @(), [switch]$Quiet)
    $args = @('-h','127.0.0.1','-p',$PgPort,'-U','postgres','-d',$Db,'-v','ON_ERROR_STOP=1','-P','pager=off')
    if ($Quiet) { $args += '-q' }
    foreach ($c in $Pre) { $args += @('-c', $c) }
    if ($File) { $args += @('-f', $File) }
    & "$PgBin\psql.exe" @args 2>&1 | Out-String
}

Write-Host '=== 1. Cluster vorbereiten ===' -ForegroundColor Cyan
if (-not (Test-Path "$PgData\PG_VERSION")) {
    $pw = "$PgRoot\pw.txt"
    Set-Content -Path $pw -Value 'tgtestlocal' -Encoding ascii -NoNewline
    & "$PgBin\initdb.exe" -D $PgData -U postgres --pwfile=$pw --encoding=UTF8 --locale=C | Out-Null
    Add-Content -Path "$PgData\postgresql.conf" -Value "`nlisten_addresses = '127.0.0.1'`nport = $PgPort`nunix_socket_directories = ''`n"
    Write-Host '  Cluster angelegt.'
} else {
    Write-Host '  Cluster vorhanden.'
}

Write-Host '=== 2. Server starten (127.0.0.1) ===' -ForegroundColor Cyan
$running = (Test-NetConnection -ComputerName 127.0.0.1 -Port $PgPort -WarningAction SilentlyContinue).TcpTestSucceeded
if (-not $running) {
    Start-Process -FilePath "$PgBin\pg_ctl.exe" -ArgumentList @('-D', $PgData, '-l', $PgLog, 'start') -NoNewWindow
    Start-Sleep -Seconds 5
}
Write-Host "  Port $PgPort erreichbar: $((Test-NetConnection -ComputerName 127.0.0.1 -Port $PgPort -WarningAction SilentlyContinue).TcpTestSucceeded)"

Write-Host '=== 3. Datenbank neu aufsetzen ===' -ForegroundColor Cyan
& "$PgBin\psql.exe" -h 127.0.0.1 -p $PgPort -U postgres -d postgres -q -c "drop database if exists $Db;" -c "create database $Db;" 2>&1 | Out-Null

Write-Host '=== 4. Supabase-Shim ===' -ForegroundColor Cyan
Invoke-Psql -File "$PSScriptRoot\00_supabase_shim.sql" -Quiet | Out-Null
Write-Host '  eingespielt.'

Write-Host '=== 5. Migrationen 001-009 ===' -ForegroundColor Cyan
$mig = @('001_schema','002_rls_policies','003_rewards_backend','004_rewards_status_guard',
         '005_rewards_birthday_bonus','006_rewards_vouchers','007_rewards_wheel',
         '008_rewards_yumaks_fulfillment_guard','009_customer_auth_rewards_access')
foreach ($m in $mig) {
    Invoke-Psql -File "$RepoRoot\supabase\migrations\$m.sql" -Quiet | Out-Null
    Write-Host "  OK  $m"
}

Write-Host '=== 6. Testdaten ===' -ForegroundColor Cyan
Invoke-Psql -File "$RepoRoot\supabase\tests\010_rewards_read_function_guards_seed.sql" `
            -Pre @("set tg.test_env = 'ICH-BESTAETIGE-ISOLIERTE-TESTUMGEBUNG';") -Quiet | Out-Null
Write-Host '  eingespielt.'

Write-Host '=== 7. Tests VOR Migration 010 ===' -ForegroundColor Yellow
Invoke-Psql -File "$RepoRoot\supabase\tests\010_rewards_read_function_guards_test.sql" -Quiet | Write-Host

Write-Host '=== 8. Migration 010 einspielen ===' -ForegroundColor Cyan
Invoke-Psql -File "$RepoRoot\supabase\migrations\010_rewards_read_function_guards.sql" -Quiet | Out-Null
Write-Host '  eingespielt.'

Write-Host '=== 9. Tests NACH Migration 010 ===' -ForegroundColor Green
Invoke-Psql -File "$RepoRoot\supabase\tests\010_rewards_read_function_guards_test.sql" -Quiet | Write-Host

Write-Host '=== 10. Server stoppen ===' -ForegroundColor Cyan
& "$PgBin\pg_ctl.exe" -D $PgData -m fast stop 2>&1 | Out-Null
Write-Host '  gestoppt.'
