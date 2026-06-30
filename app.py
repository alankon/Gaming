from flask import Flask, jsonify, render_template, request, send_from_directory
from flask_wtf.csrf import CSRFProtect
import os
import secrets
import shutil
import signal
import socket
import subprocess  # nosec B404
import threading
import time

app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.getenv("SECRET_KEY") or secrets.token_urlsafe(32),
    SEND_FILE_MAX_AGE_DEFAULT=0,
    MAX_CONTENT_LENGTH=1024 * 1024,
)

csrf = CSRFProtect(app)
PID_FILE = os.path.join(os.path.dirname(__file__), ".gaming-server.pid")
PORT_FILE = os.path.join(os.path.dirname(__file__), ".gaming-server.port")
CACHELESS_ROUTES = {"/aprender-teclas"}
LOCAL_HOSTS = {"127.0.0.1", "localhost", "::1"}


@app.after_request
def add_security_headers(response):
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
    response.headers.setdefault(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    )
    response.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self'; "
        "img-src 'self' data:; "
        "media-src 'self'; "
        "connect-src 'self'; "
        "manifest-src 'self'; "
        "base-uri 'self'; "
        "form-action 'self'; "
        "frame-ancestors 'none'; "
        "object-src 'none'",
    )
    if request.path.startswith("/static/") or request.path in CACHELESS_ROUTES:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


def _is_local_request():
    return request.remote_addr in {"127.0.0.1", "::1", "::ffff:127.0.0.1"}


def _local_only_json():
    if _is_local_request():
        return None
    return jsonify(status="forbidden"), 403


def _shutdown_server():
    # Run shutdown after response is returned.
    def _shutdown():
        try:
            os.kill(os.getpid(), signal.SIGTERM)
        except OSError:
            os._exit(0)

    threading.Timer(0.15, _shutdown).start()


def _process_is_running(pid):
    if not pid or pid == os.getpid():
        return False
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def _kill_process(pid):
    if not pid or pid == os.getpid():
        return
    try:
        if os.name == "nt":
            taskkill = shutil.which("taskkill") or "taskkill"
            subprocess.run(  # nosec B603
                [taskkill, "/PID", str(pid), "/T", "/F"],
                check=False,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        else:
            os.kill(pid, signal.SIGTERM)
            time.sleep(0.2)
            if _process_is_running(pid):
                os.kill(pid, signal.SIGKILL)
    except OSError:
        pass


def _pids_listening_on_port(port):
    pids = set()
    if os.name == "nt":
        netstat = shutil.which("netstat") or "netstat"
        result = subprocess.run(  # nosec B603
            [netstat, "-ano", "-p", "tcp"],
            check=False,
            capture_output=True,
            text=True,
            errors="ignore",
        )
        marker = f":{port}"
        for line in result.stdout.splitlines():
            parts = line.split()
            if len(parts) < 5 or parts[0].upper() != "TCP":
                continue
            if parts[1].endswith(marker) and parts[3].upper() == "LISTENING":
                if parts[4].isdigit():
                    pids.add(int(parts[4]))
        return pids

    commands = []
    fuser = shutil.which("fuser")
    lsof = shutil.which("lsof")
    if fuser:
        commands.append([fuser, f"{port}/tcp"])
    if lsof:
        commands.append([lsof, "-ti", f"tcp:{port}"])

    for command in commands:
        result = subprocess.run(  # nosec B603
            command,
            check=False,
            capture_output=True,
            text=True,
            errors="ignore",
        )
        for raw in result.stdout.replace("\n", " ").split():
            if raw.isdigit():
                pids.add(int(raw))
        if pids:
            break
    return pids


def _read_tracked_pid():
    try:
        with open(PID_FILE, "r", encoding="ascii") as pid_file:
            raw = pid_file.read().strip()
    except OSError:
        return None
    return int(raw) if raw.isdigit() else None


def _stop_tracked_server():
    pid = _read_tracked_pid()
    if pid and _process_is_running(pid):
        _kill_process(pid)


def _is_port_available(port, host="127.0.0.1"):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind((host, port))  # nosec B104
        except OSError:
            return False
    return True


def _find_free_port(start_port=5000, host="127.0.0.1"):
    for port in range(max(5000, start_port), 6000):
        if _is_port_available(port, host):
            return port
    raise RuntimeError("No free port found in range 5000-5999")


def _requested_port(default=5000):
    raw_port = os.getenv("PORT", str(default))
    try:
        port = int(raw_port)
    except ValueError:
        return default
    return port if 1 <= port <= 65535 else default


def _requested_host():
    host = os.getenv("HOST", "0.0.0.0").strip() or "0.0.0.0"  # nosec B104
    if host in LOCAL_HOSTS:
        return host
    if host == "0.0.0.0" and os.getenv("ALLOW_LAN", "1") == "1":  # nosec B104
        return host
    return "127.0.0.1"


def _write_runtime_files(port):
    try:
        with open(PID_FILE, "w", encoding="ascii") as pid_file:
            pid_file.write(str(os.getpid()))
        with open(PORT_FILE, "w", encoding="ascii") as port_file:
            port_file.write(str(port))
    except OSError:
        pass


@app.route("/index.html")
@app.route("/")
def pagina_inicial():
    return render_template("index.html")


@app.route("/2048.html")
@app.route("/2048")
def jogo_2048():
    return render_template("game_2048.html")


@app.route("/aprender-teclas.html")
@app.route("/aprender-teclas")
def jogo_aprender_teclas():
    return render_template("learn_keys.html")


@app.route("/manifest.webmanifest")
def manifest_file():
    return send_from_directory(
        os.path.dirname(__file__),
        "manifest.webmanifest",
        mimetype="application/manifest+json",
    )


@app.route("/service-worker.js")
def service_worker_file():
    response = send_from_directory(
        os.path.dirname(__file__),
        "service-worker.js",
        mimetype="application/javascript",
    )
    response.headers["Service-Worker-Allowed"] = "/"
    return response


@app.route("/health")
def health():
    return "ok", 200


@app.route("/status")
def status():
    forbidden = _local_only_json()
    if forbidden:
        return forbidden
    port = _requested_port()
    return jsonify(status="running", pid=os.getpid(), port=port), 200


@app.route("/quit", methods=["POST"])
@app.route("/exit", methods=["POST"])
@app.route("/kill", methods=["POST"])
@csrf.exempt
def quit_server():
    forbidden = _local_only_json()
    if forbidden:
        return forbidden
    _shutdown_server()
    return jsonify(status="shutting_down", pid=os.getpid()), 200


if __name__ == "__main__":
    requested_port = _requested_port()
    host = _requested_host()
    _stop_tracked_server()
    port = requested_port if _is_port_available(requested_port, host) else _find_free_port(requested_port + 1, host)
    os.environ["PORT"] = str(port)
    _write_runtime_files(port)
    app.run(host, port=port, debug=False)
