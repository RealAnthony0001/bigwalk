#!/usr/bin/env python3
"""Local editor: serves this folder on http://localhost:8000, saves the walks to data/walks.json.
Listens on 127.0.0.1 only and checks Host/Origin, so other websites open in your browser cannot write to it."""
import http.server, json, os, shutil, sys
from urllib.parse import unquote

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = 'data/walks.json'


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')  # always see the file you just saved
        super().end_headers()

    def hosts(self):
        return {f'localhost:{self.server.server_port}', f'127.0.0.1:{self.server.server_port}'}

    def allowed(self):
        return self.headers.get('Host') in self.hosts() and self.headers.get('Origin') in {'http://' + h for h in self.hosts()}

    def blocked(self):  # reads need the right Host too (DNS rebinding), and the git folder is never served
        if self.headers.get('Host') in self.hosts() and '.git' not in unquote(self.path.split('?')[0]).split('/'):
            return False
        self.reply(403, 'forbidden')
        return True

    def do_GET(self):
        self.blocked() or super().do_GET()

    def do_HEAD(self):
        self.blocked() or super().do_HEAD()

    def reply(self, code, text=''):
        body = text.encode()
        self.send_response(code)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_PUT(self):
        if not self.allowed() or self.path.split('?')[0] != '/' + DATA:
            return self.reply(403, 'forbidden')
        n = self.headers.get('Content-Length', '')
        if not n.isdigit():
            return self.reply(400, 'no length')
        n = int(n)
        if n > 2_000_000:
            return self.reply(413, 'too big')
        body = self.rfile.read(n)
        try:
            assert isinstance(json.loads(body)['walks'], list)  # see pack() in walk.js
        except Exception:
            return self.reply(400, 'not a walk')
        os.makedirs(os.path.join(ROOT, 'data'), exist_ok=True)
        tmp = os.path.join(ROOT, DATA + '.tmp')
        with open(tmp, 'wb') as f:
            f.write(body)
        live = os.path.join(ROOT, DATA)
        if os.path.exists(live):
            shutil.copyfile(live, live + '.bak')  # shortcut: keeps only the previous version, enough to undo one bad save
        os.replace(tmp, live)
        self.reply(204)


if __name__ == '__main__':
    http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1]) if len(sys.argv) > 1 else 8000), Handler).serve_forever()
