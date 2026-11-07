/* Shared map footprints in existing server coordinates; Babylon uses 34 px/metre. */
const Map3DLayouts = (() => {
    const prop=(file,x,y,scale=1,action='',w=0,d=0)=>({file,x,y,scale,action,w,d});
    const maps={
        'khu-a': {title:'Khu A · Giao dịch',pack:'khu-a',floor:'#b6ac8e',spawn:{x:400,y:455},props:[
            prop('seed-stall',270,245,1,'merchant',29,17),
            prop('produce-stall',340,245,1,'merchant',29,17),
            prop('professor',500,255,1,'professor',10,10),
            prop('recovery-station',400,378,1,'recovery',15,12)]},
        canteen:{title:'Căn tin',pack:'canteen',floor:'#d0bb91',spawn:{x:400,y:420},props:[
            prop('food-counter',400,242,1.8,'canteen-counter',72,29),
            prop('card-machine',650,345,1,'elevator-vending',15,12),
            prop('picnic-table',250,365,1,'',27,29),prop('picnic-table',500,365,1,'',27,29)]},
        farm:{title:'Vườn cộng đồng',pack:'community-farm',floor:'#72995c',spawn:{x:400,y:430},props:[
            prop('tool-shed',620,155,1,'',28,25)]},
        halloween:{title:'Tầng Halloween · 50 hộp quà',pack:'halloween',floor:'#30263d',spawn:{x:400,y:535},props:[
            prop('dead-tree',65,170,1,'',10,10),prop('dead-tree',740,180,1,'',10,10),
            prop('pumpkin',180,145,1.4),prop('pumpkin',620,145,1.4),
            prop('lantern',300,150,1.5),prop('lantern',500,150,1.5)]}
    };
    const key=id=>String(id).startsWith('halloween:')?'halloween':id;
    const get=id=>maps[key(id)];
    function obstacles(id) {
        const map=get(id); if(!map)return [];
        const result=map.props.filter(p=>p.w).map(p=>({x:p.x,y:p.y,w:p.w,d:p.d}));
        if(key(id)==='farm') for(let i=0;i<4;i++)result.push({x:239+i*110,y:311,w:38,d:24});
        if(key(id)==='halloween')for(let i=0;i<50;i++)result.push({x:112+i%10*64,y:242+Math.floor(i/10)*54,w:11,d:10});
        return result;
    }
    function blocked(id,x,y) {return obstacles(id).some(p=>Math.abs(x-p.x)<p.w+7&&Math.abs(y-p.y)<p.d+7);}
    function blockedPath(id,ax,ay,bx,by) {
        const n=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)/5));
        for(let i=1;i<=n;i++)if(blocked(id,ax+(bx-ax)*i/n,ay+(by-ay)*i/n))return true;
        return false;
    }
    return {get,key,blocked,blockedPath,exit:{x:690,y:550}};
})();
if(typeof module!=='undefined')module.exports=Map3DLayouts;
