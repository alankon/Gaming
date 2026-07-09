import os
import shutil

from app import app

# Configure app for testing
app.config["SERVER_NAME"] = "localhost"
app.config["APPLICATION_ROOT"] = "/"
app.config["PREFERRED_URL_SCHEME"] = "http"
app.config["STATIC_EXPORT"] = True

client = app.test_client()
PRESERVED_DOCS = ("gaming_sync_report.md", "SECURITY_AUDIT.md")

routes = {
    "/": "index.html",
    "/jogos": "jogos.html",
    "/categorias": "categorias.html",
    "/perfil": "perfil.html",
    "/ranking": "ranking.html",
    "/conquistas": "conquistas.html",
    "/sobre": "sobre.html",
    "/atualizacoes": "atualizacoes.html",
    "/2048": "2048.html",
    "/aprender-teclas": "aprender-teclas.html",
}

# Ensure docs directory exists
preserved_files = {}
if os.path.exists("docs"):
    for filename in PRESERVED_DOCS:
        path = os.path.join("docs", filename)
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as existing_file:
                preserved_files[filename] = existing_file.read()
    shutil.rmtree("docs")
os.makedirs("docs", exist_ok=True)

# Copy static directory to docs/static
shutil.copytree("static", "docs/static")
print("Copied static assets to docs/static")

for root_asset in ("manifest.webmanifest", "service-worker.js"):
    shutil.copy2(root_asset, os.path.join("docs", root_asset))
    print(f"Copied {root_asset} to docs/{root_asset}")

for filename, content in preserved_files.items():
    with open(os.path.join("docs", filename), "w", encoding="utf-8") as preserved_file:
        preserved_file.write(content)
    print(f"Preserved docs/{filename}")

# Render pages and save to docs
REPLACEMENTS = [
    ('href="/static/', 'href="static/'),
    ('src="/static/', 'src="static/'),
    ('href="/manifest.webmanifest"', 'href="manifest.webmanifest"'),
    ('src="/manifest.webmanifest"', 'src="manifest.webmanifest"'),
    ('href="/service-worker.js"', 'href="service-worker.js"'),
    ('src="/service-worker.js"', 'src="service-worker.js"'),
    ('href="/"', 'href="index.html"'),
    ('href="/jogos"', 'href="jogos.html"'),
    ('href="/categorias"', 'href="categorias.html"'),
    ('href="/perfil"', 'href="perfil.html"'),
    ('href="/ranking"', 'href="ranking.html"'),
    ('href="/conquistas"', 'href="conquistas.html"'),
    ('href="/sobre"', 'href="sobre.html"'),
    ('href="/atualizacoes"', 'href="atualizacoes.html"'),
    ('href="/2048"', 'href="2048.html"'),
    ('href="/aprender-teclas"', 'href="aprender-teclas.html"'),
]

with app.app_context():
    for route, filename in routes.items():
        response = client.get(route)
        if response.status_code != 200:
            print(f"Error rendering {route}: Status code {response.status_code}")
            continue

        html = response.data.decode("utf-8")
        for old, new in REPLACEMENTS:
            html = html.replace(old, new)

        dest_path = os.path.join("docs", filename)
        with open(dest_path, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"Rendered {route} -> {dest_path}")

print("Static docs build successfully completed!")
