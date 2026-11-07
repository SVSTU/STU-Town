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
    const stone = createFountainMaterial(scene, 'bench-stone', '#e7dcc1');
    const seat = BABYLON.MeshBuilder.CreateBox('bench-seat', { width: 2.8, height: .18, depth: .48 }, scene);
    seat.position.set(x, .78, z); seat.material = wood;
    for (let index = -1; index <= 1; index++) {
        const slat = BABYLON.MeshBuilder.CreateBox('bench-seat-slat', { width: 2.78, height: .08, depth: .13 }, scene);
        slat.position.set(x, .84 + index * .14, z - index * .03); slat.material = wood;
    }
    const back = BABYLON.MeshBuilder.CreateBox('bench-back', { width: 2.72, height: .68, depth: .12 }, scene);
    back.position.set(x, 1.32, z + .25); back.material = wood;
    [-1.05, 1.05].forEach((offset) => {
        const support = BABYLON.MeshBuilder.CreateBox('bench-stone-support', { width: .42, height: 1.18, depth: .72 }, scene);
        support.position.set(x + offset, .59, z); support.material = stone;
        const cap = BABYLON.MeshBuilder.CreateBox('bench-stone-cap', { width: .62, height: .18, depth: .84 }, scene);
        cap.position.set(x + offset, 1.16, z); cap.material = stone;
        const base = BABYLON.MeshBuilder.CreateBox('bench-stone-base', { width: .62, height: .18, depth: .86 }, scene);
        base.position.set(x + offset, .08, z); base.material = stone;
        const bracket = BABYLON.MeshBuilder.CreateBox('bench-metal-bracket', { width: .12, height: .72, depth: .13 }, scene);
        bracket.position.set(x + offset, .86, z + .34); bracket.material = dark;
    });
}

function addFountainLamp(scene, x, z) {
    const dark = createFountainMaterial(scene, 'lamp-dark', '#263d45');
    const glow = createFountainMaterial(scene, 'lamp-glow', '#ffd77a', '#ffb83d');
    const pole = BABYLON.MeshBuilder.CreateCylinder('lamp-pole', { height: 2.7, diameter: .12, tessellation: 8 }, scene);
    pole.position.set(x, 1.35, z); pole.material = dark;
    const cap = BABYLON.MeshBuilder.CreateCylinder('lamp-cap', { height: .18, diameter: .46, tessellation: 8 }, scene);
    cap.position.set(x, 2.75, z); cap.material = dark;
    const light = BABYLON.MeshBuilder.CreateSphere('lamp-light', { diameter: .25, segments: 8 }, scene);
    light.position.set(x, 2.58, z); light.material = glow;
}

function addFountainPergola(scene, x, z) {
    const wood = createFountainMaterial(scene, 'pergola-wood', '#9b6138');
    const leaf = createFountainMaterial(scene, 'pergola-leaf', '#5d9d4f');
    [-1.5, 1.5].forEach((offset) => {
        [-.9, .9].forEach((depth) => {
            const post = BABYLON.MeshBuilder.CreateBox('pergola-post', { width: .18, height: 2.1, depth: .18 }, scene);
            post.position.set(x + offset, 1.05, z + depth); post.material = wood;
        });
    });
    const roof = BABYLON.MeshBuilder.CreateBox('pergola-roof', { width: 3.5, height: .18, depth: 2.2 }, scene);
    roof.position.set(x, 2.2, z); roof.material = wood;
    for (let index = -2; index <= 2; index++) {
        const vine = BABYLON.MeshBuilder.CreateBox('pergola-vine', { width: .55, height: .16, depth: 2.3 }, scene);
        vine.position.set(x + index * .62, 2.32, z); vine.material = leaf;
    }
    addFountainBench(scene, x, z + .1);
}

function addFountainPath(scene, x, z, width, depth, rotation = 0) {
    const path = BABYLON.MeshBuilder.CreateBox('fountain-path', { width, height: .035, depth }, scene);
    path.position.set(x, .025, z); path.rotation.y = rotation;
    path.material = createFountainMaterial(scene, 'path-stone', '#d8c9a9');
}

function addFountainFlowerBed(scene, x, z, scale = 1) {
    const soil = createFountainMaterial(scene, 'flower-soil', '#715137');
    const flower = createFountainMaterial(scene, 'flower-pink', '#e88fa7');
    const bed = BABYLON.MeshBuilder.CreateCylinder('flower-bed', { diameter: 2.4 * scale, height: .16, tessellation: 32 }, scene);
    bed.position.set(x, .1, z); bed.material = soil;
    [-.55, 0, .55].forEach((offset) => {
        const bloom = BABYLON.MeshBuilder.CreateSphere('flower-bloom', { diameter: .32 * scale, segments: 8 }, scene);
        bloom.position.set(x + offset * scale, .36, z + (offset % .35) * scale); bloom.material = flower;
    });
}

function addFountainExitVortex(scene) {
    const portal = new BABYLON.TransformNode('fountain-exit-vortex', scene);
    portal.position.set(8.15, .08, 5.15);
    const glow = createFountainMaterial(scene, 'exit-glow', '#54d8ff', '#1b9fcb');
    const coreMat = createFountainMaterial(scene, 'exit-core', '#b9f7ff', '#54d8ff');
    const ringOuter = BABYLON.MeshBuilder.CreateTorus('exit-ring-outer', { diameter: 1.45, thickness: .12, tessellation: 36 }, scene);
    ringOuter.parent = portal; ringOuter.rotation.x = Math.PI / 2; ringOuter.material = glow;
    const ringInner = BABYLON.MeshBuilder.CreateTorus('exit-ring-inner', { diameter: .9, thickness: .07, tessellation: 32 }, scene);
    ringInner.parent = portal; ringInner.rotation.x = Math.PI / 2; ringInner.material = coreMat;
    const core = BABYLON.MeshBuilder.CreateDisc('exit-core', { radius: .32, tessellation: 32 }, scene);
    core.parent = portal; core.rotation.x = Math.PI / 2; core.material = coreMat;
    const pedestal = BABYLON.MeshBuilder.CreateCylinder('exit-pedestal', { diameter: 1.75, height: .12, tessellation: 32 }, scene);
    pedestal.parent = portal; pedestal.position.y = -.04; pedestal.material = createFountainMaterial(scene, 'exit-pedestal', '#294f5c');
    const label = BABYLON.MeshBuilder.CreatePlane('exit-label', { width: 2.2, height: .42 }, scene);
    label.parent = portal; label.position.y = 1.05; label.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    const labelTexture = new BABYLON.DynamicTexture('exit-label-texture', { width: 512, height: 100 }, scene, true);
    labelTexture.hasAlpha = true; labelTexture.drawText('THOÁT MAP', 256, 65, 'bold 42px Arial', 'white', 'transparent', true);
    const labelMaterial = new BABYLON.StandardMaterial('exit-label-material', scene); labelMaterial.diffuseTexture = labelTexture; labelMaterial.emissiveColor = BABYLON.Color3.White(); label.material = labelMaterial;
    [ringOuter, ringInner, core, label].forEach((mesh) => { mesh.isPickable = true; mesh.actionManager = new BABYLON.ActionManager(scene); mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => { mapExitTarget = { x: 690, y: 475 }; targetPosition = { x: 690, y: 475 }; showToast('Đang đi đến vòng xoáy để thoát map…'); })); });
    scene.onBeforeRenderObservable.add(() => { ringOuter.rotation.z += .012; ringInner.rotation.z -= .018; core.scaling.x = 1 + Math.sin(performance.now() / 260) * .08; core.scaling.y = 1 + Math.sin(performance.now() / 260) * .08; });
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
    const lowerPedestal = BABYLON.MeshBuilder.CreateCylinder('fountain-lower-pedestal', { diameter: 1.25, height: .7, tessellation: 32 }, scene);
    lowerPedestal.position.y = 1.02; lowerPedestal.material = stone;
    const middleBowl = BABYLON.MeshBuilder.CreateCylinder('fountain-middle-bowl', { diameter: 2.65, height: .35, tessellation: 40 }, scene);
    middleBowl.position.y = 1.62; middleBowl.material = stone;
    const pillar = BABYLON.MeshBuilder.CreateCylinder('fountain-pillar', { diameter: .42, height: 1.15, tessellation: 24 }, scene);
    pillar.position.y = 2.08; pillar.material = stone;
    const upperBowl = BABYLON.MeshBuilder.CreateCylinder('fountain-upper-bowl', { diameter: 1.75, height: .25, tessellation: 32 }, scene);
    upperBowl.position.y = 2.68; upperBowl.material = stone;
    const jet = BABYLON.MeshBuilder.CreateCylinder('fountain-jet', { diameterTop: .03, diameterBottom: .22, height: 2.1, tessellation: 16 }, scene);
    jet.position.y = 3.55; jet.material = createFountainMaterial(scene, 'fountain-jet', '#a9f4ff', '#5ddbe9');
    const waterMat = createFountainMaterial(scene, 'fountain-droplets', '#a9f4ff', '#5ddbe9');
    const droplets = [];
    for (let index = 0; index < 14; index++) {
        const angle = (Math.PI * 2 * index) / 14;
        const droplet = BABYLON.MeshBuilder.CreateSphere('fountain-droplet', { diameter: .11, segments: 6 }, scene);
        droplet.material = waterMat;
        droplets.push({ mesh: droplet, angle, phase: index * .42, radius: .65 + (index % 3) * .18 });
    }
    scene.onBeforeRenderObservable.add(() => {
        const time = performance.now() / 520;
        jet.scaling.y = 1 + Math.sin(performance.now() / 220) * .08;
        droplets.forEach(({ mesh, angle, phase, radius }) => {
            const progress = (time + phase) % 1.8;
            const normalized = progress / 1.8;
            mesh.position.x = Math.cos(angle) * radius * normalized;
            mesh.position.z = Math.sin(angle) * radius * normalized;
            mesh.position.y = 2.55 + Math.sin(normalized * Math.PI) * (1.45 + radius * .25);
            mesh.scaling.setAll(.72 + Math.sin(normalized * Math.PI) * .28);
        });
    });
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
    addFountainPath(scene, 0, -6, 2.6, 4.5); addFountainPath(scene, 0, 6, 2.6, 4.5); addFountainPath(scene, -7, 0, 4.5, 2.6, Math.PI / 2); addFountainPath(scene, 7, 0, 4.5, 2.6, Math.PI / 2);
    addFountainObject(scene); addFountainExitVortex(scene);
    addFountainTree(scene, -8, -5, 1.15); addFountainTree(scene, 8, -5, 1.15); addFountainTree(scene, -8, 4, .85); addFountainTree(scene, 8, 4, .85);
    addFountainBench(scene, -5.2, 3.1); addFountainBench(scene, 5.2, 3.1); addFountainBench(scene, -4.8, -3.3); addFountainBench(scene, 4.8, -3.3);
    addFountainLamp(scene, -3.3, -4.4); addFountainLamp(scene, 3.3, -4.4); addFountainLamp(scene, -3.3, 4.4); addFountainLamp(scene, 3.3, 4.4);
    addFountainPergola(scene, -7, 2.8); addFountainPergola(scene, 7, 2.8);
    addFountainFlowerBed(scene, -4.3, -1.8, 1.1); addFountainFlowerBed(scene, 4.3, -1.8, 1.1); addFountainFlowerBed(scene, -4.3, 1.8, 1.1); addFountainFlowerBed(scene, 4.3, 1.8, 1.1);
    const gui = BABYLON.GUI ? BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI('fountain-gui', true, scene) : null;
    babylonFountain = { canvas, engine, scene, gui, players: new Map() };
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
