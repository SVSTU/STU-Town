# Canteen 3D asset pack

These 14 models form the playable warm wood/teal canteen. The original
`canteen/` asset files are retained. `client/canteen-v2-scene.js` assembles
the room inside the shared Babylon map host.

Source: `tools/build_canteen_concept_assets.py` (Blender 5.2). Render previews
reimport the exported GLBs, so images show actual asset geometry/materials.
`tools/render_canteen_asset_gallery.py` renders the contact sheet; objects on that
sheet are individually scaled for legibility, not displayed at relative size.

All dimensions are metres; Blender Z-up exports to glTF Y-up. Front faces point
Blender -Y / glTF +Z; preserve the Babylon import root's handedness conversion.
`manifest.json` includes source bounds. Static geometry is batched by material;
the portal and honor boards retain named parts for animation and live data.

| Module | Notes |
| --- | --- |
| food-counter | Counter, transparent display, food and till |
| canopy-menu | Separate slatted canopy; place at ~2.5 m above the counter floor |
| honor-gold / honor-silver | Arched plaques with three named `portrait_slot_*` anchors |
| picnic-table | Table, benches, runner and floral centrepiece |
| ticket-machine | Purple/gold machine with emissive display |
| exit-portal | Static frame/spiral; animation belongs to the runtime renderer |
| potted-plant / hanging-plant | Floor pot / hanging basket; basket origin is pot base |
| pendant-light | Top mounting point is 1 m above its origin |
| recycling-station | Twin wooden recycling/waste cabinet |
| wall-window | Repeatable 4 m rear wall with window and roof beam |
| floor-module | Repeatable 4×4 m tiled floor |
| entry-steps | Three steps, 0.36 m total rise |

The individual studio previews include sample portraits. The playable room hides
these samples and displays actual TOP 3 names, initials and scores from the
server leaderboard; approaching a board opens the existing TOP 10 dialog.
These are stylized models inspired by the reference.

Runtime placement/interaction rules live in `client/map-3d-layouts.js`, shared
with the server: counter and two boards at the rear, a left-facing ticket
machine on the right wall, two tables, clear central paths, and an exit portal
at (620, 160). The server returns Halloween players beside the machine at
(610, 330). The counter footprint also covers the low menu overhang.

The runtime normalizes the imported asset geometry to face -Z; preserve the
glTF importer transforms below that orientation node. Arrow keys and the D-pad
share the controller. Releasing input stops movement. Camera dragging does not
walk the player. Walls/furniture block movement and picking; service access
requires proximity, the correct front and unobstructed line of sight.

Verification: `node tools/verify-map3d.cjs`, `node tools/verify-interactions.cjs`,
`node tools/verify-student-controls.cjs`. With the repository served locally on
port 8766, `node tools/verify-canteen-browser.cjs` checks the actual GLBs, live
controller, service clicks, portal, portrait layout and scene disposal, and
writes desktop/mobile screenshots under `client/assets/3d/previews/`.
