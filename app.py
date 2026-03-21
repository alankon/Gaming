from flask import Flask, render_template
from flask_wtf.csrf import CSRFProtect
import os

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-key")

csrf = CSRFProtect(app)


@app.route("/")
def pagina_inicial():
    return render_template("index.html")


@app.route("/health")
def health():
    return "ok", 200


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run("0.0.0.0", port=port, debug=False)
