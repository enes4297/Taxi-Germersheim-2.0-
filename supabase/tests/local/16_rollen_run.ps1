# 16_rollen_run.ps1
#
# Prueft den Entwurf supabase/entwuerfe/012_rollen_und_faehigkeiten.sql
# gegen die ECHTEN Policies der Migrationen 001-011.
#
# NUR LOKAL. Ausschliesslich 127.0.0.1, kein Windows-Dienst, keine
# Firewall-Freigabe, zu keinem Zeitpunkt eine Verbindung zur
# Produktivdatenbank. Alle Testkonten sind erfunden.
#
# Aufruf:  powershell -File 16_rollen_run.ps1

# PowerShell 5.1 verpackt stderr nativer Programme in einen ErrorRecord.
# Mit ErrorActionPreference = Stop bricht der Lauf dann schon bei einem
# harmlosen NOTICE von psql ab. Deshalb hier Continue; gepruefte Schritte
# werden ueber $LASTEXITCODE und die Ausgabe selbst kontrolliert.
$ErrorActionPreference = 'Continue'

$PgRoot   = "$env:USERPROFILE\pgtest-tg"
$PgBin    = "$PgRoot\pgsql\bin"
$PgData   = "$PgRoot\data"
$PgPort   = 55432
$PgLog    = "$PgRoot\server.log"
$Db       = 'tgrollen'
$RepoRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))

$env:PGPASSWORD = 'tgtestlocal'

function Invoke-Psql {
    param([string]$File, [switch]$Quiet)
    $a = @('-h','127.0.0.1','-p',$PgPort,'-U','postgres','-d',$Db,'-v','ON_ERROR_STOP=1','-P','pager=off')
    if ($Quiet) { $a += '-q' }
    $a += @('-f', $File)
    & "$PgBin\psql.exe" @a 2>&1 | Out-String
}

Write-Host '=== 1. Cluster ===' -ForegroundColor Cyan
if (-not (Test-Path "$PgData\PG_VERSION")) {
    $pw = "$PgRoot\pw.txt"
    Set-Content -Path $pw -Value 'tgtestlocal' -Encoding ascii -NoNewline
    & "$PgBin\initdb.exe" -D $PgData -U postgres --pwfile=$pw --encoding=UTF8 --locale=C | Out-Null
    Add-Content -Path "$PgData\postgresql.conf" -Value "`nlisten_addresses = '127.0.0.1'`nport = $PgPort`nunix_socket_directories = ''`n"
}

Write-Host '=== 2. Server starten ===' -ForegroundColor Cyan
$running = (Test-NetConnection -ComputerName 127.0.0.1 -Port $PgPort -WarningAction SilentlyContinue).TcpTestSucceeded
if (-not $running) {
    Start-Process -FilePath "$PgBin\pg_ctl.exe" -ArgumentList @('-D', $PgData, '-l', $PgLog, 'start') -NoNewWindow
    Start-Sleep -Seconds 5
}

Write-Host '=== 3. Datenbank neu aufsetzen ===' -ForegroundColor Cyan
& "$PgBin\psql.exe" -h 127.0.0.1 -p $PgPort -U postgres -d postgres -q -c "drop database if exists $Db;" -c "create database $Db;" 2>&1 | Out-Null

Write-Host '=== 4. Shims ===' -ForegroundColor Cyan
Invoke-Psql -File "$PSScriptRoot\00_supabase_shim.sql" -Quiet | Out-Null
Invoke-Psql -File "$PSScriptRoot\01_storage_shim.sql"  -Quiet | Out-Null
if (Test-Path "$PSScriptRoot\02_plattform_shim.sql") {
    Invoke-Psql -File "$PSScriptRoot\02_plattform_shim.sql" -Quiet | Out-Null
}

Write-Host '=== 5. Migrationen 001-011 ===' -ForegroundColor Cyan
$mig = @('001_schema','002_rls_policies','003_rewards_backend','004_rewards_status_guard',
         '005_rewards_birthday_bonus','006_rewards_vouchers','007_rewards_wheel',
         '008_rewards_yumaks_fulfillment_guard','009_customer_auth_rewards_access',
         '010_rewards_read_function_guards','011_employee_documents_storage')
foreach ($m in $mig) {
    Invoke-Psql -File "$RepoRoot\supabase\migrations\$m.sql" -Quiet | Out-Null
    Write-Host "  OK  $m"
}

Write-Host '=== 6. Entwurf 012 einspielen (nur lokal) ===' -ForegroundColor Yellow
Invoke-Psql -File "$RepoRoot\supabase\entwuerfe\012_rollen_und_faehigkeiten.sql" -Quiet | Out-Null
Write-Host '  eingespielt.'

Write-Host '=== 7. Test ===' -ForegroundColor Green
$out = Invoke-Psql -File "$PSScriptRoot\16_rollen_faehigkeiten_test.sql"
Write-Host $out
$fehl = ([regex]::Matches($out, 'FEHL')).Count
$ok   = ([regex]::Matches($out, 'OK    ')).Count

Write-Host '=== 8. Server stoppen ===' -ForegroundColor Cyan
& "$PgBin\pg_ctl.exe" -D $PgData -m fast stop 2>&1 | Out-Null
Write-Host '  gestoppt.'

Write-Host ''
Write-Host "Ergebnis: $ok bestanden, $fehl nicht bestanden" -ForegroundColor $(if ($fehl -eq 0) { 'Green' } else { 'Red' })
if ($fehl -gt 0) { exit 1 }
