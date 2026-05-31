#!/usr/bin/env python3
"""Fetch animal sounds from Wikimedia Commons and Pixabay for Aprender Teclas."""
import json
import os
import subprocess
import sys
import urllib.request
import urllib.parse

SOUND_DIR = os.path.join(os.path.dirname(__file__), "static", "sounds")

# Known good Wikimedia Commons files with confirmed URLs from API
WIKIMEDIA_DOWNLOADS = {
    "sheep-baa-wikimedia.ogg": "https://upload.wikimedia.org/wikipedia/commons/1/13/Sheep_bleating.ogg",
    "cow-moo-wikimedia.ogg": "https://upload.wikimedia.org/wikipedia/commons/a/a5/Single_Cow_Moo.ogg",
    "duck-quack-wikimedia.ogg": "https://upload.wikimedia.org/wikipedia/commons/f/fa/Anas_platyrhynchos_-_Mallard_-_XC62258.ogg",
}

# Search Wikimedia API for more audio files
SEARCH_TERMS = [
    ("donkey bray", "donkey"),
    ("Panthera tigris", "tiger"),
    ("hippopotamus", "hippo"),
    ("crocodile alligator", "croc"),
    ("Equus asinus", "donkey2"),
    ("rooster crowing", "rooster"),
    ("wind blowing", "wind"),
    ("magic sparkle chime", "magic"),
]

def wikimedia_search_audio(query, limit=5):
    """Search Wikimedia Commons for audio files."""
    url = (
        "https://commons.wikimedia.org/w/api.php?"
        + urllib.parse.urlencode({
            "action": "query",
            "list": "search",
            "srsearch": query,
            "srnamespace": "6",
            "srlimit": str(limit),
            "format": "json",
        })
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "AlankonGaming/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
        results = []
        for item in data.get("query", {}).get("search", []):
            title = item["title"]
            # Only keep audio files
            if any(title.lower().endswith(ext) for ext in (".ogg", ".oga", ".mp3", ".wav", ".flac")):
                results.append(title)
        return results
    except Exception as e:
        print(f"  Search error for '{query}': {e}")
        return []

def wikimedia_get_url(file_title):
    """Get the direct download URL for a Wikimedia Commons file."""
    url = (
        "https://commons.wikimedia.org/w/api.php?"
        + urllib.parse.urlencode({
            "action": "query",
            "titles": file_title,
            "prop": "imageinfo",
            "iiprop": "url|size",
            "format": "json",
        })
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "AlankonGaming/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
        pages = data.get("query", {}).get("pages", {})
        for page in pages.values():
            info = page.get("imageinfo", [{}])[0]
            return info.get("url"), info.get("size", 0)
    except Exception as e:
        print(f"  URL lookup error for '{file_title}': {e}")
    return None, 0

def download_file(url, dest_path):
    """Download a file from url to dest_path."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "AlankonGaming/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
        with open(dest_path, "wb") as f:
            f.write(data)
        size_kb = len(data) / 1024
        print(f"  ✓ Downloaded {os.path.basename(dest_path)} ({size_kb:.0f} KB)")
        return True
    except Exception as e:
        print(f"  ✗ Failed to download {url}: {e}")
        return False

def main():
    os.makedirs(SOUND_DIR, exist_ok=True)
    
    print("=== Downloading confirmed Wikimedia sounds ===")
    for filename, url in WIKIMEDIA_DOWNLOADS.items():
        dest = os.path.join(SOUND_DIR, filename)
        if os.path.exists(dest) and os.path.getsize(dest) > 1000:
            print(f"  ⊘ {filename} already exists, skipping")
            continue
        download_file(url, dest)

    print("\n=== Searching Wikimedia Commons for more animal audio ===")
    found_files = {}
    for query, tag in SEARCH_TERMS:
        print(f"\n  Searching: '{query}' (tag: {tag})")
        titles = wikimedia_search_audio(query, limit=8)
        if not titles:
            print(f"    No audio files found.")
            continue
        for title in titles[:3]:  # Show up to 3 results
            url, size = wikimedia_get_url(title)
            size_kb = size / 1024 if size else 0
            if url and size_kb < 600:  # Keep files under 600KB
                print(f"    Found: {title} ({size_kb:.0f} KB) -> {url}")
                found_files[tag] = found_files.get(tag, [])
                found_files[tag].append({"title": title, "url": url, "size_kb": size_kb})
            elif url:
                print(f"    Skip (too large): {title} ({size_kb:.0f} KB)")
            else:
                print(f"    Skip (no URL): {title}")

    # Download the best candidate for each tag
    print("\n=== Downloading best candidates ===")
    for tag, candidates in found_files.items():
        if not candidates:
            continue
        # Pick smallest file
        best = min(candidates, key=lambda c: c["size_kb"])
        ext = os.path.splitext(best["title"])[1] or ".ogg"
        filename = f"{tag}-wikimedia{ext}"
        dest = os.path.join(SOUND_DIR, filename)
        if os.path.exists(dest) and os.path.getsize(dest) > 1000:
            print(f"  ⊘ {filename} already exists, skipping")
            continue
        print(f"  Downloading {tag}: {best['title']} ({best['size_kb']:.0f} KB)")
        download_file(best["url"], dest)

    print("\n=== Current sound files ===")
    for f in sorted(os.listdir(SOUND_DIR)):
        full = os.path.join(SOUND_DIR, f)
        if os.path.isfile(full):
            size = os.path.getsize(full) / 1024
            print(f"  {f:45s}  {size:6.0f} KB")

if __name__ == "__main__":
    main()
