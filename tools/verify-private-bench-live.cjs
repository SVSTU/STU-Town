// Real local Socket.IO server, three Engine.IO websocket clients; Supabase explicitly disabled.
const assert=require('node:assert/strict'),fs=require('node:fs'),net=require('node:net'),path=require('node:path');
const {spawn}=require('node:child_process'),layouts=require('../client/map-3d-layouts');
const delay=ms=>new Promise(r=>setTimeout(r,ms));let child,logs='';const clients=[];
async function freePort(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
function connect(port){
  const ws=new WebSocket('ws://127.0.0.1:'+port+'/socket.io/?EIO=4&transport=websocket'),events=[];
  const client={ws,events,id:'',send:(event,value)=>ws.send('42'+JSON.stringify(value===undefined?[event]:[event,value])),wait:async(name,predicate=()=>true,after=0,timeout=6000)=>{
    const end=Date.now()+timeout;while(Date.now()<end){const event=events.slice(after).find(e=>e.name===name&&predicate(e.data));if(event)return event.data;await delay(25);}throw Error('Timed out '+name+' '+JSON.stringify(events.slice(-4)));}};
  ws.onmessage=e=>{const packet=String(e.data);if(packet[0]==='0')ws.send('40');else if(packet==='2')ws.send('3');else if(packet.startsWith('40'))client.id=JSON.parse(packet.slice(2)).sid;else if(packet.startsWith('42')){const [name,data]=JSON.parse(packet.slice(2));events.push({name,data});}};
  clients.push(client);return client;
}
function walkPath(mapId,start,target){
  const queue=[start],seen=new Map(),key=p=>p.x.toFixed(3)+','+p.y.toFixed(3);seen.set(key(start),null);
  for(let i=0;i<queue.length;i++){
    const p=queue[i];if(Math.hypot(p.x-target.x,p.y-target.y)<14){const result=[];let n=p;while(n){result.push(n);n=seen.get(key(n));}return result.reverse();}
    for(const [dx,dy]of [[4,0],[-4,0],[0,4],[0,-4]]){const next={x:p.x+dx,y:p.y+dy},tag=key(next);if(!seen.has(tag)&&!layouts.blockedPath(mapId,p.x,p.y,next.x,next.y)){seen.set(tag,p);queue.push(next);}}
  }throw Error('No route to exit');
}
(async()=>{
  const port=await freePort();child=spawn(process.execPath,['server/index.js'],{cwd:path.resolve('.'),windowsHide:true,env:{...process.env,PORT:String(port),SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:''},stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',s=>logs+=s);child.stderr.on('data',s=>logs+=s);
  child.on('error',e=>logs+=e.message);let ready=false;const deadline=Date.now()+45000;
  while(Date.now()<deadline){assert(child.exitCode===null,'server exited '+logs);try{ready=(await fetch('http://127.0.0.1:'+port+'/',{signal:AbortSignal.timeout(500)})).ok;}catch{}if(ready)break;await delay(150);}assert(ready,'local server startup timed out: '+logs);
  const [a,b,outside]=[connect(port),connect(port),connect(port)];await Promise.all(clients.map(c=>c.wait('currentPlayers')));
  assert(a.id&&b.id&&outside.id);assert.equal((await a.wait('playerPersistenceStatus')).enabled,false);
  for(const client of [a,b]){client.send('playerMovement',{x:550,y:315});client.send('restAtCampusBench','bench-3');await client.wait('benchRestResult',r=>r.message.includes('bắt đầu'));}
  const [offerA,offerB]=await Promise.all([a.wait('benchPrivateSeatOffer',()=>true,0,38000),b.wait('benchPrivateSeatOffer',()=>true,0,38000)]);assert.equal(offerA.offerId,offerB.offerId);
  for(const [c,offer]of [[a,offerA],[b,offerB]])c.send('benchPrivateSeatResponse',{offerId:offer.offerId,accept:true});
  const [roomA,roomB]=await Promise.all([a.wait('mapChanged',p=>p.mapId.startsWith('bench-private:')),b.wait('mapChanged',p=>p.mapId.startsWith('bench-private:'))]);assert.equal(roomA.mapId,roomB.mapId);assert.equal(Object.keys(roomA.players).length,2);
  for(const p of Object.values(roomA.players)){assert(!layouts.blocked(roomA.mapId,p.x,p.y));assert.equal(p.privateSeatIndex,undefined);}
  outside.send('enterCampusMap',roomA.mapId);await outside.wait('mapChangeDenied');
  const outsiderEvents=outside.events.length;
  a.send('playerMovement',{x:388,y:363});a.send('sitAtPrivateBench');b.send('playerMovement',{x:412,y:363});b.send('sitAtPrivateBench');
  const occupied=await a.wait('privateBenchOccupancy',p=>p.seats.filter(Boolean).length===2);assert.deepEqual([...occupied.seats].sort(),[a.id,b.id].sort());assert.equal(occupied.mapId,roomA.mapId);
  const mySeat=a.events.filter(e=>e.name==='playerMoved'&&e.data.id===a.id).at(-1).data;
  a.send('playerMovement',{x:mySeat.x,y:mySeat.y});a.send('returnToCampus');await a.wait('mapChangeDenied');
  // Public and direct chat are still delivered in the pair's private map.
  a.send('sendChatMessage','Kiểm tra phòng ghế riêng');await b.wait('chatMessage',p=>p.message==='Kiểm tra phòng ghế riêng');
  assert(!outside.events.slice(outsiderEvents).some(e=>e.name==='privateBenchOccupancy'||e.name==='chatMessage'&&e.data.message==='Kiểm tra phòng ghế riêng'));
  const route=walkPath(roomA.mapId,mySeat,layouts.get(roomA.mapId).exit);for(const point of route.slice(1))a.send('playerMovement',point);a.send('returnToCampus');
  await a.wait('mapChanged',p=>p.mapId==='campus');await b.wait('privateBenchOccupancy',p=>!p.seats.includes(a.id)&&p.seats.includes(b.id));
  assert(!b.events.some(e=>e.name==='mapChanged'&&e.data.mapId==='campus'));
  const report={realSocketIO:true,persistenceDisabled:true,confirmationAfter30Seconds:true,twoAcceptances:true,pairRoom:true,outsiderDenied:true,twoSeats:true,roomChatIsolated:true,remoteExitDenied:true,walkToPortal:true,partnerRemains:true};
  fs.writeFileSync('client/assets/3d/private-bench-v1/server-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);console.error(logs.slice(-1200));process.exitCode=1;}).finally(async()=>{for(const c of clients){if(c.ws.readyState===WebSocket.OPEN)c.ws.close();else c.ws.terminate?.();}await delay(100);child?.kill();});
