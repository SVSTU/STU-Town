const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class Surface {
    constructor(){this.listeners={};this.dataset={};this.classList={toggle(){},add(){},remove(){}};}
    addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);}
    dispatch(name,event={}){event.preventDefault??=()=>{};for(const fn of this.listeners[name]||[])fn(event);}
    setAttribute(){} setPointerCapture(){}
}
const window=new Surface(),document=new Surface(),pad=new Surface();
const buttons=['up','left','down','right'].map(direction=>{const b=new Surface();b.dataset.moveDirection=direction;return b;});
pad.querySelectorAll=()=>buttons;document.getElementById=()=>pad;document.querySelector=()=>null;
const context={console,Math,Number,Boolean,Map,Set,window,document,sceneRef:{input:{keyboard:{enabled:true,resetKeys(){}}}},cursors:{up:{isDown:false}},babylonFountain:{},targetPosition:null};
vm.createContext(context);vm.runInContext(fs.readFileSync('client/player-controller.js','utf8'),context);context.bindMobileMovementControls();
const direction=()=>context.readMovementDirections();
buttons[0].dispatch('pointerdown',{pointerId:1,pointerType:'mouse',button:0});assert(direction().up);
buttons[3].dispatch('pointerdown',{pointerId:1,pointerType:'mouse',button:0});assert(!direction().up&&direction().right,'same pointer must replace previous direction');
buttons[0].dispatch('lostpointercapture',{pointerId:1});assert(direction().right,'old button capture loss must not cancel the new direction');
window.dispatch('pointerup',{pointerId:1});assert(!Object.values(direction()).some(Boolean),'outside release');
buttons[0].dispatch('pointerdown',{pointerId:2,pointerType:'touch'});buttons[3].dispatch('pointerdown',{pointerId:3,pointerType:'touch'});
assert(direction().up&&direction().right);window.dispatch('pointercancel',{pointerId:2});assert(!direction().up&&direction().right);window.dispatch('pointerup',{pointerId:3});
window.dispatch('keydown',{code:'ArrowLeft'});assert(direction().left);window.dispatch('keyup',{code:'ArrowLeft'});assert(!direction().left);
window.dispatch('keydown',{code:'ArrowLeft'});window.dispatch('keydown',{code:'ArrowRight'});
assert(direction().right&&!direction().left,'new opposite key wins immediately');
window.dispatch('keydown',{code:'ArrowLeft',repeat:true});assert(direction().right&&!direction().left,'OS repeat must not steal the latest direction');
window.dispatch('keyup',{code:'ArrowRight'});assert(direction().left&&!direction().right,'held previous key resumes without waiting for repeat');
window.dispatch('keydown',{code:'ArrowRight'});assert(direction().right&&!direction().left,'released key can be pressed again immediately');
window.dispatch('keyup',{code:'ArrowRight'});window.dispatch('keyup',{code:'ArrowLeft'});
window.dispatch('keydown',{code:'ArrowLeft'});window.dispatch('keydown',{code:'ArrowRight'});
buttons[1].dispatch('pointerdown',{pointerId:21,pointerType:'touch'});assert(direction().left&&!direction().right,'new touch overrides opposite keyboard');
window.dispatch('pointerup',{pointerId:21});assert(direction().right&&!direction().left,'release touch restores newest held keyboard, not its older opposite');
window.dispatch('keyup',{code:'ArrowRight'});window.dispatch('keyup',{code:'ArrowLeft'});
buttons[0].dispatch('pointerdown',{pointerId:22,pointerType:'touch'});buttons[2].dispatch('pointerdown',{pointerId:23,pointerType:'touch'});
assert(direction().down&&!direction().up,'new opposite touch wins');window.dispatch('pointerup',{pointerId:23});assert(direction().up&&!direction().down);
window.dispatch('keydown',{code:'ArrowRight'});assert(direction().up&&direction().right,'perpendicular input keeps diagonal motion');
window.dispatch('keyup',{code:'ArrowRight'});window.dispatch('pointerup',{pointerId:22});
window.dispatch('keydown',{code:'ArrowUp'});window.dispatch('blur');assert(!Object.values(direction()).some(Boolean));
window.dispatch('keydown',{code:'ArrowUp',target:{closest:()=>true}});assert(!direction().up,'typing must not walk');
buttons[0].dispatch('pointerdown',{pointerId:4,pointerType:'mouse',button:0});window.dispatch('pointermove',{pointerId:4,pointerType:'mouse',buttons:0});assert(!direction().up,'missed pointerup recovery');
console.log('PASS input: instant opposite-key switching/repress/resume, repeat rejection, keyboard/touch priority, diagonals, outside release, cancellation, blur and text focus');

// Validate the exported skeleton hierarchy, not just runtime naming assumptions.
const data=fs.readFileSync('client/assets/3d/student.glb');
const gltf=JSON.parse(data.toString('utf8',20,20+data.readUInt32LE(12)).trim());
for(const side of ['left','right']) {
    const hip=gltf.nodes.find(n=>n.name==='student_hip_'+side),kneeIndex=gltf.nodes.findIndex(n=>n.name==='student_knee_'+side);
    assert(hip.children.includes(kneeIndex),'knee must follow hip');
    const knee=gltf.nodes[kneeIndex];assert(knee.children.some(i=>/^student_shoe(?:\.\d+)?$/.test(gltf.nodes[i].name)),'shoe must follow knee');
}
const vector=()=>({x:0,y:0,z:0,clone(){return {...this};},copyFrom(v){Object.assign(this,v);}});
const nodes=[];for(const side of ['left','right'])for(const kind of ['hip','knee','shoulder','elbow'])nodes.push({name:`student_${kind}_${side}`,rotation:vector()});
vm.runInContext(fs.readFileSync('client/student-animation.js','utf8'),context);
const root={position:{y:0}},animate=context.bindStudentAnimation(root,{getDescendants:()=>nodes});
for(let i=0;i<20;i++)animate(1/60,.01,true,false);
const left=nodes.find(n=>n.name==='student_hip_left'),right=nodes.find(n=>n.name==='student_hip_right');
assert(left.rotation.x*right.rotation.x<0,'legs must alternate');
for(let i=0;i<120;i++)animate(1/60,0,false,false);
assert(Math.abs(left.rotation.x)<.001&&Math.abs(right.rotation.x)<.001,'return to idle');
console.log('PASS gait: hip/knee/shoe hierarchy, opposing steps and smooth return to idle');
