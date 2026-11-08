const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const f=require('../client/fountain-physics');
const queue=[f.spawn],seen=new Set(),reachable=[];
for(let i=0;i<queue.length;i++){
    const p=queue[i],key=p.x+','+p.y;if(seen.has(key))continue;seen.add(key);reachable.push(p);
    for(const [dx,dy]of [[5,0],[-5,0],[0,5],[0,-5]]){const x=p.x+dx,y=p.y+dy;if(x<15||x>785||y<15||y>585||seen.has(x+','+y)||f.blockedPath(p.x,p.y,x,y))continue;queue.push({x,y});}
}
assert.equal(f.benches.length,6);
for(const bench of f.benches){
    assert(reachable.some(p=>f.canUseBench(p,bench.id)),bench.id+' unreachable from spawn');
    for(let index=0;index<2;index++){
        const front=f.approachPosition(bench,index),stand=f.standPosition(bench,index),seat=f.seatTransform(bench,index);
        assert(!f.blocked(front.x,front.y)&&f.canUseBench(front,bench.id));assert(!f.blocked(stand.x,stand.y));
        assert(Math.abs(seat.y+.69-bench.seatHeight)<1e-9,'seat surface calibration');
    }
    const a=f.seatTransform(bench,0),b=f.seatTransform(bench,1);assert(Math.abs(Math.hypot(a.x-b.x,a.z-b.z)-.7)<1e-9,'two distinct rotated seats');
}
for(const lamp of f.lamps)for(const bed of f.flowerBeds){
    const dx=lamp.x-bed.x,dz=lamp.z-bed.z,c=Math.cos(bed.rotation),s=Math.sin(bed.rotation);
    const distance=Math.hypot(Math.max(0,Math.abs(dx*c-dz*s)-1.31),Math.max(0,Math.abs(dx*s+dz*c)-.78));
    assert(distance>.36,'lamp overlaps planter');
}
for(const p of f.pergolas){
    const bench=f.benches.find(b=>b.pergolaId===p.id),front=f.approachPosition(bench);
    const outer={x:400+(p.x-1.5*Math.sin(p.rotation))*34,y:300+(p.z-1.5*Math.cos(p.rotation))*34};
    assert(!f.blockedPath(outer.x,outer.y,front.x,front.y),'pergola doorway obstructed');
    assert.equal(f.groundHeight(front.x,front.y),.18,'walk on platform');
}
// Exercise the real server handler: both sheltered benches accept nearby players,
// reject a third person and retain the normal delayed rest state.
const source=fs.readFileSync('server/index.js','utf8'),start=source.indexOf("  socket.on('restAtCampusBench'"),end=source.indexOf('\n  socket.on(',start+1);
for(const bench of f.benches.filter(b=>b.kind==='pergola')){
    const front=f.approachPosition(bench),players={me:{mapId:'fountain',...front,stats:{fatigue:0}}},handlers={},events=[];
    let occupied=[];
    const ctx={Date,Math,players,ALL_REST_BENCHES:f.benches,FountainPhysics:f,socket:{id:'me',on:(id,fn)=>handlers[id]=fn,emit:(...args)=>events.push(args)},getCampusBenchOccupants:()=>({[bench.id]:occupied}),stopCampusBenchRest(){},positionCampusBenchOccupants(){},emitCampusBenchOccupants(){},getPlayerState:()=>({}),CAMPUS_BENCH_COOLDOWN_MS:30000};
    vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);handlers.restAtCampusBench(bench.id);
    assert.equal(players.me.sittingAtBench,bench.id);assert(players.me.benchRestStartedAt>0);assert.equal(players.me.stats.fatigue,0);
    players.me.sittingAtBench='';players.me.benchRestStartedAt=0;occupied=['one','two'];handlers.restAtCampusBench(bench.id);assert.equal(players.me.sittingAtBench,'');
}
console.log('PASS: six reachable seats, open pergolas, rotated two-person slots, no lamp/planter overlap, platform height and real server capacity/rest handler.');
