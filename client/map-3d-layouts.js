/* Shared map footprints in existing server coordinates; Babylon uses 34 px/metre. */
const Map3DLayouts = (() => {
    const prop=(file,x,y,scale=1,action='',w=0,d=0)=>({file,x,y,scale,action,w,d,front:['seed-stall','produce-stall','food-counter','card-machine','ticket-machine','recovery-station'].includes(file)});
    const maps={
        'khu-a': {title:'Khu A · Hợp tác xã',pack:'khu-a-coop-v1',theme:'coop-v1',floor:'#c7b8a5',
            playerRadius:10,spawn:{x:400,y:300},exit:{x:400,y:126},
            bounds:{minX:128,maxX:672,minY:96,maxY:504},props:[
            prop('seed-stall',237,436,1,'merchant',62,30),
            prop('produce-stall',563,436,1,'merchant',62,30),
            {...prop('professor-desk',400,436,1,'professor',48,20),front:true},
            prop('recovery-station',215,230,1,'recovery',52,19),
            {...prop('locked-farm-gate',575,230,1,'locked-farm',56,34),front:true},
            prop('handcart',640,370,1,'',16,23),
            prop('potted-plant',153,372,1,'',15,15),prop('potted-plant',647,308,1,'',15,15)],
            barriers:[{id:'coop-wall-left',x:128,y:300,w:4,d:204},{id:'coop-wall-right',x:672,y:300,w:4,d:204},
                {id:'coop-wall-back',x:400,y:504,w:272,d:5},
                {id:'coop-front-left',x:238,y:96,w:110,d:5},{id:'coop-front-right',x:562,y:96,w:110,d:5}]},
        'khu-c':{title:'Khu C · Giảng đường',pack:'lecture-v1',theme:'lecture-v1',floor:'#d5c4a8',
            room:{width:18,depth:14},playerRadius:10,spawn:{x:400,y:300},exit:{x:400,y:88},
            bounds:{minX:94,maxX:706,minY:62,maxY:538},props:[
                {...prop('teacher-desk',287.8,480,1,'lecture-info',37,16),height:.28,front:true},
                {...prop('bookshelf',605.7,485.3,1,'',32,11),height:.28}],
            barriers:[{id:'lecture-left',x:94,y:300,w:4,d:238},{id:'lecture-right',x:706,y:300,w:4,d:238},
                {id:'lecture-back',x:400,y:538,w:306,d:5},
                {id:'lecture-front-left',x:219.8,y:62,w:125.8,d:5},{id:'lecture-front-right',x:580.2,y:62,w:125.8,d:5},
                {id:'stage-front-left',x:257.2,y:430.9,w:95.2,d:1},{id:'stage-front-right',x:542.8,y:430.9,w:95.2,d:1},
                {id:'stage-edge-left',x:162,y:478.5,w:1,d:47.6},{id:'stage-edge-right',x:638,y:478.5,w:1,d:47.6},
                {id:'stage-edge-back',x:400,y:526.1,w:238,d:1},
                {id:'lecture-pot-front-left',x:124,y:125,w:9,d:9},{id:'lecture-pot-front-right',x:676,y:125,w:9,d:9},
                {id:'lecture-pot-back-left',x:185,y:480,w:10,d:10},{id:'lecture-pot-back-right',x:550,y:482,w:10,d:10},
                {id:'lecture-flowers-left',x:320,y:80,w:20,d:7},{id:'lecture-flowers-right',x:480,y:80,w:20,d:7}]},
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
        'bench-private':{title:'Vườn ghế riêng',pack:'private-bench-v1',theme:'private-garden-v1',room:{width:12,depth:10},floor:'#7c9855',playerRadius:9,
            spawn:{x:388,y:355},spawns:[{x:388,y:355},{x:412,y:355}],exit:{x:536,y:198},exitRadius:18,
            seat:{x:400,y:398.6,height:.46,rotation:0,spacing:.70,approachY:363},
            bounds:{minX:196,maxX:604,minY:130,maxY:470},props:[
                prop('pergola',400,393.5),{...prop('bench',400,398.6,1,'private-bench',38.1,14.7),front:true},
                prop('flowerbed',400,289.8,1,'',30,30),
                prop('flower-urn',277.6,272.8,1,'',17,17),prop('flower-urn',522.4,272.8,1,'',17,17),
                prop('lamp',284.4,391.8,1,'',7,7),prop('lamp',515.6,391.8,1,'',7,7),
                ...[240.2,559.8].map(x=>prop('tree',x,415.6,1,'',10,10)),
                ...[219.8,580.2].map(x=>prop('tree',x,249,.64,'',7,7))],
            barriers:[
                ...[-1.68,1.68].flatMap(x=>[-1.03,1.03].map(z=>({id:'pergola-post-'+x+'-'+z,x:400+x*34,y:393.5+z*34,w:6.5,d:6.5}))),
                {id:'hedge-left',x:206.2,y:300,w:10.2,d:161.5},{id:'hedge-right',x:593.8,y:300,w:10.2,d:161.5},
                {id:'hedge-back',x:400,y:461.5,w:193.8,d:10.2},
                {id:'hedge-front-left',x:287.8,y:138.5,w:81.6,d:10.2},{id:'hedge-front-right',x:512.2,y:138.5,w:81.6,d:10.2},
                {id:'portal-left-support',x:513.9,y:198,w:4.8,d:4.8},{id:'portal-right-support',x:558.1,y:198,w:4.8,d:4.8}]},
        halloween:{title:'Tầng Halloween · 50 hộp quà',pack:'halloween',floor:'#30263d',spawn:{x:400,y:535},props:[
            prop('dead-tree',65,170,1,'',10,10),prop('dead-tree',740,180,1,'',10,10),
            prop('pumpkin',180,145,1.4),prop('pumpkin',620,145,1.4),
            prop('lantern',300,150,1.5),prop('lantern',500,150,1.5)]}
    };
    maps['khu-c'].desks=[];maps['khu-c'].seats=[];
    for(const x of [287.8,512.2])for(const y of [181,262.6,344.2]){
        const id='desk-'+(maps['khu-c'].desks.length+1);
        maps['khu-c'].desks.push({id,x,y});
        maps['khu-c'].props.push(prop('student-desk',x,y,1,'',28,12));
        for(const dx of [-14.96,14.96]){
            const seat={id:'seat-'+(maps['khu-c'].seats.length+1),x:x+dx,y:y-23.12,rotation:Math.PI,height:.45,
                approach:{x:x+dx+(dx<0?-28:28),y:y-23.12}};
            maps['khu-c'].seats.push(seat);
            maps['khu-c'].props.push({...prop('student-chair',seat.x,seat.y,1,'',9,10),rotation:Math.PI});
        }
    }
    maps.canteen.boards=[
        {id:'ranking-reputation',action:'ranking-reputation',name:'Vinh danh · Danh tiếng',file:'honor-gold',x:220,y:455,w:41,d:11,front:true},
        {id:'ranking-coins',action:'ranking-coins',name:'Vinh danh · Tiền đồng',file:'honor-silver',x:590,y:455,w:41,d:11,front:true}
    ];
    const key=id=>String(id).startsWith('bench-private:')?'bench-private':String(id).startsWith('halloween:')?'halloween':id;
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
    function groundHeight(id,x,y) {
        if(key(id)!=='khu-c')return 0;
        if(x>=162&&x<=638&&y>=430.9&&y<=526.1)return .28;
        if(Math.abs(x-400)<=47.6){if(y>=420.02&&y<430.9)return .28;if(y>=409.14&&y<420.02)return .14;}
        return 0;
    }
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
    return {get,key,blocked,blockedPath,canInteract,interactionTargets,segmentHitsBox,sampleWalkPoint,groundHeight,exit:{x:690,y:550}};
})();
if(typeof module!=='undefined')module.exports=Map3DLayouts;
