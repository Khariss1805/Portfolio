"""Make web-sized WebP copies of the earlier design work images.

Run: python3 build/images.py
Originals stay untouched in design/Images. Output goes to assets/work, plus
a manifest with each image's size so pages can reserve space (no layout jump).
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design" / "Images"
OUT = ROOT / "assets" / "work"
FILES = {
    "irina-title": "Estilo Base (2).png",
    "irina-scene": "irinalogo.png",
    "irina-persona-client": "irinapersona.png",
    "irina-persona-user": "irinapersona2.png",
    "irina-stakeholders": "irinamapainteresados.jpg",
    "irina-swot": "irinamatrizdofa.jpg",
    "irina-mvp": "irinasmv.png",
    "irina-journey": "irinajourneymap.png",
    "irina-prototypes-1": "irinaprototipes.png",
    "irina-prototypes-2": "irinaprototipes2.png",
    "nona-cover": "nonalogo.png",
    "nona-persona": "nonapersonacanva.jpg",
    "nona-ia-1": "nonaarq.jpg",
    "nona-ia-2": "nonaarq2.jpg",
    "nona-taskflow": "nonataskflow.jpg",
    "nona-userflow-1": "nonauserflow1.jpg",
    "nona-userflow-2": "nonauserflow2.jpg",
    "nona-prototypes": "nonaprot.png",
    "food-explorer": "Slide 42.png",
    "vorafood": "vorafood.png",
    "inest-1": "inest1.png",
    "inest-2": "inest2.png",
    "inest-3": "inest3.png",
    "composition": "composition.png",
    "illustration": "illustration.png",
    "chibi": "chibi4.png",
    "restoration": "restoration.png",
    "photo-edit": "photos.png",
    "visual-concept": "visual-concept.png",
    "cgi-1": "cgi1.png",
    "cgi-2": "cgi2.png",
    "car-1": "3dcar1.png",
    "car-2": "3dcar2.png",
    "vive-poster": "vivelogo.png",
}
# Videos: re-encoded for the web (H.264, smaller frame, AAC audio) with a poster frame.
VIDEOS = {
    "inest-video": ("inestvid.mp4", 640),
    "anim-3d": ("3danimation.mp4", 1280),
    "rose": ("rose.mp4", 1280),
    "promo-nezuko": ("Nezuko1.mp4", 540),
    "promo-sally": ("Sally3.mp4", 540),
}
MAX = 1600

OUT.mkdir(parents=True, exist_ok=True)
manifest = {}
for key, name in FILES.items():
    im = Image.open(SRC / name)
    im = im.convert("RGBA") if im.mode in ("RGBA", "LA", "P") else im.convert("RGB")
    if key == "chibi":
        # The original was a faded background layer: restore full opacity and trim the empty canvas.
        alpha = im.getchannel("A").point(lambda a: min(255, a * 2))
        im.putalpha(alpha)
        im = im.crop(alpha.getbbox())
    if im.width > MAX:
        im = im.resize((MAX, round(im.height * MAX / im.width)), Image.LANCZOS)
    path = OUT / f"{key}.webp"
    im.save(path, "WEBP", quality=82, method=6)
    manifest[key] = {"w": im.width, "h": im.height}
    print(f"{key:22} {im.width}x{im.height} {path.stat().st_size // 1024} KB")
import subprocess
for key, (name, width) in VIDEOS.items():
    src = SRC / name
    mp4 = OUT / f"{key}.mp4"
    poster = OUT / f"{key}.webp"
    if not mp4.exists():
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vf", f"scale={width}:-2",
                        "-c:v", "libx264", "-preset", "slow", "-crf", "28", "-pix_fmt", "yuv420p",
                        "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", str(mp4)], check=True)
    frame = OUT / f"{key}-frame.png"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "2", "-i", str(mp4), "-frames:v", "1", str(frame)], check=True)
    im = Image.open(frame).convert("RGB")
    im.save(poster, "WEBP", quality=80, method=6)
    frame.unlink()
    manifest[key] = {"w": im.width, "h": im.height, "video": True}
    print(f"{key:22} {im.width}x{im.height} video {mp4.stat().st_size // 1024} KB")
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=1))
