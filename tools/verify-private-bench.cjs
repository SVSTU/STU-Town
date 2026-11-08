const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const layouts=require('../client/map-3d-layouts'),characters=require('../client/character-assets');
const {createPrivateBenchSystem}=require('../server/private-bench');
const id='bench-private:one',layout=layouts.get(id);
assert.equal(layouts.key('bench-private:two'),'bench-private');assert.equal(layouts.key('khu-a'),'khu-a');
const queue=[layout.spawn],seen=new Set(),reachable=[];
for(let i=0;i<queue.length;i++){
    const p=queue[i],tag=p.x+','+p.y;if(seen.has(tag))continue;seen.add(tag);reachable.push(p);
    for(const [dx,dy]of [[4,0],[-4,0],[0,4],[0,-4]]){const x=p.x+dx,y=p.y+dy;if(!seen.has(x+','+y)&&!layouts.blockedPath(id,p.x,p.y,x,y))queue.push({x,y});}
}
for(const p of layout.spawns)assert(!layouts.blocked(id,p.x,p.y),'entry outside props');
assert(reachable.some(p=>layouts.canInteract(id,p,'private-bench')),'bench reachable');
assert(reachable.some(p=>Math.hypot(p.x-layout.exit.x,p.y-layout.exit.y)<layout.exitRadius),'portal reachable');
assert(!layouts.canInteract(id,{x:400,y:441},'private-bench'),'cannot sit through backrest');
assert(layouts.blocked(id,layout.bounds.maxX+10,300),'boundary is locked');
const players={a:{mapId:id,x:388,y:363},b:{mapId:id,x:412,y:363},c:{mapId:'bench-private:two',x:388,y:363},outside:{mapId:'campus',x:388,y:363}},broadcasts=[],events=[];
const io={to:room=>({emit:(...args)=>broadcasts.push({room,args})})};
const seats=createPrivateBenchSystem({players,io,layouts}),handlers={};
for(const playerId of Object.keys(players)){handlers[playerId]={};seats.bind({id:playerId,on:(name,fn)=>handlers[playerId][name]=fn,emit:(...args)=>events.push({playerId,args}),to:room=>({emit:(...args)=>broadcasts.push({room,args})})});}
handlers.outside.sitAtPrivateBench();assert.equal(players.outside.privateSeatIndex,undefined,'campus cannot sit in private room');
players.a.y=200;handlers.a.sitAtPrivateBench();assert.equal(players.a.privateSeatIndex,undefined,'remote use denied');players.a.y=363;
handlers.a.sitAtPrivateBench();handlers.b.sitAtPrivateBench();handlers.c.sitAtPrivateBench();
assert.deepEqual(seats.occupants(id),['a','b']);assert.deepEqual(seats.occupants('bench-private:two'),['c',null]);
players.third={mapId:id,x:388,y:363};const third={};seats.bind({id:'third',on:(n,fn)=>third[n]=fn,emit(){},to:()=>({emit(){}})});third.sitAtPrivateBench();assert.equal(players.third.privateSeatIndex,undefined,'third seat denied');
assert(broadcasts.every(e=>e.room==='map:'+players[e.args[1]?.id||e.args[1]?.seats?.find(Boolean)]?.mapId),'only room recipients');
assert(!seats.canExit(players.a),'remote exit denied');Object.assign(players.a,layout.exit);assert(seats.canExit(players.a));
seats.leave('b');assert.deepEqual(seats.occupants(id),['a',null]);
assert(!layouts.blocked(id,players.b.x,players.b.y),'standing position is clear');
// Tick the existing server implementation: no hunger/strength drain, delayed recovery only.
const server=fs.readFileSync('server/index.js','utf8'),start=server.indexOf('function tickPlayerStats()'),end=server.indexOf('\nsetInterval(tickPlayerStats',start);
// A redundant stop packet after sitting is not a request to stand; actual movement is.
const movementStart=server.indexOf("  socket.on('playerMovement'"),movementEnd=server.indexOf('\n  socket.on(',movementStart+1),movementHandlers={};
const movementContext={players,Map3DLayouts:layouts,privateBench:seats,Date,Math,stopCampusBenchRest(){},socket:{id:'a',on:(name,fn)=>movementHandlers[name]=fn,emit(){},to:room=>io.to(room)}};
vm.createContext(movementContext);vm.runInContext(server.slice(movementStart,movementEnd),movementContext);
movementHandlers.playerMovement({x:players.a.x,y:players.a.y});assert.equal(players.a.privateSeatIndex,0,'stop packet keeps seat');
movementHandlers.playerMovement({x:players.a.x-3,y:players.a.y});assert.equal(players.a.privateSeatIndex,undefined,'moving frees seat');
// The client flushes movement before its sit request, avoiding a stale trailing stop packet.
const elements=new Map(),clientContext={Map3DLayouts:layouts,currentMapId:id,players:{me:{x:388,y:363}},socket:{id:'me',connected:true,emit:(...args)=>events.push(args)},document:{getElementById:key=>{if(!elements.has(key))elements.set(key,{hidden:false,disabled:false});return elements.get(key);}},Math,Number,performance};
vm.createContext(clientContext);vm.runInContext('let movementWasActive=true,lastMovementSentAt=0;'+fs.readFileSync('client/world-interactions.js','utf8'),clientContext);clientContext.interactWithCurrentZone();
assert.equal(events.at(-2)[0],'playerMovement');assert.equal(events.at(-1)[0],'sitAtPrivateBench');assert.equal(vm.runInContext('movementWasActive',clientContext),false);
const statsPlayer={mapId:id,stats:{hunger:0,strength:64,fatigue:7},statsTickAt:0,hungerElapsed:0,fatigueElapsed:0,weaknessElapsed:0,privateBenchRecoveryElapsed:0,lastMovementAt:0};
let now=299999;const sandbox={players:{me:statsPlayer},Date:{now:()=>now},PRIVATE_BENCH_REST_RECOVERY_MS:300000,clampStat:x=>Math.max(0,Math.min(100,x)),emitPlayerState(){}};
vm.createContext(sandbox);vm.runInContext(server.slice(start,end),sandbox);sandbox.tickPlayerStats();assert.equal(statsPlayer.stats.fatigue,7);now=300000;sandbox.tickPlayerStats();assert.equal(statsPlayer.stats.fatigue,6);assert.equal(statsPlayer.stats.hunger,0);assert.equal(statsPlayer.stats.strength,64);
function glb(path){const b=fs.readFileSync(path);assert.equal(b.toString('ascii',0,4),'glTF');assert.equal(b.length,b.readUInt32LE(8));return JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));}
const dir='client/assets/3d/private-bench-v1',manifest=JSON.parse(fs.readFileSync(dir+'/manifest.json'));
assert.equal(manifest.assets.length,10);
for(const a of manifest.assets){const data=glb(dir+'/'+a.file);assert(data.meshes.length>0);assert.equal(fs.statSync(dir+'/'+a.file).size,a.bytes);assert(a.bytes<3*1048576,'asset budget '+a.id);}
// Collider footprint covers solid bases; leaf canopies are deliberately non-solid.
for(const p of layout.props.filter(p=>['bench','flower-urn','flowerbed','lamp'].includes(p.file))){const b=p.file==='flower-urn'?{min:[-.462,-.462],max:[.462,.462]}:manifest.assets.find(a=>a.id===p.file).boundsBlender;assert(p.w/34+.03>=Math.max(Math.abs(b.min[0]),Math.abs(b.max[0])),p.file+' width');assert(p.d/34+.03>=Math.max(Math.abs(b.min[1]),Math.abs(b.max[1])),p.file+' depth');}
const human=glb('client/assets/3d/characters/private-garden-v1/modular-student.glb'),nodes=new Map(human.nodes.map((n,i)=>[n.name,i])),parents=new Map();
human.nodes.forEach((n,i)=>(n.children||[]).forEach(j=>parents.set(j,i)));
for(const side of ['left','right'])for(const [child,parent]of [['knee','hip'],['elbow','shoulder']])assert.equal(parents.get(nodes.get('student_'+child+'_'+side)),nodes.get('student_'+parent+'_'+side));
assert(nodes.has('student_head')&&nodes.has('student_nose'));
for(const [slot,options]of Object.entries(characters.slots))for(const option of options)assert(human.nodes.some(n=>n.name.startsWith('module__'+(slot==='accessories'?'accessory':slot)+'__'+option+'__')),'module '+slot+':'+option);
for(const hair of characters.slots.hair)for(const outfit of characters.slots.outfit)for(const accessories of [[],['backpack'],['glasses'],['backpack','glasses']]){
    const fake=human.nodes.map(n=>({name:n.name,setEnabled(value){this.enabled=value;}}));characters.applyModules({getDescendants:()=>fake},{hair,outfit,accessories});
    for(const node of fake){const m=/^module__(hair|outfit|accessory)__([^_]+)__/.exec(node.name);if(m)assert.equal(node.enabled,m[1]==='accessory'?accessories.includes(m[2]):(m[1]==='hair'?hair:outfit)===m[2]);}
}
assert.equal(characters.forPlayer({},id).id,'garden-modular-01');assert.equal(characters.forPlayer({},'farm').id,characters.defaultId);
for(const file of fs.readdirSync('client').filter(f=>f.endsWith('.js')))new vm.Script(fs.readFileSync('client/'+file,'utf8'),{filename:file});
console.log('PASS private garden: bounded reachable layout; room-isolated two-seat handler; remote denial; walkable stand-up; portal reach; 5-minute recovery/no drain; 10 GLBs; eight joints; 36 module combinations; client syntax.');
