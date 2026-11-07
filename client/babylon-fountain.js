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

function addFountainPlazaRings(scene) {
    const paving = createFountainMaterial(scene, 'plaza-paving', '#e4cfa5');
    const trim = createFountainMaterial(scene, 'plaza-trim', '#b9a67f');
    const innerRing = BABYLON.MeshBuilder.CreateTorus('plaza-inner-ring', { diameter: 8.65, thickness: .16, tessellation: 64 }, scene);
    innerRing.position.y = .07; innerRing.material = trim;
    const plazaDisc = BABYLON.MeshBuilder.CreateCylinder('plaza-paving-disc', { diameter: 10.9, height: .055, tessellation: 96 }, scene);
    plazaDisc.position.y = .025; plazaDisc.material = paving;
    const outerRing = BABYLON.MeshBuilder.CreateTorus('plaza-outer-ring', { diameter: 11.0, thickness: .16, tessellation: 64 }, scene);
    outerRing.position.y = .055; outerRing.material = trim;
    for (let index = 0; index < 24; index++) {
        const angle = index * Math.PI * 2 / 24;
        const tile = BABYLON.MeshBuilder.CreateBox(`plaza-tile-${index}`, { width: .72, height: .045, depth: .34 }, scene);
        tile.position.set(Math.cos(angle) * 4.65, .075, Math.sin(angle) * 4.65);
        tile.rotation.y = -angle;
        tile.material = paving;
    }
}

function addFountainExitVortex(scene, exit = {x:690,y:475}) {
    const portal = new BABYLON.TransformNode('fountain-exit-vortex', scene);
    const portalPosition = fountainWorldPosition(exit.x,exit.y);
    portal.position.set(portalPosition.x, .08, portalPosition.z);
    const glow = createFountainMaterial(scene, 'exit-glow', '#54d8ff', '#1b9fcb');
    const coreMat = createFountainMaterial(scene, 'exit-core', '#b9f7ff', '#54d8ff');
    const dark = createFountainMaterial(scene, 'exit-dark-teal', '#163f4b');
    const base = BABYLON.MeshBuilder.CreateCylinder('exit-base', { diameter: 1.95, height: .18, tessellation: 40 }, scene);
    base.parent = portal; base.position.y = .09; base.material = dark;
    const baseTrim = BABYLON.MeshBuilder.CreateTorus('exit-base-trim', { diameter: 1.65, thickness: .07, tessellation: 40 }, scene);
    baseTrim.parent = portal; baseTrim.position.y = .19; baseTrim.material = glow;
    const ringOuter = BABYLON.MeshBuilder.CreateTorus('exit-ring-outer', { diameter: 1.55, thickness: .13, tessellation: 48 }, scene);
    ringOuter.parent = portal; ringOuter.rotation.x = Math.PI / 2; ringOuter.material = glow;
    ringOuter.position.y = .86;
    const ringInner = BABYLON.MeshBuilder.CreateTorus('exit-ring-inner', { diameter: 1.02, thickness: .075, tessellation: 40 }, scene);
    ringInner.parent = portal; ringInner.rotation.x = Math.PI / 2; ringInner.material = coreMat;
    ringInner.parent = portal; ringInner.position.y = .86;
    const core = BABYLON.MeshBuilder.CreateSphere('exit-core', { diameter: .58, segments: 16 }, scene);
    core.parent = portal; core.position.y = .86; core.material = coreMat;
    const sparks = [];
    for (let index = 0; index < 12; index++) {
        const spark = BABYLON.MeshBuilder.CreateSphere(`exit-spark-${index}`, { diameter: .055, segments: 6 }, scene);
        spark.parent = portal; spark.material = glow;
        sparks.push({ mesh: spark, phase: index * .42, radius: .38 + (index % 3) * .14 });
    }
    const label = BABYLON.MeshBuilder.CreatePlane('exit-label', { width: 2.2, height: .42 }, scene);
    label.parent = portal; label.position.y = 1.05; label.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    const labelTexture = new BABYLON.DynamicTexture('exit-label-texture', { width: 512, height: 100 }, scene, true);
    labelTexture.hasAlpha = true; labelTexture.drawText('THOÁT MAP', 256, 65, 'bold 42px Arial', 'white', 'transparent', true);
    const labelMaterial = new BABYLON.StandardMaterial('exit-label-material', scene); labelMaterial.diffuseTexture = labelTexture; labelMaterial.emissiveColor = BABYLON.Color3.White(); label.material = labelMaterial;
    [base, baseTrim, ringOuter, ringInner, core, label, ...sparks.map(({ mesh }) => mesh)].forEach((mesh) => { mesh.isPickable = true; mesh.actionManager = new BABYLON.ActionManager(scene); mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => { targetPosition = null; showToast('Dùng mũi tên đi vào vòng xoáy để thoát map.'); })); });
    scene.onBeforeRenderObservable.add(() => {
        const now = performance.now();
        ringOuter.rotation.z += .012; ringInner.rotation.z -= .018;
        const pulse = 1 + Math.sin(now / 260) * .08;
        core.scaling.setAll(pulse);
        sparks.forEach(({ mesh, phase, radius }) => {
            const t = now / 500 + phase;
            mesh.position.x = Math.cos(t) * radius;
            mesh.position.y = .86 + Math.sin(t * 1.25) * radius;
            mesh.position.z = Math.sin(t) * .16;
        });
    });
}

async function loadReferenceFountainAssets(scene, proceduralMeshes) {
    if (!BABYLON.SceneLoader) return;
    const importPlacements = async (file, placements, { disablePrefixes = [], scale = 1 } = {}) => {
        for (const [x, z, rotation = 0] of placements) {
            try {
                if (scene.isDisposed) return false;
                const result = await BABYLON.SceneLoader.ImportMeshAsync('', 'assets/3d/', file + '?v=park-detail-2', scene);
                const roots = result.meshes.filter((mesh) => !mesh.parent);
                const root = roots[0] || result.meshes[0];
                if (root) {
                    root.position.set(x, 0, z);
                    root.rotationQuaternion = null;
                    root.rotation.y = rotation;
                    root.scaling.scaleInPlace(scale);
                }
                result.meshes.forEach((mesh) => { mesh.isPickable = false; });
                if (file === 'stone-bench.glb') {
                    const bench = FountainPhysics.benches.find(b => Math.abs(b.x-(400+x*34))<1 && Math.abs(b.y-(300+z*34))<1);
                    result.meshes.forEach(mesh => {
                        mesh.isPickable = true;
                        mesh.actionManager = new BABYLON.ActionManager(scene);
                        mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
                            if (bench) socket.emit('restAtCampusBench',bench.id);
                        }));
                    });
                }
            } catch (error) {
                console.warn(`Không tải được ${file}, dùng mesh dự phòng:`, error.message);
                return false;
            }
        }
        disablePrefixes.forEach((prefix) => {
            proceduralMeshes.filter((mesh) => mesh.name.startsWith(prefix)).forEach((mesh) => mesh.setEnabled(false));
        });
        return true;
    };
    try {
        const fountain = await BABYLON.SceneLoader.ImportMeshAsync('', 'assets/3d/', 'fountain.glb?v=park-detail-2', scene);
        proceduralMeshes.filter((mesh) => mesh.name.startsWith('fountain-') && mesh.name !== 'fountain-ground' && mesh.name !== 'fountain-path').forEach((mesh) => mesh.setEnabled(false));
        fountain.meshes.forEach((mesh) => { mesh.isPickable = false; });
        fountain.meshes.filter(mesh=>/water|jet/i.test(mesh.name)).forEach(mesh=>mesh.setEnabled(false));
        createFountainWater(scene);
    } catch (error) {
        console.warn('Không tải được fountain.glb, dùng mesh dự phòng:', error.message);
    }
    await importPlacements('stone-bench.glb', [[-3.8, 3.8, Math.PI], [3.8, 3.8, Math.PI], [-3.8, -3.8], [3.8, -3.8]], { disablePrefixes: ['bench-'], scale: .85 });

    // Additional park props are loaded as reusable GLB modules. If one is unavailable,
    // its procedural counterpart remains visible so the map is still usable.
    await importPlacements('tree.glb', [[-8.0, -5.0], [8.0, -5.0], [-8.0, 4.2], [8.0, 4.2]], {
        disablePrefixes: ['tree-'],
        scale: 1.0
    });
    await importPlacements('flowerbed.glb', [[-3.8, -4.7], [3.8, -4.7], [-3.8, 4.7], [3.8, 4.7]], {
        disablePrefixes: ['flower-'],
        scale: 0.9
    });
    await importPlacements('lamp.glb', [[-3.35, -4.4], [3.35, -4.4], [-3.35, 4.4], [3.35, 4.4]], {
        disablePrefixes: ['lamp-'],
        scale: 1.0
    });
    await importPlacements('pergola.glb', [[-7.0, 3.5, Math.PI], [7.0, 3.5, Math.PI]], {
        disablePrefixes: ['pergola-'],
        scale: 0.9
    });
    await importPlacements('path.glb', [[0, -6.0], [0, 6.0], [-7.0, 0, Math.PI / 2], [7.0, 0, Math.PI / 2]], {
        disablePrefixes: ['fountain-path'],
        scale: 1.0
    });
    // The reference plaza is open and uncluttered; railings remain available as an
    // asset but are intentionally not placed in this map.
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
    const fallbackMeshes = root.getChildMeshes().filter((mesh) => mesh !== shadow);
    BABYLON.SceneLoader.ImportMeshAsync('', 'assets/3d/', 'student.glb?v=3-joints', scene).then((asset) => {
        if (scene.isDisposed || root.isDisposed()) { asset.meshes.forEach((mesh) => mesh.dispose()); return; }
        const modelRoot = asset.meshes.find((mesh) => !mesh.parent);
        if (modelRoot) modelRoot.parent = root;
        const face=asset.meshes.find(mesh=>mesh.name==='student_nose');
        const skull=asset.meshes.find(mesh=>mesh.name==='student_head');
        if(face&&skull) {
            root.computeWorldMatrix(true);skull.computeWorldMatrix(true);face.computeWorldMatrix(true);
            const direction=BABYLON.Vector3.TransformNormal(face.getAbsolutePosition().subtract(skull.getAbsolutePosition()),root.getWorldMatrix().clone().invert());
            root._modelForwardYaw=Math.atan2(direction.x,direction.z);
            if(root._desiredYaw!==undefined)root.rotation.y=root._desiredYaw-root._modelForwardYaw;
        }
        if(modelRoot)root._animateStudent=bindStudentAnimation(root,modelRoot);
        fallbackMeshes.forEach((mesh) => { mesh.visibility = 0; mesh._cameraBaseVisibility = 0; });
    }).catch((error) => console.warn('Student model fallback:', error.message));
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
    const scene = new BABYLON.Scene(engine); scene.clearColor = new BABYLON.Color4(.34, .58, .38, 1);
    const camera = new BABYLON.ArcRotateCamera('fountain-camera', -Math.PI / 2, 1.12, 23, new BABYLON.Vector3(0, .5, 0), scene);
    camera.attachControl(canvas, true); camera.lowerRadiusLimit = 13; camera.upperRadiusLimit = 24; camera.wheelPrecision = 70;
    // Arrow/WASD keys belong to the player controller, never to the 3D camera.
    camera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');
    camera.inputs.attached.keyboard?.detachControl();
    const ambient = new BABYLON.HemisphericLight('fountain-ambient', new BABYLON.Vector3(0, 1, 0), scene);
    const sunlight = new BABYLON.DirectionalLight('park-sunlight', new BABYLON.Vector3(-.6, -1, .35), scene);
    sunlight.position.set(8, 14, -8); sunlight.intensity = 1.2;
    const shadows = new BABYLON.ShadowGenerator(1024, sunlight);
    shadows.useBlurExponentialShadowMap = true; shadows.blurKernel = 16;
    scene.onNewMeshAddedObservable.add((mesh) => {
        mesh.receiveShadows = true;
        if (!/ground|path|plaza|exit-|water|jet|droplet|sky-/.test(mesh.name)) shadows.addShadowCaster(mesh);
    });
    const ground = BABYLON.MeshBuilder.CreateGround('fountain-ground', { width: 30, height: 24 }, scene); ground.material = createFountainMaterial(scene, 'ground', '#78a866');
    addFountainPath(scene, 0, -6, 2.6, 4.5); addFountainPath(scene, 0, 6, 2.6, 4.5); addFountainPath(scene, -7, 0, 4.5, 2.6, Math.PI / 2); addFountainPath(scene, 7, 0, 4.5, 2.6, Math.PI / 2);
    addFountainPlazaRings(scene);
    addFountainObject(scene); addFountainExitVortex(scene);
    addFountainTree(scene, -8, -5, 1.15); addFountainTree(scene, 8, -5, 1.15); addFountainTree(scene, -8, 4, .85); addFountainTree(scene, 8, 4, .85);
    addFountainBench(scene, -5.2, 3.1); addFountainBench(scene, 5.2, 3.1); addFountainBench(scene, -4.8, -3.3); addFountainBench(scene, 4.8, -3.3);
    addFountainLamp(scene, -3.3, -4.4); addFountainLamp(scene, 3.3, -4.4); addFountainLamp(scene, -3.3, 4.4); addFountainLamp(scene, 3.3, 4.4);
    addFountainPergola(scene, -7, 2.8); addFountainPergola(scene, 7, 2.8);
    addFountainFlowerBed(scene, -4.3, -1.8, 1.1); addFountainFlowerBed(scene, 4.3, -1.8, 1.1); addFountainFlowerBed(scene, -4.3, 1.8, 1.1); addFountainFlowerBed(scene, 4.3, 1.8, 1.1);
    const gui = BABYLON.GUI ? BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI('fountain-gui', true, scene) : null;
    const sitKey = event => {
        if (event.code !== 'KeyE' || event.repeat || /INPUT|TEXTAREA|SELECT/.test(event.target?.tagName)) return;
        const player = players[socket.id];
        const bench = player && FountainPhysics.benches.find(b => Math.hypot(player.x-b.x,player.y-b.y)<=55);
        if (bench) socket.emit('restAtCampusBench', bench.id);
    };
    window.addEventListener('keydown', sitKey);
    scene.onDisposeObservable.add(()=>window.removeEventListener('keydown',sitKey));
    const proceduralMeshes = scene.meshes.slice();
    babylonFountain = { canvas, engine, scene, gui, mapId:'fountain', camera, exit:{x:690,y:475}, players: new Map() };
    document.body.classList.add('is-map-3d');
    createFountainWeather(scene, sunlight, ambient);
    bindFountainCamera(scene, canvas, camera);
    void loadReferenceFountainAssets(scene, proceduralMeshes);
    const phaserCanvas = document.querySelector('canvas:not(#babylon-fountain-canvas)'); if (phaserCanvas) phaserCanvas.classList.add('phaser-map-hidden');
    const onResize = () => engine.resize();
    window.addEventListener('resize',onResize);
    scene.onDisposeObservable.add(()=>window.removeEventListener('resize',onResize));
    engine.runRenderLoop(() => {updateBabylonFountainPlayers();scene.render();});
    updateBabylonFountainPlayers(); return true;
}

function updateBabylonFountainPlayers() {
    if (!babylonFountain) return;
    Object.entries(players || {}).forEach(([id, player]) => {
        if (!babylonFountain.players.has(id)) babylonFountain.players.set(id, createBabylonHuman(babylonFountain.scene, id));
        const mesh = babylonFountain.players.get(id); const pos = fountainWorldPosition(player.x, player.y);
        if(!mesh._placed) {
            const camera=babylonFountain.camera||babylonFountain.scene.activeCamera;
            mesh._desiredYaw=Math.atan2(camera.position.x-pos.x,camera.position.z-pos.z);
            mesh.rotation.y=mesh._desiredYaw-(mesh._modelForwardYaw??Math.PI);
        }
        const previousVisualX=mesh.position.x,previousVisualZ=mesh.position.z;
        const dt = Math.min(babylonFountain.engine.getDeltaTime()/1000,.05);
        const dx = pos.x-(mesh._lastTargetX??pos.x), dz=pos.z-(mesh._lastTargetZ??pos.z);
        mesh._lastTargetX=pos.x;mesh._lastTargetZ=pos.z;
        const moving = Math.hypot(dx,dz)>.0001;
        if(moving)mesh._walkUntil=performance.now()+120;
        const walk = id===socket.id ? Boolean(babylonFountain.localMoving) : performance.now()<(mesh._walkUntil||0);
        const lerp = mesh._placed && (id!==socket.id||walk) ? 1-Math.exp(-(id===socket.id?32:14)*dt) : 1;
        mesh.position.x+=(pos.x-mesh.position.x)*lerp;mesh.position.z+=(pos.z-mesh.position.z)*lerp;mesh._placed=true;
        if(moving)mesh._desiredYaw=Math.atan2(dx,dz);
        mesh._heading=mesh._desiredYaw-(mesh._modelForwardYaw??Math.PI);
        if(mesh._heading!==undefined) {const angle=Math.atan2(Math.sin(mesh._heading-mesh.rotation.y),Math.cos(mesh._heading-mesh.rotation.y));mesh.rotation.y+=angle*(1-Math.exp(-18*dt));}
        const seat = babylonFountain.mapId==='fountain' && Object.entries(campusBenchOccupants || {}).find(([benchId,ids])=>benchId.startsWith('fountain-') && Array.isArray(ids) && ids.includes(id));
        if (seat) {
            const bench = FountainPhysics.benches.find(b=>b.id===seat[0]);
            if (bench) {
                mesh.position.x=(bench.x-400)/34+(seat[1].indexOf(id)===0?-.35:.35);
                mesh.position.z=(bench.y-300)/34;
                mesh.position.y=.36;
                mesh.rotation.y=bench.rotation;
            }
        } else { mesh.position.y=0; }
        mesh._animateStudent?.(dt,Math.hypot(mesh.position.x-previousVisualX,mesh.position.z-previousVisualZ),walk,Boolean(seat));
        if (mesh._nameText) mesh._nameText.text = player.playerNickname || (id === socket.id ? 'Bạn' : `Khách (${id.slice(0, 4)})`);
    });
    babylonFountain.players.forEach((mesh, id) => { if (!players[id]) { mesh._nameLabel?.dispose(); mesh.dispose(); babylonFountain.players.delete(id); } });
}

function deactivateBabylonFountain() {
    if (!babylonFountain) return;
    const world=babylonFountain;babylonFountain=null;
    world.scene.dispose();world.engine.dispose();world.canvas.remove();
    document.body.classList.remove('is-map-3d');
    document.querySelector('canvas:not(#babylon-fountain-canvas)')?.classList.remove('phaser-map-hidden');
}
