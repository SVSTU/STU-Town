// Run against the local static server on 8766. No game-server writes or real users.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'stu-canteen-browser-'));
const chrome=spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',[
    '--headless','--no-sandbox','--disable-extensions','--no-first-run','--no-default-browser-check',
    '--enable-unsafe-swiftshader','--use-angle=swiftshader','--remote-debugging-port=0',
    '--user-data-dir='+profile,'about:blank'
],{windowsHide:true,stdio:'ignore'});
let ws;let serial=0;const pending=new Map();
function call(method,params={}){return new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function capture(name){const shot=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.resolve('client/assets/3d/previews/'+name+'.png'),Buffer.from(shot.data,'base64'));}
(async()=>{
    const portFile=path.join(profile,'DevToolsActivePort');
    for(let i=0;i<100&&!fs.existsSync(portFile);i++)await delay(200);
    assert(fs.existsSync(portFile),'Chrome debugging port');
    const port=fs.readFileSync(portFile,'utf8').split(/\r?\n/)[0];
    const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
    ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
    ws.onmessage=event=>{const r=JSON.parse(event.data),p=pending.get(r.id);if(p){pending.delete(r.id);r.error?p.reject(Error(JSON.stringify(r.error))):p.resolve(r.result);}};
    await call('Emulation.setDeviceMetricsOverride',{width:1100,height:820,deviceScaleFactor:1,mobile:false});
    await call('Page.navigate',{url:'http://127.0.0.1:8766/tools/map3d-smoke.html?map=canteen'});
    let result;
    for(let i=0;i<180;i++){result=await evaluate('window.smokeResult');if(result)break;await delay(500);}
    assert(result,'scene loaded within 90 seconds');assert.deepEqual(result.errors,[]);
    assert(result.portal&&result.boards===2);assert(result.occlusion.blocked&&result.occlusion.hiddenSkipped);
    assert(result.canteenChecks.spawnClear&&result.canteenChecks.boardsFaceWalkway&&result.canteenChecks.machineFacesWalkway);
    assert(result.canteenChecks.samplePortraitsHidden&&result.canteenChecks.rankPanels===6);
    // Exercise the real shared controller in the rendered scene; no click walking.
    const controls=await evaluate(`(()=>{
        const start={...players.demo},alpha=babylonFountain.camera.alpha;
        window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowUp'}));
        const lit=document.querySelector('[data-move-direction="up"]').classList.contains('is-pressed');
        for(let i=0;i<8;i++)update(performance.now(),16.667);
        window.dispatchEvent(new KeyboardEvent('keyup',{code:'ArrowUp'}));
        const after={...players.demo};update(performance.now(),16.667);
        const stopped=players.demo.x===after.x&&players.demo.y===after.y;
        Object.assign(players.demo,start);
        const button=document.querySelector('[data-move-direction="up"]');
        button.dispatchEvent(new PointerEvent('pointerdown',{pointerId:41,pointerType:'touch',bubbles:true}));
        for(let i=0;i<8;i++)update(performance.now(),16.667);
        button.dispatchEvent(new PointerEvent('pointerup',{pointerId:41,pointerType:'touch',bubbles:true}));
        const padMatches=Math.hypot(players.demo.x-after.x,players.demo.y-after.y)<.001;
        Object.assign(players.demo,start);
        return {lit,stopped,padMatches,moved:Math.hypot(after.x-start.x,after.y-start.y)>10,cameraStable:babylonFountain.camera.alpha===alpha};
    })()`);
    assert(Object.values(controls).every(Boolean),JSON.stringify(controls));
    const interactions=await evaluate(`(()=>{
        const player=players.demo,start={...player};
        const mesh=babylonFountain.scene.meshes.find(m=>m.name.startsWith('static-0:')&&m.actionManager);
        const pick=()=>mesh.actionManager.processTrigger(BABYLON.ActionManager.OnPickTrigger,{meshUnderPointer:mesh});
        const count=smokeInteractions.length;pick();const remoteDenied=smokeInteractions.length===count;
        Object.assign(player,{x:400,y:415});pick();const nearbyAccepted=smokeInteractions.at(-1)==='canteen-counter';
        Object.assign(player,start);
        const emitted=smokeEmits.filter(e=>e[0]==='returnToCampus').length;update(performance.now(),16);
        const stayed=smokeEmits.filter(e=>e[0]==='returnToCampus').length===emitted;
        Object.assign(player,babylonFountain.exit);update(performance.now(),16);
        const exitAccepted=smokeEmits.filter(e=>e[0]==='returnToCampus').length===emitted+1;
        Object.assign(player,start);babylonFountain.exitPending=false;
        return {remoteDenied,nearbyAccepted,stayed,exitAccepted};
    })()`);
    assert(Object.values(interactions).every(Boolean),JSON.stringify(interactions));
    await evaluate("document.getElementById('smoke-result').hidden=true");
    await delay(300);await capture('canteen-v2-map-3d');
    await call('Emulation.setDeviceMetricsOverride',{width:390,height:740,deviceScaleFactor:1,mobile:true});
    await delay(700);
    const phone=await evaluate(`(()=>{const b=babylonFountain.canvas.getBoundingClientRect(),p=document.getElementById('mobile-movement-pad').getBoundingClientRect(),c=document.querySelector('.fountain-camera-toggle').getBoundingClientRect();return {deviceViewport:innerWidth===390,canvasFits:b.width<=innerWidth+1,padFits:p.left>=b.left&&p.right<=b.right+1&&p.bottom<=b.bottom+1,cameraButtonClear:c.right<=p.left||c.left>=p.right||c.bottom<=p.top||c.top>=p.bottom,zoomRoom:babylonFountain.camera.upperRadiusLimit>=babylonFountain.camera.radius};})()`);
    assert(Object.values(phone).every(Boolean),JSON.stringify(phone));
    await capture('canteen-v2-map-mobile');
    await evaluate(`deactivateBabylonFountain();currentMapId='canteen';activateBabylonMapPack(currentMapId);deactivateBabylonFountain();currentMapId='halloween:test';activateBabylonMapPack(currentMapId);`);
    await delay(2500);
    const cycle=await evaluate(`({errors:smokeErrors,canvases:document.querySelectorAll('#babylon-fountain-canvas').length,map:babylonFountain.mapId})`);
    assert.deepEqual(cycle.errors,[]);assert.equal(cycle.canvases,1);assert.equal(cycle.map,'halloween:test');
    console.log(JSON.stringify({scene:result,controls,interactions,phone,cycle},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(ws?.readyState===WebSocket.OPEN){await call('Browser.close').catch(()=>{});ws.close();}else chrome.kill();});
