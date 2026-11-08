const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const layouts=require('../client/map-3d-layouts'),characters=require('../client/character-assets');
function glb(file){const b=fs.readFileSync(file);assert.equal(b.toString('ascii',0,4),'glTF');assert.equal(b.readUInt32LE(8),b.length);return JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));}
const dir='client/assets/3d/khu-a-coop-v1',manifest=JSON.parse(fs.readFileSync(dir+'/manifest.json'));
assert.equal(manifest.assets.length,21);
for(const a of manifest.assets){const file=path.join(dir,a.file),d=glb(file);assert(d.meshes.length);assert.equal(fs.statSync(file).size,a.bytes);assert(a.bytes<5*1048576,'individual asset budget '+a.id);}
const charDir='client/assets/3d/characters/coop-v1',human=glb(charDir+'/modular-human.glb');
const nodes=new Map(human.nodes.map((n,i)=>[n.name,i]));
const parents=new Map();human.nodes.forEach((n,i)=>(n.children||[]).forEach(child=>parents.set(child,i)));
for(const side of ['left','right'])for(const [child,parent] of [['knee','hip'],['elbow','shoulder']])assert.equal(parents.get(nodes.get('student_'+child+'_'+side)),nodes.get('student_'+parent+'_'+side),'joint chain');
assert(nodes.has('student_head')&&nodes.has('student_nose'));
for(const [slot,options] of Object.entries(characters.slots))for(const option of options){const prefix='module__'+(slot==='accessories'?'accessory':slot)+'__'+option+'__';assert(human.nodes.some(n=>n.name.startsWith(prefix)),'missing module '+prefix);}
for(const file of ['student','professor','merchant'])assert(glb(charDir+'/'+file+'.glb').meshes.length);
// Exercise every module combination on the actual exported node names; no simultaneous outfits/hair.
for(const hair of characters.slots.hair)for(const outfit of characters.slots.outfit)for(const accessories of [[],['backpack'],['glasses'],['backpack','glasses']]){
    const fake=human.nodes.map(n=>({name:n.name,enabled:true,setEnabled(v){this.enabled=v;}}));
    const choice=characters.applyModules({getDescendants:()=>fake},{hair,outfit,accessories});
    for(const n of fake){const m=/^module__(hair|outfit|accessory)__([^_]+)__/.exec(n.name);if(m)assert.equal(n.enabled,m[1]==='accessory'?choice.accessories.includes(m[2]):choice[m[1]]===m[2]);}
}
assert.equal(characters.resolve('https://invalid/model.glb').id,characters.defaultId);
assert.equal(characters.forPlayer({},'khu-a').id,'student-coop-01');assert.equal(characters.forPlayer({},'farm').id,characters.defaultId);
const layout=layouts.get('khu-a');assert(layout.exit.y<layout.spawn.y-24);assert(!layouts.blocked('khu-a',layout.spawn.x,layout.spawn.y));
// Exported footprint must fit the shared server/client colliders, including the locked door steps.
for(const p of layout.props){const b=manifest.assets.find(a=>a.id===p.file).boundsBlender;assert(p.w/34+.03>=Math.max(Math.abs(b.min[0]),Math.abs(b.max[0]))*p.scale,p.file+' collider width');assert(p.d/34+.03>=Math.max(Math.abs(b.min[1]),Math.abs(b.max[1]))*p.scale,p.file+' collider depth');}
for(const f of fs.readdirSync('client').filter(f=>f.endsWith('.js')))new vm.Script(fs.readFileSync('client/'+f,'utf8'),{filename:f});
console.log('PASS: 21 GLBs; 4 character GLBs; eight-joint hierarchy; 36 module combinations; collider coverage; catalogue and client syntax.');
