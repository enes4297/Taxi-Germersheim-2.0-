# cdp-hilfe.ps1
#
# Schmale Steuerung fuer Chrome ueber das DevTools-Protokoll. Kein Node, kein
# Playwright - auf diesem Rechner ist beides nicht vorhanden. Gesprochen wird
# direkt WebSocket mit System.Net.WebSockets.ClientWebSocket.
#
# Wird von 20_portal_ui_test.ps1 per Punkt-Aufruf eingebunden.

$script:CdpSocket  = $null
$script:CdpNextId  = 1
$script:CdpEvents  = New-Object System.Collections.ArrayList
$script:CdpBuf     = New-Object byte[] 262144
$script:CdpSeg     = $null
$script:CdpSb      = New-Object System.Text.StringBuilder
$script:CdpPending = $null

function Start-Chrome {
    param(
        [Parameter(Mandatory = $true)][int]$Port,
        [Parameter(Mandatory = $true)][string]$Profilordner,
        [switch]$Sichtbar
    )
    $pfade = @(
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    )
    $chrome = $pfade | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $chrome) { throw 'Chrome wurde nicht gefunden.' }

    if (-not (Test-Path $Profilordner)) { New-Item -ItemType Directory -Path $Profilordner -Force | Out-Null }

    $argumente = @(
        "--remote-debugging-port=$Port"
        "--user-data-dir=$Profilordner"
        '--no-first-run'
        '--no-default-browser-check'
        '--disable-popup-blocking'
        '--disable-background-networking'
        '--disable-sync'
        '--window-size=1280,1400'
        'about:blank'
    )
    if (-not $Sichtbar) { $argumente = @('--headless=new', '--disable-gpu') + $argumente }

    $vorgang = Start-Process -FilePath $chrome -ArgumentList $argumente -PassThru
    $ziel = (Get-Date).AddSeconds(30)
    while ((Get-Date) -lt $ziel) {
        try {
            $v = Invoke-RestMethod "http://127.0.0.1:$Port/json/version" -TimeoutSec 3
            if ($v.webSocketDebuggerUrl) {
                return [pscustomobject]@{ Prozess = $vorgang; BrowserWs = $v.webSocketDebuggerUrl }
            }
        } catch { Start-Sleep -Milliseconds 400 }
    }
    throw 'Chrome hat den Debug-Anschluss nicht geoeffnet.'
}

function Connect-Cdp([string]$WsUrl) {
    $s = New-Object System.Net.WebSockets.ClientWebSocket
    $s.Options.KeepAliveInterval = [TimeSpan]::FromSeconds(20)
    $t = $s.ConnectAsync([Uri]$WsUrl, [Threading.CancellationToken]::None)
    if (-not $t.Wait(15000)) { throw 'WebSocket-Verbindung zu Chrome fehlgeschlagen.' }
    $script:CdpSocket = $s
    $script:CdpSeg    = New-Object 'System.ArraySegment[byte]' -ArgumentList @(, $script:CdpBuf)
    $script:CdpNextId = 1
    $script:CdpEvents.Clear()
    return $s
}

# Eine vollstaendige Nachricht lesen. Eine abgelaufene Wartezeit laesst den
# laufenden Lesevorgang stehen - Chrome erlaubt nur einen gleichzeitig.
function Read-CdpNachricht([int]$Wartezeit = 2000) {
    while ($true) {
        if ($null -eq $script:CdpPending) {
            $script:CdpPending = $script:CdpSocket.ReceiveAsync($script:CdpSeg, [Threading.CancellationToken]::None)
        }
        if (-not $script:CdpPending.Wait($Wartezeit)) { return $null }
        $r = $script:CdpPending.Result
        $script:CdpPending = $null
        [void]$script:CdpSb.Append([Text.Encoding]::UTF8.GetString($script:CdpBuf, 0, $r.Count))
        if ($r.EndOfMessage) {
            $txt = $script:CdpSb.ToString()
            [void]$script:CdpSb.Clear()
            return $txt
        }
    }
}

function Send-Cdp {
    param(
        [Parameter(Mandatory = $true)][string]$Methode,
        [hashtable]$Parameter = @{},
        [string]$Sitzung = $null,
        [int]$Wartezeit = 30000
    )
    $id = $script:CdpNextId
    $script:CdpNextId++
    $nachricht = @{ id = $id; method = $Methode; params = $Parameter }
    if ($Sitzung) { $nachricht.sessionId = $Sitzung }
    $json  = $nachricht | ConvertTo-Json -Depth 15 -Compress
    $bytes = [Text.Encoding]::UTF8.GetBytes($json)
    $seg   = New-Object 'System.ArraySegment[byte]' -ArgumentList @(, $bytes)
    $st = $script:CdpSocket.SendAsync($seg, [Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None)
    if (-not $st.Wait(10000)) { throw "CDP: Senden von $Methode fehlgeschlagen." }

    $ziel = (Get-Date).AddMilliseconds($Wartezeit)
    while ((Get-Date) -lt $ziel) {
        $txt = Read-CdpNachricht 1500
        if ($null -eq $txt) { continue }
        $o = $txt | ConvertFrom-Json
        if (($o.PSObject.Properties.Name -contains 'id') -and ($o.id -eq $id)) {
            if ($o.PSObject.Properties.Name -contains 'error') { throw "CDP $Methode : $($o.error.message)" }
            return $o.result
        }
        [void]$script:CdpEvents.Add($o)
    }
    throw "CDP: Zeitueberschreitung bei $Methode."
}

# Ereignisse einsammeln, ohne auf eine Antwort zu warten.
function Update-CdpEreignisse([int]$Wartezeit = 200) {
    while ($true) {
        $txt = Read-CdpNachricht $Wartezeit
        if ($null -eq $txt) { return }
        [void]$script:CdpEvents.Add(($txt | ConvertFrom-Json))
    }
}

function Get-CdpEreignisse([string]$Methode) {
    return @($script:CdpEvents | Where-Object { $_.method -eq $Methode })
}

function Clear-CdpEreignisse { $script:CdpEvents.Clear() }

# Eine neue, fuer sich stehende Browsersitzung - eigener Speicher, eigene
# Anmeldung. Ohne das wuerden sich die Konten gegenseitig abmelden.
function New-Browsersitzung([string]$Startadresse = 'about:blank') {
    $kontext = Send-Cdp 'Target.createBrowserContext' @{ disposeOnDetach = $false }
    $ziel    = Send-Cdp 'Target.createTarget' @{ url = $Startadresse; browserContextId = $kontext.browserContextId }
    $anhang  = Send-Cdp 'Target.attachToTarget' @{ targetId = $ziel.targetId; flatten = $true }
    $sid     = $anhang.sessionId
    Send-Cdp 'Page.enable'    @{} $sid | Out-Null
    Send-Cdp 'Runtime.enable' @{} $sid | Out-Null
    Send-Cdp 'Network.enable' @{} $sid | Out-Null
    return [pscustomobject]@{ Sitzung = $sid; Ziel = $ziel.targetId; Kontext = $kontext.browserContextId }
}

function Invoke-Js {
    param(
        [Parameter(Mandatory = $true)][string]$Sitzung,
        [Parameter(Mandatory = $true)][string]$Ausdruck,
        [switch]$Warten,
        [int]$Wartezeit = 30000
    )
    $r = Send-Cdp 'Runtime.evaluate' @{
        expression    = $Ausdruck
        returnByValue = $true
        awaitPromise  = [bool]$Warten
        userGesture   = $true
    } $Sitzung $Wartezeit
    if ($r.exceptionDetails) {
        $m = $r.exceptionDetails.exception.description
        if (-not $m) { $m = $r.exceptionDetails.text }
        throw "JS-Fehler: $m"
    }
    return $r.result.value
}

function Wait-Bedingung {
    param(
        [Parameter(Mandatory = $true)][string]$Sitzung,
        [Parameter(Mandatory = $true)][string]$Ausdruck,
        [int]$Wartezeit = 20000
    )
    $ziel = (Get-Date).AddMilliseconds($Wartezeit)
    while ((Get-Date) -lt $ziel) {
        try {
            $w = Invoke-Js $Sitzung "Boolean($Ausdruck)"
            if ($w -eq $true) { return $true }
        } catch { }
        Start-Sleep -Milliseconds 250
    }
    return $false
}

function Open-Seite {
    param(
        [Parameter(Mandatory = $true)][string]$Sitzung,
        [Parameter(Mandatory = $true)][string]$Adresse,
        [int]$Wartezeit = 30000
    )
    Send-Cdp 'Page.navigate' @{ url = $Adresse } $Sitzung | Out-Null
    return (Wait-Bedingung $Sitzung "document.readyState === 'complete'" $Wartezeit)
}

# Datei in ein <input type=file> legen. Anders als ueber JavaScript entsteht so
# eine echte Dateiauswahl, wie sie der Browser beim Klick erzeugt.
function Set-Dateiauswahl {
    param(
        [Parameter(Mandatory = $true)][string]$Sitzung,
        [Parameter(Mandatory = $true)][string]$Waehler,
        [Parameter(Mandatory = $true)][string]$Dateipfad
    )
    Send-Cdp 'DOM.enable' @{} $Sitzung | Out-Null
    $dok    = Send-Cdp 'DOM.getDocument' @{ depth = 1 } $Sitzung
    $knoten = Send-Cdp 'DOM.querySelector' @{ nodeId = $dok.root.nodeId; selector = $Waehler } $Sitzung
    if (-not $knoten.nodeId) { throw "Dateifeld nicht gefunden: $Waehler" }
    Send-Cdp 'DOM.setFileInputFiles' @{ files = @($Dateipfad); nodeId = $knoten.nodeId } $Sitzung | Out-Null
}
