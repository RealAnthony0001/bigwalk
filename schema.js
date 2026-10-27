// Schematic metro map like the diagram in the wagons. Needs STATIONS and LINES (stations.js).
// Each line is a hand-drawn 45°/90° path; its stations sit evenly along it between fixed points (both ends and the transfers).
const SVG_W = 1300, SVG_H = 860;
const SCHEMA = {
  // at: station name -> index of the path vertex it sits on; below/right: station index ranges whose labels go below / right of the line
  A: { path: [[100, 340], [370, 340], [470, 440], [560, 440], [660, 440], [860, 440], [960, 540], [1160, 540]], at: { 'Můstek': 3, 'Muzeum': 4 } },
  B: { path: [[100, 520], [480, 520], [560, 440], [660, 340], [700, 300], [1100, 300]], at: { 'Můstek': 2, 'Florenc': 3 }, below: [0, 11] },
  C: { path: [[740, 40], [740, 120], [660, 200], [660, 340], [660, 440], [660, 640], [760, 740], [1000, 740]], at: { 'Florenc': 3, 'Muzeum': 4 }, below: [15, 19], right: [8, 19] },
};
const OVR = { // hand-placed labels [dx, dy, anchor] where the automatic ones would hit a line
  'Můstek': [10, 22, 'start'], 'Muzeum': [12, -12, 'start'], 'Florenc': [12, 16, 'start'],
  'Náměstí Republiky': [-10, -6, 'end'], 'Staroměstská': [6, -16, 'middle'], 'Hlavní nádraží': [11, 4, 'start'], 'Křižíkova': [10, 26, 'start'],
};

const pt = (L, a) => { // point and direction on a line's path at arc length a
  let i = 1; while (i < L.path.length - 1 && L.cum[i] < a) i++;
  const [p, q] = [L.path[i - 1], L.path[i]], t = (a - L.cum[i - 1]) / (L.cum[i] - L.cum[i - 1]);
  return { x: p[0] + (q[0] - p[0]) * t, y: p[1] + (q[1] - p[1]) * t, dx: q[0] - p[0], dy: q[1] - p[1] };
};
const sub = (L, a0, a1) => 'M' + [a0, ...L.cum.filter(c => c > a0 && c < a1), a1].map(a => { const p = pt(L, a); return p.x.toFixed(1) + ' ' + p.y.toFixed(1); }).join('L');

function layout() {
  const pos = {}, lay = {};
  for (const k in SCHEMA) {
    const { path, at } = SCHEMA[k], names = LINES[k].s, L = lay[k] = { path, arc: [] };
    L.cum = path.map(() => 0);
    path.forEach((p, i) => { if (i) L.cum[i] = L.cum[i - 1] + Math.hypot(p[0] - path[i - 1][0], p[1] - path[i - 1][1]); });
    const fixed = [[0, 0], ...names.flatMap((n, i) => n in at ? [[i, L.cum[at[n]]]] : []), [names.length - 1, L.cum.at(-1)]];
    fixed.forEach(([i, a], j) => { if (j) for (let t = fixed[j - 1][0]; t <= i; t++) L.arc[t] = fixed[j - 1][1] + (a - fixed[j - 1][1]) * (t - fixed[j - 1][0]) / (i - fixed[j - 1][0]); });
    names.forEach((n, i) => pos[n] ||= { ...pt(L, L.arc[i]), k, i });
  }
  return { pos, lay };
}

function label(p, n) {
  const o = OVR[n], S = SCHEMA[p.k], within = r => r && p.i >= r[0] && p.i <= r[1];
  if (o) return { x: p.x + o[0], y: p.y + o[1], a: o[2], r: 0 };
  if (Math.abs(p.dy) < .4 * Math.abs(p.dx)) return within(S.below) ? { x: p.x + 5, y: p.y + 13, a: 'start', r: 45 } : { x: p.x + 5, y: p.y - 10, a: 'start', r: -45 };
  return within(S.right) ? { x: p.x + 11, y: p.y + 4, a: 'start', r: 0 } : { x: p.x - 11, y: p.y + 4, a: 'end', r: 0 };
}

// V[i] = station i (index in STATIONS) visited
function schematic(V) {
  const { pos, lay } = layout(), idx = Object.fromEntries(STATIONS.map((s, i) => [s[0], i]));
  const wash = c => `color-mix(in srgb, ${c} 35%, var(--panel))`;
  const grads = ['AB', 'AC', 'BC'].map(g => `<linearGradient id="g${g}"><stop offset=".5" stop-color="${LINES[g[0]].c}"/><stop offset=".5" stop-color="${LINES[g[1]].c}"/></linearGradient>`).join('');
  let segs = '', ends = '', stns = '';
  for (const k in SCHEMA) {
    const L = lay[k], c = LINES[k].c, names = LINES[k].s;
    names.forEach((n, i) => { if (i) segs += `<path d="${sub(L, L.arc[i - 1], L.arc[i])}" style="stroke:${V[idx[n]] && V[idx[names[i - 1]]] ? c : wash(c)}"/>`; });
    [[0, -1], [names.length - 1, 1]].forEach(([i, s]) => { // line letter at both termini
      const p = pos[names[i]], m = Math.hypot(p.dx, p.dy);
      ends += `<g transform="translate(${p.x + s * p.dx / m * 32} ${p.y + s * p.dy / m * 32})"><circle r="13" style="fill:${c}"/><text y="5" text-anchor="middle" style="fill:#111;font:700 15px system-ui">${k}</text></g>`;
    });
  }
  STATIONS.forEach(([n, , , ls], i) => {
    const p = pos[n], v = V[i], hub = ls.length > 1, l = label(p, n), c = LINES[ls[0]].c;
    const dot = hub ? `<circle cx="${p.x}" cy="${p.y}" r="11" style="fill:${v ? `url(#g${ls})` : 'var(--panel)'};stroke:${v ? 'var(--text)' : 'var(--muted)'};stroke-width:3"/>`
      : `<circle cx="${p.x}" cy="${p.y}" r="7" style="fill:${v ? c : 'var(--panel)'};stroke:${v ? 'var(--text)' : wash(c)};stroke-width:${v ? 2.5 : 3}"/>`;
    stns += `<g class="stn${v ? ' v' : ''}${hub ? ' hub' : ''}" data-i="${i}"><title>${n} · ${v ? 'navštíveno' : 'nenavštíveno'}</title>${dot}<text x="${l.x}" y="${l.y}" text-anchor="${l.a}" transform="rotate(${l.r} ${l.x} ${l.y})">${n}</text></g>`;
  });
  return `<svg viewBox="0 -30 ${SVG_W} ${SVG_H + 30}" role="img" aria-label="Schéma pražského metra s navštívenými stanicemi"><defs>${grads}</defs>${segs}${ends}${stns}</svg>`;
}

if (typeof module !== 'undefined') module.exports = { layout, schematic, SVG_W, SVG_H };
