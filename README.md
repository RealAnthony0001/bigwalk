<img src="assets/icon.svg" width="64" height="64" alt="">

# big walk

Created in [T3 Code](https://t3.codes).

Track our Prague metro walks: every walk has a meet place, a kebab place and a route, and every station within 170 m of any route turns green. All walks are on one map; the sidebar (☰ Trasy) lists them with date, distance, stations passed, how many of those were new compared with earlier walks, and a 🗺 Jen trasy button that hides stations, metro lines and pins so only the map and the routes remain (also a per-browser setting), an 👁 switch to hide a walk on the map (that switch is a per-browser view setting; progress still counts hidden walks). The 🚇 Metro map button shows the network like the diagram in the wagons (hand-drawn layout in `schema.js`) with progress and statistics; click a station to jump to it.

## Editor is local, the website is view-only

- **Editing** happens only on your computer: double-click `start.command` (macOS) or run `python3 server.py`, then open http://localhost:8000. Every change is saved to `data/walks.json` on disk (`/?view` previews what viewers see).
- **Publishing** is plain git: commit `data/walks.json` and `git push`; GitHub Pages then shows it to everyone after a minute. `server.py` listens on 127.0.0.1 only, refuses writes that do not come from its own page and never serves `.git/`. Each save keeps the previous version as `data/walks.json.bak` (git-ignored); if the file cannot be read at start, the editor refuses to save over it.
- **The hosted site** (GitHub Pages) can never edit: it only reads `data/walks.json`. Nothing is shown there until the first publish.
- The repo must be public for free GitHub Pages, so the route and the meet/kebab places are public too.
- The edit buttons act on the highlighted walk (click a card; **+ Nová** adds one, ✎ renames it, the date field changes its date, 🗑 deletes it). **Drag a card** onto another to change the order of the walks; it is saved, and the "new stations" counts follow it (the date does not reorder anything).
- **Marking a station by hand:** click a station on the map: its popup lists the walks that visited it, and in the editor a button marks it as visited for the highlighted walk (or removes that hand mark). Hand marks count in that walk's stations and "new" numbers and are listed as "(ručně)"; passing a station can't be unmarked.
- **Drawing a route:** **+ Nová** (or ✏ Trasa on an existing walk) starts drawing: every click on the map adds a waypoint, a click on a station snaps to it, ↶ Zpět takes the last waypoint back, Esc or ✏ stops. Lines are straight between clicks (points are filled in every 100 m, so stations on the way count), so click the bends. 📍 Sraz, 🥙 Kebab and 🏁 Konec place one pin each;

Do not open `index.html` as a file: the offline map needs http. Open the site once online: it downloads the Prague map (40 MB) and the app, then works with no signal (on a phone, "Add to Home Screen" too). The offline copy (service worker) exists only on the hosted site; on localhost the page is always served by the running server, and any old copy there is removed.

Tests: `node walk.test.js`, `python3 server.test.py`.

## Map

`prague.pmtiles` is a Prague-only extract of OpenStreetMap (ODbL), drawn with protomaps-leaflet. Regenerate with `brew install pmtiles`, then
`pmtiles extract https://build.protomaps.com/<YYYYMMDD>.pmtiles prague.pmtiles --bbox=14.22,49.94,14.71,50.18 --maxzoom=15`
and bump `C` in `sw.js` so phones re-download it. Libraries in `vendor/` are Leaflet 1.9.4 and protomaps-leaflet 5.1.0.
