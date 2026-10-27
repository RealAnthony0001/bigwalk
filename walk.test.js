// Run: node walk.test.js
const assert = require('node:assert/strict');
const { dist, add, extend, parts, visited, km, summarize, pack, unpack } = require('./walk.js');

const st = ['X', 50, 14];
const hit = p => visited(st, parts(p));

assert.ok(hit([[50.0002, 13.999], [50.0002, 14.001]]), 'passes 22 m from the station');
assert.ok(!hit([[50.003, 13.999], [50.003, 14.001]]), 'passes 333 m away');
assert.ok(hit([[50.0001, 13.9983], [50.0001, 14.0017]]), 'sparse points, segment crosses the station');
assert.ok(!hit([[50, 13.99], [50, 14.01]]), 'jump over 500 m is a break, not a walk');
assert.ok(hit([[50.0003, 14]]), 'single point close by');
const north = m => [[50 + m / 111200, 13.9985], [50 + m / 111200, 14.0015]]; // a 200 m street passing m metres north of the station
assert.ok(hit(north(165)) && !hit(north(175)), 'station radius is 170 m');

const p = []; [[50, 14], [50.00001, 14], [50.001, 14]].forEach(q => add(p, q));
assert.equal(p.length, 2, 'points closer than 10 m are dropped');

assert.ok(Math.abs(km(parts([[50, 14], [50.004, 14]])) - .445) < .005, '0.004° of latitude is 445 m');
assert.equal(km(parts([[50, 14], [50.004, 14], [50.1, 14]])), km(parts([[50, 14], [50.004, 14]])), 'the jump over a gap is not walked distance');

// schematic map: every station placed, none on top of another, all inside the canvas
Object.assign(globalThis, new Function(require('node:fs').readFileSync(__dirname + '/stations.js', 'utf8') + ';return { STATIONS, LINES }')());
const { layout, schematic, SVG_W, SVG_H } = require('./schema.js');
const ps = Object.entries(layout().pos);
assert.equal(ps.length, 58);
ps.forEach(([n, a], i) => {
  assert.ok(a.x > 0 && a.x < SVG_W && a.y > 0 && a.y < SVG_H, n + ' outside canvas');
  ps.slice(i + 1).forEach(([m, b]) => assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 30, `${n} and ${m} are too close`));
});
assert.ok(schematic(STATIONS.map(() => true)).includes('Můstek'));

// clicked route: two clicks 1.1 km apart make one unbroken line that still passes a station halfway
const drawn = []; extend(drawn, [50, 14]); extend(drawn, [50.01, 14]); extend(drawn, [50.01, 14.0001]);
assert.equal(parts(drawn).length, 1, 'no gap in a clicked line');
assert.ok(drawn.every((q, i) => !i || dist(drawn[i - 1], q) <= 100), 'points at most 100 m apart');
assert.deepEqual(drawn.at(-1), [50.01, 14], 'the clicked point itself is kept (a third click 7 m away was dropped)');
assert.ok(visited(['X', 50.005, 14], parts(drawn)), 'station between two clicks is visited');
assert.ok(Math.abs(km(parts(drawn)) - 1.112) < .02, 'distance of the clicked line');
const once = []; extend(once, [50, 14]); extend(once, [50.00002, 14]); assert.equal(once.length, 1, 'a double click adds nothing');

// several walks: per-walk numbers, and "new" counts stations not passed by earlier walks
const A = ['A', 50, 14], B = ['B', 50.01, 14], C = ['C', 50.02, 14], D = ['D', 51, 14]; // ~1.1 km apart, D far away
const walks = [
  { id: 1, name: 'první', date: '2026-10-01', m: null, k: null, p: [[50, 14], [50.004, 14], [50.008, 14], [50.01, 14]] },   // A, B (steps < 500 m)
  { id: 2, name: 'druhá', date: '2026-10-08', m: [50.1, 14.1], k: [50.2, 14.2], e: [50.3, 14.3], p: [[50.01, 14], [50.014, 14], [50.018, 14], [50.02, 14]] }, // B again, plus C
  { id: 3, name: 'jen ručně', date: '2026-10-09', m: null, k: null, p: [], s: ['D', 'A'] }, // D by hand; A also by hand but walk 1 already passed it
];
const sum = summarize(walks, [A, B, C, D]);
assert.deepEqual(sum.rows.map(r => [r.n, r.fresh]), [[2, 2], [2, 1], [2, 1]], 'visited and new stations per walk, hand marks count too');
assert.deepEqual(sum.rows[2].M, [true, false, false, true], 'marked by hand (no path near them)');
assert.deepEqual(sum.rows[0].M, [false, false, false, false], 'passing a station is not a hand mark');
assert.deepEqual(sum.V, [true, true, true, true], 'union over all walks');
assert.ok(Math.abs(sum.rows[0].km - 1.112) < .02 && sum.rows[2].km == 0, 'distance per walk');

assert.deepEqual(unpack(pack(walks)), walks, 'walks survive pack/unpack');
assert.ok(pack(walks).length < 400, 'compact');
console.log('ok');
