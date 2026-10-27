#!/usr/bin/env python3
"""Local editor: serves this folder on http://localhost:8000, saves the walks to data/walks.json and publishes it with git push.
Listens on 127.0.0.1 only and checks Host/Origin, so other websites open in your browser cannot write to it."""
import http.server, json, os, subprocess, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = 'data/walks.json'


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')  # always see the file you just saved
        super().end_headers()

    def allowed(self):
        hosts = {f'localhost:{self.server.server_port}', f'127.0.0.1:{self.server.server_port}'}
        return self.headers.get('Host') in hosts and self.headers.get('Origin') in {'http://' + h for h in hosts}

    def reply(self, code, text=''):
        body = text.encode()
        self.send_response(code)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_PUT(self):
        if not self.allowed() or self.path.split('?')[0] != '/' + DATA:
            return self.reply(403, 'forbidden')
        n = int(self.headers.get('Content-Length') or 0)
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
        os.replace(tmp, os.path.join(ROOT, DATA))
        self.reply(204)

    def do_POST(self):
        if not self.allowed() or self.path != '/publish':
            return self.reply(403, 'forbidden')
        git = lambda *a: subprocess.run(['git', *a], cwd=ROOT, capture_output=True, text=True, timeout=120, env={**os.environ, 'GIT_TERMINAL_PROMPT': '0'})
        try:
            git('add', DATA)
            git('commit', '-m', 'Big Walk: aktualizace trasy', '--', DATA)  # "nothing to commit" is fine, push may still have work
            p = git('push')
        except subprocess.TimeoutExpired:
            return self.reply(504, 'git push trvá moc dlouho')
        self.reply(200 if p.returncode == 0 else 500, (p.stderr or p.stdout).strip())


if __name__ == '__main__':
    http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1]) if len(sys.argv) > 1 else 8000), Handler).serve_forever()
