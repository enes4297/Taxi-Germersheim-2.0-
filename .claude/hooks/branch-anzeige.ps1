# =============================================================================
# branch-anzeige.ps1 - SessionStart-Hook
# =============================================================================
#
# Zeigt zu Sitzungsbeginn den aktuellen Branch und die Zahl offener
# Aenderungen. Steht der Branch auf main oder dev, folgt ein deutlicher
# Warnhinweis.
#
# WICHTIG: Dieses Skript endet IMMER mit Exit 0. Bei SessionStart wuerde
# Exit 2 die Sitzung gar nicht erst starten lassen - das darf ein reiner
# Anzeige-Hook niemals ausloesen. Deshalb faengt es jeden Fehler ab.
# =============================================================================

try {
  $roh = [Console]::In.ReadToEnd()
  $cwd = $null
  if (-not [string]::IsNullOrWhiteSpace($roh)) {
    try { $cwd = [string]($roh | ConvertFrom-Json).cwd } catch { $cwd = $null }
  }
  if ([string]::IsNullOrWhiteSpace($cwd)) { $cwd = (Get-Location).Path }

  $branch = (& git -C "$cwd" rev-parse --abbrev-ref HEAD 2>$null | Out-String).Trim()
  if ([string]::IsNullOrWhiteSpace($branch)) {
    Write-Output "Git-Status: nicht ermittelbar (kein Repository oder git nicht verfuegbar)."
    exit 0
  }

  $status = (& git -C "$cwd" status --porcelain 2>$null | Out-String)
  $offen = 0
  if (-not [string]::IsNullOrWhiteSpace($status)) {
    $offen = ($status -split "`n" | Where-Object { $_.Trim() -ne '' }).Count
  }

  $zeilen = New-Object System.Collections.Generic.List[string]
  $zeilen.Add("Aktueller Branch: $branch")
  $zeilen.Add("Offene Aenderungen im Arbeitsverzeichnis: $offen")

  if ($branch -eq 'main' -or $branch -eq 'dev') {
    $zeilen.Add("")
    $zeilen.Add("ACHTUNG: '$branch' ist schreibgeschuetzt.")
    $zeilen.Add("Analysieren, Lesen und Suchen sind erlaubt. Edit, Write, Commit,")
    $zeilen.Add("Push und Merge werden auf diesem Branch von den Hooks gesperrt.")
    $zeilen.Add("Fuer Aenderungen zuerst auf einen Feature-Branch wechseln.")
  } elseif ($branch -eq 'HEAD') {
    $zeilen.Add("")
    $zeilen.Add("Hinweis: losgeloester HEAD. Commits haengen hier an keinem Branch.")
  }

  Write-Output ([string]::Join([Environment]::NewLine, $zeilen))
} catch {
  Write-Output "Git-Status: nicht ermittelbar."
}

exit 0
