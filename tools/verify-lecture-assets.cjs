const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const layouts=require('../client/map-3d-layouts'),characters=require('../client/character-assets');
function glb(file){const b=fs.readFileSync(file);assert.equal(b.toString('ascii',0,4),'glTF');assert.equal(b.readUInt32LE(8),b.length);return JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));}
const dir='client/assets/3d/lecture-v1',manifest=JSON.parse(fs.readFileSync(dir+'/manifest.json'));
assert.equal(manifest.assets.length,23);
for(const a of manifest.assets){const file=path.join(dir,a.file),d=glb(file);assert(d.meshes.length);assert.equal(fs.statSync(file).size,a.bytes);assert(a.bytes<5*1048576,'individual asset budget '+a.id);}
for(const a of manifest.reusedAssets)assert(glb('client/assets/3d/'+manifest.reusedPack+'/'+a+'.glb').meshes.length);
const charDir='client/assets/3d/characters/campus-v1',human=glb(charDir+'/modular-human.glb'),names=new Map(human.nodes.map((n,i)=>[n.name,i])),parents=new Map();
human.nodes.forEach((n,i)=>(n.children||[]).forEach(child=>parents.set(child,i)));
for(const side of ['left','right'])for(const [child,parent] of [['knee','hip'],['elbow','shoulder']])assert.equal(parents.get(names.get('student_'+child+'_'+side)),names.get('student_'+parent+'_'+side));
assert(names.has('student_head')&&names.has('student_nose'));
for(const [slot,options] of Object.entries(characters.campusSlots))for(const option of options)assert(human.nodes.some(n=>n.name.startsWith('module__'+(slot==='accessories'?'accessory':slot)+'__'+option+'__')),'missing '+option);
for(const hair of characters.campusSlots.hair)for(const outfit of characters.campusSlots.outfit)for(const accessories of [[],['backpack'],['glasses'],['backpack','glasses']]){
    const fake=human.nodes.map(n=>({name:n.name,enabled:true,setEnabled(v){this.enabled=v;}})),choice=characters.applyModules({getDescendants:()=>fake},{hair,outfit,accessories},characters.campusSlots);
    for(const n of fake){const m=/^module__(hair|outfit|accessory)__([^_]+)__/.exec(n.name);if(m)assert.equal(n.enabled,m[1]==='accessory'?choice.accessories.includes(m[2]):choice[m[1]]===m[2]);}
}
for(const preset of ['student','student-female','professor'])assert(glb(charDir+'/'+preset+'.glb').meshes.length);
assert.equal(characters.forPlayer({},'khu-c').id,'student-campus-01');assert.equal(characters.forPlayer({},'khu-a').id,'student-coop-01');
const layout=layouts.get('khu-c');assert.equal(layout.desks.length,6);assert.equal(layout.seats.length,12);
for(const p of layout.props){const b=manifest.assets.find(a=>a.id===p.file).boundsBlender;assert(p.w/34+.02>=Math.max(Math.abs(b.min[0]),Math.abs(b.max[0])),'collider width '+p.file);assert(p.d/34+.02>=Math.max(Math.abs(b.min[1]),Math.abs(b.max[1])),'collider depth '+p.file);}
const queue=[layout.spawn],seen=new Set(),reachable=[];
for(let i=0;i<queue.length;i++){
    const p=queue[i],tag=p.x+','+p.y;if(seen.has(tag))continue;seen.add(tag);reachable.push(p);
    for(const [dx,dy] of [[5,0],[-5,0],[0,5],[0,-5]]){const q={x:p.x+dx,y:p.y+dy},key=q.x+','+q.y;if(!seen.has(key)&&!layouts.blockedPath('khu-c',p.x,p.y,q.x,q.y))queue.push(q);}
}
assert(!layouts.blocked('khu-c',layout.spawn.x,layout.spawn.y));assert(reachable.some(p=>Math.hypot(p.x-layout.exit.x,p.y-layout.exit.y)<24));
assert(reachable.some(p=>layouts.canInteract('khu-c',p,'lecture-info')),'teacher desk access');
for(const seat of layout.seats)assert(reachable.some(p=>Math.hypot(p.x-seat.approach.x,p.y-seat.approach.y)<8),'side aisle access '+seat.id);
assert.equal(layouts.groundHeight('khu-c',400,415),.14);assert.equal(layouts.groundHeight('khu-c',400,425),.28);assert.equal(layouts.groundHeight('khu-c',400,475),.28);assert.equal(layouts.groundHeight('khu-c',400,300),0);
assert(!layouts.blockedPath('khu-c',400,400,400,450),'stairs accessible');assert(layouts.blockedPath('khu-c',257,405,257,450),'stage front requires stairs');
for(const f of fs.readdirSync('client').filter(f=>f.endsWith('.js')))new vm.Script(fs.readFileSync('client/'+f,'utf8'),{filename:f});
console.log('PASS: 23 GLBs + 4 reused props; 4 humanoids; 64 module combinations; shared rig; collider coverage; 6 desks/12 chairs; all routes; step heights.');
