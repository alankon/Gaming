from flask import Flask, jsonify, render_template, request
from flask_wtf.csrf import CSRFProtect
import os
import signal
import threading

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-key")

csrf = CSRFProtect(app)
PID_FILE = os.path.join(os.path.dirname(__file__), ".gaming-server.pid")
PORT_FILE = os.path.join(os.path.dirname(__file__), ".gaming-server.port")


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


@app.route("/2048")
def jogo_2048():
    return render_template("game_2048.html")


@app.route("/aprender-teclas")
def jogo_aprender_teclas():
    return render_template("learn_keys.html")


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
    app.run("0.0.0.0", port=port, debug=False)
