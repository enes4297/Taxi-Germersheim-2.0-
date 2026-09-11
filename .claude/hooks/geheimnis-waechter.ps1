# =============================================================================
# geheimnis-waechter.ps1 - PreToolUse-Hook fuer Edit und Write
# =============================================================================
#
# Verhindert, dass ein echtes Geheimnis in eine Projektdatei geschrieben wird.
#
# Geprueft werden ALLE Zeichenkettenwerte in tool_input, nicht nur ein
# bestimmtes Feld. So ist es gleichgueltig, ob der Inhalt unter "content"
# (Write) oder "new_string" (Edit) steht.
#
# Gesperrt:
#   sb_secret_...                      Supabase Secret Key (neues Format)
#   JWT mit "service_role" im Rumpf    Supabase Service-Role-Key (Altformat)
#   -----BEGIN ... PRIVATE KEY-----    privater Schluessel
#   ghp_... / github_pat_...           GitHub-Token
#
# AUSDRUECKLICH ERLAUBT:
#   sb_publishable_...                 oeffentlicher Schluessel
#   JWT mit "anon" im Rumpf            oeffentlicher Anon-Key
# Ein Publishable- bzw. Anon-Key ist allein kein Geheimnis. Deshalb wird der
# JWT-Rumpf tatsaechlich dekodiert, statt blind auf "eyJ" zu reagieren.
#
# BEWUSST KEIN allgemeines Passwort-Muster: Das wuerde die projekteigenen
# Testskripte treffen (etwa PGPASSWORD='tgtestlocal' in
# supabase/tests/local/13_concurrency_run.ps1) und waere reiner Laerm.
# =============================================================================

$ErrorActionPreference = 'Stop'

function Send-Deny([string]$Grund) {
  $antwort = @{
    hookSpecificOutput = @{
      hookEventName            = 'PreToolUse'
      permissionDecision       = 'deny'
      permissionDecisionReason = $Grund
    }
  } | ConvertTo-Json -Depth 5 -Compress
  [Console]::Out.Write($antwort)
  exit 2
}

try {
  $roh = [Console]::In.ReadToEnd()
  if ([string]::IsNullOrWhiteSpace($roh)) { exit 0 }
  $eingabe = $roh | ConvertFrom-Json
} catch {
  exit 0
}

if (-not $eingabe.tool_input) { exit 0 }

# --- Alle Zeichenketten aus tool_input einsammeln ---------------------------
$texte = New-Object System.Collections.Generic.List[string]

function Add-Strings($wert, [int]$tiefe) {
  if ($tiefe -gt 8 -or $null -eq $wert) { return }
  if ($wert -is [string]) { $texte.Add($wert); return }
  if ($wert -is [System.Collections.IEnumerable] -and -not ($wert -is [string])) {
    foreach ($e in $wert) { Add-Strings $e ($tiefe + 1) }
    return
  }
  if ($wert -is [psobject]) {
    foreach ($p in $wert.PSObject.Properties) { Add-Strings $p.Value ($tiefe + 1) }
  }
}

Add-Strings $eingabe.tool_input 0
if ($texte.Count -eq 0) { exit 0 }
$inhalt = [string]::Join("`n", $texte)

# --- 1) Supabase Secret Key (neues Format) ----------------------------------
if ($inhalt -cmatch 'sb_secret_[A-Za-z0-9_\-]{8,}') {
  Send-Deny ("GESPERRT: Der Inhalt enthaelt einen Supabase Secret Key (sb_secret_...). " +
             "Geheime Schluessel gehoeren nicht in Projektdateien und niemals in den Browser. " +
             "Ein oeffentlicher Publishable Key (sb_publishable_...) waere zulaessig.")
}

# --- 2) JWT mit service_role im Rumpf ---------------------------------------
$jwts = [regex]::Matches($inhalt, '\beyJ[A-Za-z0-9_\-]{5,}\.(?<rumpf>[A-Za-z0-9_\-]{10,})\.[A-Za-z0-9_\-]{5,}')
foreach ($m in $jwts) {
  $rumpf = $m.Groups['rumpf'].Value
  $klartext = ''
  try {
    $b64 = $rumpf.Replace('-', '+').Replace('_', '/')
    switch ($b64.Length % 4) { 2 { $b64 += '==' } 3 { $b64 += '=' } 1 { $b64 = '' } }
    if ($b64) { $klartext = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b64)) }
  } catch {
    $klartext = ''
  }

  if ($klartext -match 'service_role') {
    Send-Deny ("GESPERRT: Der Inhalt enthaelt ein JWT, dessen Rumpf die Rolle 'service_role' " +
               "ausweist - also einen Supabase Service-Role-Key. Der umgeht saemtliche " +
               "RLS-Regeln und darf weder in eine Datei noch in den Browser. " +
               "Ein Anon-Key waere zulaessig.")
  }
}

# --- 3) Privater Schluessel --------------------------------------------------
if ($inhalt -cmatch '-----BEGIN [A-Z ]*PRIVATE KEY-----') {
  Send-Deny ("GESPERRT: Der Inhalt enthaelt einen privaten Schluessel " +
             "(-----BEGIN ... PRIVATE KEY-----). Der gehoert nicht ins Projektverzeichnis.")
}

# --- 4) GitHub-Token ---------------------------------------------------------
if ($inhalt -cmatch '\bghp_[A-Za-z0-9]{30,}' -or $inhalt -cmatch '\bgithub_pat_[A-Za-z0-9_]{20,}') {
  Send-Deny ("GESPERRT: Der Inhalt enthaelt ein GitHub-Zugriffstoken. " +
             "Tokens gehoeren in die Anmeldeverwaltung, nicht in eine Projektdatei.")
}

exit 0
