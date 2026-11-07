/* Shared authoritative footprints, in Babylon world units. */
const FountainPhysics = (() => {
    // Bench local front is -Z after glTF's handedness conversion.
    const benches = [[-3.8,3.8,0],[3.8,3.8,0],[-3.8,-3.8,Math.PI],[3.8,-3.8,Math.PI]].map(([x,z,rotation],i)=>({id:`fountain-bench-${i}`,x:400+x*34,y:300+z*34,rotation}));
    const boxes = benches.map(b=>({id:b.id,x:(b.x-400)/34,z:(b.y-300)/34,w:1.28,d:.48}));
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
    function canUseBench(player,benchId) {
        const bench=benches.find(b=>b.id===benchId);
        if(!bench||!player||!Number.isFinite(player.x)||!Number.isFinite(player.y)||blocked(player.x,player.y))return false;
        if(Math.hypot(player.x-bench.x,player.y-bench.y)>55)return false;
        const front=-(player.x-bench.x)*Math.sin(bench.rotation)-(player.y-bench.y)*Math.cos(bench.rotation);
        if(front<8)return false;
        const ax=(player.x-400)/34,az=(player.y-300)/34,bx=(bench.x-400)/34,bz=(bench.y-300)/34;
        const steps=Math.ceil(Math.hypot(bx-ax,bz-az)/.04);
        for(let i=0;i<=steps;i++) {
            const x=ax+(bx-ax)*i/steps,z=az+(bz-az)*i/steps;
            if(boxes.some(b=>b.id!==benchId&&Math.abs(x-b.x)<b.w&&Math.abs(z-b.z)<b.d)
                ||circles.some(c=>Math.hypot(x-c.x,z-c.z)<c.r))return false;
        }
        return true;
    }
    return {benches,blocked,blockedPath,canUseBench,spawn:{x:400,y:500}};
})();
if(typeof module!=='undefined') module.exports=FountainPhysics;
