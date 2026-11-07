/* Reuse the Babylon player/camera host while keeping game state on Socket.IO. */
let farmMouse3DState = null;

function activateBabylonMapPack(mapId) {
    const layout=Map3DLayouts.get(mapId);
    if(!layout || !window.BABYLON || babylonFountain)return false;
    const B=BABYLON;
    const canvas=document.createElement('canvas');canvas.id='babylon-fountain-canvas';
    document.body.appendChild(canvas);
    const engine=new B.Engine(canvas,true,{stencil:true});
    engine.setHardwareScalingLevel(Math.max(1,window.devicePixelRatio/1.5));
    const scene=new B.Scene(engine);
    const halloween=Map3DLayouts.key(mapId)==='halloween';
    scene.clearColor=halloween?new B.Color4(.055,.035,.09,1):new B.Color4(.44,.60,.53,1);
    const camera=new B.ArcRotateCamera('map-camera',-Math.PI/2,.72,27,new B.Vector3(0,0,0),scene);
    camera.lowerRadiusLimit=16;camera.upperRadiusLimit=32;
    camera.lowerBetaLimit=.15;camera.upperBetaLimit=1.45;
    camera.panningSensibility=0;camera.wheelPrecision=70;
    camera.attachControl(canvas,true);camera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');
    const ambient=new B.HemisphericLight('map-ambient',new B.Vector3(0,1,0),scene);
    ambient.intensity=halloween?.65:.85;
    const sun=new B.DirectionalLight('park-sunlight',new B.Vector3(-.6,-1,.3),scene);
    sun.position.set(8,16,-8);sun.intensity=halloween?.35:1;
    const shadows=new B.ShadowGenerator(1024,sun);shadows.usePercentageCloserFiltering=true;
    const ground=B.MeshBuilder.CreateGround('pack-ground',{width:23.5,height:17.5},scene);
    ground.material=createFountainMaterial(scene,'pack-floor',layout.floor);ground.receiveShadows=true;
    const floorTrim=createFountainMaterial(scene,'pack-trim',halloween?'#795198':'#b9c39c');
    for(const x of [-11.5,11.5]) {
        const kerb=B.MeshBuilder.CreateBox('boundary',{width:.12,height:.16,depth:17.4},scene);
        kerb.position.set(x,.08,0);kerb.material=floorTrim;
    }
    for(const z of [-8.6,8.6]) {
        const kerb=B.MeshBuilder.CreateBox('boundary',{width:23,height:.16,depth:.12},scene);
        kerb.position.set(0,.08,z);kerb.material=floorTrim;
    }
    const gui=B.GUI?B.GUI.AdvancedDynamicTexture.CreateFullscreenUI('map-gui',true,scene):null;
    const world={canvas,engine,scene,gui,mapId,camera,players:new Map(),exit:Map3DLayouts.exit};
    babylonFountain=world;
    document.body.classList.add('is-map-3d');
    addFountainExitVortex(scene,world.exit);
    bindFountainCamera(scene,canvas,camera);
    if(mapId==='farm')createFountainWeather(scene,sun,ambient);
    const title=document.createElement('div');title.className='map-3d-title';
    title.textContent=layout.title+' · Mũi tên: đi · E: tương tác · Kéo/vuốt: xoay';
    document.body.appendChild(title);
    const resize=()=>{
        engine.resize();const b=canvas.getBoundingClientRect();
        title.style.left=`${b.left+12}px`;title.style.top=`${b.top+12}px`;
    };
    const observer=new ResizeObserver(resize);observer.observe(canvas);
    scene.onDisposeObservable.add(()=>{observer.disconnect();title.remove();});
    const templates=new Map(),slots=new Map();
    let failureReported=false;
    function template(file) {
        if(!templates.has(file))templates.set(file,B.SceneLoader.LoadAssetContainerAsync('assets/3d/',file+'?v=packs-1',scene).then(container=>{
            if(scene.isDisposed){container.dispose();return null;}
            return container;
        }).catch(error=>{
            console.warn('Map asset:',file,error);
            if(!scene.isDisposed&&!failureReported){failureReported=true;showToast('Một số đối tượng 3D chưa tải được. Hãy tải lại trang.');}
            return null;
        }));
        return templates.get(file);
    }
    function interact(action,x,y) {
        const player=players[socket.id];if(!player)return;
        updateInteractionZone(player);
        let near=false;
        if(action.startsWith('box:'))near=activeHalloweenBox===Number(action.slice(4));
        else if(action.startsWith('plot:'))near=activeFarmPlotId===action.slice(5);
        else near=activeInteriorObjectId===action;
        if(!near){showToast('Dùng mũi tên đến gần đối tượng, rồi nhấn E hoặc bấm lại.');return;}
        interactWithCurrentZone();
    }
    async function place(id,file,x,y,scale=1,action='',variant='') {
        const token={file,variant};const previous=slots.get(id);
        if(previous?.file===file&&previous?.variant===variant)return;
        previous?.instance?.dispose();previous?.root?.dispose();slots.set(id,token);
        const container=await template(file);
        if(!container||scene.isDisposed||slots.get(id)!==token)return;
        const uniqueMaterials=variant==='wilted'||variant==='growing';
        const instance=container.instantiateModelsToScene(name=>`${id}:${name}`,uniqueMaterials,{doNotInstantiate:uniqueMaterials});
        const root=new B.TransformNode('prop-'+id,scene);
        const pos=fountainWorldPosition(x,y);root.position.set(pos.x,0,pos.z);root.scaling.setAll(scale);
        instance.rootNodes.forEach(node=>node.parent=root);
        for(const mesh of root.getChildMeshes()) {
            mesh.receiveShadows=true;mesh.isPickable=Boolean(action);shadows.addShadowCaster(mesh);
            if(action){mesh.actionManager=new B.ActionManager(scene);mesh.actionManager.registerAction(new B.ExecuteCodeAction(B.ActionManager.OnPickTrigger,()=>interact(action,x,y)));}
            if(variant==='growing'&&/leaf|foliage|fruit|root|cob|stalk/.test(mesh.name))mesh.scaling.scaleInPlace(.45);
            if(variant==='wilted'&&/leaf|foliage|fruit|root|cob|stalk/.test(mesh.name)) {
                mesh.scaling.y*=.55;
                if(mesh.material?.albedoColor)mesh.material.albedoColor=B.Color3.Lerp(mesh.material.albedoColor,new B.Color3(.37,.22,.08),.75);
            }
        }
        token.instance=instance;token.root=root;
    }
    layout.props.forEach((p,i)=>void place('static-'+i,`${layout.pack}/${p.file}.glb`,p.x,p.y,p.scale,p.action));
    // Scatter lights/decor outside the walkable interaction rows.
    if(halloween)for(const x of [85,720]) {
        const light=new B.PointLight('lantern-light',new B.Vector3((x-400)/34,2,-3),scene);
        light.diffuse=new B.Color3(1,.45,.12);light.intensity=.8;light.range=8;
    }
    let stateTick=0,eventUntil=0;
    world.showEvent=(result)=>{
        const player=players[socket.id];if(!player)return;
        if(result.spider||result.foundPumpkin){eventUntil=performance.now()+2500;void place('event',`halloween/${result.spider?'spider':'pumpkin'}.glb`,player.x,player.y-35,1.2);}
    };
    scene.onBeforeRenderObservable.add(()=>{
        const now=performance.now();
        if(now>=stateTick){
            stateTick=now+250;
            if(mapId==='farm') {
                for(const plot of FARM_PLOT_LAYOUT) {
                    const state=farmPlots[plot.id],age=state?.plantedAt?Date.now()-state.plantedAt:0;
                    const crop=state?.plantedAt ? Object.keys(CROP_INFO).find(key=>key===state.crop||CROP_INFO[key].icon===state.crop)||'empty' : 'empty';
                    const variant=crop==='empty'?'':age<FARM_GROWTH_MS?'growing':age>=FARM_WILT_MS?'wilted':'ripe';
                    void place(plot.id,`community-farm/plot-${crop}.glb`,plot.x+plot.width/2,plot.y+plot.height/2,1.35,'plot:'+plot.id,variant);
                }
            }
            if(halloween)HALLOWEEN_BOX_POSITIONS.forEach((box,i)=>void place('box-'+i,`halloween/gift-${halloweenOpenedBoxes.has(i)?'open':'closed'}.glb`,box.x,box.y,.8,'box:'+i));
        }
        if(mapId==='farm') {
            const mouse=farmMouse3DState;
            if(mouse?.active&&Number.isFinite(mouse.x)&&Number.isFinite(mouse.y)) {
                if(!slots.has('mouse'))void place('mouse','community-farm/mouse.glb',mouse.x,mouse.y,1.7);
                const root=slots.get('mouse')?.root;
                if(root){const p=fountainWorldPosition(mouse.x,mouse.y);const dt=Math.min(engine.getDeltaTime()/1000,.05);root.position.x+=(p.x-root.position.x)*(1-Math.exp(-12*dt));root.position.z+=(p.z-root.position.z)*(1-Math.exp(-12*dt));}
            } else if(slots.has('mouse')){slots.get('mouse').instance?.dispose();slots.get('mouse').root?.dispose();slots.delete('mouse');}
        }
        if(eventUntil&&now>eventUntil){slots.get('event')?.instance?.dispose();slots.get('event')?.root?.dispose();slots.delete('event');eventUntil=0;}
    });
    scene.onDisposeObservable.add(()=>{
        templates.forEach(promise=>void promise.then(container=>container?.dispose()));
    });
    document.querySelector('canvas:not(#babylon-fountain-canvas)')?.classList.add('phaser-map-hidden');
    engine.runRenderLoop(()=>{updateBabylonFountainPlayers();scene.render();});
    resize();
    return true;
}
