#!/usr/bin/env python3
"""
App icons and Play Store graphics, generated rather than drawn.

Placeholder-quality on purpose — the point is a consistent, legible system
across twelve sibling apps, not final art. Each app gets the same geometry in
its own brand colour, so they read as a family in a phone drawer.

Needs Pillow, which is not a project dependency:
    python3 -m venv /tmp/imgvenv && /tmp/imgvenv/bin/pip install Pillow
    /tmp/imgvenv/bin/python scripts/make-icons.py health
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont

INK   = (13, 13, 16)        # --text / dark ground
PAPER = (242, 241, 234)     # --bg

# One entry per shippable app. Colours come from the cards on the home page.
APPS = {
    'health': {
        'accent': (29, 158, 117),
        'name':   'Health Calculator',
        'tag':    'Calories, macros and goals',
        'glyph':  'pulse',
    },
}

FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FONT_REG  = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'


def pulse_points(cx, cy, w):
    """An ECG trace, centred on (cx, cy) and w wide. Flat, spike, flat."""
    x0 = cx - w / 2
    u = w / 100.0                      # one unit = 1% of the width
    h = w * 0.42                       # spike height
    # (x%, y as a fraction of spike height above baseline)
    shape = [
        (0, 0), (26, 0), (34, 0.22), (44, -0.30),
        (54, 1.0), (64, -0.62), (72, 0), (100, 0),
    ]
    return [(x0 + px * u, cy - py * h) for px, py in shape]


def draw_glyph(d, kind, cx, cy, w, colour, weight):
    if kind == 'pulse':
        d.line(pulse_points(cx, cy, w), fill=colour, width=weight,
               joint='curve')
        # Rounded caps: Pillow's line joints are curved but its ends are not.
        pts = pulse_points(cx, cy, w)
        r = weight / 2
        for x, y in (pts[0], pts[-1]):
            d.ellipse([x - r, y - r, x + r, y + r], fill=colour)
    else:
        raise ValueError(f'unknown glyph {kind!r}')


def rounded_square(size, radius, fill):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(img).rounded_rectangle([0, 0, size - 1, size - 1],
                                          radius=radius, fill=fill)
    return img


def store_icon(app, size=512):
    """Full-bleed square. Play shows it masked, so keep art off the edges."""
    img = Image.new('RGBA', (size, size), INK + (255,))
    d = ImageDraw.Draw(img)
    draw_glyph(d, app['glyph'], size / 2, size / 2, size * 0.62,
               app['accent'], int(size * 0.075))
    return img


def adaptive_foreground(app, size=432):
    """
    Android adaptive icons crop to a shape the launcher chooses. Only the
    centre 66/108 of the canvas is guaranteed visible, so the art lives there
    and everything outside is bleed.
    """
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    safe = size * 66 / 108
    draw_glyph(d, app['glyph'], size / 2, size / 2, safe * 0.86,
               app['accent'], int(size * 0.075))
    return img


def legacy_icon(app, size):
    """Pre-adaptive launchers get a rounded square, drawn at final size."""
    img = rounded_square(size, int(size * 0.22), INK + (255,))
    d = ImageDraw.Draw(img)
    draw_glyph(d, app['glyph'], size / 2, size / 2, size * 0.60,
               app['accent'], max(2, int(size * 0.075)))
    return img


def feature_graphic(app, w=1024, h=500):
    """
    The banner at the top of a Play listing. Play may overlay UI on it and
    crops it on some surfaces, so nothing important goes near an edge.
    """
    img = Image.new('RGBA', (w, h), INK + (255,))
    d = ImageDraw.Draw(img)

    draw_glyph(d, app['glyph'], w * 0.21, h * 0.5, w * 0.23,
               app['accent'], int(h * 0.055))

    x = w * 0.38
    margin = w * 0.05
    avail = w - x - margin

    # Play crops this image on some surfaces and overlays UI on others, so the
    # title is fitted to the available width rather than trusted to fit. A
    # longer app name shrinks instead of running off the edge.
    size = 62
    while size > 30:
        f = ImageFont.truetype(FONT_BOLD, size)
        if d.textlength(app['name'], font=f) <= avail:
            break
        size -= 2
    name = ImageFont.truetype(FONT_BOLD, size)
    tag   = ImageFont.truetype(FONT_REG, 30)
    brand = ImageFont.truetype(FONT_REG, 23)

    d.text((x, h * 0.44), app['name'], font=name, fill=PAPER, anchor='ls')
    d.text((x, h * 0.575), app['tag'], font=tag, fill=PAPER + (165,), anchor='ls')

    by = h * 0.76
    d.text((x, by), '2176 STUDIOS', font=brand, fill=app['accent'], anchor='ls')
    bw = d.textlength('2176 STUDIOS', font=brand)
    d.ellipse([x + bw + 9, by - 16, x + bw + 18, by - 7], fill=app['accent'])
    return img


# Legacy launcher densities, in dp-scaled pixels.
MIPMAPS = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in APPS:
        sys.exit(f'usage: make-icons.py <{"|".join(APPS)}>')
    key = sys.argv[1]
    app = APPS[key]

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    play = os.path.join(root, 'apps', key, 'play')
    res  = os.path.join(root, 'apps', key, 'android-res')
    os.makedirs(play, exist_ok=True)

    store_icon(app).convert('RGB').save(os.path.join(play, 'icon-512.png'))
    feature_graphic(app).convert('RGB').save(
        os.path.join(play, 'feature-graphic-1024x500.png'))

    # Android resource XML is parsed strictly: "--" is illegal inside an XML
    # comment, and aapt fails the whole build over it.
    os.makedirs(os.path.join(res, 'values'), exist_ok=True)
    with open(os.path.join(res, 'values', 'ic_launcher_background.xml'), 'w') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
                '    <color name="ic_launcher_background">#%02X%02X%02X</color>\n'
                '</resources>\n' % INK)

    for d_, px in MIPMAPS.items():
        out = os.path.join(res, f'mipmap-{d_}')
        os.makedirs(out, exist_ok=True)
        legacy_icon(app, px).save(os.path.join(out, 'ic_launcher.png'))
        legacy_icon(app, px).save(os.path.join(out, 'ic_launcher_round.png'))
        fg = adaptive_foreground(app).resize((px * 2, px * 2), Image.LANCZOS)
        fg.save(os.path.join(out, 'ic_launcher_foreground.png'))

    print(f'{key}: wrote play/ and android-res/ under apps/{key}/')

if __name__ == '__main__':
    main()
