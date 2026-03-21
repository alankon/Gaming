from flask import Flask, jsonify, render_template, request
from flask_wtf.csrf import CSRFProtect
import atexit
import os
import signal
import threading

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-key")

csrf = CSRFProtect(app)
PID_FILE = os.path.join(os.path.dirname(__file__), ".gaming-server.pid")


def _write_pid_file():
    with open(PID_FILE, "w", encoding="utf-8") as handle:
        handle.write(str(os.getpid()))


def _remove_pid_file():
    try:
        if os.path.exists(PID_FILE):
            os.remove(PID_FILE)
    except OSError:
        pass


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


@app.route("/")
def pagina_inicial():
    return render_template("index.html")


@app.route("/health")
def health():
    return "ok", 200


@app.route("/status")
def status():
    return jsonify(status="running", pid=os.getpid(), pid_file=PID_FILE), 200


@app.route("/quit", methods=["GET", "POST"])
@app.route("/exit", methods=["GET", "POST"])
@app.route("/kill", methods=["GET", "POST"])
def quit_server():
    if not _is_local_request():
        return jsonify(status="forbidden"), 403
    _shutdown_server()
    return jsonify(status="shutting_down", pid=os.getpid()), 200


if __name__ == "__main__":
    _write_pid_file()
    atexit.register(_remove_pid_file)
    port = int(os.getenv("PORT", "5000"))
    app.run("0.0.0.0", port=port, debug=False)
