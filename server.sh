#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$ROOT_DIR/.gaming-server.pid"
LOG_OUT="$ROOT_DIR/flask.out.log"
LOG_ERR="$ROOT_DIR/flask.err.log"

is_running() {
  [[ -f "$PID_FILE" ]] || return 1
  local pid
  pid="$(cat "$PID_FILE")"
  [[ -n "$pid" ]] || return 1
  kill -0 "$pid" 2>/dev/null
}

start_server() {
  if is_running; then
    echo "Server already running with PID $(cat "$PID_FILE")"
    exit 0
  fi
  cd "$ROOT_DIR"
  nohup python3 app.py >"$LOG_OUT" 2>"$LOG_ERR" &
  sleep 1
  if is_running; then
    echo "Server started. PID $(cat "$PID_FILE")"
  else
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
  kill "$pid" || true
  sleep 1
  if is_running; then
    echo "Graceful stop failed, forcing kill..."
    kill -9 "$pid" || true
  fi
  rm -f "$PID_FILE"
  echo "Server stopped."
}

kill_all() {
  pkill -f "python3 app.py" || true
  pkill -f "python app.py" || true
  rm -f "$PID_FILE"
  echo "All app.py processes killed."
}

status_server() {
  if is_running; then
    echo "RUNNING PID $(cat "$PID_FILE")"
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
  *)
    echo "Usage: ./server.sh {start|stop|status|restart|kill|quit|exit}"
    exit 2
    ;;
esac
