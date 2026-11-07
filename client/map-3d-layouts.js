/* Shared map footprints in existing server coordinates; Babylon uses 34 px/metre. */
const Map3DLayouts = (() => {
    const prop=(file,x,y,scale=1,action='',w=0,d=0)=>({file,x,y,scale,action,w,d,front:['seed-stall','produce-stall','food-counter','card-machine','ticket-machine','recovery-station'].includes(file)});
    const maps={
        'khu-a': {title:'Khu A · Giao dịch',pack:'khu-a',floor:'#b6ac8e',spawn:{x:400,y:455},props:[
            prop('seed-stall',270,245,1,'merchant',29,17),
            prop('produce-stall',340,245,1,'merchant',29,17),
            prop('professor',500,255,1,'professor',10,10),
            prop('recovery-station',400,378,1,'recovery',15,12)]},
        canteen:{title:'Căn tin · STU',pack:'canteen-v2',theme:'canteen-v2',floor:'#c9b292',spawn:{x:400,y:155},returnSpawn:{x:610,y:330},exit:{x:620,y:160},props:[
            prop('food-counter',400,455,1,'canteen-counter',88,28),
            {...prop('ticket-machine',640,330,1,'elevator-vending',12,15),rotation:Math.PI/2},
            prop('picnic-table',300,280,1.25,'',37,36),prop('picnic-table',510,280,1.25,'',37,36),
            prop('recycling-station',155,230,1,'',21,12),
            prop('potted-plant',165,470,1,'',14,14),prop('potted-plant',640,470,1,'',14,14),
            prop('potted-plant',165,135,1,'',14,14),prop('potted-plant',650,230,1,'',14,14)],
            barriers:[{id:'wall-left',x:128,y:300,w:4,d:208},{id:'wall-right',x:672,y:300,w:4,d:208},
                {id:'wall-back',x:400,y:504,w:276,d:5},{id:'wall-front',x:400,y:96,w:276,d:2}]},
        farm:{title:'Nông trại cộng đồng',pack:'community-farm-v2',theme:'garden-v2',floor:'#b7a27d',playerRadius:12,spawn:{x:400,y:147},exit:{x:196,y:164},bounds:{minX:128,maxX:672,minY:96,maxY:504},props:[
            prop('tool-shed',196,470,1,'',53,50),prop('water-barrel',604,467,1,'',20,20),
            prop('watering-can',628,442,1,'',12,10),prop('garden-tree',155,337,1,'',15,15),prop('garden-tree',645,337,1,'',15,15)],
            plots:[{id:'plot-1',x:301.4,y:232,w:74.1,d:49.6,scale:1.2},{id:'plot-2',x:301.4,y:368,w:74.1,d:49.6,scale:1.2},
                {id:'plot-3',x:498.6,y:368,w:74.1,d:49.6,scale:1.2},{id:'plot-4',x:498.6,y:232,w:74.1,d:49.6,scale:1.2}],
            barriers:[{id:'hedge-left',x:140,y:300,w:8,d:196},{id:'hedge-right',x:660,y:300,w:8,d:196},
                {id:'hedge-back',x:400,y:493,w:264,d:8},{id:'hedge-front-left',x:240,y:107,w:101,d:8},{id:'hedge-front-right',x:560,y:107,w:101,d:8}]},
        halloween:{title:'Tầng Halloween · 50 hộp quà',pack:'halloween',floor:'#30263d',spawn:{x:400,y:535},props:[
            prop('dead-tree',65,170,1,'',10,10),prop('dead-tree',740,180,1,'',10,10),
            prop('pumpkin',180,145,1.4),prop('pumpkin',620,145,1.4),
            prop('lantern',300,150,1.5),prop('lantern',500,150,1.5)]}
    };
    maps.canteen.boards=[
        {id:'ranking-reputation',action:'ranking-reputation',name:'Vinh danh · Danh tiếng',file:'honor-gold',x:220,y:455,w:41,d:11,front:true},
        {id:'ranking-coins',action:'ranking-coins',name:'Vinh danh · Tiền đồng',file:'honor-silver',x:590,y:455,w:41,d:11,front:true}
    ];
    const key=id=>String(id).startsWith('halloween:')?'halloween':id;
    const get=id=>maps[key(id)];
    function obstacles(id) {
        const map=get(id); if(!map)return [];
        const result=map.props.map((p,i)=>({...p,id:'prop:'+i})).filter(p=>p.w).concat(map.boards||[],map.barriers||[]);
        if(key(id)==='farm')for(const p of map.plots)result.push({...p,id:'plot:'+p.id,action:'plot:'+p.id});
        if(key(id)==='halloween')for(let i=0;i<50;i++)result.push({id:'box:'+i,action:'box:'+i,x:112+i%10*64,y:242+Math.floor(i/10)*54,w:11,d:10});
        return result;
    }
    function blocked(id,x,y) {
        const map=get(id),b=map?.bounds,radius=map?.playerRadius||7;
        if(b&&(x<b.minX+radius||x>b.maxX-radius||y<b.minY+radius||y>b.maxY-radius))return true;
        return obstacles(id).some(p=>Math.abs(x-p.x)<p.w+radius&&Math.abs(y-p.y)<p.d+radius);
    }
    function blockedPath(id,ax,ay,bx,by) {
        const n=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)/5));
        for(let i=1;i<=n;i++)if(blocked(id,ax+(bx-ax)*i/n,ay+(by-ay)*i/n))return true;
        return false;
    }
    function segmentHitsBox(ax,ay,bx,by,box) {
        let low=0,high=1;
        for(const [start,delta,center,half] of [[ax,bx-ax,box.x,box.w],[ay,by-ay,box.y,box.d]]) {
            if(Math.abs(delta)<1e-9){if(start<center-half||start>center+half)return false;continue;}
            const a=(center-half-start)/delta,b=(center+half-start)/delta;
            low=Math.max(low,Math.min(a,b));high=Math.min(high,Math.max(a,b));
            if(low>high)return false;
        }
        return high>=0&&low<=1;
    }
    function canReachTarget(id,player,target,all) {
        const dx=Math.max(0,Math.abs(player.x-target.x)-target.w),dy=Math.max(0,Math.abs(player.y-target.y)-target.d);
        if(Math.hypot(dx,dy)>26)return false;
        // Use the same rotated front normal as the rendered model.
        if(target.front) {
            const rotation=target.rotation||0,fx=-Math.sin(rotation),fy=-Math.cos(rotation);
            const depth=Math.abs(fx)*target.w+Math.abs(fy)*target.d;
            if((player.x-target.x)*fx+(player.y-target.y)*fy<depth+1)return false;
        }
        return !all.some(box=>box.id!==target.id&&segmentHitsBox(player.x,player.y,target.x,target.y,box));
    }
    function interactionTargets(id,player) {
        if(!player||!Number.isFinite(player.x)||!Number.isFinite(player.y))return [];
        const all=obstacles(id);
        if(blocked(id,player.x,player.y))return [];
        return all.filter(target=>target.action&&canReachTarget(id,player,target,all))
            .sort((a,b)=>Math.hypot(player.x-a.x,player.y-a.y)-Math.hypot(player.x-b.x,player.y-b.y));
    }
    function canInteract(id,player,action) {return interactionTargets(id,player).some(target=>target.action===action);}
    const walkSamples=new Map();
    function sampleWalkPoint(id,random=Math.random) {
        const map=get(id);if(!map?.bounds)return {...(map?.spawn||{x:400,y:300})};
        if(!walkSamples.has(key(id))){
            const queue=[map.spawn],seen=new Set(),samples=[];
            for(let i=0;i<queue.length;i++){
                const p=queue[i],tag=p.x+','+p.y;if(seen.has(tag))continue;seen.add(tag);samples.push(p);
                for(const [dx,dy] of [[10,0],[-10,0],[0,10],[0,-10]]){
                    const next={x:p.x+dx,y:p.y+dy};
                    if(!seen.has(next.x+','+next.y)&&!blockedPath(id,p.x,p.y,next.x,next.y))queue.push(next);
                }
            }
            walkSamples.set(key(id),samples);
        }
        const samples=walkSamples.get(key(id));return {...samples[Math.min(samples.length-1,Math.floor(random()*samples.length))]};
    }
    return {get,key,blocked,blockedPath,canInteract,interactionTargets,segmentHitsBox,sampleWalkPoint,exit:{x:690,y:550}};
})();
if(typeof module!=='undefined')module.exports=Map3DLayouts;
