# 13_concurrency_run.ps1
#
# Gezielter Nebenlaeufigkeitstest ueber ZWEI echte Datenbankverbindungen.
# Kein Lasttest - es wird genau eine Verschraenkung erzwungen.
#
# Geprueft wird das Zusammenspiel aus Migration 011:
#   Fall A: Loeschen beginnt zuerst -> das gleichzeitige Verknuepfen muss
#           scheitern (DOCUMENT_FILE_NOT_FOUND), keine haengende Referenz.
#   Fall B: Verknuepfen beginnt zuerst -> das gleichzeitige Loeschen darf
#           die Datei NICHT entfernen.
#
# GRENZE: Getestet wird ausschliesslich die Datenbankseite. Die echte
# Supabase-Storage-API ist lokal nicht verfuegbar; das Entfernen der Datei
# im Objektspeicher ist damit NICHT abgedeckt.
#
# Aufruf:  powershell -File 13_concurrency_run.ps1

param([string]$Db = 'tgtest')

$ErrorActionPreference = 'Stop'
$PgBin = "$env:USERPROFILE\pgtest-tg\pgsql\bin"
$env:PGPASSWORD = 'tgtestlocal'
$Conn = @('-h', '127.0.0.1', '-p', '55432', '-U', 'postgres', '-d', $Db)
$Here = $PSScriptRoot

function Invoke-Sql([string]$Sql) {
    & "$PgBin\psql.exe" @Conn -q -t -A -c $Sql 2>&1 | Out-String
}

Write-Host '=== Vorbereitung ===' -ForegroundColor Cyan
& "$PgBin\psql.exe" @Conn -q -f "$Here\13_concurrency_setup.sql" | Out-Null
$ids   = (Invoke-Sql "select (select auth_user_id from tg_test.identities where schluessel='mitarbeiter')::text || '|' || (select p.employee_id from public.profiles p join tg_test.identities i on i.auth_user_id=p.auth_user_id where i.schluessel='mitarbeiter')::text;").Trim()
$maUid = $ids.Split('|')[0]
$maEmp = $ids.Split('|')[1]
Write-Host "  Mitarbeiter: $maUid"

$jwt = "{""sub"":""$maUid"",""role"":""authenticated""}"

function New-SqlFile([string]$Name, [string]$Body) {
    $p = Join-Path $env:TEMP $Name
    Set-Content -Path $p -Value $Body -Encoding utf8
    return $p
}

function Start-Psql([string]$File) {
    $out = Join-Path $env:TEMP ([IO.Path]::GetFileNameWithoutExtension($File) + '.out')
    $p = Start-Process -FilePath "$PgBin\psql.exe" `
        -ArgumentList (@('-h','127.0.0.1','-p','55432','-U','postgres','-d',$Db,'-v','ON_ERROR_STOP=0','-f',$File)) `
        -NoNewWindow -PassThru -RedirectStandardOutput $out -RedirectStandardError "$out.err"
    return @{ Proc = $p; Out = $out }
}

# ---------------------------------------------------------------------------
# Fall A: Loeschen zuerst, Verknuepfen faellt hinein
# ---------------------------------------------------------------------------
Write-Host '=== Fall A: Loeschen beginnt zuerst ===' -ForegroundColor Yellow
$pfadA = "$maUid/2099/testdata-013-fall-a.pdf"

$a1 = New-SqlFile 'tg13_a_delete.sql' @"
begin;
select set_config('role','authenticated',true);
select set_config('request.jwt.claims','$jwt',true);
delete from storage.objects where bucket_id='employee-documents' and name='$pfadA';
select 'A: geloeschte Zeilen=' || (select count(*) from storage.objects where name='$pfadA' and bucket_id='employee-documents');
select pg_sleep(3);
commit;
"@

$a2 = New-SqlFile 'tg13_a_link.sql' @"
select pg_sleep(1);
begin;
select set_config('role','authenticated',true);
select set_config('request.jwt.claims','$jwt',true);
insert into public.document_submissions (employee_id, file_path, file_name, mime_type, status, note)
values ('$maEmp', '$pfadA', 'a.pdf', 'application/pdf', 'submitted', 'TESTDATA-013 fall a');
commit;
"@

$jobA1 = Start-Psql $a1
$jobA2 = Start-Psql $a2
$jobA1.Proc.WaitForExit(30000) | Out-Null
$jobA2.Proc.WaitForExit(30000) | Out-Null

$outA1 = (Get-Content $jobA1.Out -Raw) + (Get-Content "$($jobA1.Out).err" -Raw -ErrorAction SilentlyContinue)
$outA2 = (Get-Content $jobA2.Out -Raw) + (Get-Content "$($jobA2.Out).err" -Raw -ErrorAction SilentlyContinue)

$aVerknuepft = [int](Invoke-Sql "select count(*) from public.document_submissions where note='TESTDATA-013 fall a';").Trim()
$aDatei      = [int](Invoke-Sql "select count(*) from storage.objects where name='$pfadA';").Trim()
$aBlockiert  = $outA2 -match 'DOCUMENT_FILE_NOT_FOUND'

Write-Host "  Verbindung B meldete DOCUMENT_FILE_NOT_FOUND: $aBlockiert"
Write-Host "  Verknuepfungen in der Datenbank: $aVerknuepft (erwartet 0)"
Write-Host "  Datei noch vorhanden: $aDatei (erwartet 0)"
$fallA = ($aBlockiert -and $aVerknuepft -eq 0 -and $aDatei -eq 0)
Write-Host "  FALL A: $(if ($fallA) {'BESTANDEN'} else {'FEHLGESCHLAGEN'})" -ForegroundColor $(if ($fallA) {'Green'} else {'Red'})

# ---------------------------------------------------------------------------
# Fall B: Verknuepfen zuerst, Loeschen faellt hinein
# ---------------------------------------------------------------------------
Write-Host '=== Fall B: Verknuepfen beginnt zuerst ===' -ForegroundColor Yellow
$pfadB = "$maUid/2099/testdata-013-fall-b.pdf"

$b1 = New-SqlFile 'tg13_b_link.sql' @"
begin;
select set_config('role','authenticated',true);
select set_config('request.jwt.claims','$jwt',true);
insert into public.document_submissions (employee_id, file_path, file_name, mime_type, status, note)
values ('$maEmp', '$pfadB', 'b.pdf', 'application/pdf', 'submitted', 'TESTDATA-013 fall b');
select pg_sleep(3);
commit;
"@

$b2 = New-SqlFile 'tg13_b_delete.sql' @"
select pg_sleep(1);
begin;
select set_config('role','authenticated',true);
select set_config('request.jwt.claims','$jwt',true);
delete from storage.objects where bucket_id='employee-documents' and name='$pfadB';
commit;
"@

$jobB1 = Start-Psql $b1
$jobB2 = Start-Psql $b2
$jobB1.Proc.WaitForExit(30000) | Out-Null
$jobB2.Proc.WaitForExit(30000) | Out-Null

$outB2 = (Get-Content $jobB2.Out -Raw) + (Get-Content "$($jobB2.Out).err" -Raw -ErrorAction SilentlyContinue)

$bVerknuepft = [int](Invoke-Sql "select count(*) from public.document_submissions where note='TESTDATA-013 fall b';").Trim()
$bDatei      = [int](Invoke-Sql "select count(*) from storage.objects where name='$pfadB';").Trim()

Write-Host "  Verknuepfungen in der Datenbank: $bVerknuepft (erwartet 1)"
Write-Host "  Datei noch vorhanden: $bDatei (erwartet 1)"
if ($outB2 -match 'ALREADY_LINKED') { Write-Host '  Loeschversuch meldete DOCUMENT_ALREADY_LINKED' }
$fallB = ($bVerknuepft -eq 1 -and $bDatei -eq 1)
Write-Host "  FALL B: $(if ($fallB) {'BESTANDEN'} else {'FEHLGESCHLAGEN'})" -ForegroundColor $(if ($fallB) {'Green'} else {'Red'})

# ---------------------------------------------------------------------------
Write-Host '=== Aufraeumen ===' -ForegroundColor Cyan
Invoke-Sql "delete from public.document_submissions where note like 'TESTDATA-013%'; delete from storage.objects where name like '%testdata-013%';" | Out-Null

Write-Host ''
if ($fallA -and $fallB) {
    Write-Host 'NEBENLAEUFIGKEIT: BEIDE FAELLE BESTANDEN' -ForegroundColor Green
    exit 0
} else {
    Write-Host 'NEBENLAEUFIGKEIT: FEHLGESCHLAGEN' -ForegroundColor Red
    exit 1
}
