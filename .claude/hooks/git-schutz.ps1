# =============================================================================
# git-schutz.ps1 - PreToolUse-Hook fuer Bash und PowerShell
# =============================================================================
#
# Sperrt gezielt zerstoerende oder branch-verletzende git-Befehle.
# Lesende Befehle (status, diff, log, branch, show, fetch) bleiben frei.
#
# Gesperrt:
#   immer            git push --force / -f / --force-with-lease / +refspec
#   immer            git push mit Ziel main oder dev
#   immer            Loeschen von main oder dev (branch -d/-D, push --delete, :main)
#   immer            git reset --hard   (auf ALLEN Branches)
#   immer            git clean -f / -fd / -fdx / --force
#   auf main/dev     git push ohne ausdrueckliches Ziel
#   auf main/dev     git commit
#   auf main/dev     git merge, git rebase, git cherry-pick
#
# Zwei Vorverarbeitungsschritte, ohne die es Fehlalarme gaebe:
#   1. Heredoc-Ruempfe werden entfernt. Commit-Nachrichten enthalten oft Woerter
#      wie "main" oder "--force"; der Teil VOR dem Heredoc-Marker bleibt aber
#      erhalten, damit angehaengte Befehle weiterhin geprueft werden.
#   2. Zeichenketten in Anfuehrungszeichen werden entfernt. Damit ist der Text
#      einer Commit-Nachricht fuer die Regeln unsichtbar. Die Commit-Sperre
#      haengt ohnehin am Branch, nicht am Text.
#
# Danach wird an ; && || | und Zeilenumbruechen zerlegt und JEDES Segment
# einzeln geprueft, damit "git add . && git push --force" auffliegt.
#
# GRENZE, ehrlich benannt: Das ist ein Gelaender gegen Versehen, kein Kaefig.
# Umwege ueber Variablen oder Aliase erkennt eine Musterpruefung nicht.
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

$befehl = $null
if ($eingabe.tool_input -and $eingabe.tool_input.command) {
  $befehl = [string]$eingabe.tool_input.command
}
if ([string]::IsNullOrWhiteSpace($befehl)) { exit 0 }

# Frueh aussteigen, wenn gar kein git vorkommt.
if ($befehl -notmatch '(^|[^A-Za-z0-9_-])git([^A-Za-z0-9_-]|$)') { exit 0 }

$cwd = [string]$eingabe.cwd
if ([string]::IsNullOrWhiteSpace($cwd)) { $cwd = (Get-Location).Path }

$branch = ''
try {
  $branch = (& git -C "$cwd" rev-parse --abbrev-ref HEAD 2>$null | Out-String).Trim()
} catch {
  $branch = ''
}
$aufGeschuetztem = ($branch -eq 'main' -or $branch -eq 'dev')

# --- 1) Heredoc-Ruempfe entfernen, Rest der Startzeile behalten --------------
$muster = '<<-?\s*[''"]?(?<d>[A-Za-z_][A-Za-z0-9_]*)[''"]?(?<rest>[^\r\n]*)[\r\n][\s\S]*?[\r\n][ \t]*\k<d>[ \t]*(?=[\r\n]|$)'
$sauber = [regex]::Replace($befehl, $muster, ' ${rest} ')

# --- 2) Zeichenketten in Anfuehrungszeichen entfernen -----------------------
$sauber = [regex]::Replace($sauber, "'[^']*'", ' ')
$sauber = [regex]::Replace($sauber, '"[^"]*"', ' ')

# --- 3) In Segmente zerlegen ------------------------------------------------
$segmente = [regex]::Split($sauber, '(?:&&|\|\||[;\|\r\n])')

foreach ($seg in $segmente) {
  $s = $seg.Trim()
  if ([string]::IsNullOrWhiteSpace($s)) { continue }

  $teile = [regex]::Split($s, '\s+') | Where-Object { $_ -ne '' }
  if ($teile.Count -eq 0) { continue }

  # Position von "git" im Segment finden (auch nach "cd x && ").
  $gitIndex = -1
  for ($i = 0; $i -lt $teile.Count; $i++) {
    if ($teile[$i] -eq 'git' -or $teile[$i] -like '*[\/]git' -or $teile[$i] -eq 'git.exe') {
      $gitIndex = $i; break
    }
  }
  if ($gitIndex -lt 0) { continue }

  # Unterbefehl suchen; dabei globale Schalter wie -C <pfad> und -c <wert>
  # ueberspringen.
  $unter = $null
  $argumente = @()
  $j = $gitIndex + 1
  while ($j -lt $teile.Count) {
    $t = $teile[$j]
    if ($t -cmatch '^-(C|c)$') { $j += 2; continue }
    if ($t.StartsWith('-'))    { $j += 1; continue }
    $unter = $t
    if ($j + 1 -lt $teile.Count) { $argumente = $teile[($j + 1)..($teile.Count - 1)] }
    break
  }
  if (-not $unter) { continue }

  # Alle Schalter des Segments nach dem Unterbefehl, plus die davor.
  $alleArgs = @()
  if ($gitIndex + 1 -lt $teile.Count) { $alleArgs = $teile[($gitIndex + 1)..($teile.Count - 1)] }

  # Hilfsfunktionen -----------------------------------------------------------
  $hatKurzFlagF = ($alleArgs | Where-Object { $_ -cmatch '^-[A-Za-z]*f[A-Za-z]*$' }).Count -gt 0
  $nenntGeschuetzt = ($alleArgs | Where-Object {
      $_ -eq 'main' -or $_ -eq 'dev' -or
      $_ -match ':(main|dev)$' -or $_ -match '^\+?(refs/heads/)?(main|dev)$'
    }).Count -gt 0

  switch -Regex ($unter) {

    '^push$' {
      if (($alleArgs -contains '--force') -or ($alleArgs -contains '--force-with-lease') -or $hatKurzFlagF) {
        Send-Deny ("GESPERRT: Force-Push ist in diesem Projekt ausgeschlossen. Erkannt: '$s'. " +
                   "Kein --force, kein -f und kein --force-with-lease. Ein ueberschriebener " +
                   "Remote-Verlauf laesst sich nicht wiederherstellen.")
      }
      if (($alleArgs | Where-Object { $_ -cmatch '^\+' }).Count -gt 0) {
        Send-Deny ("GESPERRT: Die Plus-Refspec ist ein Force-Push in anderer Schreibweise. Erkannt: '$s'.")
      }
      if (($alleArgs -contains '--delete') -and $nenntGeschuetzt) {
        Send-Deny ("GESPERRT: main und dev duerfen nicht geloescht werden. Erkannt: '$s'.")
      }
      if (($alleArgs | Where-Object { $_ -cmatch '^:(main|dev)$' }).Count -gt 0) {
        Send-Deny ("GESPERRT: ':main' bzw. ':dev' loescht den Branch auf dem Server. Erkannt: '$s'.")
      }
      if ($nenntGeschuetzt) {
        Send-Deny ("GESPERRT: Direktes Pushen nach main oder dev ist ausgeschlossen. Erkannt: '$s'. " +
                   "Aenderungen laufen ueber einen Feature-Branch und eine Freigabe durch den Menschen.")
      }
      if ($aufGeschuetztem) {
        Send-Deny ("GESPERRT: Auf dem Branch '$branch' wird nicht gepusht. Erkannt: '$s'. " +
                   "Bitte auf einem Feature-Branch arbeiten.")
      }
    }

    '^commit$' {
      if ($aufGeschuetztem) {
        Send-Deny ("GESPERRT: Auf dem Branch '$branch' wird nicht committet. Erkannt: '$s'. " +
                   "main und dev sind schreibgeschuetzt; gearbeitet wird auf Feature-Branches.")
      }
    }

    '^(merge|rebase|cherry-pick)$' {
      if ($aufGeschuetztem) {
        Send-Deny ("GESPERRT: '$unter' auf dem Branch '$branch' braucht die ausdrueckliche " +
                   "Freigabe des Menschen und wird hier nicht automatisch ausgefuehrt. Erkannt: '$s'. " +
                   "Bewusst ohne Hintertuer: eine vom Assistenten selbst setzbare Ausnahme waere " +
                   "kein Schutz.")
      }
    }

    '^reset$' {
      if ($alleArgs -contains '--hard') {
        Send-Deny ("GESPERRT: 'git reset --hard' verwirft nicht gesicherte Aenderungen " +
                   "unwiederbringlich - auf allen Branches. Erkannt: '$s'. " +
                   "Nutze 'git stash' oder einen weichen Reset.")
      }
    }

    '^clean$' {
      if (($alleArgs -contains '--force') -or $hatKurzFlagF) {
        Send-Deny ("GESPERRT: 'git clean' mit Zwang loescht unversionierte Dateien " +
                   "unwiederbringlich. Erkannt: '$s'. Pruefe stattdessen zuerst mit " +
                   "'git clean -nd', was betroffen waere.")
      }
    }

    '^branch$' {
      $loescht = ($alleArgs | Where-Object { $_ -ceq '-d' -or $_ -ceq '-D' -or $_ -eq '--delete' }).Count -gt 0
      if ($loescht -and $nenntGeschuetzt) {
        Send-Deny ("GESPERRT: main und dev duerfen nicht geloescht werden. Erkannt: '$s'.")
      }
    }
  }
}

exit 0
