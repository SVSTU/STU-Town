/* Babylon.js pilot renderer for the fountain map. The game/server state stays in Phaser/Socket.IO. */
let babylonFountain = null;

function fountainWorldPosition(x, y) {
    return { x: (Number(x) - 400) / 34, z: (Number(y) - 300) / 34 };
}

function createFountainMaterial(scene, name, color, emissive = null) {
    const material = new BABYLON.StandardMaterial(name, scene);
    material.diffuseColor = BABYLON.Color3.FromHexString(color);
    if (emissive) material.emissiveColor = BABYLON.Color3.FromHexString(emissive);
    return material;
}

function addFountainTree(scene, x, z, scale = 1) {
    const trunk = BABYLON.MeshBuilder.CreateCylinder('tree-trunk', { height: 1.2 * scale, diameter: .28 * scale }, scene);
    trunk.position.set(x, .6 * scale, z);
    trunk.material = createFountainMaterial(scene, 'trunk', '#75492d');
    const crown = BABYLON.MeshBuilder.CreateSphere('tree-crown', { diameter: 1.8 * scale, segments: 12 }, scene);
    crown.position.set(x, 1.65 * scale, z);
    crown.material = createFountainMaterial(scene, 'leaves', '#4f914f', '#173a22');
}

function addFountainBench(scene, x, z) {
    const wood = createFountainMaterial(scene, 'bench-wood', '#a9683c');
    const dark = createFountainMaterial(scene, 'bench-dark', '#4e311f');
    const seat = BABYLON.MeshBuilder.CreateBox('bench-seat', { width: 2.8, height: .18, depth: .48 }, scene);
    seat.position.set(x, .72, z); seat.material = wood;
    const back = BABYLON.MeshBuilder.CreateBox('bench-back', { width: 2.8, height: .75, depth: .14 }, scene);
    back.position.set(x, 1.2, z + .23); back.material = wood;
    [-1.05, 1.05].forEach((offset) => {
        const leg = BABYLON.MeshBuilder.CreateBox('bench-leg', { width: .14, height: .7, depth: .2 }, scene);
        leg.position.set(x + offset, .35, z); leg.material = dark;
    });
}

function addFountainObject(scene) {
    const stone = createFountainMaterial(scene, 'fountain-stone', '#dce5dc');
    const water = createFountainMaterial(scene, 'fountain-water', '#2d9fbc', '#0e536b');
    const rim = BABYLON.MeshBuilder.CreateCylinder('fountain-rim', { diameter: 6.2, height: .55, tessellation: 48 }, scene);
    rim.position.y = .28; rim.material = stone;
    const basin = BABYLON.MeshBuilder.CreateCylinder('fountain-basin', { diameter: 5.5, height: .18, tessellation: 48 }, scene);
    basin.position.y = .6; basin.material = water;
    const inner = BABYLON.MeshBuilder.CreateCylinder('fountain-inner', { diameter: 3.7, height: .12, tessellation: 48 }, scene);
    inner.position.y = .72; inner.material = createFountainMaterial(scene, 'fountain-inner', '#68d8e6', '#155f75');
    const pillar = BABYLON.MeshBuilder.CreateCylinder('fountain-pillar', { diameter: .42, height: 1.7, tessellation: 24 }, scene);
    pillar.position.y = 1.35; pillar.material = stone;
    const jet = BABYLON.MeshBuilder.CreateCylinder('fountain-jet', { diameterTop: .03, diameterBottom: .22, height: 2.1, tessellation: 16 }, scene);
    jet.position.y = 2.65; jet.material = createFountainMaterial(scene, 'fountain-jet', '#a9f4ff', '#5ddbe9');
    scene.onBeforeRenderObservable.add(() => { jet.scaling.y = 1 + Math.sin(performance.now() / 220) * .08; });
}

function createBabylonHuman(scene, id) {
    const root = new BABYLON.TransformNode(`player-${id}`, scene);
    const isMe = id === socket.id;
    const shirt = createFountainMaterial(scene, `shirt-${id}`, isMe ? '#2aa96b' : '#d87536');
    const skin = createFountainMaterial(scene, `skin-${id}`, '#f2c39f');
    const body = BABYLON.MeshBuilder.CreateCylinder('human-body', { height: 1.05, diameterTop: .42, diameterBottom: .58, tessellation: 8 }, scene);
    body.parent = root; body.position.y = .85; body.material = shirt;
    const head = BABYLON.MeshBuilder.CreateSphere('human-head', { diameter: .52, segments: 12 }, scene);
    head.parent = root; head.position.y = 1.62; head.material = skin;
    [-.28, .28].forEach((x) => {
        const arm = BABYLON.MeshBuilder.CreateCylinder('human-arm', { height: .8, diameter: .13, tessellation: 8 }, scene);
        arm.parent = root; arm.position.set(x, .86, 0); arm.rotation.z = x < 0 ? -.12 : .12; arm.material = shirt;
        const leg = BABYLON.MeshBuilder.CreateBox('human-leg', { width: .16, height: .72, depth: .2 }, scene);
        leg.parent = root; leg.position.set(x * .55, .28, 0); leg.material = createFountainMaterial(scene, `pants-${id}`, '#334b75');
    });
    const shadow = BABYLON.MeshBuilder.CreateDisc('human-shadow', { radius: .48, tessellation: 24 }, scene);
    shadow.parent = root; shadow.rotation.x = Math.PI / 2; shadow.position.y = .015; shadow.material = createFountainMaterial(scene, `shadow-${id}`, '#14251b');
    if (BABYLON.GUI) {
        const label = new BABYLON.GUI.Rectangle(`name-${id}`);
        label.width = '110px'; label.height = '25px'; label.cornerRadius = 6; label.thickness = 0;
        label.background = isMe ? '#1c7d52' : '#9a4d2b';
        const text = new BABYLON.GUI.TextBlock(); text.text = players[id]?.playerNickname || (isMe ? 'Bạn' : `Khách (${id.slice(0, 4)})`); text.color = 'white'; text.fontSize = 12;
        label.addControl(text); babylonFountain.gui.addControl(label); label.linkWithMesh(head); label.linkOffsetY = -45; root._nameLabel = label; root._nameText = text;
    }
    return root;
}

function activateBabylonFountain() {
    if (!window.BABYLON || babylonFountain) return Boolean(babylonFountain);
    const canvas = document.createElement('canvas'); canvas.id = 'babylon-fountain-canvas'; document.body.appendChild(canvas);
    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    const scene = new BABYLON.Scene(engine); scene.clearColor = new BABYLON.Color4(.055, .12, .08, 1);
    const camera = new BABYLON.ArcRotateCamera('fountain-camera', -Math.PI / 2, 1.05, 19, new BABYLON.Vector3(0, .5, 0), scene);
    camera.attachControl(canvas, true); camera.lowerRadiusLimit = 13; camera.upperRadiusLimit = 24; camera.wheelPrecision = 70;
    new BABYLON.HemisphericLight('fountain-sun', new BABYLON.Vector3(0, 1, 0), scene).intensity = .9;
    const ground = BABYLON.MeshBuilder.CreateGround('fountain-ground', { width: 22, height: 16 }, scene); ground.material = createFountainMaterial(scene, 'ground', '#78a866');
    addFountainObject(scene); addFountainTree(scene, -8, -5, 1.15); addFountainTree(scene, 8, -5, 1.15); addFountainTree(scene, -8, 4, .85); addFountainTree(scene, 8, 4, .85); addFountainBench(scene, -5, 3.2); addFountainBench(scene, 5, 3.2);
    const gui = BABYLON.GUI ? BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI('fountain-gui', true, scene) : null;
    babylonFountain = { canvas, engine, scene, gui, players: new Map() };
    canvas.addEventListener('pointerdown', (event) => { const rect = canvas.getBoundingClientRect(); targetPosition = { x: ((event.clientX - rect.left) / rect.width) * 800, y: ((event.clientY - rect.top) / rect.height) * 600 }; });
    const phaserCanvas = document.querySelector('canvas:not(#babylon-fountain-canvas)'); if (phaserCanvas) phaserCanvas.classList.add('phaser-map-hidden');
    engine.runRenderLoop(() => scene.render()); window.addEventListener('resize', () => engine.resize());
    updateBabylonFountainPlayers(); return true;
}

function updateBabylonFountainPlayers() {
    if (!babylonFountain) return;
    Object.entries(players || {}).forEach(([id, player]) => {
        if (!babylonFountain.players.has(id)) babylonFountain.players.set(id, createBabylonHuman(babylonFountain.scene, id));
        const mesh = babylonFountain.players.get(id); const pos = fountainWorldPosition(player.x, player.y); mesh.position.x = pos.x; mesh.position.z = pos.z;
        if (mesh._nameText) mesh._nameText.text = player.playerNickname || (id === socket.id ? 'Bạn' : `Khách (${id.slice(0, 4)})`);
    });
    babylonFountain.players.forEach((mesh, id) => { if (!players[id]) { mesh._nameLabel?.dispose(); mesh.dispose(); babylonFountain.players.delete(id); } });
}

function deactivateBabylonFountain() {
    if (!babylonFountain) return;
    babylonFountain.engine.dispose(); babylonFountain.canvas.remove(); babylonFountain = null;
    document.querySelector('canvas:not(#babylon-fountain-canvas)')?.classList.remove('phaser-map-hidden');
}
