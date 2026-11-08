/* Two-person private garden. Geometry, collisions and seat anchors are separate. */
function createPrivateBenchScene(scene,world,{place}) {
    const B=BABYLON,layout=Map3DLayouts.get(world.mapId),pack='private-bench-v1/';
    const add=(id,file,x,y,options={})=>place('private-'+id,pack+file+'.glb',x,y,options.scale||1,'','',options);
    world.privateGardenState={capacity:2,recoveryMs:300000,statDrain:false};
    world.groundHeight=(x,y)=>Math.hypot(x-world.exit.x,y-world.exit.y)<.79*34 ? .25 : .03;
    void add('floor','garden-ground',400,300,{castShadow:false});
    // Repeated hedge modules; the opening in front stays clear.
    for(let i=0;i<6;i++)void add('hedge-back-'+i,'hedge',400+(-5+i*2)*34,461.5);
    for(let i=0;i<5;i++)for(const x of [206.2,593.8])void add('hedge-side-'+x+'-'+i,'hedge',x,300+(-4+i*2)*34,{rotation:Math.PI/2});
    for(const side of [-1,1])for(let i=0;i<3;i++)void add('hedge-front-'+side+'-'+i,'hedge',400+side*(1.7+i*1.6)*34,138.5,{scaleX:.8});
    const lights=[];
    const hud=document.getElementById('interaction-hud'),hudKeys=['top','left','right','bottom','width','maxHeight','transform'];
    const hudBefore=hud?Object.fromEntries(hudKeys.map(key=>[key,hud.style[key]])):{};let hudBounds='';
    scene.onDisposeObservable.add(()=>{if(hud)for(const key of hudKeys)hud.style[key]=hudBefore[key];});
    for(const x of [284.4,515.6]){
        const p=fountainWorldPosition(x,391.8),light=new B.PointLight('private-lamp-light',new B.Vector3(p.x,2.45,p.z),scene);
        light.diffuse=new B.Color3(1,.69,.30);light.range=4.5;lights.push(light);
    }
    let vortex,time=0;
    void add('exit','exit-portal',world.exit.x,world.exit.y,{onReady:root=>{
        root.name='fountain-exit-vortex';
        B.Effect.ShadersStore.privateVortexVertexShader='precision highp float;attribute vec3 position;attribute vec2 uv;uniform mat4 worldViewProjection;varying vec2 vUV;void main(){vUV=uv;gl_Position=worldViewProjection*vec4(position,1.0);}';
        B.Effect.ShadersStore.privateVortexFragmentShader='precision highp float;varying vec2 vUV;uniform float time;void main(){vec2 p=(vUV-.5)*2.;float r=length(p);if(r>1.)discard;float a=atan(p.y,p.x);float s=pow(.5+.5*sin(a*3.+r*14.-time*1.7),5.);float rim=exp(-pow((r-.94)*22.,2.));float core=exp(-r*9.);vec3 col=mix(vec3(.005,.13,.22),vec3(.30,.96,1.),s*.78+rim*.7+core);gl_FragColor=vec4(col,.80+rim*.2);}';
        vortex=new B.ShaderMaterial('private-vortex-material',scene,{vertex:'privateVortex',fragment:'privateVortex'},{attributes:['position','uv'],uniforms:['worldViewProjection','time']});
        vortex.backFaceCulling=false;
        const face=B.MeshBuilder.CreatePlane('private-vortex-surface',{width:1.22,height:1.76},scene);
        face.parent=root;face.position.set(0,1.22,-.012);face.material=vortex;face.isPickable=false;
        if(world.gui){
            const label=new B.GUI.TextBlock('private-exit-label','Thoát về sân trường');label.color='#e6fcff';label.fontFamily='Segoe UI, Arial';label.fontSize=12;label.width='145px';label.height='25px';label.outlineWidth=3;label.outlineColor='#123540';
            world.gui.addControl(label);label.linkWithMesh(root.getChildMeshes()[0]);label.linkOffsetY=45;
        }
        root.getChildMeshes().forEach(mesh=>{
            mesh.actionManager=new B.ActionManager(scene);
            mesh.actionManager.registerAction(new B.ExecuteCodeAction(B.ActionManager.OnPickTrigger,()=>showToast('Dùng phím mũi tên hoặc vùng điều hướng để đi vào vòng xoáy.')));
        });
    }});
    scene.onBeforeRenderObservable.add(()=>{
        time+=Math.min(world.engine.getDeltaTime()/1000,.05);vortex?.setFloat('time',time);
        if(hud){
            const b=world.canvas.getBoundingClientRect(),key=[b.left,b.top,b.width,b.height].join(',');
            if(key!==hudBounds){hudBounds=key;Object.assign(hud.style,{left:(b.left+8)+'px',top:(b.top+43)+'px',right:'auto',bottom:'auto',width:Math.min(270,b.width-16)+'px',maxHeight:Math.min(190,b.height*.32)+'px',transform:'none'});}
        }
        const sun=scene.getLightByName('park-sunlight'),dark=(sun?.intensity||0)<.5;
        lights.forEach(light=>light.intensity=dark?.65:.08);
    });
}
