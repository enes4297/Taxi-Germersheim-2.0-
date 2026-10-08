# =============================================================================
# testerinnerung.ps1 - PostToolUse-Hook fuer Edit und Write
# =============================================================================
#
# Erinnert nach jeder Aenderung an einer SQL-Datei unterhalb von supabase/
# daran, dass der lokale Testlauf noch aussteht.
#
# BEWUSST KEIN Exit 2: Bei PostToolUse wuerde Exit 2 den Assistenten am
# Weiterarbeiten hindern. Fuer eine Erinnerung ist das unangemessen. Exit 0
# mit additionalContext blockiert nichts, geht aber auch nicht unter.
# =============================================================================

$ErrorActionPreference = 'Stop'

try {
  $roh = [Console]::In.ReadToEnd()
  if ([string]::IsNullOrWhiteSpace($roh)) { exit 0 }
  $eingabe = $roh | ConvertFrom-Json
} catch {
  exit 0
}

$pfad = $null
if ($eingabe.tool_input -and $eingabe.tool_input.file_path) {
  $pfad = [string]$eingabe.tool_input.file_path
}
if ([string]::IsNullOrWhiteSpace($pfad)) { exit 0 }

$norm = ($pfad -replace '\\', '/').ToLowerInvariant()

if ($norm -match '(^|/)supabase/' -and $norm.EndsWith('.sql')) {
  $hinweis = @"
Erinnerung zu '$pfad': Der lokale Testlauf steht noch aus.

- Ein Strukturvergleich oder das blosse Lesen der Datei ist KEIN Testlauf.
- Ablauf: portables PostgreSQL auf 127.0.0.1:55432 starten, die Shims aus
  supabase/tests/local/ laden, die nummerierten Testdateien fahren und den
  Server danach wieder stoppen.
- Nichts als 'getestet' berichten, was nicht tatsaechlich gelaufen ist.
- Nicht gegen die Produktivinstanz ausfuehren.
"@

  $antwort = @{
    hookSpecificOutput = @{
      hookEventName     = 'PostToolUse'
      additionalContext = $hinweis
    }
  } | ConvertTo-Json -Depth 5 -Compress

  [Console]::Out.Write($antwort)
}

exit 0
