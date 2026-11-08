/* Shared fountain layout and authoritative footprints. Layout props use world metres;
 * player/bench x,y use server pixels (34 px/m). Normalized GLB fronts point toward -Z. */
const FountainPhysics=(()=>{
    const toMap=(x,z)=>({x:400+x*34,y:300+z*34});
    const transform=(x,z,rotation,lx,lz)=>({x:x+lx*Math.cos(rotation)+lz*Math.sin(rotation),z:z-lx*Math.sin(rotation)+lz*Math.cos(rotation)});
    const makeBench=(id,x,z,rotation,kind,seatHeight)=>({id,...toMap(x,z),worldX:x,worldZ:z,rotation,kind,seatHeight});
    const stoneBenches=[[-3.8,3.8],[3.8,3.8],[-3.8,-3.8],[3.8,-3.8]].map(([x,z],i)=>makeBench('fountain-bench-'+i,x,z,Math.atan2(x,z),'stone',.80));
    const pergolas=[{id:'fountain-pergola-0',x:-8,z:0,rotation:-Math.PI/2,scale:.9},{id:'fountain-pergola-1',x:8,z:0,rotation:Math.PI/2,scale:.9}];
    const shelteredBenches=pergolas.map((p,i)=>{
        const seat=transform(p.x,p.z,p.rotation,0,.40*p.scale);
        return {...makeBench('fountain-pergola-bench-'+i,seat.x,seat.z,p.rotation,'pergola',.60*p.scale),pergolaId:p.id};
    });
    const benches=[...stoneBenches,...shelteredBenches];
    const flowerBeds=stoneBenches.map(b=>({...transform(b.worldX,b.worldZ,b.rotation,0,1.45),rotation:b.rotation,scale:.9}));
    const lamps=stoneBenches.map(b=>({...transform(b.worldX,b.worldZ,b.rotation,2.05,.95),scale:1}));
    const trees=[-10,10].flatMap(x=>[-5.8,5.8].map(z=>({x,z,scale:1})));
    const boxes=benches.map(b=>({id:b.id,x:b.worldX,z:b.worldZ,rotation:b.rotation,w:b.kind==='stone'?1.29:1.20,d:b.kind==='stone'?.48:.32}));
    flowerBeds.forEach((p,i)=>boxes.push({id:'flower-'+i,...p,w:1.31,d:.78}));
    for(const p of pergolas)for(const lx of [-1.35,1.35])for(const lz of [-.81,.81])boxes.push({id:p.id+'-post-'+lx+'-'+lz,...transform(p.x,p.z,p.rotation,lx,lz),rotation:p.rotation,w:.19,d:.19});
    const circles=[{id:'fountain',x:0,z:0,r:3.25},...trees.map((p,i)=>({id:'tree-'+i,...p,r:.36})),...lamps.map((p,i)=>({id:'lamp-'+i,...p,r:.26}))];
    const inside=(x,z,b,padding=0)=>{
        const dx=x-b.x,dz=z-b.z,c=Math.cos(b.rotation||0),s=Math.sin(b.rotation||0);
        return Math.abs(dx*c-dz*s)<b.w+padding&&Math.abs(dx*s+dz*c)<b.d+padding;
    };
    function blocked(x,y){
        const wx=(x-400)/34,wz=(y-300)/34,p=.30;
        return boxes.some(b=>inside(wx,wz,b,p))||circles.some(c=>Math.hypot(wx-c.x,wz-c.z)<c.r+p);
    }
    function blockedPath(ax,ay,bx,by){
        const count=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)/5));
        for(let i=1;i<=count;i++)if(blocked(ax+(bx-ax)*i/count,ay+(by-ay)*i/count))return true;
        return false;
    }
    function approachPosition(bench,index=0,distance=.94){
        const p=transform(bench.worldX,bench.worldZ,bench.rotation,index===0?-.35:.35,-distance);return toMap(p.x,p.z);
    }
    function standPosition(bench,index=0){
        const start=approachPosition(bench,index);
        for(const distance of [1.3,1.5,1.1]){const p=approachPosition(bench,index,distance);if(!blocked(p.x,p.y)&&!blockedPath(start.x,start.y,p.x,p.y))return p;}
        return start;
    }
    function seatTransform(bench,index=0,hipBottom=.69){
        const p=transform(bench.worldX,bench.worldZ,bench.rotation,index===0?-.35:.35,0);
        return {x:p.x,y:bench.seatHeight-hipBottom,z:p.z,yaw:bench.rotation+Math.PI};
    }
    function groundHeight(x,y){
        const wx=(x-400)/34,wz=(y-300)/34;
        return pergolas.some(p=>inside(wx,wz,{...p,w:1.90*p.scale,d:1.375*p.scale})) ? .18 : 0;
    }
    function canUseBench(player,benchId){
        const bench=benches.find(b=>b.id===benchId);
        if(!bench||!player||!Number.isFinite(player.x)||!Number.isFinite(player.y)||blocked(player.x,player.y))return false;
        if(Math.hypot(player.x-bench.x,player.y-bench.y)>55)return false;
        const front=-(player.x-bench.x)*Math.sin(bench.rotation)-(player.y-bench.y)*Math.cos(bench.rotation);
        if(front<8)return false;
        const ax=(player.x-400)/34,az=(player.y-300)/34,count=Math.ceil(Math.hypot(bench.worldX-ax,bench.worldZ-az)/.04);
        for(let i=0;i<=count;i++){
            const x=ax+(bench.worldX-ax)*i/count,z=az+(bench.worldZ-az)*i/count;
            if(boxes.some(b=>b.id!==benchId&&inside(x,z,b))||circles.some(c=>Math.hypot(x-c.x,z-c.z)<c.r))return false;
        }
        return true;
    }
    return {benches,stoneBenches,pergolas,flowerBeds,lamps,trees,boxes,circles,blocked,blockedPath,canUseBench,approachPosition,standPosition,seatTransform,groundHeight,spawn:{x:400,y:500}};
})();
if(typeof module!=='undefined')module.exports=FountainPhysics;
