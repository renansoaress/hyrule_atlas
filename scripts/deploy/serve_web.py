"""Servidor HTTP do Hyrule Atlas: o http.server do Python com tipos e cache certos.

    python3 serve_web.py /root/projects/botw_web --port 5510 --bind 127.0.0.1

- tipos MIME de .webp/.mjs/.webmanifest (o Python 3.9 não conhece o .webp);
- index.html sem cache, para uma versão nova aparecer logo;
- imagens, fonte e o bundle com cache longo (os nomes mudam a cada build ou o conteúdo é estável);
- os downloads (HTML único e ZIP) com Content-Disposition para salvar o arquivo.

É o que o botw_web.service roda no servidor; o nginx na frente cuida do HTTPS e da compressão.
"""

import argparse
import functools
import mimetypes
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("text/javascript", ".mjs")
mimetypes.add_type("application/manifest+json", ".webmanifest")


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        path = self.path.split("?", 1)[0]
        name = path.rsplit("/", 1)[-1]
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        if name in ("", "index.html"):
            self.send_header("Cache-Control", "no-cache")
        elif path.startswith("/downloads/"):
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Content-Disposition", f'attachment; filename="{name}"')
        elif path.startswith("/assets/"):
            self.send_header("Cache-Control", "public, max-age=86400")
        super().end_headers()

    def log_message(self, fmt, *args):  # o nginx já registra os acessos
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("directory", nargs="?", default="release/Hyrule-Atlas-Offline")
    parser.add_argument("--port", type=int, default=5510)
    parser.add_argument("--bind", default="127.0.0.1")
    args = parser.parse_args()

    # O caminho é resolvido a cada pedido: trocar a pasta no deploy (mv) não exige reiniciar.
    handler = functools.partial(Handler, directory=args.directory)
    with ThreadingHTTPServer((args.bind, args.port), handler) as server:
        print(f"Hyrule Atlas em http://{args.bind}:{args.port} ({args.directory})", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
