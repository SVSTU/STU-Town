const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const layouts=require('../client/map-3d-layouts');

// Ensure the server spawn can reach every action and the exit using real footprints.
for(const map of ['khu-a','canteen','farm','halloween:test']) {
    const config=layouts.get(map),step=5,queue=[config.spawn],seen=new Set();
    const reachable=[];
    for(let cursor=0;cursor<queue.length;cursor++) {
        const p=queue[cursor],key=p.x+','+p.y;if(seen.has(key))continue;seen.add(key);reachable.push(p);
        for(const [dx,dy] of [[step,0],[-step,0],[0,step],[0,-step]]) {
            const x=p.x+dx,y=p.y+dy;
            if(x<15||x>785||y<15||y>585||seen.has(x+','+y)||layouts.blockedPath(map,p.x,p.y,x,y))continue;
            queue.push({x,y});
        }
    }
    assert(!layouts.blocked(map,config.spawn.x,config.spawn.y),map+' spawn');
    assert(reachable.some(p=>Math.hypot(p.x-layouts.exit.x,p.y-layouts.exit.y)<24),map+' exit unreachable');
    for(const prop of config.props.filter(p=>p.action))assert(reachable.some(p=>Math.hypot(p.x-prop.x,p.y-prop.y)<45),map+' action '+prop.action);
    if(map.startsWith('halloween:'))for(let i=0;i<50;i++)assert(reachable.some(p=>Math.hypot(p.x-(112+i%10*64),p.y-(242+Math.floor(i/10)*54))<38),'box '+i+' unreachable');
    console.log('PASS footprints/spawn/exit/actions:',map);
}

function controller(fps,direction,source='keyboard',forward={x:0,z:1}) {
    const player={x:400,y:400},emits=[];
    const context={console,Math,Number,Boolean,performance,Map3DLayouts:layouts,
        document:{querySelector:()=>null},
        sceneRef:{input:{keyboard:{enabled:true}}},
        cursors:Object.fromEntries(['up','down','left','right'].map(k=>[k,{isDown:false}])),
        socket:{id:'me',emit:(...args)=>emits.push(args)},players:{me:player},
        playerStatsState:{stats:{fatigue:0,hunger:100}},currentMapId:'test',targetPosition:{x:700,y:500},mapExitTarget:null,
        babylonFountain:{scene:{activeCamera:{getForwardRay:()=>({direction:forward})}},exit:{x:780,y:580}},
        renderEnvironmentOverlay(){},updateInteractionZone(){},isBlockedPosition:()=>false,
        Phaser:{Math:{Clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),Distance:{Between:()=>100}}}
    };
    vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../client/player-controller.js'),'utf8'),context);
    if(source==='keyboard')context.cursors[direction].isDown=true;
    else vm.runInContext(`mobileMoveState.${direction}=true`,context);
    for(let i=1;i<=fps;i++)context.update(i*1000/fps,1000/fps);
    const before={...player};
    context.cursors[direction].isDown=false;vm.runInContext(`mobileMoveState.${direction}=false`,context);
    for(let i=1;i<=10;i++)context.update(1000+i*1000/fps,1000/fps);
    assert.deepEqual(player,before,'release must stop immediately');
    assert(emits.filter(e=>e[0]==='playerMovement').length<=22,'movement packets throttled');
    return player;
}
const sixty=controller(60,'up'),thirty=controller(30,'up'),touch=controller(60,'up','pad');
assert(Math.abs(sixty.y-thirty.y)<.001,'frame independent speed');
assert.deepEqual(sixty,touch,'keyboard and pad movement match');
assert(sixty.y>400,'up follows camera forward');
const rotated=controller(60,'up','keyboard',{x:1,z:0});
assert(rotated.x>400&&rotated.y===400,'movement follows rotated camera');
console.log('PASS unified keyboard/pad, camera orientation, release stop, 30/60 FPS and packet rate');
