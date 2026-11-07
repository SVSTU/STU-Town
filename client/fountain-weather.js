/* Babylon presentation of the same environmentConditions used by the campus. */
function createFountainWeather(scene, sunlight, ambient) {
    const material = (name, color, emission = 0) => {
        const m = new BABYLON.StandardMaterial(name,scene);
        m.diffuseColor = BABYLON.Color3.FromHexString(color);
        m.emissiveColor = m.diffuseColor.scale(emission);
        m.specularColor = BABYLON.Color3.Black();
        return m;
    };
    const sunMat=material('sky-sun','#ffe6a3',1);
    const moonMat=material('sky-moon','#dbe8ff',.8);
    const cloudMat=material('sky-cloud','#ffffff',.25);
    const starMat=material('sky-star','#ebf3ff',1);
    const rainMat=material('sky-rain','#a5cfe8',.3); rainMat.alpha=.45;
    const sphere=(name,diameter,mat)=>{
        const mesh=BABYLON.MeshBuilder.CreateSphere(name,{diameter,segments:12},scene);
        mesh.material=mat; mesh.isPickable=false; mesh.receiveShadows=false; return mesh;
    };
    const sun=sphere('sky-sun',1.5,sunMat);
    const moon=sphere('sky-moon',1.1,moonMat);
    // Fixed random sequence keeps sky positions stable when weather refreshes.
    const random=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
    const clouds=Array.from({length:10},(_,i)=>{
        const root=new BABYLON.TransformNode('sky-cloud-group',scene);
        for(let j=0;j<4;j++) {
            const puff=sphere('sky-cloud-puff',1.1+random(i*9+j)*.7,cloudMat);
            puff.parent=root; puff.position.set(j*.65,Math.sin(j)*.18,0); puff.scaling.y=.55;
        }
        root.position.set(random(i+30)*34-17,7+random(i+50)*2,7+random(i+70)*6);
        return root;
    });
    const stars=Array.from({length:65},(_,i)=>{
        const mesh=sphere('sky-star',.035+random(i+80)*.05,starMat);
        mesh.position.set(random(i+100)*38-19,6+random(i+200)*11,9+random(i+300)*7);
        return mesh;
    });
    const rainTemplate=BABYLON.MeshBuilder.CreateBox('sky-rain-template',{width:.012,height:.24,depth:.012},scene);
    rainTemplate.material=rainMat; rainTemplate.isVisible=false; rainTemplate.isPickable=false;
    const drops=Array.from({length:150},(_,i)=>{
        const mesh=rainTemplate.createInstance('sky-rain-drop'); mesh.isPickable=false;
        mesh.position.set(random(i+400)*26-13,random(i+500)*9,random(i+600)*18-9);
        return mesh;
    });
    scene.fogMode=BABYLON.Scene.FOGMODE_EXP2;
    let lastUpdate=-Infinity, day=true, wet=false, storm=false, cover=0, starVisibility=0;
    const clamp=v=>Math.max(0,Math.min(1,v));
    const blend=(a,b,t)=>BABYLON.Color3.Lerp(BABYLON.Color3.FromHexString(a),BABYLON.Color3.FromHexString(b),clamp(t));
    scene.onBeforeRenderObservable.add(()=>{
        const now=performance.now(), dt=Math.min(scene.getEngine().getDeltaTime()/1000,.1);
        if(now-lastUpdate>1000) {
            lastUpdate=now;
            const conditions=typeof environmentConditions==='object' && environmentConditions || {};
            const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()).split(':');
            const hour=Number(parts[0])+Number(parts[1])/60;
            const date=new Date();
            const astronomy=typeof SunCalc!=='undefined';
            const solar=astronomy?SunCalc.getPosition(date,10.745,106.67583):null;
            const lunar=astronomy?SunCalc.getMoonPosition(date,10.745,106.67583):null;
            const altitude=solar?solar.altitude*180/Math.PI:45*Math.sin((hour-6)*Math.PI/12);
            day=altitude>-.833;
            cover=Math.max(0,Math.min(100,Number(conditions.cloudCover)||0));
            const code=Number(conditions.weatherCode);
            storm=code>=95;
            wet=Number(conditions.rain)>0||Number(conditions.showers)>0||(code>=51&&code<=67)||(code>=80&&code<=82)||storm;
            const fog=code===45||code===48;
            scene.fogDensity=fog?.025:wet?.008:.001;
            const daylight=clamp((altitude+7)/19);
            const twilight=clamp(1-Math.abs(altitude-1)/10);
            const overcast=clamp(Math.max(cover/100,wet?.8:0));
            let sky=blend('#070e23','#79b8e1',daylight);
            sky=BABYLON.Color3.Lerp(sky,BABYLON.Color3.FromHexString('#d99b84'),twilight*(1-overcast)*.65);
            sky=BABYLON.Color3.Lerp(sky,blend('#121a28','#939fa9',daylight),overcast*.7);
            scene.clearColor=new BABYLON.Color4(sky.r,sky.g,sky.b,1);
            scene.fogColor=sky;
            const illumination=astronomy?SunCalc.getMoonIllumination(date).fraction:typeof getLocalMoonIllumination==='function'?getLocalMoonIllumination():.5;
            sunlight.intensity=day?clamp(altitude/25)*(1-overcast*.7)*1.2:.025+illumination*.07;
            ambient.intensity=.16+daylight*.6;
            sunlight.diffuse=day?blend('#ffa565','#fff4dc',altitude/25):BABYLON.Color3.FromHexString('#a2b6d4');
            const place=(mesh,position)=>{
                const a=position.altitude,z=position.azimuth;
                mesh.position.set(-Math.sin(z)*Math.cos(a)*18,Math.sin(a)*18,Math.cos(z)*Math.cos(a)*18);
            };
            if(solar) place(sun,solar);
            if(lunar) place(moon,lunar);
            if(!astronomy) {
                sun.position.set((hour-12)*1.5,Math.sin((hour-6)*Math.PI/12)*18,10);
                moon.setEnabled(false);
            }
            sun.setEnabled(altitude>-.833&&cover<85&&!wet);
            if(lunar) moon.setEnabled(lunar.altitude>0&&illumination>.02&&cover<80&&!wet);
            sunMat.diffuseColor=blend('#ff8945','#fff3c6',altitude/25);
            sunMat.emissiveColor=sunMat.diffuseColor;
            moonMat.emissiveColor=moonMat.diffuseColor.scale((.15+illumination*.65)*(1-daylight*.9));
            const lightPosition=day?sun.position:moon.position;
            sunlight.direction=lightPosition.negate().normalize();
            sunlight.position.copyFrom(lightPosition);
            cloudMat.diffuseColor=BABYLON.Color3.Lerp(blend('#222d43','#f2f1ea',daylight),blend('#17202d','#747f8a',daylight),overcast*.7);
            cloudMat.emissiveColor=cloudMat.diffuseColor.scale(.03+daylight*.12);
            starVisibility=clamp((-altitude-6)/10)*(1-overcast)*(1-illumination*.4);
            clouds.forEach((mesh,i)=>mesh.setEnabled(i<Math.ceil(Math.max(wet?70:0,cover)/10)));
            stars.forEach(mesh=>mesh.setEnabled(starVisibility>.03&&!wet));
            drops.forEach(mesh=>mesh.setEnabled(wet));
        }
        clouds.forEach((mesh,i)=>{mesh.position.x+=dt*(.12+i*.014);if(mesh.position.x>19)mesh.position.x=-20;});
        if(wet) drops.forEach((mesh,i)=>{mesh.position.y-=dt*(storm?12:8);if(mesh.position.y<0)mesh.position.y=8+random(i)*2;});
        stars.forEach((mesh,i)=>{mesh.visibility=starVisibility*(.85+.15*Math.sin(now*.0007+i));});
    });
}
