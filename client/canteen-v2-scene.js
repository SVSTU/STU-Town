/* Canteen assembly. State, purchases and reach checks stay in the existing game. */
function bindCanteenView(world, getOverviewRadius) {
    const B = BABYLON;
    const { canvas, camera, scene } = world;
    const layer = document.createElement('div');
    layer.className = 'canteen-view';
    const zoom = document.createElement('div');
    zoom.className = 'canteen-zoom';
    zoom.hidden = true;
    zoom.setAttribute('role', 'group');
    zoom.setAttribute('aria-label', 'Thu phóng góc nhìn');
    zoom.innerHTML = `
        <button type="button" data-zoom="out" aria-label="Thu nhỏ" title="Thu nhỏ">−</button>
        <button type="button" data-zoom="reset" aria-label="Về góc toàn cảnh" title="Về góc toàn cảnh">⟲</button>
        <button type="button" data-zoom="in" aria-label="Phóng to" title="Phóng to">+</button>`;
    document.body.append(layer, zoom);
    const zoomOut = zoom.querySelector('[data-zoom="out"]');
    const zoomIn = zoom.querySelector('[data-zoom="in"]');
    camera.storeState();

    function stepZoom(factor) {
        const damping = 1 - camera.inertia;
        const pendingRadius = camera.radius - camera.inertialRadiusOffset / damping;
        const target = B.Scalar.Clamp(pendingRadius * factor, camera.lowerRadiusLimit, camera.upperRadiusLimit);
        camera.inertialRadiusOffset = (camera.radius - target) * damping;
    }
    zoomIn.addEventListener('click', () => stepZoom(.72));
    zoomOut.addEventListener('click', () => stepZoom(1 / .72));
    zoom.querySelector('[data-zoom="reset"]').addEventListener('click', () => {
        camera.restoreState();
        camera.radius = getOverviewRadius();
    });

    const markers = [];
    const viewport = new B.Viewport(0, 0, 0, 0);
    const identity = B.Matrix.Identity();
    const projected = new B.Vector3();
    scene.onAfterRenderObservable.add(() => {
        const overview = scene.activeCamera === camera;
        layer.hidden = zoom.hidden = !overview;
        if (!overview) return;
        const bounds = canvas.getBoundingClientRect();
        layer.style.left = bounds.left + 'px';
        layer.style.top = bounds.top + 'px';
        layer.style.width = bounds.width + 'px';
        layer.style.height = bounds.height + 'px';
        const compact = bounds.width < 520;
        zoom.style.left = (compact ? Math.max(bounds.left + 6, bounds.right - 324) : bounds.left + bounds.width / 2) + 'px';
        zoom.style.top = (compact ? bounds.bottom - 150 : bounds.top + 43) + 'px';
        zoom.classList.toggle('is-compact', compact);
        zoomIn.disabled = camera.radius <= camera.lowerRadiusLimit + .03;
        zoomOut.disabled = camera.radius >= camera.upperRadiusLimit - .03;
        viewport.width = bounds.width;
        viewport.height = bounds.height;
        for (const marker of markers) {
            const { element, anchor, offset } = marker;
            B.Vector3.ProjectToRef(anchor, identity, scene.getTransformMatrix(), viewport, projected);
            const { x, y, z } = projected;
            const bottom = y - offset;
            element.hidden = z < 0 || z > 1 || x < 0 || x > bounds.width || bottom < 0 || bottom > bounds.height - 4;
            if (element.hidden) continue;
            marker.size ??= { width: element.offsetWidth, height: element.offsetHeight };
            if (bottom < marker.size.height + 4) {
                element.hidden = true;
                continue;
            }
            const edge = marker.size.width / 2 + 5;
            element.style.left = B.Scalar.Clamp(x, edge, bounds.width - edge) + 'px';
            element.style.top = bottom + 'px';
        }
    });
    scene.onDisposeObservable.add(() => {
        layer.remove();
        zoom.remove();
    });

    return (text, x, y, height, category = '', offset = 0) => {
        const element = document.createElement('div');
        element.className = 'canteen-map-label';
        element.hidden = true;
        if (category) {
            element.dataset.category = category;
            const eyebrow = document.createElement('small');
            eyebrow.textContent = 'Vinh danh';
            element.append(eyebrow);
        }
        const title = document.createElement('strong');
        title.textContent = text;
        element.append(title);
        layer.append(element);
        const p = fountainWorldPosition(x, y);
        markers.push({ element, anchor: new B.Vector3(p.x, height, p.z), offset });
    };
}

function createCanteenConceptScene(scene,world,{place,interact,shadows,getOverviewRadius}) {
    const B=BABYLON,layout=Map3DLayouts.get('canteen'),pack='canteen-v2/';
    const add=(id,file,x,y,options={})=>place('canteen-'+id,pack+file+'.glb',x,y,options.scale||1,'','',options);
    const stone=createFountainMaterial(scene,'canteen-limestone','#dcc7a3');
    const oak=createFountainMaterial(scene,'canteen-oak','#80532e');
    const teal=createFountainMaterial(scene,'canteen-teal','#164e48');
    const mark = bindCanteenView(world, getOverviewRadius);
    function beam(name,x,y,width,height,depth,material,lift=0) {
        const mesh=B.MeshBuilder.CreateBox(name,{width,height,depth},scene),p=fountainWorldPosition(x,y);
        mesh.position.set(p.x,height/2+lift,p.z);mesh.material=material;
        mesh.isPickable=true;mesh.receiveShadows=true;shadows.addShadowCaster(mesh);return mesh;
    }
    for(const x of [196,332,468,604]) {
        for(const y of [164,300,436])void add('floor-'+x+'-'+y,'floor-module',x,y,{height:-.028,castShadow:false});
        void add('rear-'+x,'wall-window',x,504);
    }
    // Open front/cutaway walls preserve the view on narrow phone screens.
    for(const x of [128,672]) {
        beam('canteen-side-wall',x,300,.16,.66,12,stone);
        beam('canteen-side-cap',x,300,.22,.07,12,oak,.66);
        for(const [y,h] of [[96,.9],[300,3.1],[504,3.1]])beam('canteen-post',x,y,.20,h,.20,oak);
        beam('canteen-side-roof-beam',x,402,.26,.18,6,teal,3.05);
    }
    for(const x of [238,562]) {
        beam('canteen-front-wall',x,96,6.47,.42,.16,stone);
        beam('canteen-front-cap',x,96,6.47,.06,.22,oak,.42);
    }
    void add('entry','entry-steps',400,82,{height:-.36});
    void add('canopy','canopy-menu',400,455,{height:2.5,onReady:root=>{
        const sign = label('canteen-menu', root, 4.92, .89, -.38, -.84, 1024);
        sign.paint((ctx, w, h) => {
            panel(ctx, w, h, '#12382f', '#e8c275');
            text(ctx, 'QUẦY ẨM THỰC', w / 2, 63, 56, '#fff3d3');
            ['Bánh mì', 'Bánh bao', 'Nước ngọt', 'Nước suối'].forEach((name, index) => {
                const x = 16 + index * 249;
                ctx.fillStyle = '#f5e8ca';
                ctx.fillRect(x, 95, 244, 66);
                text(ctx, name, x + 122, 129, 40, '#163c32');
            });
        });
        bindPick(sign.face, () => interact('canteen-counter', 400, 455));
        mark('Quầy ẩm thực', 400, 455, 3.05, '', 38);
    }});
    for(const x of [260,400,540])void add('pendant-'+x,'pendant-light',x,478,{height:2.47});
    for(const x of [180,620])void add('hanging-'+x,'hanging-plant',x,498,{height:2.45});
    for(const x of [-4,4]) {
        const light=new B.PointLight('canteen-warm-light',new B.Vector3(x,2.8,3.6),scene);
        light.diffuse=new B.Color3(1,.76,.46);light.intensity=.3;light.range=7;
    }
    function label(name, parent, width, height, y, z, pixels = 640) {
        const face = B.MeshBuilder.CreatePlane(name, { width, height }, scene);
        face.parent = parent;
        face.position.set(0, y, z);
        const pixelHeight = Math.round(pixels * height / width);
        const texture = new B.DynamicTexture(name + '-texture', { width: pixels, height: pixelHeight }, scene, true, B.Texture.TRILINEAR_SAMPLINGMODE);
        const material = new B.StandardMaterial(name + '-material', scene);
        material.disableLighting = true;
        material.diffuseColor = B.Color3.Black();
        material.emissiveTexture = texture;
        face.material = material;
        return {
            face,
            paint(draw) {
                const size = texture.getSize();
                const ctx = texture.getContext();
                ctx.save();
                ctx.scale(size.width / pixels, size.height / pixelHeight);
                draw(ctx, pixels, pixelHeight);
                ctx.restore();
                texture.update();
            }
        };
    }
    function panel(ctx, width, height, background, border) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = border;
        ctx.lineWidth = 8;
        ctx.strokeRect(4, 4, width - 8, height - 8);
    }
    function text(ctx, value, x, y, size, color, align = 'center', maxWidth) {
        ctx.font = `bold ${size}px Arial, sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = align;
        ctx.fillStyle = color;
        if (maxWidth && ctx.measureText(value).width > maxWidth) {
            const characters = Array.from(value);
            while (characters.length && ctx.measureText(characters.join('') + '…').width > maxWidth) characters.pop();
            value = characters.join('') + '…';
        }
        ctx.fillText(value, x, y);
    }
    function bindPick(mesh, action) {
        mesh.actionManager = new B.ActionManager(scene);
        mesh.actionManager.registerAction(new B.ExecuteCodeAction(B.ActionManager.OnPickTrigger, action));
    }
    function propReady(prop, root) {
        if (prop.file === 'ticket-machine') {
            root.getChildMeshes().filter(mesh => /ticket_glyph|machine_title/.test(mesh.name))
                .forEach(mesh => mesh.setEnabled(false));
            const sign = label('canteen-ticket-label', root, 1.23, .36, 1.78, -.38);
            sign.paint((ctx, w, h) => {
                panel(ctx, w, h, '#36294d', '#d8b9f4');
                text(ctx, 'MÁY BÁN THẺ', w / 2, h / 2, 73, '#fff4ff');
            });
            bindPick(sign.face, () => interact(prop.action, prop.x, prop.y));
            mark('Máy bán thẻ', prop.x, prop.y, 2.03, '', -24);
        } else if (prop.file === 'recycling-station') {
            const sign = label('canteen-recycling-label', root, 1.02, .25, .50, -.31);
            sign.paint((ctx, w, h) => {
                panel(ctx, w, h, '#143c32', '#d5dfba');
                text(ctx, 'Tái chế', w * .25, h / 2, 60, '#fff4db');
                text(ctx, 'Rác khác', w * .75, h / 2, 60, '#fff4db');
            });
        }
    }
    layout.props.forEach((prop, index) => void place(
        'static-' + index, pack + prop.file + '.glb', prop.x, prop.y, prop.scale, prop.action, '',
        { rotation: prop.rotation || 0, height: prop.height || 0, onReady: root => propReady(prop, root) }
    ));
    let spiral;
    void add('exit','exit-portal',world.exit.x,world.exit.y,{scale:1.2,onReady:root=>{
        root.name='fountain-exit-vortex';
        spiral=new B.TransformNode('canteen-portal-energy',scene);spiral.parent=root;
        spiral.position.set(0,.88,-.08);root.computeWorldMatrix(true);spiral.computeWorldMatrix(true);
        root.getChildMeshes().filter(mesh=>mesh.name.includes('vortex_spiral')).forEach(mesh=>mesh.setParent(spiral));
        label('canteen-exit-label', root, 1.72, .33, 1.91, -.12).paint((ctx, w, h) => {
            panel(ctx, w, h, '#12383c', '#94ecf2');
            text(ctx, 'VỀ SÂN TRƯỜNG', w / 2, h / 2, 62, '#e4fdff');
        });
        mark('Về sân trường', world.exit.x, world.exit.y, 2.42, '', -16);
        root.getChildMeshes().forEach(mesh => bindPick(mesh, () => showToast('Dùng mũi tên đi đến cổng xoáy để về sân trường.')));
    }});
    scene.onBeforeRenderObservable.add(()=>{if(spiral)spiral.rotation.z-=Math.min(world.engine.getDeltaTime()/1000,.05)*.8;});
    return layout.boards.map(board => {
        const category = board.id.slice(8);
        const title = category === 'reputation' ? 'Danh tiếng' : 'Tiền đồng';
        const accent = category === 'reputation' ? '#ffe098' : '#bcecf7';
        let sign;
        let signature;
        void place(board.id, pack + board.file + '.glb', board.x, board.y, 1, board.action, '', { onReady: root => {
            root.name = board.id;
            root.getChildMeshes().filter(mesh => /portrait_|nameplate|rank_text|honor_title/.test(mesh.name))
                .forEach(mesh => mesh.setEnabled(false));
            sign = label(board.id + '-face', root, 2.05, 1.45, 1.32, -.19);
            bindPick(sign.face, () => interact(board.action, board.x, board.y));
            mark(title, board.x, board.y, 2.58, category);
            update();
        } });
        function update() {
            if (!sign) return;
            const rows = getServerRankingRows(category).slice(0, 3);
            const next = JSON.stringify(rows);
            if (signature === next) return;
            signature = next;
            sign.paint((ctx, w, h) => {
                panel(ctx, w, h, '#102e28', accent);
                text(ctx, title.toLocaleUpperCase('vi-VN'), w / 2, 66, 62, accent);
                if (!rows.length) {
                    text(ctx, 'Chưa có dữ liệu', w / 2, h / 2 + 28, 48, '#fff5df');
                    return;
                }
                rows.forEach((row, index) => {
                    const y = 124 + index * 97;
                    ctx.fillStyle = index === 0 ? '#285142' : '#1b3b32';
                    ctx.fillRect(18, y, w - 36, 84);
                    text(ctx, String(index + 1), 53, y + 42, 42, accent);
                    const score = (Number(row.score) || 0).toLocaleString('vi-VN');
                    text(ctx, String(row.nickname || 'Người chơi'), 94, y + 42, 42, '#fff7e3', 'left', 295);
                    text(ctx, score, w - 34, y + 42, 39, accent, 'right', 190);
                });
            });
        }
        return update;
    });
}
