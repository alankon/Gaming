import os
import shutil
from app import app

# Configure app for testing
app.config['SERVER_NAME'] = 'localhost'
app.config['APPLICATION_ROOT'] = '/'
app.config['PREFERRED_URL_SCHEME'] = 'http'

client = app.test_client()

routes = {
    "/": "index.html",
    "/2048": "2048.html",
    "/aprender-teclas": "aprender-teclas.html"
}

# Ensure dist directory exists
if os.path.exists("dist"):
    shutil.rmtree("dist")
os.makedirs("dist", exist_ok=True)

# Copy static directory to dist/static
shutil.copytree("static", "dist/static")
print("Copied static assets to dist/static")

# Render pages and save to dist
with app.app_context():
    for route, filename in routes.items():
        response = client.get(route)
        if response.status_code != 200:
            print(f"Error rendering {route}: Status code {response.status_code}")
            continue
            
        html = response.data.decode('utf-8')
        
        # Replace absolute slash links with relative links to work perfectly on GitHub Pages
        # url_for('static', filename='menu.css') in Flask renders as /static/menu.css
        html = html.replace('href="/static/', 'href="static/')
        html = html.replace('src="/static/', 'src="static/')
        html = html.replace('href="/2048"', 'href="2048.html"')
        html = html.replace('href="/aprender-teclas"', 'href="aprender-teclas.html"')
        html = html.replace('href="/"', 'href="index.html"')
        
        dest_path = os.path.join("dist", filename)
        with open(dest_path, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"Rendered {route} -> {dest_path}")

print("Static build successfully completed!")
