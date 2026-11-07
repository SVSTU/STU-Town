// Test the real renderer/controller locally; all players, crops and socket writes are isolated fixtures.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process'),delay=ms=>new Promise(r=>setTimeout(r,ms));
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'stu-garden-browser-'));
const chrome=spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',['--headless','--no-sandbox','--disable-extensions','--no-first-run','--no-default-browser-check','--enable-unsafe-swiftshader','--use-angle=swiftshader','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
let ws,serial=0;const pending=new Map();
function call(method,params={}){return new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function capture(name){const shot=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.resolve('client/assets/3d/community-farm-v2/previews/'+name+'.png'),Buffer.from(shot.data,'base64'));}
async function waitFor(expression,timeout=10000){for(let i=0;i<timeout/200;i++){if(await evaluate('Boolean('+expression+')'))return;await delay(200);}throw Error('Timed out: '+expression);}
(async()=>{
    const portFile=path.join(profile,'DevToolsActivePort');for(let i=0;i<100&&!fs.existsSync(portFile);i++)await delay(200);assert(fs.existsSync(portFile));
    const port=fs.readFileSync(portFile,'utf8').split(/\r?\n/)[0],tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
    ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
    ws.onmessage=e=>{const r=JSON.parse(e.data),p=pending.get(r.id);if(p){pending.delete(r.id);r.error?p.reject(Error(JSON.stringify(r.error))):p.resolve(r.result);}};
    await call('Emulation.setDeviceMetricsOverride',{width:1100,height:820,deviceScaleFactor:1,mobile:false});
    await call('Page.navigate',{url:'http://127.0.0.1:8766/tools/map3d-smoke.html?map=farm'});
    await waitFor('window.smokeResult',90000);const result=await evaluate('window.smokeResult');assert.deepEqual(result.errors,[]);assert(result.portal&&result.occlusion.blocked&&result.occlusion.hiddenSkipped);
    const assets=await evaluate(`(()=>{const w=babylonFountain,r=w.players.get('demo');return {character:r._characterKey,joints:r._characterModel.getDescendants().filter(n=>/^student_(hip|knee|shoulder|elbow)_(left|right)$/.test(n.name)).length,beds:Map3DLayouts.get('farm').plots.filter(p=>w.scene.getTransformNodeByName('prop-garden-bed-'+p.id)).length,labels:w.scene.meshes.filter(m=>m.name.startsWith('garden-sign-text-')).map(m=>m.metadata.label),vortexReady:w.scene.getMaterialByName('garden-vortex-material').getEffect().isReady(),states:w.farmRenderState};})()`);
    assert.equal(assets.character,'student-polo-01');assert.equal(assets.joints,8);assert.equal(assets.beds,4);assert.deepEqual(assets.labels.sort(),['Luống 1','Luống 2','Luống 3','Luống 4']);assert(assets.vortexReady);
    const controls=await evaluate(`(()=>{
        const p=players.demo,original={...p},plot=Map3DLayouts.get('farm').plots[0];Object.assign(p,{x:plot.x,y:plot.y-plot.d-18});const start={...p},alpha=babylonFountain.camera.alpha;
        window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowUp'}));for(let i=0;i<15;i++)update(performance.now(),16.667);window.dispatchEvent(new KeyboardEvent('keyup',{code:'ArrowUp'}));
        const end={...p};update(performance.now(),16.667);const stopped=p.x===end.x&&p.y===end.y,blocked=!Map3DLayouts.blocked('farm',p.x,p.y)&&p.y<plot.y-plot.d-11;
        Object.assign(p,start);const button=document.querySelector('[data-move-direction="up"]');button.dispatchEvent(new PointerEvent('pointerdown',{pointerId:55,pointerType:'touch',bubbles:true}));for(let i=0;i<15;i++)update(performance.now(),16.667);button.dispatchEvent(new PointerEvent('pointerup',{pointerId:55,pointerType:'touch',bubbles:true}));
        const matches=Math.hypot(p.x-end.x,p.y-end.y)<.001;Object.assign(p,original);return {stopped,blocked,matches,cameraStable:alpha===babylonFountain.camera.alpha};})()`);
    assert(Object.values(controls).every(Boolean),JSON.stringify(controls));
    const interaction=await evaluate(`(()=>{const p=players.demo,start={...p},plot=Map3DLayouts.get('farm').plots[0],mesh=babylonFountain.scene.meshes.find(m=>m.name.startsWith('garden-bed-plot-1:')&&m.actionManager),pick=()=>mesh.actionManager.processTrigger(BABYLON.ActionManager.OnPickTrigger,{}),count=smokeInteractions.length;pick();const remoteDenied=smokeInteractions.length===count;Object.assign(p,{x:plot.x,y:plot.y-plot.d-18});pick();const nearAccepted=smokeInteractions.at(-1)==='plot:plot-1';Object.assign(p,start);const before=smokeEmits.filter(e=>e[0]==='returnToCampus').length;update(performance.now(),16);const stayed=smokeEmits.filter(e=>e[0]==='returnToCampus').length===before;Object.assign(p,babylonFountain.exit);update(performance.now(),16);const exitAccepted=smokeEmits.filter(e=>e[0]==='returnToCampus').length===before+1;Object.assign(p,start);babylonFountain.exitPending=false;return {remoteDenied,nearAccepted,stayed,exitAccepted};})()`);
    assert(Object.values(interaction).every(Boolean),JSON.stringify(interaction));
    await evaluate(`farmPlots['plot-1']={cropKey:'carrot',plantedAt:Date.now()-1000}`);
    await waitFor(`babylonFountain.farmRenderState['plot-1'].stage==='growing'&&babylonFountain.scene.getTransformNodeByName('prop-garden-crop-plot-1-23')`);
    await evaluate(`farmPlots['plot-1'].plantedAt=Date.now()-40000`);await waitFor(`babylonFountain.farmRenderState['plot-1'].stage==='ripe'&&babylonFountain.scene.meshes.some(m=>m.name.startsWith('garden-crop-plot-1-0:')&&m.name.includes('ripe'))`);
    await evaluate(`farmPlots['plot-1'].plantedAt=Date.now()-400000`);await waitFor(`babylonFountain.farmRenderState['plot-1'].stage==='wilted'`);
    await evaluate(`farmPlots['plot-1']={plantedAt:0,crop:''}`);await waitFor(`!babylonFountain.scene.getTransformNodeByName('prop-garden-crop-plot-1-0')`);
    const cropCount=await evaluate(`babylonFountain.scene.transformNodes.filter(n=>/^prop-garden-crop-plot-1-/.test(n.name)).length`);assert.equal(cropCount,0);
    await evaluate(`document.getElementById('smoke-result').hidden=true;players.demo.playerNickname='Bạn'`);
    const views=[['front',-Math.PI/2,.98],['back',Math.PI/2,.98],['left',Math.PI,.98],['right',0,.98],['top',-Math.PI/2,.001],['perspective',-Math.PI/2+.32,1.00]];
    for(const [name,alpha,beta]of views){await evaluate(`(()=>{const c=babylonFountain.camera;c.lowerBetaLimit=.001;c.alpha=${alpha};c.beta=${beta};c.radius=20;})()`);await delay(350);await capture('map-'+name);}
    await evaluate(`(()=>{const c=babylonFountain.camera;c.alpha=-Math.PI/2;c.beta=.98;c.radius=20;})()`);
    await call('Emulation.setDeviceMetricsOverride',{width:390,height:740,deviceScaleFactor:1,mobile:true});await delay(700);
    const phone=await evaluate(`(()=>{const b=babylonFountain.canvas.getBoundingClientRect(),p=document.getElementById('mobile-movement-pad').getBoundingClientRect(),c=document.querySelector('.fountain-camera-toggle').getBoundingClientRect();return {viewport:innerWidth===390,canvasFits:b.width<=innerWidth+1,padFits:p.left>=b.left&&p.right<=b.right+1&&p.bottom<=b.bottom+1,cameraClear:c.bottom<=p.top||c.right<=p.left||c.left>=p.right};})()`);assert(Object.values(phone).every(Boolean),JSON.stringify(phone));await capture('map-mobile');
    await evaluate(`deactivateBabylonFountain();currentMapId='farm';activateBabylonMapPack(currentMapId);deactivateBabylonFountain();currentMapId='canteen';activateBabylonMapPack(currentMapId);`);await delay(2500);
    const cycle=await evaluate(`({errors:smokeErrors,canvases:document.querySelectorAll('#babylon-fountain-canvas').length})`);assert.deepEqual(cycle.errors,[]);assert.equal(cycle.canvases,1);
    console.log(JSON.stringify({assets,controls,interaction,cropLifecycle:'growing -> ripe -> wilted -> empty, no stale instances',phone,cycle},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(ws?.readyState===WebSocket.OPEN){await Promise.race([call('Browser.close').catch(()=>{}),delay(1500)]);ws.close();}chrome.kill();});
