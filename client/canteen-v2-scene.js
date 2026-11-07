/* Canteen assembly. State, purchases and reach checks stay in the existing game. */
function createCanteenConceptScene(scene,world,{place,interact,shadows}) {
    const B=BABYLON,layout=Map3DLayouts.get('canteen'),pack='canteen-v2/';
    const add=(id,file,x,y,options={})=>place('canteen-'+id,pack+file+'.glb',x,y,options.scale||1,'','',options);
    const stone=createFountainMaterial(scene,'canteen-limestone','#dcc7a3');
    const oak=createFountainMaterial(scene,'canteen-oak','#80532e');
    const teal=createFountainMaterial(scene,'canteen-teal','#164e48');
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
    void add('canopy','canopy-menu',400,455,{height:2.5});
    for(const x of [260,400,540])void add('pendant-'+x,'pendant-light',x,420,{height:2.15});
    for(const x of [180,620])void add('hanging-'+x,'hanging-plant',x,498,{height:2.45});
    for(const x of [-4,4]) {
        const light=new B.PointLight('canteen-warm-light',new B.Vector3(x,2.8,3.6),scene);
        light.diffuse=new B.Color3(1,.76,.46);light.intensity=.3;light.range=7;
    }
    function label(name,parent,width,height,x,y,z,draw) {
        const face=B.MeshBuilder.CreatePlane(name,{width,height},scene);
        face.parent=parent;face.position.set(x,y,z);
        const texture=new B.DynamicTexture(name+'-texture',{width:512,height:256},scene,false);
        const material=new B.StandardMaterial(name+'-material',scene);
        material.diffuseTexture=texture;material.emissiveColor=new B.Color3(.65,.65,.65);
        material.specularColor=B.Color3.Black();face.material=material;
        face.isPickable=true;
        if(draw){draw(texture.getContext());texture.update();}
        return {face,texture};
    }
    function fit(ctx,text,max,font=46) {
        do{ctx.font=`bold ${font}px Arial`;font-=2;}while(ctx.measureText(text).width>max&&font>16);
    }
    let spiral;
    void add('exit','exit-portal',world.exit.x,world.exit.y,{scale:1.2,onReady:root=>{
        root.name='fountain-exit-vortex';
        spiral=new B.TransformNode('canteen-portal-energy',scene);spiral.parent=root;
        spiral.position.set(0,.88,-.08);root.computeWorldMatrix(true);spiral.computeWorldMatrix(true);
        root.getChildMeshes().filter(mesh=>mesh.name.includes('vortex_spiral')).forEach(mesh=>mesh.setParent(spiral));
        label('canteen-exit-label',root,1.4,.24,0,1.88,-.12,ctx=>{
            ctx.fillStyle='#173a36';ctx.fillRect(0,0,512,256);ctx.textAlign='center';ctx.fillStyle='#bcf8ff';ctx.font='bold 60px Arial';ctx.fillText('THOÁT MAP',256,152);
        });
        root.getChildMeshes().forEach(mesh=>{
            mesh.actionManager=new B.ActionManager(scene);
            mesh.actionManager.registerAction(new B.ExecuteCodeAction(B.ActionManager.OnPickTrigger,()=>showToast('Dùng mũi tên đi đến cổng xoáy để về sân trường.')));
        });
    }});
    scene.onBeforeRenderObservable.add(()=>{if(spiral)spiral.rotation.z-=Math.min(world.engine.getDeltaTime()/1000,.05)*.8;});
    // Public ranking data contains names and scores, not player avatar images.
    // Initials replace the model's sample portraits; opening a board shows TOP 10.
    return layout.boards.map(board=>{
        const category=board.id.slice(8),accent=category==='reputation'?'#efce76':'#c8edf1';
        let panels=[],signature='';
        void place(board.id,pack+board.file+'.glb',board.x,board.y,1,board.action,'',{onReady:root=>{
            root.name=board.id;
            root.getChildMeshes().filter(mesh=>/portrait_(back|head|hair|shirt|eye)|rank_text|honor_title/.test(mesh.name)).forEach(mesh=>mesh.setEnabled(false));
            label(board.id+'-title',root,1.90,.24,0,2.13,-.19,ctx=>{
                ctx.fillStyle='#123b34';ctx.fillRect(0,0,512,256);ctx.fillStyle=accent;ctx.textAlign='center';ctx.font='bold 62px Arial';
                ctx.fillText(category==='reputation'?'DANH TIẾNG':'TIỀN ĐỒNG',256,150,490);
            });
            const positions=[[0,1.62],[-.65,1.18],[.65,1.18]];
            panels=positions.map(([x,y],index)=>{
                const portrait=label(board.id+'-initials-'+index,root,.40,.40,x,y,-.26);
                const name=label(board.id+'-name-'+index,root,.59,.23,x,y-.37,-.19);
                return {portrait,name};
            });
            root.getChildMeshes().filter(mesh=>mesh.name.startsWith(board.id+'-')).forEach(mesh=>{
                mesh.actionManager=new B.ActionManager(scene);
                mesh.actionManager.registerAction(new B.ExecuteCodeAction(B.ActionManager.OnPickTrigger,()=>interact(board.action,board.x,board.y)));
            });
            signature='';update();
        }});
        function update() {
            if(!panels.length)return;
            const rows=getServerRankingRows(category).slice(0,3),next=JSON.stringify(rows);
            if(signature===next)return;signature=next;
            panels.forEach(({portrait,name},index)=>{
                const row=rows[index],nickname=String(row?.nickname||'Chưa có');
                const initials=row?nickname.trim().split(/\s+/).map(word=>Array.from(word)[0]).slice(-2).join('').toUpperCase():'—';
                let ctx=portrait.texture.getContext();ctx.fillStyle='#123b34';ctx.fillRect(0,0,512,256);
                ctx.fillStyle=accent;ctx.textAlign='center';ctx.font='bold 100px Arial';ctx.fillText(initials,256,130,460);
                ctx.font='bold 48px Arial';ctx.fillText('TOP '+(index+1),256,218);portrait.texture.update();
                ctx=name.texture.getContext();ctx.fillStyle='#123b34';ctx.fillRect(0,0,512,256);
                ctx.textAlign='center';ctx.fillStyle='#fff5df';fit(ctx,nickname,490,65);ctx.fillText(nickname,256,102,490);
                ctx.fillStyle=accent;ctx.font='bold 65px Arial';ctx.fillText(row?(Number(row.score)||0).toLocaleString('vi-VN'):'—',256,205,490);name.texture.update();
            });
        }
        return update;
    });
}
