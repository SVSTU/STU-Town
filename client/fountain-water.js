/* Animated fountain water. Geometry stays still; flow, foam and highlights move. */
function createFountainWater(scene) {
    if (scene._fountainWater) return;
    scene._fountainWater = true;
    const B = BABYLON;
    B.Effect.ShadersStore.parkWaterVertexShader = `
        precision highp float;
        attribute vec3 position;
        attribute vec3 normal;
        attribute vec2 uv;
        uniform mat4 world;
        uniform mat4 worldViewProjection;
        uniform float time;
        uniform float curtain;
        varying vec3 vWorld;
        varying vec3 vNormal;
        varying vec2 vUV;
        void main() {
            vec3 p = position;
            if (curtain < 0.5) {
                float r = length(p.xy);
                p.z += sin(r*16.0-time*3.0)*0.006 + sin(p.x*9.0+p.y*7.0+time*1.6)*0.004;
            }
            vWorld = (world*vec4(p,1.0)).xyz;
            vNormal = normalize(mat3(world)*normal);
            vUV = uv;
            gl_Position = worldViewProjection*vec4(p,1.0);
        }`;
    B.Effect.ShadersStore.parkWaterFragmentShader = `
        precision highp float;
        uniform float time;
        uniform float curtain;
        uniform vec3 eyePosition;
        uniform vec3 lightDirection;
        uniform float lightLevel;
        varying vec3 vWorld;
        varying vec3 vNormal;
        varying vec2 vUV;
        void main() {
            vec3 n = normalize(vNormal);
            vec3 eye = normalize(eyePosition-vWorld);
            vec3 light = normalize(-lightDirection);
            float wave = sin(vWorld.x*13.0+time*1.7)*sin(vWorld.z*11.0-time*1.2);
            n = normalize(n + vec3(wave*0.07,0.0,cos(vWorld.x*8.0+vWorld.z*9.0-time*2.0)*0.07));
            float fresnel = pow(1.0-abs(dot(n,eye)),3.0);
            float spec = pow(max(dot(reflect(-light,n),eye),0.0),70.0);
            float radial = sin(length(vWorld.xz)*23.0-time*3.6);
            float caustic = pow(max(0.0,wave),6.0);
            vec3 color = mix(vec3(0.025,0.37,0.46),vec3(0.40,0.76,0.82),fresnel);
            float alpha = 0.90;
            if (curtain > 0.5) {
                float flow = sin(vUV.x*150.0+sin(vUV.y*17.0-time*4.0))*0.5+0.5;
                float glint = pow(max(0.0,sin(vUV.y*48.0+time*12.0+vUV.x*23.0)),12.0);
                color = mix(vec3(0.23,0.64,0.72),vec3(0.83,0.96,0.97),flow*0.28+glint*0.35);
                alpha = 0.16+flow*0.19+fresnel*0.13;
            } else {
                color += vec3(caustic*0.09 + pow(max(radial,0.0),18.0)*0.035);
            }
            color = color*lightLevel + vec3(spec*0.55*lightLevel);
            gl_FragColor = vec4(color,alpha);
        }`;
    const materials = [0, 1].map(curtain => {
        const material = new B.ShaderMaterial(`flow-water-${curtain}`, scene, 'parkWater', {
            attributes: ['position','normal','uv'],
            uniforms: ['world','worldViewProjection','time','curtain','eyePosition','lightDirection','lightLevel'],
            needAlphaBlending: true
        });
        material.backFaceCulling = false;
        material.setFloat('curtain',curtain);
        return material;
    });
    const tiers = [{r:2.78,y:.425},{r:1.51,y:1.246},{r:.70,y:2.146}];
    tiers.forEach((tier,i) => {
        // Disc lies in XZ and exposes UVs to the ripple shader.
        const disc=B.MeshBuilder.CreateDisc(`flow-water-surface-${i}`,{radius:tier.r,tessellation:96,sideOrientation:B.Mesh.DOUBLESIDE},scene);
        disc.rotation.x=Math.PI/2; disc.position.y=tier.y; disc.material=materials[0]; disc.isPickable=false;
    });
    const falls=[{r:.84,top:2.12,bottom:1.25},{r:1.65,top:1.22,bottom:.43}];
    falls.forEach((fall,i) => {
        const paths=[];
        for(let row=0;row<=12;row++) {
            const t=row/12,r=fall.r+.09*t;
            const path=[];
            for(let col=0;col<=96;col++) {
                const angle=col/96*Math.PI*2;
                path.push(new B.Vector3(Math.cos(angle)*r,fall.top-(fall.top-fall.bottom)*t*t,Math.sin(angle)*r));
            }
            paths.push(path);
        }
        const sheet=B.MeshBuilder.CreateRibbon(`flow-water-curtain-${i}`,{pathArray:paths,sideOrientation:B.Mesh.DOUBLESIDE},scene);
        sheet.material=materials[1]; sheet.isPickable=false;
    });
    const sprayMat=new B.StandardMaterial('flow-water-spray',scene);
    sprayMat.diffuseColor=new B.Color3(.65,.88,.94);
    sprayMat.specularColor=new B.Color3(1,1,1); sprayMat.specularPower=64;
    sprayMat.alpha=.64;
    const shape=B.MeshBuilder.CreateSphere('flow-water-drop-template',{diameter:1,segments:4},scene);
    const particles=new B.SolidParticleSystem('flow-water-drops',scene,{updatable:true});
    particles.addShape(shape,320); shape.dispose();
    const spray=particles.buildMesh(); spray.material=sprayMat; spray.isPickable=false;
    spray.alwaysSelectAsActiveMesh=true;
    particles.computeParticleColor=false; particles.computeParticleTexture=false;
    let elapsed=0;
    particles.updateParticle = particle => {
        const i=particle.idx;
        if(i<224) {
            const jet=i%8, angle=jet*Math.PI/4;
            const t=((elapsed*1.12+Math.floor(i/8)/28)%1);
            const radius=.035+.59*t;
            particle.position.set(Math.cos(angle)*radius,2.15+2.5*t-2.5*t*t,Math.sin(angle)*radius);
            const size=.018+.010*t;
            particle.scaling.set(size,size*1.7,size);
        } else {
            const k=i-224,fall=falls[k%2],angle=k*2.39996;
            const t=(elapsed*1.6+k*.173)%1;
            const radius=fall.r+.10+.22*t;
            particle.position.set(Math.cos(angle)*radius,fall.bottom+.16*4*t*(1-t),Math.sin(angle)*radius);
            const size=.018*(1-t)+.004;
            particle.scaling.set(size,size*.7,size);
        }
        return particle;
    };
    const foamMat=new B.StandardMaterial('flow-water-foam',scene);
    foamMat.diffuseColor=new B.Color3(.75,.91,.94); foamMat.specularColor=B.Color3.Black(); foamMat.alpha=.42;
    const ripples=[];
    falls.forEach((fall,j)=>{
        for(let i=0;i<18;i++) {
            const angle=i*Math.PI*2/18+j*.2;
            const ripple=B.MeshBuilder.CreateTorus('flow-water-impact',{diameter:.18,thickness:.009,tessellation:16},scene);
            ripple.position.set(Math.cos(angle)*(fall.r+.09),fall.bottom+.012,Math.sin(angle)*(fall.r+.09));
            ripple.material=foamMat; ripple.isPickable=false;
            ripples.push(ripple);
        }
    });
    scene.onBeforeRenderObservable.add(()=>{
        elapsed+=Math.min(scene.getEngine().getDeltaTime()/1000,.05);
        const light=scene.getLightByName('park-sunlight');
        const level=Math.max(.18,Math.min(1,(light?.intensity||.1)+.22));
        materials.forEach(material=>{
            material.setFloat('time',elapsed);
            material.setVector3('eyePosition',scene.activeCamera.globalPosition);
            material.setVector3('lightDirection',light?.direction||new B.Vector3(-1,-1,0));
            material.setFloat('lightLevel',level);
        });
        particles.setParticles();
        ripples.forEach((ripple,i)=>{
            const t=(elapsed*.7+i*.137)%1;
            ripple.scaling.setAll(.35+t*1.7);
            ripple.visibility=(1-t)*.65;
        });
    });
    scene.onDisposeObservable.add(()=>{particles.dispose();materials.forEach(m=>m.dispose());});
}
