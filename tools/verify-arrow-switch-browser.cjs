// Trusted CDP key events with the real Phaser keyboard manager and Babylon renderer.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const delay=ms=>new Promise(r=>setTimeout(r,ms)),profile=fs.mkdtempSync(path.join(os.tmpdir(),'stu-arrow-switch-'));
const chrome=spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',['--headless','--no-sandbox','--disable-extensions','--no-first-run','--enable-unsafe-swiftshader','--use-angle=swiftshader','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
let ws,serial=0;const pending=new Map();
function call(method,params={}){return new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function waitFor(expression){for(let i=0;i<360;i++){if(await evaluate('Boolean('+expression+')'))return;await delay(250);}throw Error('Timed out '+expression+' '+JSON.stringify(await evaluate('smokeErrors')));}
const codes={ArrowUp:38,ArrowDown:40,ArrowLeft:37,ArrowRight:39};
const key=(code,down,autoRepeat=false)=>call('Input.dispatchKeyEvent',{type:down?'keyDown':'keyUp',key:code,code,windowsVirtualKeyCode:codes[code],nativeVirtualKeyCode:codes[code],autoRepeat});
(async()=>{
 const portFile=path.join(profile,'DevToolsActivePort');for(let i=0;i<100&&!fs.existsSync(portFile);i++)await delay(200);const port=fs.readFileSync(portFile,'utf8').split(/\r?\n/)[0];const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
 ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});ws.onmessage=e=>{const r=JSON.parse(e.data),p=pending.get(r.id);if(p){pending.delete(r.id);r.error?p.reject(Error(JSON.stringify(r.error))):p.resolve(r.result);}if(r.method==='Fetch.requestPaused'){const req=r.params,cache=path.join('tools/.preview-cache',new URL(req.request.url).pathname.split('/').pop());void call(fs.existsSync(cache)?'Fetch.fulfillRequest':'Fetch.continueRequest',fs.existsSync(cache)?{requestId:req.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/javascript'}],body:fs.readFileSync(cache).toString('base64')}:{requestId:req.requestId});}};
 await call('Fetch.enable',{patterns:[{urlPattern:'https://cdn.babylonjs.com/*'}]});await call('Emulation.setDeviceMetricsOverride',{width:1100,height:820,deviceScaleFactor:1,mobile:false});
 await call('Page.navigate',{url:'http://127.0.0.1:8766/tools/fountain-keyboard-smoke.html'});await waitFor('window.testReady&&babylonFountain?.players.get("demo")');
 const initialAlpha=await evaluate('babylonFountain.camera.alpha'),snapshots=[];
 for(const code of ['ArrowUp','ArrowLeft','ArrowUp','ArrowRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowDown','ArrowUp']){
   await evaluate('Object.assign(players.demo,{x:400,y:500});');await key(code,true);
   await waitFor('Math.hypot(players.demo.x-400,players.demo.y-500)>.1');
   const s=await evaluate('({position:{x:players.demo.x,y:players.demo.y},keys:readMovementDirections(),camera:babylonFountain.camera.alpha,enabled:sceneRef.input.keyboard.enabled})');snapshots.push(s);
   assert.equal(s.camera,initialAlpha);assert(s.enabled);
   const direction=code.slice(5).toLowerCase();assert(s.keys[direction]);
   await key(code,false);const released=await evaluate('readMovementDirections()');assert(!Object.values(released).some(Boolean),JSON.stringify(released));
 }
 for(const [oldKey,newKey,axis,sign]of [['ArrowLeft','ArrowRight','x',1],['ArrowUp','ArrowDown','y',-1]]){
   await evaluate('Object.assign(players.demo,{x:400,y:500});');await key(oldKey,true);await key(newKey,true);
   const read=()=>evaluate('readMovementDirections()'),oldDir=oldKey.slice(5).toLowerCase(),newDir=newKey.slice(5).toLowerCase();
   let state=await read();assert(state[newDir]&&!state[oldDir],JSON.stringify(state));
   await key(oldKey,true,true);state=await read();assert(state[newDir]&&!state[oldDir],'old auto-repeat cannot steal direction');
   const before=await evaluate('players.demo.'+axis);await waitFor('(players.demo.'+axis+'-('+before+'))*'+sign+'>.1');
   await key(newKey,false);state=await read();assert(state[oldDir]&&!state[newDir],'old held key resumes immediately');
   await key(newKey,true);state=await read();assert(state[newDir]&&!state[oldDir],'same key can be pressed again immediately');
   await key(newKey,false);await key(oldKey,false);
 }
 await evaluate('document.getElementById("typing-test").focus()');await key('ArrowLeft',true);assert(!Object.values(await evaluate('readMovementDirections()')).some(Boolean));await key('ArrowLeft',false);
 await evaluate('document.getElementById("typing-test").blur()');await key('ArrowRight',true);assert((await evaluate('readMovementDirections()')).right);await key('ArrowRight',false);
 const errors=await evaluate('smokeErrors');assert.deepEqual(errors,[]);
 console.log(JSON.stringify({rapidRepress:true,oppositeKeys:true,heldKeyResume:true,oldRepeatIgnored:true,typingAndRefocus:true,cameraStable:true,phaserKeyboard:true,babylonRenderer:true,presses:snapshots.length,errors},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(ws?.readyState===WebSocket.OPEN){await Promise.race([call('Browser.close').catch(()=>{}),delay(1500)]);ws.close();}chrome.kill();});
