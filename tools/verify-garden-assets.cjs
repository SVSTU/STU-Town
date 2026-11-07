const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const layouts=require('../client/map-3d-layouts'),characters=require('../client/character-assets');
function glb(file){const b=fs.readFileSync(file);assert.equal(b.toString('ascii',0,4),'glTF');assert.equal(b.readUInt32LE(4),2);assert.equal(b.readUInt32LE(8),b.length);assert(b.length<25*1048576,'asset exceeds Cloudflare size limit: '+file);return JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));}
const dir='client/assets/3d/community-farm-v2',manifest=JSON.parse(fs.readFileSync(dir+'/manifest.json'));
assert.equal(manifest.assets.length,26);
for(const asset of manifest.assets){const doc=glb(path.join(dir,asset.file));assert(doc.meshes?.length,'missing geometry '+asset.file);assert.equal(fs.statSync(path.join(dir,asset.file)).size,asset.bytes);}
const character=characters.resolve(),doc=glb('client/assets/3d/'+character.file),names=new Set(doc.nodes.map(n=>n.name));
for(const joint of ['hip','knee','shoulder','elbow'])for(const side of ['left','right'])assert(names.has('student_'+joint+'_'+side),'missing joint '+joint+' '+side);
assert(names.has('student_head')&&names.has('student_nose'),'facing and label anchors');
for(const slot of character.materialSlots)assert(doc.materials.some(m=>m.name===slot),'missing customization slot '+slot);
const parents=new Map();doc.nodes.forEach((n,i)=>(n.children||[]).forEach(child=>parents.set(child,i)));
for(const side of ['left','right']){
    const knee=doc.nodes.findIndex(n=>n.name==='student_knee_'+side),hip=doc.nodes.findIndex(n=>n.name==='student_hip_'+side);
    assert.equal(parents.get(knee),hip,'knee follows hip');
    const elbow=doc.nodes.findIndex(n=>n.name==='student_elbow_'+side),shoulder=doc.nodes.findIndex(n=>n.name==='student_shoulder_'+side);
    assert.equal(parents.get(elbow),shoulder,'elbow follows shoulder');
}
assert.equal(characters.resolve('https://invalid/model.glb').id,characters.defaultId,'unknown appearance cannot load arbitrary URLs');
const bed=manifest.assets.find(a=>a.file==='raised-bed.glb').boundsBlender;
for(const p of layouts.get('farm').plots){assert(p.w/34>=Math.max(Math.abs(bed.min[0]),Math.abs(bed.max[0]))*p.scale);assert(p.d/34>=Math.max(Math.abs(bed.min[1]),Math.abs(bed.max[1]))*p.scale);}
console.log('PASS: 26 GLBs, file limits, bed collider coverage, student joint hierarchy, material slots and validated catalogue.');
const vm=require('node:vm');
for(const file of fs.readdirSync('client').filter(f=>f.endsWith('.js')))new vm.Script(fs.readFileSync('client/'+file,'utf8'),{filename:file});
for(const file of ['client/assets/3d/characters/preview.html','client/assets/3d/community-farm-v2/preview.html']){
    const html=fs.readFileSync(file,'utf8');new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
    for(const match of html.matchAll(/src="([^"]+\.png)"/g))assert(fs.existsSync(path.resolve(path.dirname(file),match[1])),'missing preview '+match[1]);
}
console.log('PASS client script syntax and all actual asset preview images.');
