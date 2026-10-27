# Run: python3 server.test.py — drives server.py against a temporary git repo with a local bare remote
import http.server, json, os, subprocess, tempfile, threading, urllib.error, urllib.request
import importlib.util

spec = importlib.util.spec_from_file_location('server', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'server.py'))
server = importlib.util.module_from_spec(spec); spec.loader.exec_module(server)

tmp = tempfile.mkdtemp()
bare, work = os.path.join(tmp, 'remote.git'), os.path.join(tmp, 'work')
sh = lambda *a, cwd=work: subprocess.run(a, cwd=cwd, check=True, capture_output=True, text=True).stdout
os.makedirs(work)
sh('git', 'init', '--bare', '-b', 'main', bare, cwd=tmp)
sh('git', 'init', '-b', 'main'); sh('git', 'config', 'user.email', 't@t'); sh('git', 'config', 'user.name', 't')
open(os.path.join(work, 'index.html'), 'w').write('hi')
sh('git', 'add', '.'); sh('git', 'commit', '-m', 'init'); sh('git', 'remote', 'add', 'origin', bare); sh('git', 'push', '-u', 'origin', 'main')

server.ROOT = work
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()
port = srv.server_port
good = {'Origin': f'http://localhost:{port}'}

def req(method, path, body=None, headers=good):
    r = urllib.request.Request(f'http://localhost:{port}{path}', data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(r) as x: return x.status, x.read().decode(), x.headers
    except urllib.error.HTTPError as e: return e.code, e.read().decode(), e.headers

walk = json.dumps({'walks': [{'id': 1, 'name': 'první', 'p': [5008000, 1443000, 12, -3]}]}).encode()
data = os.path.join(work, 'data', 'walks.json')

assert req('PUT', '/data/walks.json', walk)[0] == 204 and open(data, 'rb').read() == walk, 'saves the walk'
code, body, h = req('GET', '/data/walks.json', headers={})
assert code == 200 and body.encode() == walk and h['Cache-Control'] == 'no-cache', 'serves it back, uncached'

other = json.dumps({'walks': []}).encode()
assert req('PUT', '/data/walks.json', other, {'Origin': 'http://evil.example'})[0] == 403, 'foreign origin refused'
assert req('PUT', '/data/walks.json', other, {})[0] == 403, 'no origin refused'
assert req('PUT', '/data/walks.json', other, {'Origin': f'http://localhost:{port}', 'Host': 'evil.example'})[0] == 403, 'rebinding host refused'
assert req('PUT', '/index.html', other)[0] == 403, 'only the walk file is writable'
assert req('PUT', '/data/walks.json', b'not json')[0] == 400 and req('PUT', '/data/walks.json', b'{"a":1}')[0] == 400, 'garbage refused'
assert open(data, 'rb').read() == walk, 'refused requests changed nothing'

assert req('POST', '/publish', headers={'Origin': 'http://evil.example'})[0] == 403, 'publish needs our origin'
code, msg, _ = req('POST', '/publish')
assert code == 200, msg
assert 'aktualizace trasy' in sh('git', '--git-dir', bare, 'log', '-1', '--format=%s', cwd=tmp), 'commit reached the remote'
assert sh('git', '--git-dir', bare, 'show', 'main:data/walks.json', cwd=tmp).encode() == walk
assert req('POST', '/publish')[0] == 200, 'publishing with nothing new is fine'
print('ok')
