/* Reference garden assembly; crop state stays authoritative on the existing farm room. */
function createCommunityGardenScene(scene,world,{place,remove,interact,shadows}) {
    const B=BABYLON,layout=Map3DLayouts.get('farm'),pack='community-farm-v2/';
    const add=(id,file,x,y,options={},action='')=>place('garden-'+id,pack+file+'.glb',x,y,options.scale||1,action,'',options);
    const grass=createFountainMaterial(scene,'garden-grass-rim','#688341');
    const rim=B.MeshBuilder.CreateBox('garden-ground-rim',{width:16.5,depth:12.5,height:.18},scene);
    rim.position.y=-.16;rim.material=grass;rim.receiveShadows=true;
    void add('floor','garden-floor',400,300,{castShadow:false});
    const posts=new Map();
    function rail(id,x,y,rotation=0,scaleX=1){
        void add('rail-'+id,'fence-rail',x,y,{rotation,scaleX});
        const dx=Math.cos(rotation)*34*scaleX,dy=-Math.sin(rotation)*34*scaleX;
        for(const sign of [-1,1])posts.set((x+sign*dx).toFixed(2)+','+(y+sign*dy).toFixed(2),{x:x+sign*dx,y:y+sign*dy});
    }
    for(let i=0;i<8;i++)rail('back-'+i,162+i*68,504);
    for(let i=0;i<6;i++)for(const x of [128,672])rail('side-'+x+'-'+i,x,130+i*68,Math.PI/2);
    for(const x of [162,230,298,502,570,638])rail('front-'+x,x,96);
    rail('front-short-left',349,96,0,.5);rail('front-short-right',451,96,0,.5);
    posts.forEach((p,id)=>void add('post-'+id,'fence-post',p.x,p.y));
    // Border plants sit within the shared hedge collision strips, outside all routes.
    for(let i=0;i<14;i++){
        const y=119+i*28;
        for(const x of [139,661])void add('flower-'+x+'-'+i,'flower-border',x,y,{rotation:i*.71,scale:1.12});
    }
    for(let i=0;i<18;i++){
        const x=150+i*29;
        void add('flower-back-'+i,'flower-border',x,491,{rotation:i*.53,scale:1.1});
        if(x<340||x>460)void add('flower-front-'+i,'flower-border',x,108,{rotation:i*.31,scale:1.12});
    }
    function textPlane(name,root,text,width,height,x,y,z,action=''){
        const mesh=B.MeshBuilder.CreatePlane(name,{width,height},scene);mesh.parent=root;mesh.position.set(x,y,z);
        mesh.metadata={label:text};
        const texture=new B.DynamicTexture(name+'-text',{width:1024,height:256},scene,false);texture.hasAlpha=true;
        const ctx=texture.getContext();ctx.clearRect(0,0,1024,256);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 110px "Segoe UI", Arial';ctx.fillStyle='#233725';ctx.fillText(text,512,132,960);texture.update();
        const mat=new B.StandardMaterial(name+'-ink',scene);mat.diffuseTexture=texture;mat.useAlphaFromDiffuseTexture=true;mat.emissiveColor=new B.Color3(.42,.42,.42);mat.specularColor=B.Color3.Black();mesh.material=mat;
        if(action){mesh.actionManager=new B.ActionManager(scene);mesh.actionManager.registerAction(new B.ExecuteCodeAction(B.ActionManager.OnPickTrigger,()=>interact(action)));}
        return mesh;
    }
    layout.plots.forEach((plot,index)=>{
        const action='plot:'+plot.id;
        void add('bed-'+plot.id,'raised-bed',plot.x,plot.y,{scale:plot.scale||1},action);
        void add('sign-'+plot.id,'plot-sign',plot.x,plot.y-plot.d-1,{height:.08,onReady:root=>textPlane('garden-sign-text-'+plot.id,root,'Luống '+(index+1),.69,.18,0,.56,-.059,action)},action);
    });
    const lantern=new B.PointLight('garden-shed-lantern',new B.Vector3(-6,2.25,3.95),scene);lantern.diffuse=new B.Color3(1,.65,.28);lantern.intensity=.45;lantern.range=4;
    let vortexTime=0,vortexMaterial;
    void add('exit','exit-portal',world.exit.x,world.exit.y,{onReady:root=>{
        root.name='fountain-exit-vortex';
        B.Effect.ShadersStore.gardenVortexVertexShader='precision highp float;attribute vec3 position;attribute vec2 uv;uniform mat4 worldViewProjection;varying vec2 vUV;void main(){vUV=uv;gl_Position=worldViewProjection*vec4(position,1.0);}';
        B.Effect.ShadersStore.gardenVortexFragmentShader='precision highp float;varying vec2 vUV;uniform float time;void main(){vec2 p=(vUV-.5)*2.;float r=length(p);if(r>1.)discard;float a=atan(p.y,p.x);float spiral=pow(.5+.5*sin(a*3.+r*16.-time*2.),8.);float halo=exp(-pow((r-.89)*17.,2.));float core=exp(-r*8.);vec3 c=mix(vec3(.015,.25,.30),vec3(.40,1.,1.),spiral*.8+halo*.6+core*.7);gl_FragColor=vec4(c,(.42+spiral*.5+halo*.3)*(1.-smoothstep(.90,1.,r)));}';
        vortexMaterial=new B.ShaderMaterial('garden-vortex-material',scene,{vertex:'gardenVortex',fragment:'gardenVortex'},{attributes:['position','uv'],uniforms:['worldViewProjection','time'],needAlphaBlending:true});
        vortexMaterial.backFaceCulling=false;vortexMaterial.disableDepthWrite=true;
        const face=B.MeshBuilder.CreatePlane('garden-vortex-surface',{width:1.08,height:1.39},scene);face.parent=root;face.position.set(0,1.26,-.082);face.material=vortexMaterial;
        textPlane('garden-exit-caption',root,'Thoát map',.48,.15,.79,.58,-.178);
        root.getChildMeshes().forEach(mesh=>{
            mesh.actionManager=new B.ActionManager(scene);mesh.actionManager.registerAction(new B.ExecuteCodeAction(B.ActionManager.OnPickTrigger,()=>showToast('Dùng phím mũi tên hoặc vùng điều hướng để đi đến cổng thoát.')));
        });
    }});
    scene.onBeforeRenderObservable.add(()=>{vortexTime+=Math.min(world.engine.getDeltaTime()/1000,.05);vortexMaterial?.setFloat('time',vortexTime);});
    const lastState=new Map();world.farmRenderState={};
    return ()=>{
        for(const plot of layout.plots){
            const state=farmPlots[plot.id],age=state?.plantedAt?Math.max(0,Date.now()-state.plantedAt):0;
            const candidate=state?.plantedAt?(state.cropKey||Object.keys(CROP_INFO).find(key=>key===state.crop||CROP_INFO[key].icon===state.crop)||'empty'):'empty';
            const crop=Object.hasOwn(CROP_INFO,candidate)?candidate:'empty';
            const stage=crop==='empty'?'empty':age<FARM_GROWTH_MS?'growing':age<FARM_WILT_MS?'ripe':'wilted';
            const key=crop+':'+stage;world.farmRenderState[plot.id]={crop,stage};
            if(lastState.get(plot.id)===key)continue;lastState.set(plot.id,key);
            const columns=crop==='strawberry'||crop==='carrot'?6:4,rows=crop==='strawberry'||crop==='carrot'?4:3;
            for(let i=0;i<24;i++){
                const id='garden-crop-'+plot.id+'-'+i;
                if(crop==='empty'||i>=columns*rows){remove(id);continue;}
                const x=plot.x+((i%columns)-(columns-1)/2)*(columns===6?.58:.88)*34,y=plot.y+(Math.floor(i/columns)-(rows-1)/2)*(rows===4?.58:.74)*34;
                void place(id,pack+'crop-'+crop+'-'+stage+'.glb',x,y,1,'plot:'+plot.id,'',{height:.48,rotation:(i%3)*.63});
            }
        }
    };
}
