#!/usr/bin/env bash
# Usage: ./png2svg.sh [input_dir] [output_dir] [--tolerance N] [--ai] [--hq] [--no-bg-remove]
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
VENV="${PNG2SVG_VENV:-$HOME/.cache/png2svg-venv}"
NEED="import rembg, vtracer, PIL, onnxruntime, scipy, numpy"

if [ -x "$VENV/bin/python" ] && "$VENV/bin/python" -c "$NEED" 2>/dev/null; then
  PY="$VENV/bin/python"
elif python3 -c "$NEED" 2>/dev/null; then
  PY="$(command -v python3)"
else
  [ -x "$VENV/bin/python" ] || python3 -m venv "$VENV"
  PY="$VENV/bin/python"
  missing=()
  "$PY" -c "import rembg, onnxruntime" 2>/dev/null || missing+=("rembg[cpu]")
  "$PY" -c "import vtracer" 2>/dev/null || missing+=("vtracer")
  "$PY" -c "import PIL" 2>/dev/null || missing+=("pillow")
  "$PY" -c "import scipy, numpy" 2>/dev/null || missing+=("scipy" "numpy")
  echo "Installing: ${missing[*]}"
  "$PY" -m pip install "${missing[@]}"
fi

exec "$PY" "$HERE/png2svg.py" "$@"
