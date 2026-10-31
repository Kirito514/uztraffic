#!/usr/bin/env python
"""OQIM AI — Brend qo‘llanmasi yig‘uvchisi.

    python build.py            # PDF + barcha sahifa PNG + kontakt varag‘i
    python build.py --png      # faqat PNG va kontakt varag‘i
    python build.py --pdf      # faqat PDF

Sahifa HTTP orqali ochiladi (vaqtinchalik `python -m http.server`),
chunki logo ../logo/ dan, shriftlar esa CSS orqali yuklanadi.
Server ildizi — E:\\uztraffic\\brand (brandbook/ va logo/ ikkalasi ham ko‘rinadi).
"""
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SUB = os.path.basename(HERE)
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
PDF = os.path.join(HERE, "OQIM-AI-Brand-Book.pdf")
PAGES = os.path.join(HERE, "pages")
W, H = 1600, 1000


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


def start_server():
    port = free_port()
    # `python -m http.server` bilan bir xil, faqat navbat (backlog) 5 emas, 256:
    # bir nechta Edge parallel ulanganda CSS/rasm so‘rovlari rad etilmasin.
    code = "\n".join([
        "import http.server, functools, sys",
        "class S(http.server.ThreadingHTTPServer):",
        "    request_queue_size = 256",
        "    daemon_threads = True",
        "class H(http.server.SimpleHTTPRequestHandler):",
        "    def log_message(self, *a): pass",
        "S(('127.0.0.1', int(sys.argv[1])), functools.partial(H, directory=sys.argv[2])).serve_forever()",
    ])
    proc = subprocess.Popen(
        [sys.executable, "-c", code, str(port), ROOT],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    for _ in range(100):
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.2):
                return proc, port
        except OSError:
            time.sleep(0.1)
    proc.kill()
    raise RuntimeError("HTTP server ishga tushmadi")


def edge(args, timeout=180):
    profile = tempfile.mkdtemp(prefix="oqim-edge-")
    try:
        cmd = [EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
               "--no-default-browser-check", "--disable-extensions", "--force-color-profile=srgb",
               f"--user-data-dir={profile}"] + args
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=timeout)
    finally:
        shutil.rmtree(profile, ignore_errors=True)


def page_count():
    html = open(os.path.join(HERE, "index.html"), encoding="utf-8").read()
    return len(re.findall(r'<section class="page[ "]', html))


def build_pdf(base):
    if os.path.exists(PDF):
        os.remove(PDF)
    edge(["--no-pdf-header-footer", "--run-all-compositor-stages-before-draw",
          "--virtual-time-budget=40000", f"--print-to-pdf={PDF}", base], timeout=300)
    if not os.path.exists(PDF):
        raise RuntimeError("PDF yaratilmadi")
    data = open(PDF, "rb").read()
    n = len(re.findall(rb"/Type\s*/Page[^s]", data))
    print(f"PDF: {PDF}  ({len(data) / 1e6:.1f} MB, {n} sahifa)")


def shot(base, i):
    out = os.path.join(PAGES, f"page-{i:02d}.png")
    for _ in range(4):  # parallel Edge ba’zan bo‘sh chiqadi — qayta urinish
        edge([f"--window-size={W},{H}", "--virtual-time-budget=20000",
              "--run-all-compositor-stages-before-draw", f"--screenshot={out}", f"{base}?page={i}"])
        if os.path.exists(out) and os.path.getsize(out) > 0:
            return out
        time.sleep(0.5)
    return None


def build_pngs(base):
    os.makedirs(PAGES, exist_ok=True)
    for f in os.listdir(PAGES):
        if f.startswith("page-") or f.startswith("_overview"):
            os.remove(os.path.join(PAGES, f))
    n = page_count()
    with ThreadPoolExecutor(max_workers=4) as ex:
        outs = list(ex.map(lambda i: shot(base, i), range(1, n + 1)))
    ok = [o for o in outs if o]
    print(f"PNG: {len(ok)}/{n} sahifa -> {PAGES}")
    contact_sheet(ok)


def contact_sheet(files):
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        print("Pillow yo‘q — kontakt varag‘i o‘tkazib yuborildi")
        return
    cols, tw, th, gap, lab = 5, 400, 250, 24, 22
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (tw + gap) + gap, rows * (th + gap + lab) + gap), (220, 216, 211))
    d = ImageDraw.Draw(sheet)
    for k, f in enumerate(files):
        im = Image.open(f).convert("RGB").resize((tw, th), Image.LANCZOS)
        x = gap + (k % cols) * (tw + gap)
        y = gap + (k // cols) * (th + gap + lab)
        sheet.paste(im, (x, y))
        d.text((x, y + th + 5), os.path.basename(f)[5:7], fill=(60, 56, 52))
    out = os.path.join(PAGES, "_overview.jpg")
    sheet.save(out, quality=88)
    print(f"Kontakt varag‘i: {out}")


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    want_pdf = "--png" not in sys.argv
    want_png = "--pdf" not in sys.argv
    proc, port = start_server()
    base = f"http://127.0.0.1:{port}/{SUB}/index.html"
    try:
        if want_pdf:
            build_pdf(base)
        if want_png:
            build_pngs(base)
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


if __name__ == "__main__":
    main()
