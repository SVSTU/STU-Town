// Runs actual renderer, controller and exported GLBs with isolated fixtures only.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process'),delay=ms=>new Promise(r=>setTimeout(r,ms));
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'stu-coop-browser-'));
const chrome=spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',['--headless','--no-sandbox','--disable-extensions','--no-first-run','--no-default-browser-check','--enable-unsafe-swiftshader','--use-angle=swiftshader','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
let ws,serial=0;const pending=new Map();
function call(method,params={}){return new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function waitFor(expression,timeout=90000){for(let i=0;i<timeout/250;i++){if(await evaluate('Boolean('+expression+')'))return;await delay(250);}const diagnostic=await evaluate(`({ready:document.readyState,errors:typeof smokeErrors==='undefined'?[]:smokeErrors,babylon:typeof BABYLON,world:typeof babylonFountain==='undefined'?null:!!babylonFountain,resources:performance.getEntriesByType('resource').map(r=>({name:r.name,duration:r.duration}))})`);throw Error('Timed out: '+expression+' '+JSON.stringify(diagnostic));}
async function capture(name){const shot=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync('client/assets/3d/khu-a-coop-v1/previews/'+name+'.png',Buffer.from(shot.data,'base64'));}
(async()=>{
    fs.mkdirSync('client/assets/3d/khu-a-coop-v1/previews',{recursive:true});
    const portFile=path.join(profile,'DevToolsActivePort');for(let i=0;i<100&&!fs.existsSync(portFile);i++)await delay(200);assert(fs.existsSync(portFile));
    const port=fs.readFileSync(portFile,'utf8').split(/\r?\n/)[0],tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
    ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
    ws.onmessage=e=>{
        const r=JSON.parse(e.data),p=pending.get(r.id);if(p){pending.delete(r.id);r.error?p.reject(Error(JSON.stringify(r.error))):p.resolve(r.result);}
        if(r.method==='Fetch.requestPaused'){
            const request=r.params,cache=path.join('tools/.preview-cache',new URL(request.request.url).pathname.split('/').pop());
            if(fs.existsSync(cache))void call('Fetch.fulfillRequest',{requestId:request.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/javascript'}],body:fs.readFileSync(cache).toString('base64')});
            else void call('Fetch.continueRequest',{requestId:request.requestId});
        }
    };
    if(fs.existsSync('tools/.preview-cache/babylon.js'))await call('Fetch.enable',{patterns:[{urlPattern:'https://cdn.babylonjs.com/*'}]});
    await call('Emulation.setDeviceMetricsOverride',{width:1100,height:850,deviceScaleFactor:1,mobile:false});
    await call('Page.navigate',{url:'http://127.0.0.1:8766/tools/map3d-smoke.html?map=khu-a'});
    await waitFor('window.smokeResult');await waitFor("babylonFountain.players.get('demo')?._characterModel&&babylonFountain.scene.getTransformNodeByName('fountain-exit-vortex')&&babylonFountain.scene.getTransformNodeByName('prop-coop-npc-professor')");
    const result=await evaluate('window.smokeResult');assert.deepEqual(result.errors,[]);assert(result.portal);
    const state=await evaluate(`(()=>{const w=babylonFountain,p=w.players.get('demo'),locked=w.scene.getTransformNodeByName('prop-static-4');return {state:w.coopState,character:p._characterKey,joints:p._characterModel.getDescendants().filter(n=>/^student_(hip|knee|shoulder|elbow)_(left|right)$/.test(n.name)).length,lockedMeshes:locked.getChildMeshes().length,spawnClear:!Map3DLayouts.blocked('khu-a',players.demo.x,players.demo.y),stats:{meshes:w.scene.meshes.length,vertices:w.scene.getTotalVertices(),active:w.scene.getActiveMeshes().length}};})()`);
    assert.equal(state.character,'student-coop-01');assert.equal(state.joints,8);assert(state.spawnClear&&state.lockedMeshes>0&&state.state.farmLocked);
    const interactions=await evaluate(`(()=>{const p=players.demo,start={...p},checks={};for(const index of [0,1,2,3,4]){const prop=Map3DLayouts.get('khu-a').props[index],mesh=babylonFountain.scene.meshes.find(m=>m.name.startsWith('static-'+index+':')&&m.actionManager),count=smokeInteractions.length;mesh.actionManager.processTrigger(BABYLON.ActionManager.OnPickTrigger,{});checks['remote-'+index]=smokeInteractions.length===count;Object.assign(p,{x:prop.x,y:prop.y-prop.d-18});mesh.actionManager.processTrigger(BABYLON.ActionManager.OnPickTrigger,{});checks['near-'+index]=smokeInteractions.at(-1)===prop.action;Object.assign(p,start);}const before=smokeEmits.filter(e=>e[0]==='returnToCampus').length;update(performance.now(),16);checks.spawnStays=smokeEmits.filter(e=>e[0]==='returnToCampus').length===before;Object.assign(p,babylonFountain.exit);update(performance.now(),16);checks.exitWorks=smokeEmits.filter(e=>e[0]==='returnToCampus').length===before+1;Object.assign(p,start);babylonFountain.exitPending=false;return checks;})()`);
    assert(Object.values(interactions).every(Boolean),JSON.stringify(interactions));
    await evaluate("document.getElementById('smoke-result').hidden=true");await delay(300);await capture('map-desktop');
    await call('Emulation.setDeviceMetricsOverride',{width:390,height:740,deviceScaleFactor:1,mobile:true});await delay(700);
    const mobile=await evaluate(`(()=>{const b=babylonFountain.canvas.getBoundingClientRect(),p=document.getElementById('mobile-movement-pad').getBoundingClientRect();return {viewport:innerWidth===390,canvas:b.width<=innerWidth+1,pad:p.left>=b.left&&p.right<=b.right+1&&p.bottom<=b.bottom+1};})()`);assert(Object.values(mobile).every(Boolean));await capture('map-mobile');
    await call('Emulation.setDeviceMetricsOverride',{width:1100,height:850,deviceScaleFactor:1,mobile:false});
    await call('Page.navigate',{url:'http://127.0.0.1:8766/client/assets/3d/characters/coop-v1/preview.html'});await waitFor('window.modulePreview');
    const modules=await evaluate(`(()=>{const {model,apply}=modulePreview;document.getElementById('hair').value='braid';document.getElementById('outfit').value='apron';document.getElementById('backpack').checked=false;document.getElementById('glasses').checked=true;apply();return model.getDescendants().filter(n=>/^module__/.test(n.name)&&n.isEnabled()).map(n=>n.name);})()`);
    assert(modules.some(n=>n.includes('__hair__braid__'))&&modules.some(n=>n.includes('__outfit__apron__'))&&modules.some(n=>n.includes('__accessory__glasses__')));assert(!modules.some(n=>/__hair__(wavy|gray)__|__outfit__(polo|vest)__|__accessory__backpack__/.test(n)));
    await capture('modular-character');
    await call('Page.navigate',{url:'http://127.0.0.1:8766/client/assets/3d/khu-a-coop-v1/preview.html'});await waitFor('window.assetPreview');
    assert.equal(await evaluate('assetPreview.asset.id'),'seed-stall');await delay(300);await capture('asset-seed-stall');
    fs.writeFileSync('client/assets/3d/khu-a-coop-v1/verification.json',JSON.stringify({renderer:result,state,interactions,mobile,moduleSelection:true},null,2));
    console.log(JSON.stringify({state,interactions,mobile,moduleSelection:true},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(ws?.readyState===WebSocket.OPEN){await call('Browser.close').catch(()=>{});ws.close();}else chrome.kill();});
