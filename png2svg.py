import argparse, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

p = argparse.ArgumentParser()
p.add_argument("input", nargs="?", default="Logo smaples")
p.add_argument("output", nargs="?", default="output")
p.add_argument("--no-bg-remove", action="store_true", help="skip background removal")
p.add_argument("--ai", action="store_true", help="use AI model (u2netp) instead of flood-fill")
p.add_argument("--hq", action="store_true", help="AI model isnet-general-use (implies --ai)")
p.add_argument("--tolerance", type=float, default=40,
               help="flood-fill tolerance (raise if background remains, lower if icon is eaten)")
a = p.parse_args()
model = "isnet-general-use" if a.hq else "u2netp"
use_ai = a.ai or a.hq

TRACE_TUNED = ("import sys, vtracer; vtracer.convert_image_to_svg_py(sys.argv[1], sys.argv[2], "
               "colormode='color', hierarchical='stacked', mode='spline', filter_speckle=4, "
               "color_precision=6, layer_difference=16, corner_threshold=60, "
               "length_threshold=4.0, path_precision=3)")
TRACE_SIMPLE = "import sys, vtracer; vtracer.convert_image_to_svg_py(sys.argv[1], sys.argv[2])"

def flood_remove(img, tol):
    arr = np.array(img.convert("RGBA"))
    rgb = arr[..., :3].astype(float)
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, axis=0)
    dist = np.sqrt(((rgb - bg) ** 2).sum(-1))
    lab, _ = ndi.label(dist <= tol)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    mask = np.isin(lab, list(edge))
    mask |= ndi.binary_dilation(mask, iterations=1) & (dist <= tol * 2.5)
    arr[..., 3] = np.where(mask, 0, arr[..., 3])
    return Image.fromarray(arr)

def ensure_model(name):
    home = Path.home()
    paths = [home / ".rembg/models" / name / f"{name}.onnx", home / ".u2net" / f"{name}.onnx"]
    for f in paths:
        if f.exists() and f.stat().st_size > 1_000_000:
            return
    dest = paths[0]
    dest.parent.mkdir(parents=True, exist_ok=True)
    part = dest.with_suffix(".part")
    url = f"https://github.com/danielgatis/rembg/releases/download/v0.0.0/{name}.onnx"
    print(f"Downloading {name} (resumable)")
    r = subprocess.run(["curl", "-L", "--fail", "-C", "-", "--retry", "20",
                        "--retry-all-errors", "-o", str(part), url])
    if r.returncode != 0:
        sys.exit(f"Download failed. Rerun to resume, or copy the file to {dest}")
    part.rename(dest)

src, out = Path(a.input), Path(a.output)
if not src.is_dir():
    sys.exit(f"Input folder not found: {src}")
png_dir, svg_dir = out / "png_nobg", out / "svg"
png_dir.mkdir(parents=True, exist_ok=True)
svg_dir.mkdir(parents=True, exist_ok=True)

files = sorted(f for f in src.iterdir() if f.suffix.lower() == ".png")
if not files:
    sys.exit(f"No PNG files in {src}")

# ---- pass 1: background removal
session = None
if use_ai and not a.no_bg_remove:
    ensure_model(model)
    from rembg import new_session, remove
    session = new_session(model)

if a.no_bg_remove:
    method = "skipped"
elif session:
    method = "AI " + model
else:
    method = "edge flood-fill"
print(f"Pass 1/2: background removal ({method})")

cleaned = []
for i, f in enumerate(files, 1):
    name = f.stem.strip().replace(" ", "_")
    img = Image.open(f).convert("RGBA")
    if not a.no_bg_remove:
        img = remove(img, session=session) if session else flood_remove(img, a.tolerance)
    dst = png_dir / f"{name}.png"
    img.save(dst)
    cleaned.append((name, dst))
    print(f"  [{i}/{len(files)}] {f.name}")

# ---- pass 2: SVG tracing (separate process per file)
print("Pass 2/2: converting to SVG")
fails = 0
for i, (name, png) in enumerate(cleaned, 1):
    svg = svg_dir / f"{name}.svg"
    ok = False
    for code in (TRACE_TUNED, TRACE_SIMPLE):
        r = subprocess.run([sys.executable, "-c", code, str(png), str(svg)])
        if r.returncode == 0 and svg.exists():
            ok = True
            break
    print(f"  [{i}/{len(cleaned)}] {name}.svg {'OK' if ok else 'FAILED'}")
    if not ok:
        fails += 1

print(f"\nDone ({len(cleaned) - fails}/{len(cleaned)} SVGs)")
print(f"PNGs: {png_dir}")
print(f"SVGs: {svg_dir}")
