/* Shared authoritative footprints, in Babylon world units. */
const FountainPhysics = (() => {
    const benches = [[-3.8,3.8,Math.PI],[3.8,3.8,Math.PI],[-3.8,-3.8,0],[3.8,-3.8,0]].map(([x,z,rotation],i)=>({id:`fountain-bench-${i}`,x:400+x*34,y:300+z*34,rotation}));
    const boxes = benches.map(b=>({x:(b.x-400)/34,z:(b.y-300)/34,w:1.28,d:.48}));
    for(const x of [-3.8,3.8]) for(const z of [-4.7,4.7]) boxes.push({x,z,w:1.30,d:.76});
    const circles = [{x:0,z:0,r:3.25}];
    for(const x of [-8,8]) for(const z of [-5,4.2]) circles.push({x,z,r:.36});
    for(const x of [-3.35,3.35]) for(const z of [-4.4,4.4]) circles.push({x,z,r:.26});
    for(const center of [-7,7]) {
        for(const dx of [-1.35,1.35]) for(const dz of [-.81,.81]) boxes.push({x:center+dx,z:3.5+dz,w:.20,d:.20});
        boxes.push({x:center,z:3.14,w:1.24,d:.35});
    }
    function blocked(x,y) {
        const wx=(x-400)/34,wz=(y-300)/34,p=.23;
        return boxes.some(b=>Math.abs(wx-b.x)<b.w+p&&Math.abs(wz-b.z)<b.d+p)
            ||circles.some(c=>Math.hypot(wx-c.x,wz-c.z)<c.r+p);
    }
    function blockedPath(ax,ay,bx,by) {
        const steps=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)/5));
        for(let i=1;i<=steps;i++) if(blocked(ax+(bx-ax)*i/steps,ay+(by-ay)*i/steps)) return true;
        return false;
    }
    return {benches,blocked,blockedPath,spawn:{x:400,y:500}};
})();
if(typeof module!=='undefined') module.exports=FountainPhysics;
