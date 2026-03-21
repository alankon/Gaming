#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$ROOT_DIR/.gaming-server.pid"
PORT_FILE="$ROOT_DIR/.gaming-server.port"
LOG_OUT="$ROOT_DIR/flask.out.log"
LOG_ERR="$ROOT_DIR/flask.err.log"

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

is_windows_port_in_use() {
  local port="$1"
  if ! command -v powershell.exe >/dev/null 2>&1; then
    return 1
  fi
  local result
  result="$(powershell.exe -NoProfile -Command "\$p=$port; if (Get-NetTCPConnection -State Listen -LocalPort \$p -ErrorAction SilentlyContinue) { 'inuse' }" 2>/dev/null | tr -d '\r')"
  [[ "$result" == *inuse* ]]
}

is_port_free() {
  local port="$1"
  (echo >/dev/tcp/127.0.0.1/"$port") >/dev/null 2>&1 && return 1
  if is_windows_port_in_use "$port"; then
    return 1
  fi
  return 0
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
    if ! is_port_free "$port"; then
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

kill_windows_by_port() {
  local port="$1"
  if ! command -v powershell.exe >/dev/null 2>&1; then
    return 0
  fi
  powershell.exe -NoProfile -Command "\$p=$port; \$conns=Get-NetTCPConnection -State Listen -LocalPort \$p -ErrorAction SilentlyContinue; foreach (\$c in \$conns) { try { Stop-Process -Id \$c.OwningProcess -Force -ErrorAction SilentlyContinue } catch {} }" >/dev/null 2>&1 || true
}

kill_windows_gaming_app() {
  if ! command -v powershell.exe >/dev/null 2>&1; then
    return 0
  fi
  powershell.exe -NoProfile -Command "\$procs=Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { \$_.Name -eq 'python.exe' -and \$_.CommandLine -match 'Gaming.*app.py' }; foreach (\$p in \$procs) { try { Stop-Process -Id \$p.ProcessId -Force -ErrorAction SilentlyContinue } catch {} }" >/dev/null 2>&1 || true
}

free_port() {
  local port="${1:-5000}"
  if [[ ! "$port" =~ ^[0-9]{2,5}$ ]]; then
    echo "Invalid port: $port"
    exit 2
  fi
  kill_by_port "$port"
  kill_windows_by_port "$port"
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
  PORT="$port" nohup python3 app.py >"$LOG_OUT" 2>"$LOG_ERR" &
  local pid
  pid="$!"
  echo "$pid" > "$PID_FILE"
  echo "$port" > "$PORT_FILE"

  if kill -0 "$pid" 2>/dev/null && wait_for_port "$port"; then
    echo "Server started. PID $pid on port $port"
    echo "URL: http://127.0.0.1:$port"
  else
    rm -f "$PID_FILE" "$PORT_FILE"
    echo "Server failed to start. Check $LOG_ERR"
    exit 1
  fi
}

stop_server() {
  if ! is_running; then
    echo "Server is not running."
    rm -f "$PID_FILE"
    exit 0
  fi
  local pid
  pid="$(cat "$PID_FILE")"
  kill "$pid" 2>/dev/null || true
  if kill -0 "$pid" 2>/dev/null && command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command "Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue" >/dev/null 2>&1 || true
  fi
  sleep 1
  if kill -0 "$pid" 2>/dev/null; then
    echo "Graceful stop failed, forcing kill..."
    kill -9 "$pid" || true
    if command -v powershell.exe >/dev/null 2>&1; then
      powershell.exe -NoProfile -Command "Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue" >/dev/null 2>&1 || true
    fi
  fi
  local port
  port="$(read_port || true)"
  if [[ -n "$port" ]]; then
    kill_by_port "$port"
    kill_windows_by_port "$port"
  fi
  rm -f "$PID_FILE"
  rm -f "$PORT_FILE"
  echo "Server stopped."
}

kill_all() {
  pkill -f "python3 app.py" || true
  pkill -f "python app.py" || true
  kill_windows_gaming_app
  local port
  port="$(read_port || true)"
  if [[ -n "$port" ]]; then
    kill_by_port "$port"
    kill_windows_by_port "$port"
  else
    for port in $(seq 5000 5999); do
      kill_windows_by_port "$port"
    done
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
    else
      echo "RUNNING PID $(cat "$PID_FILE")"
    fi
    exit 0
  fi
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
  *)
    echo "Usage: ./server.sh {start|stop|status|restart|kill|quit|exit|free-port [port]}"
    exit 2
    ;;
esac
