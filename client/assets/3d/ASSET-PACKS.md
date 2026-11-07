# Prepared map assets

Source: `tools/build_map_asset_packs.py` (Blender 5.2).
Rebuild with Blender background mode; the script also renders each pack from
the exported GLBs. `map-asset-packs.json` lists all 27 files.

All props use metre dimensions, ground-level origins, glTF Y-up. Characters and
sign fronts face Blender -Y before export. Preserve the glTF import root's
handedness conversion when placing assets in Babylon.js.

| Pack | Files | Purpose |
| --- | --- | --- |
| halloween | 8 | Pumpkin, closed/open gift, spider, lantern, exit portal, dead tree, fence |
| khu-a | 4 | Seed stall, produce stall, professor, recovery station |
| canteen | 7 | Counter, card machine, picnic table, bread, bao, water, soda |
| community-farm | 8 | Empty soil, four crop plots, mouse, fence, tool shed |

The four packs are integrated by `babylon-map-packs.js`; footprints and spawn
positions are shared with the server in `map-3d-layouts.js`. Rewards and actions
still use the existing Socket.IO handlers. Characters/camera use the common
Babylon host, and each map has an exit vortex reached with directional movement.
Gift closed/open are separate visual states, instantiated from two cached asset
containers for all 50 boxes. Plots use the server crop icon and planting timestamp
to select the model, growth scale and wilted coloring. Community crops do not die.
The professor is a static NPC, not a rigged player.
Portal glow is an emissive material; bloom/particles are applied by the renderer.

Gallery renders in `previews/*-assets.png` show the actual exported geometry.
