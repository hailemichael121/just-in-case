#!/usr/bin/env python3
"""
Update splash and notification icons with the new Just In Case logo (mountain-j).
"""
import os
import subprocess
from pathlib import Path
from PIL import Image

LOGO_ASSETS = Path("/home/yihun/Desktop/worst-case-widget/just-in-case-logo-assets/logo_assets")
ANDROID_RES = Path("/home/yihun/Desktop/worst-case-widget/android/app/src/main/res")

MOUNTAIN_J_BLACK_SVG = LOGO_ASSETS / "mountain-j" / "black" / "mountain-j_black.svg"
MOUNTAIN_J_WHITE_SVG = LOGO_ASSETS / "mountain-j" / "white" / "mountain-j_white.svg"
MOUNTAIN_J_BLACK_PNG = LOGO_ASSETS / "mountain-j" / "black" / "mountain-j_black_transparent.png"
MOUNTAIN_J_WHITE_PNG = LOGO_ASSETS / "mountain-j" / "white" / "mountain-j_white_transparent.png"

def run(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {cmd}")
        print(result.stderr)
    return result

def svg_to_png(svg_path, png_path, size):
    try:
        run(f"rsvg-convert -w {size} -h {size} '{svg_path}' -o '{png_path}'")
        return True
    except:
        try:
            import cairosvg
            cairosvg.svg2png(url=str(svg_path), write_to=str(png_path), output_width=size, output_height=size)
            return True
        except ImportError:
            pass
    return False

def generate_splash_icon():
    """Generate splash screen icon (drawable-nodpi/ic_splash_drop.png) - 512x512, black logo"""
    print("Generating splash icon...")
    splash_path = ANDROID_RES / "drawable-nodpi" / "ic_splash_drop.png"
    splash_path.parent.mkdir(parents=True, exist_ok=True)
    
    if MOUNTAIN_J_BLACK_SVG.exists():
        svg_to_png(MOUNTAIN_J_BLACK_SVG, splash_path, 512)
    elif MOUNTAIN_J_BLACK_PNG.exists():
        img = Image.open(MOUNTAIN_J_BLACK_PNG)
        img.resize((512, 512), Image.Resampling.LANCZOS).save(splash_path)
    print(f"  Created {splash_path}")

def generate_notification_icons():
    """Generate notification icons (white silhouette for dark status bar)"""
    print("Generating notification icons...")
    
    densities = {
        "mdpi": 24,
        "hdpi": 36,
        "xhdpi": 48,
        "xxhdpi": 72,
        "xxxhdpi": 96,
        "nodpi": 96,  # base
    }
    
    for density, size in densities.items():
        drawable_dir = ANDROID_RES / f"drawable-{density}" if density != "nodpi" else ANDROID_RES / "drawable"
        drawable_dir.mkdir(parents=True, exist_ok=True)
        
        icon_path = drawable_dir / "ic_notif_drop.png"
        
        # Use white logo for notification (silhouette on dark status bar)
        if MOUNTAIN_J_WHITE_SVG.exists():
            svg_to_png(MOUNTAIN_J_WHITE_SVG, icon_path, size)
        elif MOUNTAIN_J_WHITE_PNG.exists():
            img = Image.open(MOUNTAIN_J_WHITE_PNG)
            img.resize((size, size), Image.Resampling.LANCZOS).save(icon_path)
        print(f"  Created {icon_path}")

def generate_splash_screens():
    """Generate splash screen images for web (dark and light)"""
    print("Generating splash screens...")
    splash_dir = Path("/home/yihun/Desktop/worst-case-widget/public/img")
    splash_dir.mkdir(parents=True, exist_ok=True)
    
    # Dark mode splash (black logo on dark background)
    splash_dark = splash_dir / "splash-dark.png"
    if MOUNTAIN_J_BLACK_SVG.exists():
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

def main():
    print("=== Updating Splash & Notification Icons ===\n")
    generate_splash_icon()
    print()
    generate_notification_icons()
    print()
    generate_splash_screens()
    print()
    print("=== Done! ===")

if __name__ == "__main__":
    main()