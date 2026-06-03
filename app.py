from flask import Flask, jsonify, render_template, request, send_from_directory
from flask_wtf.csrf import CSRFProtect
import os
import signal
import subprocess
import threading
import time

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-key")
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0

csrf = CSRFProtect(app)
PID_FILE = os.path.join(os.path.dirname(__file__), ".gaming-server.pid")
PORT_FILE = os.path.join(os.path.dirname(__file__), ".gaming-server.port")
CACHELESS_ROUTES = {"/aprender-teclas"}


@app.after_request
def add_no_cache_headers(response):
    if request.path.startswith("/static/") or request.path in CACHELESS_ROUTES:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


def _is_local_request():
    return request.remote_addr in {"127.0.0.1", "::1"}


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
            subprocess.run(
                ["taskkill", "/PID", str(pid), "/T", "/F"],
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
        result = subprocess.run(
            ["netstat", "-ano", "-p", "tcp"],
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

    for command in (["fuser", f"{port}/tcp"], ["lsof", "-ti", f"tcp:{port}"]):
        result = subprocess.run(
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


def _free_port_before_start(port):
    for pid in _pids_listening_on_port(port):
        _kill_process(pid)


def _write_runtime_files(port):
    try:
        with open(PID_FILE, "w", encoding="ascii") as pid_file:
            pid_file.write(str(os.getpid()))
        with open(PORT_FILE, "w", encoding="ascii") as port_file:
            port_file.write(str(port))
    except OSError:
        pass


@app.route("/")
def pagina_inicial():
    return render_template("index.html")


@app.route("/2048")
def jogo_2048():
    return render_template("game_2048.html")


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
    return jsonify(
        status="running",
        pid=os.getpid(),
        pid_file=PID_FILE,
        port=int(os.getenv("PORT", "5000")),
        port_file=PORT_FILE,
    ), 200


@app.route("/quit", methods=["GET", "POST"])
@app.route("/exit", methods=["GET", "POST"])
@app.route("/kill", methods=["GET", "POST"])
def quit_server():
    if not _is_local_request():
        return jsonify(status="forbidden"), 403
    _shutdown_server()
    return jsonify(status="shutting_down", pid=os.getpid()), 200


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    _free_port_before_start(port)
    _write_runtime_files(port)
    app.run("0.0.0.0", port=port, debug=False)
