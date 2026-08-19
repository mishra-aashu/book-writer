#!/usr/bin/env python3
"""
Font downloader for Book Writer Tauri App.
Downloads .woff2 files from Google Fonts CDN and saves locally.
"""
import os
import re
import urllib.request
import urllib.error

FONTS_DIR = os.path.join(os.path.dirname(__file__), "src", "assets", "fonts")
os.makedirs(FONTS_DIR, exist_ok=True)

# Modern Chrome user-agent to get woff2 format
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

FONT_REQUESTS = {
    # Body/Prose Fonts
    "Lora": "family=Lora:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700",
    "Merriweather": "family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400",
    "EB_Garamond": "family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500",
    "Crimson_Pro": "family=Crimson+Pro:ital,wght@0,400;0,600;0,700;1,400;1,600",
    "Bitter": "family=Bitter:ital,wght@0,400;0,600;0,700;1,400",

    # Chapter/Display Header Fonts
    "Playfair_Display": "family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,700",
    "Cormorant_Garamond": "family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600",
    "Cinzel": "family=Cinzel:wght@400;600;700",

    # UI Fonts
    "Inter": "family=Inter:wght@300;400;500;600;700",
    "Outfit": "family=Outfit:wght@300;400;500;600;700",
    "Manrope": "family=Manrope:wght@400;500;600;700",

    # Screenplay Font
    "Courier_Prime": "family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700",

    # Devanagari/Hindi
    "Noto_Serif_Devanagari": "family=Noto+Serif+Devanagari:wght@400;500;600;700",
    "Noto_Sans_Devanagari": "family=Noto+Sans+Devanagari:wght@400;500;600;700",
    "Tiro_Devanagari_Hindi": "family=Tiro+Devanagari+Hindi:ital@0;1",

    # Genre Extras
    "Caveat": "family=Caveat:wght@400;600;700",
    "Kalam": "family=Kalam:wght@300;400;700",
    "Rajdhani": "family=Rajdhani:wght@400;500;600;700",
}

def fetch_css(family_param: str) -> str:
    url = f"https://fonts.googleapis.com/css2?{family_param}&display=swap"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8")

def download_woff2(url: str, filepath: str):
    if os.path.exists(filepath):
        print(f"  ✓ Already exists: {os.path.basename(filepath)}")
        return
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = resp.read()
    with open(filepath, "wb") as f:
        f.write(data)
    print(f"  ↓ Downloaded: {os.path.basename(filepath)}")

def slugify(s: str) -> str:
    return s.strip().replace(" ", "_").replace("-", "_")

all_face_info = []  # (family, style, weight, local_path)

for font_key, param in FONT_REQUESTS.items():
    print(f"\n→ Fetching CSS for: {font_key}")
    try:
        css = fetch_css(param)
    except Exception as e:
        print(f"  ✗ Failed to fetch CSS: {e}")
        continue

    # Parse @font-face blocks
    blocks = re.findall(r'@font-face\s*\{([^}]+)\}', css, re.DOTALL)
    for block in blocks:
        # Extract font-family
        fam_m = re.search(r"font-family:\s*'([^']+)'", block)
        # Extract font-style
        sty_m = re.search(r'font-style:\s*(\w+)', block)
        # Extract font-weight
        wgt_m = re.search(r'font-weight:\s*(\d+)', block)
        # Extract woff2 URL
        url_m = re.search(r"url\((https://[^)]+\.woff2)\)", block)

        if not (fam_m and url_m):
            continue

        family = fam_m.group(1).strip()
        style = sty_m.group(1).strip() if sty_m else "normal"
        weight = wgt_m.group(1).strip() if wgt_m else "400"
        woff2_url = url_m.group(1).strip()

        # Build clean filename
        slug_fam = slugify(family)
        style_suffix = "-Italic" if style == "italic" else ""
        filename = f"{slug_fam}-{weight}{style_suffix}.woff2"
        filepath = os.path.join(FONTS_DIR, filename)

        try:
            download_woff2(woff2_url, filepath)
            all_face_info.append((family, style, weight, f"./assets/fonts/{filename}"))
        except Exception as e:
            print(f"  ✗ Failed to download {filename}: {e}")

print(f"\n\n✅ Done! {len(all_face_info)} font faces processed.")
print(f"   Files saved to: {FONTS_DIR}")

# Generate @font-face CSS snippet
css_out = []
for (family, style, weight, path) in sorted(set(all_face_info)):
    css_out.append(f"""@font-face {{
  font-family: '{family}';
  src: url('{path}') format('woff2');
  font-weight: {weight};
  font-style: {style};
  font-display: swap;
}}""")

snippet_path = os.path.join(os.path.dirname(__file__), "font_faces_generated.css")
with open(snippet_path, "w") as f:
    f.write("\n\n".join(css_out))
print(f"\n📄 @font-face CSS written to: {snippet_path}")
