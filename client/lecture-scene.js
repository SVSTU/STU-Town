/* Khu C: independent furniture, shared humanoids and server-owned opening hours. */
function createLectureScene(scene,world,{place,interact,shadows}) {
    const B=BABYLON,layout=Map3DLayouts.get('khu-c'),walls=[];
    const add=(id,file,x,y,options={},action='')=>place('lecture-'+id,'lecture-v1/'+file+'.glb',x,y,options.scale||1,action,'',options);
    const reused=(id,file,x,y,options={})=>place('lecture-'+id,'khu-a-coop-v1/'+file+'.glb',x,y,options.scale||1,'','',options);
    const wallReady=side=>root=>walls.push({root,side});
    for(const x of [145,247,349,451,553,655]) {
        for(const y of [121.5,240.5,359.5,478.5])void add('floor-'+x+'-'+y,'floor-module',x,y,{castShadow:false});
        void add('rear-'+x,'wall-plain',x,538,{onReady:wallReady('back')});
    }
    for(let i=0;i<7;i++)for(const side of ['left','right']) {
        const x=side==='left'?94:706,y=96+i*68;
        const window=side==='left'?[1,3,5].includes(i):[1,5].includes(i);
        void add('side-'+side+'-'+i,window?'wall-window':'wall-plain',x,y,{scaleX:2/3,rotation:side==='left'?-Math.PI/2:Math.PI/2,onReady:wallReady(side)});
    }
    for(const x of [219.8,580.2])void add('front-'+x,'wall-low',x,62,{scaleX:7.4/3});
    void add('platform','teaching-platform',400,478.5);
    void add('board','chalkboard',400,532,{height:1.55,onReady:wallReady('back')});
    void add('screen','projection-screen',420.4,526,{height:1.35,onReady:wallReady('back')});
    void add('projector','projector',420.4,459.8,{height:3.35,rotation:Math.PI});
    void add('title','lecture-title',400,532,{height:3.33,onReady:wallReady('back')});
    void add('clock','wall-clock',620,534,{height:2.87,onReady:wallReady('back')});
    void add('notice','noticeboard',701,300,{height:1.2,rotation:Math.PI/2,onReady:wallReady('right')});
    void add('schedule-support','schedule-panel',610,62);
    void add('schedule','schedule-sign',610,56.9,{height:.30});
    const slide=B.MeshBuilder.CreatePlane('lecture-slide',{width:2.9,height:1.62},scene);
    slide.position.set(.6,2.32,(526-300)/34-.048);slide.isPickable=false;
    const texture=new B.DynamicTexture('lecture-slide-texture',{width:768,height:432},scene,false),ctx=texture.getContext();
    ctx.fillStyle='#f6eed9';ctx.fillRect(0,0,768,432);
    for(const [i,height] of [90,140,210,285].entries()){ctx.fillStyle=['#adbec5','#8ba4b0','#6c899b','#4e718b'][i];ctx.fillRect(55+i*80,355-height,55,height);}
    ctx.fillStyle='#8ba4b0';ctx.beginPath();ctx.arc(575,183,94,0,Math.PI*2);ctx.fill();texture.update();
    const ink=new B.StandardMaterial('lecture-slide-material',scene);ink.diffuseTexture=texture;ink.emissiveColor=new B.Color3(.35,.35,.35);ink.specularColor=B.Color3.Black();slide.material=ink;
    for(const desk of layout.desks)void add('book-'+desk.id,desk.id.endsWith('1')?'closed-book':'open-book',desk.x+12,desk.y,{height:.765,rotation:Math.PI});
    void add('teacher-laptop','laptop',302,481,{height:1.24});
    void add('teacher-books','closed-book',263,481,{height:1.24});
    void add('teacher-pens','pen-holder',275,481,{height:1.24});
    for(const [id,x,y,height,scale] of [['back-left',185,480,.28,1.1],['back-right',550,482,.28,1.1],['front-left',124,125,0,.9],['front-right',676,125,0,.9]])void reused(id,'potted-plant',x,y,{height,scale});
    for(const x of [320,480])void reused('flower-'+x,'flower-planter',x,80,{scale:.85});
    void reused('trailing','hanging-plant',627,481.5,{height:2.95,scale:.7});
    for(const x of [145,655])void reused('lamp-'+x,'wall-lantern',x,531,{height:2.65,onReady:wallReady('back')});
    void place('lecture-npc-professor','characters/campus-v1/professor.glb',287.8,508,1,'','',{height:.28});
    for(const [index,file] of [[0,'student'],[3,'student-female'],[6,'student-female'],[9,'student']]) {
        const seat=layout.seats[index];
        void place('lecture-npc-seat-'+index,'characters/campus-v1/'+file+'.glb',seat.x,seat.y,1,'','',{rotation:Math.PI,height:-.24,onReady:root=>{
            const pose=bindStudentAnimation(root,root);pose(1,0,false,true);
            root.metadata={reusableCharacter:file,pose:'seated',seat:seat.id,decorative:true};
        }});
    }
    void add('exit','exit-gate',world.exit.x,world.exit.y,{onReady:root=>{
        root.name='fountain-exit-vortex';root.metadata={destination:'campus',active:true};
        root.getChildMeshes().forEach(mesh=>{mesh.actionManager=new B.ActionManager(scene);mesh.actionManager.registerAction(new B.ExecuteCodeAction(B.ActionManager.OnPickTrigger,()=>showToast('Đi đến cổng vàng để về bản đồ chính.')));});
    }});
    for(const x of [world.exit.x-52.7,world.exit.x+52.7])void reused('exit-lamp-'+x,'wall-lantern',x,world.exit.y-5,{height:2});
    const glow=new B.StandardMaterial('lecture-exit-energy',scene);glow.emissiveColor=new B.Color3(1,.62,.12);glow.disableLighting=true;glow.alpha=.65;
    const ring=B.MeshBuilder.CreateTorus('lecture-exit-threshold',{diameter:2.6,thickness:.045,tessellation:48},scene),exit=fountainWorldPosition(world.exit.x,world.exit.y);
    ring.position.set(exit.x,.035,exit.z);ring.material=glow;ring.isPickable=false;
    scene.onBeforeRenderObservable.add(()=>{
        glow.alpha=.57+Math.sin(performance.now()*.002)*.10;
        const p=scene.activeCamera.position;
        slide.setEnabled(p.z<=6.7);
        for(const {root,side} of walls){
            const faded=side==='left'?p.x<-8.5:side==='right'?p.x>8.5:p.z>6.7;
            // Instanced GLBs share source visibility/materials. Enable each instance instead of changing alpha.
            for(const mesh of root.getChildMeshes()){mesh.setEnabled(!faded);mesh.isPickable=!faded;}
        }
    });
    world.lectureState={desks:6,chairs:12,npcs:5,exitDestination:'campus',schedule:['07:00–11:30','13:00–17:00'],scheduleAuthority:'server',characterLibrary:'campus-v1'};
}
