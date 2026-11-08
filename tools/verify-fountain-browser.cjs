// Exercise the real GLB transforms, seating renderer and mobile action in an isolated page.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process'),delay=ms=>new Promise(r=>setTimeout(r,ms));
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'stu-fountain-seating-'));
const chrome=spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',['--headless','--no-sandbox','--disable-extensions','--no-first-run','--no-default-browser-check','--enable-unsafe-swiftshader','--use-angle=swiftshader','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
let ws,serial=0;const pending=new Map();
function call(method,params={}){return new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function waitFor(expression,timeout=90000){for(let i=0;i<timeout/250;i++){if(await evaluate('Boolean('+expression+')'))return;await delay(250);}throw Error('Timed out: '+expression);}
async function capture(name){const shot=await call('Page.captureScreenshot',{format:'png'}),dir=path.resolve('client/assets/3d/previews');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,name+'.png'),Buffer.from(shot.data,'base64'));}
(async()=>{
    const portFile=path.join(profile,'DevToolsActivePort');for(let i=0;i<100&&!fs.existsSync(portFile);i++)await delay(200);assert(fs.existsSync(portFile));
    const port=fs.readFileSync(portFile,'utf8').split(/\r?\n/)[0],tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
    ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
    ws.onmessage=e=>{const r=JSON.parse(e.data),p=pending.get(r.id);if(p){pending.delete(r.id);r.error?p.reject(Error(JSON.stringify(r.error))):p.resolve(r.result);}};
    await call('Emulation.setDeviceMetricsOverride',{width:1100,height:820,deviceScaleFactor:1,mobile:false});
    await call('Page.navigate',{url:'http://127.0.0.1:8766/tools/fountain-smoke.html'});
    await waitFor(`typeof babylonFountain!=='undefined'&&babylonFountain?.scene.transformNodes.filter(n=>n.metadata?.file==='pergola.glb').length===2&&babylonFountain.players.get('demo')?._characterModel`);
    const directions=await evaluate(`(()=>{
        const scene=babylonFountain.scene;
        return FountainPhysics.benches.map(b=>{
            const p=scene.transformNodes.find(n=>n.metadata&&(b.kind==='stone'?n.metadata.file==='stone-bench.glb'&&Math.abs(n.metadata.x-b.worldX)<.01&&Math.abs(n.metadata.z-b.worldZ)<.01:n.metadata.file==='pergola.glb'&&FountainPhysics.pergolas.find(p=>p.id===b.pergolaId).x===n.metadata.x));
            const all=p.getChildMeshes(),seat=all.find(n=>b.kind==='stone'?n.name==='bench_seat_slat':n.name==='pergola_bench_seat'),back=all.find(n=>b.kind==='stone'?n.name==='bench_back_slat':n.name==='pergola_bench_back');
            if(!seat||!back)return {id:b.id,names:all.map(n=>n.name)};
            seat.computeWorldMatrix(true);back.computeWorldMatrix(true);const front=seat.getAbsolutePosition().subtract(back.getAbsolutePosition());
            return {id:b.id,dot:front.x*-Math.sin(b.rotation)+front.z*-Math.cos(b.rotation)};
        });})()`);
    assert(directions.every(b=>b.dot>0),JSON.stringify(directions));
    const seating=await evaluate(`(()=>{
        const bench=FountainPhysics.benches.find(b=>b.kind==='pergola'),p=players.demo;
        Object.assign(p,FountainPhysics.approachPosition(bench,0,1.8));const start=p.x;
        babylonFountain.camera.alpha=0;babylonFountain.camera.getViewMatrix(true);
        keyboardMoveState.up=true;for(let i=0;i<8;i++)update(performance.now(),16.667);keyboardMoveState.up=false;
        const walkedInside=p.x<start-30&&!FountainPhysics.blocked(p.x,p.y)&&FountainPhysics.groundHeight(p.x,p.y)===.18;
        updateInteractionZone(p);const button=document.getElementById('interaction-button');button.click();
        const action=smokeEmits.at(-1),hud=!document.getElementById('interaction-hud').hidden&&document.getElementById('interaction-zone-name').textContent==='Ghế trong chòi nghỉ';
        players.guest={...FountainPhysics.approachPosition(bench,1),playerNickname:'Khách'};campusBenchOccupants={[bench.id]:['demo','guest']};updateBabylonFountainPlayers();updateInteractionZone(p);
        const a=babylonFountain.players.get('demo'),b=babylonFountain.players.get('guest');
        return {walkedInside,hud,action,disabled:button.disabled,spacing:BABYLON.Vector3.Distance(a.position,b.position),free:!FountainPhysics.blocked(p.x,p.y),seatedHeight:a.position.y,expectedHeight:bench.seatHeight-a._seatedHipBottom};})()`);
    assert(seating.walkedInside&&seating.hud&&seating.disabled&&seating.free,JSON.stringify(seating));assert.deepEqual(seating.action,['restAtCampusBench','fountain-pergola-bench-0']);assert(Math.abs(seating.spacing-.7)<.001);assert(Math.abs(seating.seatedHeight-seating.expectedHeight)<.001);
    await waitFor(`babylonFountain.players.get('guest')?._characterModel`);
    await evaluate(`document.getElementById('interaction-hud').style.display='none';babylonFountain.camera.alpha=-Math.PI/2+.3;babylonFountain.camera.beta=.90;babylonFountain.camera.radius=24;`);await delay(600);await capture('fountain-seating-fixed');
    await evaluate(`babylonFountain.camera.setTarget(new BABYLON.Vector3(-8,.8,0));babylonFountain.camera.alpha=0;babylonFountain.camera.beta=1.1;babylonFountain.camera.lowerRadiusLimit=5;babylonFountain.camera.radius=7;`);await delay(600);await capture('fountain-pergola-seating');
    const errors=await evaluate('smokeErrors');assert.deepEqual(errors,[]);console.log(JSON.stringify({directions,seating,errors},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(ws?.readyState===WebSocket.OPEN){await Promise.race([call('Browser.close').catch(()=>{}),delay(1500)]);ws.close();}chrome.kill();});
