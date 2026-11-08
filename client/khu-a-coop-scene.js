/* Khu A cooperative: standalone GLBs, shared authoritative footprints and services. */
function createKhuACoopScene(scene,world,{place,interact,shadows}) {
    const B=BABYLON,pack='khu-a-coop-v1/';
    const add=(id,file,x,y,options={},action='')=>place('coop-'+id,pack+file+'.glb',x,y,options.scale||1,action,'',options);
    for(const x of [196,332,468,604]) {
        for(const y of [164,300,436])void add('floor-'+x+'-'+y,'floor-module',x,y,{castShadow:false});
        void add('back-'+x,'wall-window',x,504);
    }
    for(const x of [128,672])for(const y of [164,300,436])void add('side-'+x+'-'+y,'wall-low',x,y,{rotation:Math.PI/2});
    // Cutaway front walls sit outside approach routes; the open arch remains a separate asset.
    for(const x of [238,562])void add('front-'+x,'wall-low',x,96,{scaleX:1.61});
    const wood=createFountainMaterial(scene,'coop-structural-timber','#b77c3c');
    for(const x of [128,672])for(const y of [300,504]) {
        const p=fountainWorldPosition(x,y),post=B.MeshBuilder.CreateBox('coop-structural-post',{width:.18,height:3.4,depth:.22},scene);
        post.position.set(p.x,1.7,p.z);post.material=wood;post.receiveShadows=true;shadows.addShadowCaster(post);
    }
    void add('prices','price-board',355,482,{height:1.65,scale:.92});
    void add('orders','order-board',438,482,{height:1.65,scale:.92});
    for(const x of [166,634])void add('hanging-'+x,'hanging-plant',x,494,{height:2.7});
    for(const x of [282,518])void add('entry-flower-'+x,'flower-planter',x,111);
    // These use the same reusable character presets as the player catalogue, not baked portraits.
    for(const [id,file,x,y] of [['professor','professor',400,470],['seed-merchant','merchant',237,441],['produce-merchant','merchant',563,441]]) {
        void place('coop-npc-'+id,'characters/coop-v1/'+file+'.glb',x,y,1,'','',{rotation:0,onReady:root=>{
            root.metadata={role:id,reusableCharacter:file,rig:'student-animation-v1'};
        }});
    }
    void add('exit','exit-gate',world.exit.x,world.exit.y,{onReady:root=>{
        root.name='fountain-exit-vortex';root.metadata={destination:'campus',active:true};
        root.getChildMeshes().forEach(mesh=>{
            mesh.actionManager=new B.ActionManager(scene);
            mesh.actionManager.registerAction(new B.ExecuteCodeAction(B.ActionManager.OnPickTrigger,()=>showToast('Đi đến cổng vàng để về bản đồ chính.')));
        });
    }});
    // Additive energy is separate from the gate mesh and is absent on the locked farm.
    const pos=fountainWorldPosition(world.exit.x,world.exit.y);
    const glow=new B.StandardMaterial('coop-exit-energy',scene);glow.diffuseColor=new B.Color3(1,.64,.12);
    glow.emissiveColor=new B.Color3(1,.57,.08);glow.alpha=.65;glow.disableLighting=true;
    const energy=B.MeshBuilder.CreateTorus('coop-exit-threshold',{diameter:2.55,thickness:.045,tessellation:48},scene);
    energy.position.set(pos.x,.035,pos.z);energy.material=glow;energy.isPickable=false;
    for(const dx of [-1.48,1.48]) {
        const edge=B.MeshBuilder.CreateBox('coop-gold-exit-edge',{width:.035,height:2.05,depth:.04},scene);
        edge.position.set(pos.x+dx,1.05,pos.z-.16);edge.material=glow;edge.isPickable=false;
    }
    scene.onBeforeRenderObservable.add(()=>{glow.alpha=.55+Math.sin(performance.now()*.002)*.12;});
    world.coopState={theme:'coop-v1',farmLocked:true,exitDestination:'campus',npcCount:3};
}
