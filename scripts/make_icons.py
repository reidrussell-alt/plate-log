"""Render the Lift Tracker app icon (red weight plate stamped LBS, on white) at every size the app needs.

Artwork is defined on a 100x100 grid, drawn at 8x supersampling, then downscaled
for smooth edges. Usage (from the project folder): python3 scripts/make_icons.py icons
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BG = (255, 255, 255)
RED = (217, 52, 43)          # #d9342b, bumper-plate red
FONT = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
PLATE_R, RING_R, RING_W, HUB_R, HOLE_R = 36, 27.5, 1.6, 10.5, 4.5   # on the 100-grid, centred at 50,50
RING = tuple(round(c * 0.45 + 255 * 0.55) for c in RED)            # pale red: white at ~55% over the plate
SLOT_W, SLOT_H = 12, 5.5                                          # white grip slots, top and bottom
SLOTS_Y = (18.5, 76)                                              # top edge of each slot
TEXT, TEXT_SIZE, TEXT_TRACK, TEXT_BASELINE = "LBS", 8.5, 1.6, 70.5


def render(size: int, inset: float = 1.0) -> Image.Image:
    ss = 8
    big = size * ss
    img = Image.new("RGB", (big, big), BG)
    d = ImageDraw.Draw(img)
    unit = big / 100 * inset
    off = (big - 100 * unit) / 2

    def p(v):
        return off + v * unit

    def circle(r, **kw):
        d.ellipse([p(50 - r), p(50 - r), p(50 + r), p(50 + r)], **kw)

    circle(PLATE_R, fill=RED)
    circle(RING_R, outline=RING, width=max(1, round(RING_W * unit)))
    circle(HUB_R, fill=BG)
    circle(HOLE_R, fill=RED)
    for sy in SLOTS_Y:
        d.rounded_rectangle([p(50 - SLOT_W / 2), p(sy), p(50 + SLOT_W / 2), p(sy + SLOT_H)],
                            radius=SLOT_H / 2 * unit, fill=BG)

    font = ImageFont.truetype(FONT, round(TEXT_SIZE * unit))
    widths = [d.textlength(ch, font=font) for ch in TEXT]
    total = sum(widths) + TEXT_TRACK * unit * (len(TEXT) - 1)
    cx = p(50)
    x = cx - total / 2
    for ch, w in zip(TEXT, widths):
        d.text((x, p(TEXT_BASELINE)), ch, font=font, fill=BG, anchor="ls")
        x += w + TEXT_TRACK * unit
    return img.resize((size, size), Image.LANCZOS)


def main(out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    targets = {
        "apple-touch-icon.png": (180, 1.0),   # iOS home screen
        "icon-192.png": (192, 1.0),           # Android / manifest
        "icon-512.png": (512, 1.0),           # manifest, splash
        "icon-512-maskable.png": (512, 0.78), # Android adaptive: artwork inside the safe zone
        "favicon-32.png": (32, 1.0),          # browser tab
    }
    for name, (size, inset) in targets.items():
        render(size, inset).save(out / name, optimize=True)
        print(f"{name:24} {size}x{size}  {(out / name).stat().st_size:>6} bytes")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
