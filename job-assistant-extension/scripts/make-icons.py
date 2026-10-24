# Draws the extension icons (a white briefcase on the portfolio's blue) as PNGs, standard library only.
import os, struct, zlib

BLUE = (59, 130, 246)
WHITE = (255, 255, 255)

def png(size, path):
    s = size / 128.0
    def inside_round_rect(x, y, x0, y0, x1, y1, r):
        if x < x0 or x > x1 or y < y0 or y > y1:
            return False
        cx = min(max(x, x0 + r), x1 - r)
        cy = min(max(y, y0 + r), y1 - r)
        return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
    rows = []
    for py in range(size):
        row = bytearray([0])
        for px in range(size):
            x, y = (px + 0.5) / s, (py + 0.5) / s
            if not inside_round_rect(x, y, 4, 4, 124, 124, 26):
                row += bytes((0, 0, 0, 0))
                continue
            col = BLUE
            body = inside_round_rect(x, y, 22, 44, 106, 102, 10)
            handle = inside_round_rect(x, y, 46, 28, 82, 50, 8) and not inside_round_rect(x, y, 54, 35, 74, 50, 3)
            band = 66 <= y <= 72
            if (body and not band) or handle:
                col = WHITE
            row += bytes((*col, 255))
        rows.append(bytes(row))
    raw = zlib.compress(b''.join(rows), 9)
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    data = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)) + chunk(b'IDAT', raw) + chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(data)

here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, '..', 'extension', 'icons')
os.makedirs(out, exist_ok=True)
for n in (16, 48, 128):
    png(n, os.path.join(out, f'icon{n}.png'))
print('icons written')
