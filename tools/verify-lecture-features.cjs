const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),layouts=require('../client/map-3d-layouts');
const source=fs.readFileSync('server/index.js','utf8'),fn=source.slice(source.indexOf('function isKhuCScheduleOpen()'),source.indexOf('\nfunction getVietnamTimeMinutes()'));
for(const [hour,minute,expected] of [[6,59,false],[7,0,true],[11,29,true],[11,30,false],[12,59,false],[13,0,true],[16,59,true],[17,0,false]]){
    const instant=Date.UTC(2026,10,8,hour-7,minute),Clock=class extends Date{constructor(...args){super(...(args.length?args:[instant]));}};
    const ctx={Intl,Date:Clock};vm.createContext(ctx);vm.runInContext(fn,ctx);assert.equal(ctx.isKhuCScheduleOpen(),expected,`${hour}:${minute}`);
}
function enter(open){
    const handlers={},emits=[],player={mapId:'campus',x:355,y:175};
    const ctx={Map3DLayouts:layouts,players:{review:player},socket:{id:'review',on:(n,fn)=>handlers[n]=fn,emit:(...a)=>emits.push(a),leave(){},join(){},to:()=>({emit(){}})},OPEN_MAP_IDS:new Set(['khu-c']),CLOSED_MAP_IDS:new Set(),isKhuCScheduleOpen:()=>open,stopCampusBenchRest(){},getMapPlayers:()=>({review:player}),getSessionLeaderboard:()=>({}),emitSessionLeaderboard(){},emitCampusBenchOccupants(){}};
    const start=source.indexOf("  socket.on('enterCampusMap'"),end=source.indexOf("  socket.on('returnToCampus'",start);vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);handlers.enterCampusMap('khu-c');return {player,emits};
}
const closed=enter(false);assert.equal(closed.player.mapId,'campus');assert(closed.emits.some(e=>e[0]==='mapChangeDenied'));
const opened=enter(true);assert.equal(opened.player.mapId,'khu-c');assert.equal(opened.player.x,400);assert.equal(opened.player.y,300);assert(opened.emits.some(e=>e[0]==='sessionLeaderboard'));
// Exercise the existing ranking renderer with a small isolated DOM; no server writes.
const nodes=new Map(),element=()=>({children:[],textContent:'',appendChild(n){this.children.push(n);},append(n){this.children.push(n);},replaceChildren(){this.children=[];},setAttribute(){}}),document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);},querySelectorAll:()=>[],createElement:element};
const rank={document,activeRankingCategory:'coins',activeLeaderboardScope:'server',sessionLeaderboard:{server:{coins:[{nickname:'Sinh viên A',score:1200}]},session:{coins:[{nickname:'Sinh viên B',score:300}]}}};vm.createContext(rank);vm.runInContext(fs.readFileSync('client/world-interactions.js','utf8'),rank);rank.renderSessionLeaderboard();assert(nodes.get('session-leaderboard-list').children[0].textContent.includes('Sinh viên A'));rank.activeLeaderboardScope='session';rank.renderSessionLeaderboard();assert(nodes.get('session-leaderboard-list').children[0].textContent.includes('Sinh viên B'));
console.log('PASS actual server opening-hour boundaries and map-entry handler; leaderboard emitted; existing server/session ranking renderer.');
