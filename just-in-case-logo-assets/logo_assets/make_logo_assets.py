#!/usr/bin/env python3
"""
Split a "light | dark" logo sheet into standalone logo marks and export, for each:
  - transparent PNG   (background removed)
  - PNG with its own solid background (white or black)
  - SVG               (traced from the artwork, pure vector, no background)

Each input image is expected to be a side-by-side pair:
    LEFT half  = black mark on white
    RIGHT half = white mark on black

    pip install opencv-python numpy pillow
    python3 make_logo_assets.py "Light_and_Dark_Mountain_J_Logo_Split.png" mountain-j  \
                                "Minimalist_Just_in_Case_Logo_Split.png"  compass-j  -o logo_assets
"""
import argparse
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

OUT_SIZE = 1024        # exported canvas (square)
MARK_FILL = 0.70       # mark occupies this fraction of the canvas
TRACE_SCALE = 4        # upsample factor before tracing (smoother curves)
SIMPLIFY_EPS = 0.9     # polygon simplification in traced-pixel units (smaller = more faithful)
MIN_AREA = 12          # drop specks smaller than this (traced px^2)


def ink_map(panel, dark_on_light):
    """0..255 'ink' strength: 255 where the mark is, 0 on background (noise-stretched)."""
    g = cv2.cvtColor(panel, cv2.COLOR_BGR2GRAY).astype(np.float32)
    ink = 255 - g if dark_on_light else g
    lo, hi = 25.0, 230.0                     # kill faint background noise, keep clean edges
    return (np.clip((ink - lo) / (hi - lo), 0, 1) * 255).astype(np.uint8)


def square_crop_box(ink):
    ys, xs = np.where(ink > 128)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    side = max(x1 - x0, y1 - y0) / MARK_FILL
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    return cx - side / 2, cy - side / 2, side


def render_square(ink, box, size):
    """Crop the (possibly out-of-bounds) square box from ink and resize to size x size."""
    x0, y0, side = box
    scale = size / side
    M = np.array([[scale, 0, -x0 * scale], [0, scale, -y0 * scale]], dtype=np.float32)
    return cv2.warpAffine(ink, M, (size, size), flags=cv2.INTER_CUBIC,
                          borderMode=cv2.BORDER_CONSTANT, borderValue=0)


def trace_svg(ink_big, size_out, fill):
    """Trace a high-res ink map into a single evenodd-filled SVG path."""
    _, bw = cv2.threshold(ink_big, 128, 255, cv2.THRESH_BINARY)
    contours, hier = cv2.findContours(bw, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    k = size_out / ink_big.shape[0]
    parts = []
    for c in contours:
        if cv2.contourArea(c) < MIN_AREA:
            continue
        a = cv2.approxPolyDP(c, SIMPLIFY_EPS, True).reshape(-1, 2) * k
        if len(a) < 3:
            continue
        parts.append("M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in a) + " Z")
    d = " ".join(parts)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size_out} {size_out}" '
            f'width="{size_out}" height="{size_out}">\n'
            f'  <path fill="{fill}" fill-rule="evenodd" d="{d}"/>\n</svg>\n')


def process(path, name, out):
    img = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if img is None:
        raise SystemExit(f"cannot read {path}")
    h, w = img.shape[:2]
    mid = w // 2
    left, right = img[:, :mid], img[:, mid:2 * mid]

    ink_black = ink_map(left, dark_on_light=True)     # black mark
    ink_white = ink_map(right, dark_on_light=False)   # white mark
    box = square_crop_box(ink_black)                  # same framing for both versions

    for label, ink, rgb, bg, svg_fill in (
        ("black", ink_black, (13, 13, 13), (255, 255, 255), "#0d0d0d"),
        ("white", ink_white, (255, 255, 255), (13, 13, 13), "#ffffff"),
    ):
        d = out / name / label
        d.mkdir(parents=True, exist_ok=True)

        alpha = render_square(ink, box, OUT_SIZE)
        rgba = np.zeros((OUT_SIZE, OUT_SIZE, 4), np.uint8)
        rgba[..., :3] = rgb
        rgba[..., 3] = alpha
        Image.fromarray(rgba, "RGBA").save(d / f"{name}_{label}_transparent.png", optimize=True)

        a = alpha[..., None].astype(np.float32) / 255
        solid = (np.array(rgb, np.float32) * a + np.array(bg, np.float32) * (1 - a)).astype(np.uint8)
        Image.fromarray(solid, "RGB").save(d / f"{name}_{label}_on-{'white' if label == 'black' else 'black'}.png",
                                           optimize=True)

        big = render_square(ink, box, OUT_SIZE * TRACE_SCALE // 2)  # 2048 px for tracing
        (d / f"{name}_{label}.svg").write_text(trace_svg(big, OUT_SIZE, svg_fill), encoding="utf-8")
        print(f"  {name}/{label}: transparent.png, on-bg.png, .svg")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pairs", nargs="+", help="image1 name1 [image2 name2 ...]")
    ap.add_argument("-o", "--out", default="logo_assets")
    a = ap.parse_args()
    if len(a.pairs) % 2:
        raise SystemExit("give pairs of: <image> <name>")
    out = Path(a.out)
    for i in range(0, len(a.pairs), 2):
        print(a.pairs[i])
        process(a.pairs[i], a.pairs[i + 1], out)
    print("done ->", out.resolve())


if __name__ == "__main__":
    main()
