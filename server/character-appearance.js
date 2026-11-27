// Use the same catalogue and module allowlist as the renderer. Never accept asset paths.
const assets = require('../client/character-assets');
function normaliseAppearance(input) {
  if (!input || input.characterAssetId !== 'campus-modular-01') return null;
  return { characterAssetId: 'campus-modular-01', characterModules: assets.normaliseModules(input.characterModules, assets.campusSlots) };
}
module.exports = { normaliseAppearance };
