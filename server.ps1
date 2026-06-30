param(
  [Parameter(Position=0)]
  [ValidateSet("start","stop","status","restart","kill","quit","exit","free-port","lan-proxy")]
  [string]$Command = "status",
  [Parameter(Position=1)]
  [int]$Port = 5000
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$PidFile = Join-Path $Root ".gaming-server.pid"
$PortFile = Join-Path $Root ".gaming-server.port"
$LogOut = Join-Path $Root "flask.out.log"
$LogErr = Join-Path $Root "flask.err.log"

function Get-WindowsLanIp {
  $cfg = Get-NetIPConfiguration -ErrorAction SilentlyContinue |
    Where-Object { $_.IPv4DefaultGateway -and $_.IPv4Address.IPAddress -like "192.168.*" } |
    Select-Object -First 1
  if ($cfg) {
    return $cfg.IPv4Address.IPAddress
  }
  return Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -like "192.168.*" -and $_.PrefixOrigin -ne "WellKnown" } |
    Select-Object -First 1 -ExpandProperty IPAddress
}

function Get-WslIp {
  $wsl = Get-Command wsl.exe -ErrorAction SilentlyContinue
  if (-not $wsl) { return $null }
  $script = @'
ip route get 1.1.1.1 2>/dev/null | sed -n 's/.* src \([0-9.]*\).*/\1/p' | head -n 1
ip -o -4 addr show scope global 2>/dev/null | grep -Ev ' (docker|br-|lo)' | tr -s ' ' | cut -d' ' -f4 | cut -d/ -f1 | head -n 1
'@
  $raw = & wsl.exe sh -lc $script 2>$null
  if ($LASTEXITCODE -ne 0) { return $null }
  $ip = $raw | Where-Object { $_ -match '^(10|172|192)\.' } | Select-Object -First 1
  if (-not $ip) { return $null }
  return $ip.Trim()
}

function Test-IsAdmin {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}
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
  $runner = "set HOST=0.0.0.0 && set ALLOW_LAN=1 && set PORT=$port && python app.py"
  $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c $runner" -WorkingDirectory $Root -RedirectStandardOutput $LogOut -RedirectStandardError $LogErr -WindowStyle Hidden -PassThru
  Set-Content -Path $PidFile -Value $proc.Id -Encoding ascii
  Set-Content -Path $PortFile -Value $port -Encoding ascii

  if ((Is-ProcessRunning -ProcId $proc.Id) -and (Wait-ForPort -Port $port)) {
    Write-Output "Server started. PID $($proc.Id) on port $port"
    Write-Output "URL: http://127.0.0.1:$port"
    $lanIp = Get-WindowsLanIp
    if ($lanIp) { Write-Output "LAN URL: http://${lanIp}:$port" }
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

function Free-Port([int]$Port) {
  $listeners = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
  foreach ($ln in $listeners) {
    try { Stop-Process -Id $ln.OwningProcess -Force -ErrorAction SilentlyContinue } catch {}
  }
  Write-Output "Port $Port released (best effort)."
}

function Show-Status {
  $trackedPid = Get-TrackedPid
  $port = Get-TrackedPort
  if ($trackedPid -and (Is-ProcessRunning -ProcId $trackedPid)) {
    if ($port) {
      Write-Output "RUNNING PID $trackedPid PORT $port URL http://127.0.0.1:$port"
      $lanIp = Get-WindowsLanIp
      if ($lanIp) { Write-Output "LAN URL http://${lanIp}:$port" }
    } else {
      Write-Output "RUNNING PID $trackedPid"
    }
    return
  }
  Write-Output "STOPPED"
  exit 1
}

function Enable-LanProxy([int]$Port) {
  $lanIp = Get-WindowsLanIp
  $wslIp = Get-WslIp
  if (-not $lanIp) {
    throw "Could not detect a Windows 192.168.* LAN IP."
  }
  $targetIp = if ($wslIp) { $wslIp } else { "127.0.0.1" }
  if (-not (Test-IsAdmin)) {
    Write-Output "Admin PowerShell required for Windows portproxy/firewall."
    Write-Output "Open PowerShell as Administrator and run:"
    Write-Output "  cd $Root"
    Write-Output "  .\server.ps1 lan-proxy $Port"
    Write-Output ""
    Write-Output "This will forward http://${lanIp}:$Port to http://${targetIp}:$Port."
    if (-not $wslIp) {
      Write-Output "WSL NAT IP was not detected, so the proxy will use the Windows localhost bridge."
    }
    return
  }

  netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=$Port 2>$null | Out-Null
  netsh interface portproxy delete v4tov4 listenaddress=$lanIp listenport=$Port 2>$null | Out-Null
  netsh interface portproxy add v4tov4 listenaddress=$lanIp listenport=$Port connectaddress=$targetIp connectport=$Port | Out-Null

  $ruleName = "alankon Gaming $Port"
  $rule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
  if (-not $rule) {
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port | Out-Null
  }

  Write-Output "LAN proxy configured."
  Write-Output "Windows LAN URL: http://${lanIp}:$Port"
  Write-Output "Forward target: http://${targetIp}:$Port"
}

switch ($Command) {
  "start" { Start-Server }
  "stop" { Stop-Server }
  "status" { Show-Status }
  "restart" { Stop-Server; Start-Server }
  "kill" { Kill-All }
  "quit" { Kill-All }
  "exit" { Kill-All }
  "free-port" { Free-Port -Port $Port }
  "lan-proxy" { Enable-LanProxy -Port $Port }
}
