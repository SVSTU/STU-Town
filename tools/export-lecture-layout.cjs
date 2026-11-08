// Capture GLB placements from the actual scene assembler, without a browser/GPU.
const fs=require('node:fs'),vm=require('node:vm'),layouts=require('../client/map-3d-layouts');
const layout=layouts.get('khu-c'),placements=layout.props.map((p,i)=>({id:'static-'+i,file:layout.pack+'/'+p.file+'.glb',x:p.x,y:p.y,scale:p.scale,action:p.action,rotation:p.rotation||0,height:p.height||0}));
const position=()=>({set(){}}),mesh=()=>({position:position()}),scene={onBeforeRenderObservable:{add(){}}};
class Color{constructor(...args){this.values=args;}static Black(){return new Color(0,0,0);}}
class Material{}class Texture{getContext(){return {fillRect(){},beginPath(){},arc(){},fill(){}};}update(){}}
const ctx={Map3DLayouts:layouts,BABYLON:{MeshBuilder:{CreatePlane:mesh,CreateTorus:mesh},DynamicTexture:Texture,StandardMaterial:Material,Color3:Color},fountainWorldPosition:(x,y)=>({x:(x-400)/34,z:(y-300)/34}),performance:{now:()=>0}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('client/lecture-scene.js','utf8'),ctx);
ctx.createLectureScene(scene,{exit:layout.exit},{place:(id,file,x,y,scale,action,variant,options={})=>{
    const {onReady,...transform}=options;placements.push({id,file,x,y,scale,action,...transform,pose:id.startsWith('lecture-npc-seat-')?'seated':undefined});return Promise.resolve();
},interact(){},shadows:{}});
fs.mkdirSync('source-assets/lecture-v1',{recursive:true});
fs.writeFileSync('source-assets/lecture-v1/runtime-layout.json',JSON.stringify(layout,null,2));
fs.writeFileSync('source-assets/lecture-v1/placements.json',JSON.stringify({units:'metres',mapUnitsPerMetre:34,origin:[400,300],placements},null,2));
console.log('Exported '+placements.length+' exact GLB placements from lecture-scene.js');
