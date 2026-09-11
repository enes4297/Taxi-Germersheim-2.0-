# =============================================================================
# pfadschutz.ps1 - PreToolUse-Hook fuer Edit und Write
# =============================================================================
#
# Drei Sperren, in dieser Reihenfolge geprueft:
#
#   A) Schreibsperre auf main und dev
#      Auf diesen Branches wird nicht gearbeitet. Lesen, Suchen und alle
#      git-Abfragen bleiben erlaubt - der Hook greift nur bei Edit und Write.
#
#   B) Claude-Konfiguration
#      .claude/settings.json und alles unter .claude/hooks/ sind gesperrt.
#      Sonst koennte der Assistent seine eigenen Schutzregeln abschalten.
#      Eine Lockerung laeuft ausdruecklich ueber den Menschen.
#
#   C) Bestehende Migrationen
#      Vorhandene Dateien unter supabase/migrations/ sind unveraenderlich.
#      NEUE Dateien in demselben Ordner bleiben erlaubt - neue Migrationen
#      sollen ja entstehen.
#
# Ausgabe bei Treffer: permissionDecision "deny" plus Exit 2.
# Sonst Exit 0 ohne Entscheidung; der normale Berechtigungsablauf gilt.
#
# Meldungen bewusst ohne Umlaute, damit die Konsolenkodierung sie nicht
# zerlegt - dieselbe Schreibweise wie in den SQL-Kommentaren des Projekts.
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
  # Unlesbare Eingabe darf nicht blockieren, aber auch nichts durchwinken.
  exit 0
}

$pfad = $null
if ($eingabe.tool_input -and $eingabe.tool_input.file_path) {
  $pfad = [string]$eingabe.tool_input.file_path
}
if ([string]::IsNullOrWhiteSpace($pfad)) { exit 0 }

$cwd = [string]$eingabe.cwd
if ([string]::IsNullOrWhiteSpace($cwd)) { $cwd = (Get-Location).Path }

# --- A) Schreibsperre auf main und dev --------------------------------------
$branch = ''
try {
  $branch = (& git -C "$cwd" rev-parse --abbrev-ref HEAD 2>$null | Out-String).Trim()
} catch {
  $branch = ''
}

if ($branch -eq 'main' -or $branch -eq 'dev') {
  Send-Deny ("GESPERRT: Auf dem Branch '$branch' wird nicht geschrieben. " +
             "main und dev sind schreibgeschuetzt - Analysieren, Lesen und Suchen " +
             "sind erlaubt, Aendern nicht. Bitte auf einen Feature-Branch wechseln " +
             "(z. B. 'git switch feature/...') oder den Menschen fragen.")
}

# --- Pfad vereinheitlichen --------------------------------------------------
# Rueckwaerts-Schraegstriche angleichen, damit die Vergleiche unabhaengig von
# der Schreibweise greifen.
$norm = $pfad -replace '\\', '/'
$normKlein = $norm.ToLowerInvariant()

# --- B) Claude-Konfiguration ------------------------------------------------
if ($normKlein -match '(^|/)\.claude/hooks/' -or
    $normKlein -match '(^|/)\.claude/settings\.json$') {
  Send-Deny ("GESPERRT: '$pfad' gehoert zur Schutzkonfiguration von Claude Code " +
             "(.claude/settings.json und .claude/hooks/). Diese Dateien darf der " +
             "Assistent nicht selbst aendern, sonst waeren die Schutzregeln wertlos. " +
             "Aenderungen daran bitte vom Menschen vornehmen lassen.")
}

# --- C) Bestehende Migrationen ----------------------------------------------
if ($normKlein -match '(^|/)supabase/migrations/') {
  $existiert = $false
  try { $existiert = Test-Path -LiteralPath $pfad -PathType Leaf } catch { $existiert = $false }

  if ($existiert) {
    Send-Deny ("GESPERRT: '$pfad' ist eine bereits vorhandene Migration. " +
               "Bestehende Migrationen werden in diesem Projekt nie veraendert. " +
               "Lege stattdessen eine neue, fortlaufend nummerierte Migration an. " +
               "Neue Dateien in supabase/migrations/ sind erlaubt.")
  }
}

exit 0
