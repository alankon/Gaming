param(
  [Parameter(Position=0)]
  [ValidateSet("start","stop","status","restart","kill","quit","exit")]
  [string]$Command = "status"
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$PidFile = Join-Path $Root ".gaming-server.pid"
$PortFile = Join-Path $Root ".gaming-server.port"
$LogOut = Join-Path $Root "flask.out.log"
$LogErr = Join-Path $Root "flask.err.log"

function Get-TrackedPid {
  if (!(Test-Path $PidFile)) { return $null }
  $raw = (Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
  if ($raw -match '^\d+$') { return [int]$raw }
  return $null
}

function Get-TrackedPort {
  if (!(Test-Path $PortFile)) { return $null }
  $raw = (Get-Content $PortFile -ErrorAction SilentlyContinue | Select-Object -First 1)
  if ($raw -match '^5\d{3}$') { return [int]$raw }
  return $null
}

function Is-ProcessRunning([int]$ProcId) {
  if ($ProcId -le 0) { return $false }
  try {
    Get-Process -Id $ProcId -ErrorAction Stop | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Is-PortBusy([int]$Port) {
  $busy = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
  return $null -ne $busy
}

function Find-FreePort {
  for ($p = 5000; $p -le 5999; $p++) {
    if (-not (Is-PortBusy -Port $p)) {
      return $p
    }
  }
  throw "No free port found in range 5000-5999"
}

function Wait-ForPort([int]$Port) {
  for ($i = 0; $i -lt 25; $i++) {
    if (Is-PortBusy -Port $Port) { return $true }
    Start-Sleep -Milliseconds 200
  }
  return $false
}

function Start-Server {
  $trackedPid = Get-TrackedPid
  if ($trackedPid -and (Is-ProcessRunning -ProcId $trackedPid)) {
    $port = Get-TrackedPort
    if ($port) {
      Write-Output "Server already running with PID $trackedPid on port $port"
    } else {
      Write-Output "Server already running with PID $trackedPid"
    }
    return
  }

  $port = Find-FreePort
  $runner = "set PORT=$port && python app.py"
  $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c $runner" -WorkingDirectory $Root -RedirectStandardOutput $LogOut -RedirectStandardError $LogErr -PassThru
  Set-Content -Path $PidFile -Value $proc.Id -Encoding ascii
  Set-Content -Path $PortFile -Value $port -Encoding ascii

  if ((Is-ProcessRunning -ProcId $proc.Id) -and (Wait-ForPort -Port $port)) {
    Write-Output "Server started. PID $($proc.Id) on port $port"
    Write-Output "URL: http://127.0.0.1:$port"
    return
  }

  Remove-Item $PidFile -ErrorAction SilentlyContinue
  Remove-Item $PortFile -ErrorAction SilentlyContinue
  throw "Server failed to start. Check $LogErr"
}

function Stop-Server {
  $trackedPid = Get-TrackedPid
  $port = Get-TrackedPort

  if (-not $trackedPid -and -not $port) {
    Write-Output "Server is not running."
    return
  }

  if ($trackedPid -and (Is-ProcessRunning -ProcId $trackedPid)) {
    try { Stop-Process -Id $trackedPid -ErrorAction SilentlyContinue } catch {}
    Start-Sleep -Seconds 1
    if (Is-ProcessRunning -ProcId $trackedPid) {
      try { Stop-Process -Id $trackedPid -Force -ErrorAction SilentlyContinue } catch {}
    }
  }

  if ($port) {
    $listeners = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
    foreach ($ln in $listeners) {
      try { Stop-Process -Id $ln.OwningProcess -Force -ErrorAction SilentlyContinue } catch {}
    }
  }

  Remove-Item $PidFile -ErrorAction SilentlyContinue
  Remove-Item $PortFile -ErrorAction SilentlyContinue
  Write-Output "Server stopped."
}

function Kill-All {
  $procs = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    $_.Name -eq "python.exe" -and $_.CommandLine -match "Gaming.*app.py"
  }
  foreach ($p in $procs) {
    try { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue } catch {}
  }

  $port = Get-TrackedPort
  if ($port) {
    $listeners = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
    foreach ($ln in $listeners) {
      try { Stop-Process -Id $ln.OwningProcess -Force -ErrorAction SilentlyContinue } catch {}
    }
  }

  Remove-Item $PidFile -ErrorAction SilentlyContinue
  Remove-Item $PortFile -ErrorAction SilentlyContinue
  Write-Output "All app.py processes killed."
}

function Show-Status {
  $trackedPid = Get-TrackedPid
  $port = Get-TrackedPort
  if ($trackedPid -and (Is-ProcessRunning -ProcId $trackedPid)) {
    if ($port) {
      Write-Output "RUNNING PID $trackedPid PORT $port URL http://127.0.0.1:$port"
    } else {
      Write-Output "RUNNING PID $trackedPid"
    }
    return
  }
  Write-Output "STOPPED"
  exit 1
}

switch ($Command) {
  "start" { Start-Server }
  "stop" { Stop-Server }
  "status" { Show-Status }
  "restart" { Stop-Server; Start-Server }
  "kill" { Kill-All }
  "quit" { Kill-All }
  "exit" { Kill-All }
}
