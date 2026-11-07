const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const layouts=require('../client/map-3d-layouts'),fountain=require('../client/fountain-physics');
const services=[['khu-a','merchant'],['khu-a','recovery'],['canteen','canteen-counter'],['canteen','elevator-vending'],['canteen','ranking-reputation'],['canteen','ranking-coins']];
for(const [map,action] of services){
    const config=layouts.get(map),p=config.props.concat(config.boards||[]).find(p=>(p.action||p.id)===action);
    const fx=-Math.sin(p.rotation||0),fy=-Math.cos(p.rotation||0),distance=Math.abs(fx)*p.w+Math.abs(fy)*p.d+18;
    assert(layouts.canInteract(map,{x:p.x+fx*distance,y:p.y+fy*distance},action),'front access '+action);
    assert(!layouts.canInteract(map,{x:p.x-fx*distance,y:p.y-fy*distance},action),'rear blocked '+action);
    assert(!layouts.canInteract(map,layouts.get(map).spawn,action),'remote access '+action);
}
const props=layouts.get('khu-a').props;
props.push({x:270,y:220,w:10,d:3});
assert(!layouts.canInteract('khu-a',{x:270,y:205},'merchant'),'obstacle must block line of sight');props.pop();
for(const bench of fountain.benches){
    const offset=-Math.cos(bench.rotation)*32;
    assert(fountain.canUseBench({x:bench.x,y:bench.y+offset},bench.id));
    assert(!fountain.canUseBench({x:bench.x,y:bench.y-offset},bench.id));
}
console.log('PASS reach rules: service fronts, remote/rear denial, occlusion and all four benches');

// Run real server handlers in a sandbox, with isolated in-memory balances only.
const source=fs.readFileSync('server/index.js','utf8');
function execute(event,map,position,payload){
    const start=source.indexOf("  socket.on('"+event+"'"),next=source.indexOf('\n  socket.on(',start+1),handlers={};
    const player={mapId:map,...position,coins:1500,reputation:100,stats:{hunger:30,strength:30,fatigue:50},lastFarmActionAt:0,farmPlantCount:0};
    const inventory={seeds:{carrot:3},produce:{carrot:0},items:{bread:0,eventGoldCoin:2,elevatorTicket:1}},plot={crop:'',plantedAt:0};
    const noop=()=>{};
    const ctx={console,Map,Date,Math,Number,Object,Promise,Map3DLayouts:layouts,socket:{id:'review',on:(name,fn)=>handlers[name]=fn,emit:noop},players:{review:player},playerInventories:new Map([['review',inventory]]),farmPlots:new Map([['plot-1',plot]]),FARM_CROP_KEYS:{carrot:'carrot'},CROP_PRICES:{carrot:100},FOOD_MENU:{bread:{coins:100,reputation:20}},applyFarmWorkCost:()=>'',emitPlayerState:noop,emitSessionLeaderboard:noop,schedulePlayerSave:noop,getPlayerState:()=>({}),getFarmSnapshot:()=>({}),clampStat:v=>Math.max(0,Math.min(100,v)),io:{to:()=>({emit:noop})},recordCanteenSale:()=>Promise.resolve(),emitCanteenBestSellingProducts:()=>Promise.resolve(),isKhuCScheduleOpen:()=>false};
    vm.createContext(ctx);vm.runInContext(source.slice(start,next<0?undefined:next),ctx);handlers[event](payload);
    return {player,inventory,plot};
}
const cases=[
    ['interactFarmPlot','farm',{x:239,y:270},{plotId:'plot-1',action:'plant',cropKey:'carrot'},s=>s.inventory.seeds.carrot===2],
    ['farmShopAction','khu-a',{x:270,y:205},{action:'buy-seed',cropKey:'carrot',quantity:1},s=>s.player.coins===1400],
    ['useRecoveryStation','khu-a',{x:400,y:350},undefined,s=>s.player.coins===1000],
    ['canteenPurchase','canteen',{x:400,y:415},{itemId:'bread',currency:'coins',quantity:1},s=>s.inventory.items.bread===1],
    ['buyElevatorTicket','canteen',{x:610,y:330},undefined,s=>s.inventory.items.elevatorTicket===2]
];
for(const [event,map,near,payload,succeeded]of cases){
    assert(succeeded(execute(event,map,near,payload)),'valid nearby '+event);
    const far=execute(event,map,layouts.get(map).spawn,payload);
    assert.equal(far.player.coins,1500,'remote coins '+event);assert.equal(far.inventory.seeds.carrot,3,'remote seeds '+event);assert.equal(far.inventory.items.bread,0);assert.equal(far.inventory.items.elevatorTicket,1);
}
console.log('PASS real server handlers: nearby actions accepted, remote writes denied without balance/item changes');

// Regression: opened box -> new stage, then leaving for a farm or service.
const nodes=new Map(),element=()=>({hidden:false,disabled:false,textContent:''});
const doc={getElementById:id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);}};
const ctx={console,Math,Number,Object,Set,Map,document:doc,Map3DLayouts:layouts,Phaser:{Math:{Distance:{Between:(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by)}}},currentMapId:'halloween:review',HALLOWEEN_BOX_POSITIONS:[{x:112,y:242}],halloweenOpenedBoxes:new Set([0]),activeHalloweenBox:-1,activeInteractionZoneId:'',activeFarmPlotId:'',interactedFarmPlotId:'',FARM_PLOT_LAYOUT:[{id:'plot-1',x:200,y:290,width:78,height:42}],farmPlots:{},updateFarmPlotControls(){},activeInteriorObjectId:'',INTERIOR_OBJECTS:{},zoneServiceView:{screen:'closed',target:''},renderZoneServices(){}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('client/world-interactions.js','utf8'),ctx);
ctx.updateHalloweenBoxInteraction({x:112,y:212});assert(doc.getElementById('interaction-button').disabled);
ctx.halloweenOpenedBoxes.clear();ctx.updateHalloweenBoxInteraction({x:112,y:212});assert(!doc.getElementById('interaction-button').disabled&&!doc.getElementById('interaction-button').hidden);
ctx.currentMapId='farm';doc.getElementById('interaction-button').disabled=true;ctx.updateFarmPlotInteraction({x:239,y:270});assert(!doc.getElementById('interaction-button').disabled);
ctx.currentMapId='canteen';doc.getElementById('interaction-button').disabled=true;ctx.updateInteriorInteraction({x:400,y:415});assert(!doc.getElementById('interaction-button').disabled);
console.log('PASS UI: same Halloween box becomes usable after reset; farm/canteen buttons recover');
