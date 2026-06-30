#!/usr/bin/env bash
# server.sh — gaming app server manager (WSL2 mirrored-network edition)
# All Windows/powershell calls removed; uses only Linux tools.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$ROOT_DIR/.gaming-server.pid"
PORT_FILE="$ROOT_DIR/.gaming-server.port"
LOG_OUT="$ROOT_DIR/flask.out.log"
LOG_ERR="$ROOT_DIR/flask.err.log"

# In WSL mirrored mode the Linux network IS the Windows network.
# Pick the first global (non-loopback) IPv4 address.
linux_lan_ip() {
  local routed
  routed="$(ip route get 1.1.1.1 2>/dev/null | grep -oP '(?<=src )\d+\.\d+\.\d+\.\d+' | head -n 1)"
  if [[ -n "$routed" ]]; then
    echo "$routed"
    return 0
  fi
  local addrs
  addrs="$(ip -o -4 addr show scope global 2>/dev/null | awk '$2 !~ /^(docker|br-|lo)/ { split($4,a,"/"); print a[1] }' | grep -v '^127\.')"
  echo "$addrs" | grep '^192\.168\.' | head -n 1 && return 0
  echo "$addrs" | grep '^172\.' | head -n 1 && return 0
  echo "$addrs" | grep '^10\.' | grep -v '^10\.255\.' | head -n 1 && return 0
  echo "$addrs" | head -n 1
}

windows_lan_ip() {
  if ! command -v powershell.exe >/dev/null 2>&1; then
    return 0
  fi
  powershell.exe -NoProfile -Command '$cfg = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.IPv4Address.IPAddress -like "192.168.*" } | Select-Object -First 1; if ($cfg) { $cfg.IPv4Address.IPAddress } else { Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.*" -and $_.PrefixOrigin -ne "WellKnown" } | Select-Object -First 1 -ExpandProperty IPAddress }' \
    2>/dev/null | tr -d '\r' | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | head -n 1
}

show_urls() {
  local port="$1"
  echo "URL: http://127.0.0.1:$port"
  local linux_ip
  linux_ip="$(linux_lan_ip || true)"
  if [[ -n "$linux_ip" ]]; then
    echo "WSL/Linux URL: http://$linux_ip:$port"
  fi
  local win_ip
  win_ip="$(windows_lan_ip || true)"
  if [[ -n "$win_ip" ]]; then
    echo "Windows LAN URL: http://$win_ip:$port"
    echo "If this refuses connection from another device, run in Admin PowerShell: .\\server.ps1 lan-proxy $port"
  fi
}

lan_proxy_help() {
  local port="${1:-5000}"
  local linux_ip
  local win_ip
  linux_ip="$(linux_lan_ip || true)"
  win_ip="$(windows_lan_ip || true)"
  if [[ -z "$win_ip" ]]; then
    echo "Could not detect the Windows LAN IP."
    return 1
  fi
  echo "To expose WSL on the Windows LAN address, open Windows PowerShell as Administrator and run:"
  echo "  cd E:\\WSL\\repos\\Gaming"
  echo "  .\\server.ps1 lan-proxy $port"
  echo ""
  if [[ -n "$linux_ip" ]]; then
    echo "This will forward http://$win_ip:$port to http://$linux_ip:$port."
  else
    echo "No stable WSL NAT IP was detected; the PowerShell command will use the Windows localhost bridge."
  fi
}

is_running() {
  [[ -f "$PID_FILE" ]] || return 1
  local pid
  pid="$(cat "$PID_FILE")"
  [[ -n "$pid" ]] || return 1
  kill -0 "$pid" 2>/dev/null
}

read_port() {
  [[ -f "$PORT_FILE" ]] || return 1
  local port
  port="$(cat "$PORT_FILE")"
  [[ "$port" =~ ^5[0-9]{3}$ ]] || return 1
  echo "$port"
}

is_port_in_use() {
  local port="$1"
  # ss is instantaneous — reads kernel socket table, no TCP connect needed
  ss -tlnH "sport = :$port" 2>/dev/null | grep -q .
}

is_port_free() {
  local port="$1"
  ! is_port_in_use "$port"
}

find_free_port() {
  local port
  for port in $(seq 5000 5999); do
    if is_port_free "$port"; then
      echo "$port"
      return 0
    fi
  done
  return 1
}

wait_for_port() {
  local port="$1"
  local retries=25
  while (( retries > 0 )); do
    if is_port_in_use "$port"; then
      return 0
    fi
    sleep 0.2
    retries=$((retries - 1))
  done
  return 1
}

kill_by_port() {
  local port="$1"
  local pids
  pids="$(fuser -n tcp "$port" 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
    sleep 1
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
  fi
}

free_port() {
  local port="${1:-5000}"
  if [[ ! "$port" =~ ^[0-9]{2,5}$ ]]; then
    echo "Invalid port: $port"
    exit 2
  fi
  kill_by_port "$port"
  echo "Port $port released (best effort)."
}

start_server() {
  if is_running; then
    local running_port
    running_port="$(read_port || true)"
    if [[ -n "$running_port" ]]; then
      echo "Server already running with PID $(cat "$PID_FILE") on port $running_port"
    else
      echo "Server already running with PID $(cat "$PID_FILE")"
    fi
    exit 0
  fi
  cd "$ROOT_DIR"
  local port
  port="$(find_free_port)" || {
    echo "No free port found in range 5000-5999"
    exit 1
  }
  HOST="0.0.0.0" ALLOW_LAN="1" PORT="$port" nohup python3 app.py >"$LOG_OUT" 2>"$LOG_ERR" &
  local pid
  pid="$!"
  echo "$pid" > "$PID_FILE"
  echo "$port" > "$PORT_FILE"

  if kill -0 "$pid" 2>/dev/null && wait_for_port "$port"; then
    echo "Server started. PID $pid on port $port"
    show_urls "$port"
  else
    rm -f "$PID_FILE" "$PORT_FILE"
    echo "Server failed to start. Check $LOG_ERR"
    exit 1
  fi
}

stop_server() {
  if ! is_running; then
    echo "Server is not running."
    rm -f "$PID_FILE" "$PORT_FILE"
    return 0
  fi
  local pid
  pid="$(cat "$PID_FILE")"
  kill "$pid" 2>/dev/null || true
  sleep 1
  if kill -0 "$pid" 2>/dev/null; then
    echo "Graceful stop failed, forcing kill..."
    kill -9 "$pid" 2>/dev/null || true
  fi
  local port
  port="$(read_port || true)"
  if [[ -n "$port" ]]; then
    kill_by_port "$port"
  fi
  rm -f "$PID_FILE"
  rm -f "$PORT_FILE"
  echo "Server stopped."
  return 0
}

kill_all() {
  pkill -f "python3 app.py" || true
  pkill -f "python app.py" || true
  local port
  port="$(read_port || true)"
  if [[ -n "$port" ]]; then
    kill_by_port "$port"
  else
    echo "No tracked port file found; skipped broad 5000-5999 port kill."
    echo "Use './server.sh free-port 5000' to release a specific port."
  fi
  rm -f "$PID_FILE"
  rm -f "$PORT_FILE"
  echo "All app.py processes killed."
}

status_server() {
  if is_running; then
    local port
    port="$(read_port || true)"
    if [[ -n "$port" ]]; then
      echo "RUNNING PID $(cat "$PID_FILE") PORT $port URL http://127.0.0.1:$port"
      show_urls "$port"
    else
      echo "RUNNING PID $(cat "$PID_FILE")"
    fi
    exit 0
  fi
  rm -f "$PID_FILE" "$PORT_FILE"
  echo "STOPPED"
  exit 1
}

cmd="${1:-status}"
case "$cmd" in
  start) start_server ;;
  stop) stop_server ;;
  status) status_server ;;
  restart) stop_server; start_server ;;
  kill|quit|exit) kill_all ;;
  free-port) free_port "${2:-5000}" ;;
  lan-proxy) lan_proxy_help "${2:-$(read_port || echo 5000)}" ;;
  *)
    echo "Usage: ./server.sh {start|stop|status|restart|kill|quit|exit|free-port [port]|lan-proxy [port]}"
    exit 2
    ;;
esac
