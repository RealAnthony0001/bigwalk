// Pure walk logic (no DOM, no map). Loaded as a plain script in the browser, require()d by walk.test.js.
const R = 170, GAP = 500, MIN = 10, E = 1e5; // metres: station radius, max step before the path counts as broken, min spacing of kept points

const dist = (a, b) => { // haversine, metres
  const r = Math.PI / 180, h = Math.sin((b[0] - a[0]) * r / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin((b[1] - a[1]) * r / 2) ** 2;
  return 12742000 * Math.asin(Math.sqrt(h));
};

const add = (p, q) => { const l = p.at(-1); if (!l || dist(l, q) >= MIN) p.push(q); };

// A clicked waypoint: fill in points every <= 100 m so the line stays one walk (steps over GAP count as a break) and passes stations in between.
const extend = (p, q) => {
  const l = p.at(-1), n = l ? Math.ceil(dist(l, q) / 100) : 1;
  for (let j = 1; j <= n; j++) add(p, l ? [l[0] + (q[0] - l[0]) * j / n, l[1] + (q[1] - l[1]) * j / n] : q);
};

const km = P => P.reduce((s, part) => s + part.reduce((a, q, i) => a + (i ? dist(part[i - 1], q) : 0), 0), 0) / 1000; // walked distance of parts(p)

// Split a path wherever two neighbours are > GAP apart (tram ride, tracking switched off): never draw or count the straight line across.
const parts = p => p.reduce((a, q, i) => { if (i && dist(p[i - 1], q) > GAP) a.push([]); a.at(-1).push(q); return a; }, [[]]);

// station s = [name, lat, lng]; true if any path segment passes within R metres
const visited = (s, P) => {
  const c = Math.cos(s[1] * Math.PI / 180) * 111320, f = ([y, x]) => [(x - s[2]) * c, (y - s[1]) * 111200]; // local metres, station at origin
  return P.some(part => part.map(f).some((a, i, v) => {
    const [ax, ay] = a, [bx, by] = v[i + 1] || a, dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
    const t = l ? Math.min(1, Math.max(0, -(ax * dx + ay * dy) / l)) : 0;
    return Math.hypot(ax + t * dx, ay + t * dy) <= R;
  }));
};

// Per walk (in list order): its path parts, the stations it passes or was marked with by hand (w.s = station names), distance,
// and how many stations are new compared with the walks before it. M = stations that are only marked by hand. V = stations visited by any walk.
const summarize = (W, stations) => {
  const seen = stations.map(() => false);
  const rows = W.map(w => {
    const P = parts(w.p), A = stations.map(s => visited(s, P)), V = A.map((a, i) => a || (w.s || []).includes(stations[i][0]));
    const fresh = V.filter((v, i) => v && !seen[i]).length;
    V.forEach((v, i) => seen[i] ||= v);
    return { P, V, M: V.map((v, i) => v && !A[i]), km: km(P), n: V.filter(Boolean).length, fresh };
  });
  return { rows, V: seen };
};

// Published format: { walks: [{ id, name, date, m, k, p }] }, each path as delta-encoded integer coordinates (about 1 m).
const pack = W => JSON.stringify({ walks: W.map(w => { let a = 0, b = 0; return { ...w, p: w.p.flatMap(([y, x]) => { const r = [Math.round(y * E) - a, Math.round(x * E) - b]; a += r[0]; b += r[1]; return r; }) }; }) });
const unpack = t => JSON.parse(t).walks.map(w => { let a = 0, b = 0; const p = []; for (let i = 0; i < w.p.length; i += 2) { a += w.p[i]; b += w.p[i + 1]; p.push([a / E, b / E]); } return { ...w, p }; });

if (typeof module !== 'undefined') module.exports = { dist, add, extend, parts, visited, km, summarize, pack, unpack };
