#!/usr/bin/env python3
"""
Generate all Android and web app icons from the Just In Case logo assets.
Uses the mountain-j logo (black for dark mode, white for light mode).
"""
import os
import subprocess
import shutil
from pathlib import Path
from PIL import Image

# Paths
LOGO_ASSETS = Path("/home/yihun/Desktop/worst-case-widget/just-in-case-logo-assets/logo_assets")
PROJECT_ROOT = Path("/home/yihun/Desktop/worst-case-widget")
ANDROID_RES = PROJECT_ROOT / "android" / "app" / "src" / "main" / "res"
PUBLIC_DIR = PROJECT_ROOT / "public"
DIST_DIR = PROJECT_ROOT / "dist"

# Logo sources (mountain-j seems most appropriate for survival app)
MOUNTAIN_J_BLACK_SVG = LOGO_ASSETS / "mountain-j" / "black" / "mountain-j_black.svg"
MOUNTAIN_J_WHITE_SVG = LOGO_ASSETS / "mountain-j" / "white" / "mountain-j_white.svg"
MOUNTAIN_J_BLACK_PNG = LOGO_ASSETS / "mountain-j" / "black" / "mountain-j_black_transparent.png"
MOUNTAIN_J_WHITE_PNG = LOGO_ASSETS / "mountain-j" / "white" / "mountain-j_white_transparent.png"

def run(cmd, cwd=None):
    """Run a command and check for errors."""
    result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error running: {cmd}")
        print(result.stderr)
        raise RuntimeError(f"Command failed: {cmd}")
    return result

def svg_to_png(svg_path, png_path, size):
    """Convert SVG to PNG using rsvg-convert or cairosvg."""
    try:
        run(f"rsvg-convert -w {size} -h {size} '{svg_path}' -o '{png_path}'")
    except:
        # Fallback to cairosvg
        try:
            import cairosvg
            cairosvg.svg2png(url=str(svg_path), write_to=str(png_path), output_width=size, output_height=size)
        except ImportError:
            # Last resort: use PIL with a rasterized version
            print(f"Warning: Could not convert {svg_path} to PNG, using existing PNG if available")
            return False
    return True

def generate_android_icons():
    """Generate all Android mipmap icons."""
    print("Generating Android icons...")
    
    # Mipmap densities and sizes
    densities = {
        "mdpi": 48,
        "hdpi": 72,
        "xhdpi": 96,
        "xxhdpi": 144,
        "xxxhdpi": 192,
    }
    
    # Use black logo for launcher icons (works on both light/dark backgrounds with adaptive icon)
    source_svg = MOUNTAIN_J_BLACK_SVG
    source_png = MOUNTAIN_J_BLACK_PNG
    
    for density, size in densities.items():
        mipmap_dir = ANDROID_RES / f"mipmap-{density}"
        mipmap_dir.mkdir(parents=True, exist_ok=True)
        
        # Regular icon
        icon_path = mipmap_dir / "ic_launcher.png"
        if source_svg.exists():
            svg_to_png(source_svg, icon_path, size)
        elif source_png.exists():
            img = Image.open(source_png)
            img.resize((size, size), Image.Resampling.LANCZOS).save(icon_path)
        print(f"  Created {icon_path}")
        
        # Round icon (same for now)
        round_icon_path = mipmap_dir / "ic_launcher_round.png"
        shutil.copy2(icon_path, round_icon_path)
        print(f"  Created {round_icon_path}")

def generate_adaptive_icon_foreground():
    """Generate adaptive icon foreground (1024x1024 for mdpi scaling)."""
    print("Generating adaptive icon foreground...")
    foreground_dir = ANDROID_RES / "drawable-nodpi"
    foreground_dir.mkdir(parents=True, exist_ok=True)
    
    foreground_path = foreground_dir / "ic_launcher_foreground.png"
    if MOUNTAIN_J_BLACK_SVG.exists():
        svg_to_png(MOUNTAIN_J_BLACK_SVG, foreground_path, 1024)
    elif MOUNTAIN_J_BLACK_PNG.exists():
        img = Image.open(MOUNTAIN_J_BLACK_PNG)
        img.resize((1024, 1024), Image.Resampling.LANCZOS).save(foreground_path)
    print(f"  Created {foreground_path}")

def generate_web_icons():
    """Generate web icons for PWA and browser."""
    print("Generating web icons...")
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    
    # favicon.ico (32x32)
    favicon_path = PUBLIC_DIR / "favicon.ico"
    if MOUNTAIN_J_BLACK_SVG.exists():
        # Create multiple sizes for ICO
        sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
        images = []
        for size in sizes:
            png_path = f"/tmp/favicon_{size[0]}.png"
            svg_to_png(MOUNTAIN_J_BLACK_SVG, png_path, size[0])
            images.append(Image.open(png_path))
        images[0].save(favicon_path, format='ICO', sizes=[(img.width, img.height) for img in images])
    print(f"  Created {favicon_path}")
    
    # Apple touch icon (180x180)
    apple_icon = PUBLIC_DIR / "apple-touch-icon.png"
    if MOUNTAIN_J_BLACK_SVG.exists():
        svg_to_png(MOUNTAIN_J_BLACK_SVG, apple_icon, 180)
    elif MOUNTAIN_J_BLACK_PNG.exists():
        img = Image.open(MOUNTAIN_J_BLACK_PNG)
        img.resize((180, 180), Image.Resampling.LANCZOS).save(apple_icon)
    print(f"  Created {apple_icon}")
    
    # PWA icons (512x512, 192x192)
    for size, name in [(512, "icon-512.png"), (192, "icon-192.png")]:
        icon_path = PUBLIC_DIR / name
        if MOUNTAIN_J_BLACK_SVG.exists():
            svg_to_png(MOUNTAIN_J_BLACK_SVG, icon_path, size)
        elif MOUNTAIN_J_BLACK_PNG.exists():
            img = Image.open(MOUNTAIN_J_BLACK_PNG)
            img.resize((size, size), Image.Resampling.LANCZOS).save(icon_path)
        print(f"  Created {icon_path}")

def generate_splash_screens():
    """Generate splash screen images for different themes."""
    print("Generating splash screens...")
    splash_dir = PUBLIC_DIR / "img"
    splash_dir.mkdir(parents=True, exist_ok=True)
    
    # Dark mode splash (black logo on dark background)
    splash_dark = splash_dir / "splash-dark.png"
    if MOUNTAIN_J_BLACK_SVG.exists():
        # Create a 2732x2732 image with dark background and centered logo
        bg = Image.new('RGBA', (2732, 2732), (20, 20, 22, 255))  # #141416
        logo_size = 512
        logo_path = "/tmp/splash_logo.png"
        svg_to_png(MOUNTAIN_J_BLACK_SVG, logo_path, logo_size)
        logo = Image.open(logo_path).convert('RGBA')
        pos = ((2732 - logo_size) // 2, (2732 - logo_size) // 2)
        bg.paste(logo, pos, logo)
        bg.save(splash_dark)
    print(f"  Created {splash_dark}")
    
    # Light mode splash (white logo on light background)
    splash_light = splash_dir / "splash-light.png"
    if MOUNTAIN_J_WHITE_SVG.exists():
        bg = Image.new('RGBA', (2732, 2732), (247, 246, 243, 255))  # #f7f6f3
        logo_size = 512
        logo_path = "/tmp/splash_logo_light.png"
        svg_to_png(MOUNTAIN_J_WHITE_SVG, logo_path, logo_size)
        logo = Image.open(logo_path).convert('RGBA')
        pos = ((2732 - logo_size) // 2, (2732 - logo_size) // 2)
        bg.paste(logo, pos, logo)
        bg.save(splash_light)
    print(f"  Created {splash_light}")

def generate_notification_icons():
    """Generate notification icons (small, 24x24dp)."""
    print("Generating notification icons...")
    drawable_dir = ANDROID_RES / "drawable"
    drawable_dir.mkdir(parents=True, exist_ok=True)
    
    # Notification icon (white silhouette for dark status bar)
    notif_icon = drawable_dir / "ic_notif_drop.png"
    if MOUNTAIN_J_WHITE_SVG.exists():
        svg_to_png(MOUNTAIN_J_WHITE_SVG, notif_icon, 96)  # 24dp * 4 (xxxhdpi)
    elif MOUNTAIN_J_WHITE_PNG.exists():
        img = Image.open(MOUNTAIN_J_WHITE_PNG)
        img.resize((96, 96), Image.Resampling.LANCZOS).save(notif_icon)
    print(f"  Created {notif_icon}")
    
    # Also create hdpi, xhdpi, xxhdpi, xxxhdpi versions
    for density, size in [("mdpi", 24), ("hdpi", 36), ("xhdpi", 48), ("xxhdpi", 72), ("xxxhdpi", 96)]:
        density_dir = ANDROID_RES / f"drawable-{density}"
        density_dir.mkdir(parents=True, exist_ok=True)
        icon_path = density_dir / "ic_notif_drop.png"
        if MOUNTAIN_J_WHITE_SVG.exists():
            svg_to_png(MOUNTAIN_J_WHITE_SVG, icon_path, size)
        elif MOUNTAIN_J_WHITE_PNG.exists():
            img = Image.open(MOUNTAIN_J_WHITE_PNG)
            img.resize((size, size), Image.Resampling.LANCZOS).save(icon_path)
        print(f"  Created {icon_path}")

def copy_icons_to_dist():
    """Copy generated icons to dist folder for web build."""
    print("Copying icons to dist...")
    DIST_DIR.mkdir(parents=True, exist_ok=True)
    
    for icon in ["favicon.ico", "apple-touch-icon.png", "icon-512.png", "icon-192.png"]:
        src = PUBLIC_DIR / icon
        if src.exists():
            shutil.copy2(src, DIST_DIR / icon)
            print(f"  Copied {icon} to dist")

def main():
    print("=== Generating Just In Case App Icons ===\n")
    
    generate_android_icons()
    print()
    
    generate_adaptive_icon_foreground()
    print()
    
    generate_web_icons()
    print()
    
    generate_splash_screens()
    print()
    
    generate_notification_icons()
    print()
    
    copy_icons_to_dist()
    print()
    
    print("=== Icon generation complete! ===")

if __name__ == "__main__":
    main()