/* Validated character catalogue. Add future body/outfit models here without changing movement. */
const CharacterAssets=(()=>{
    const slots=Object.freeze({hair:Object.freeze(['wavy','braid','gray']),outfit:Object.freeze(['polo','apron','vest']),accessories:Object.freeze(['backpack','glasses'])});
    const campusSlots=Object.freeze({hair:Object.freeze(['wavy','braid','gray','ponytail']),outfit:Object.freeze(['polo','apron','vest','uniform']),accessories:slots.accessories});
    const catalogue=Object.freeze({
        'student-polo-01':Object.freeze({id:'student-polo-01',name:'Sinh viên áo polo',file:'characters/student-male-01.glb',version:'1',height:1.78,seatOffset:.20,rig:'student-animation-v1',materialSlots:['char.skin','char.hair','char.shirt','char.trim','char.trousers','char.shoes']}),
        'student-coop-01':Object.freeze({id:'student-coop-01',name:'Sinh viên hợp tác xã',file:'characters/coop-v1/student.glb',version:'1',height:1.81,seatOffset:.20,rig:'student-animation-v1'}),
        'professor-coop-01':Object.freeze({id:'professor-coop-01',name:'Giáo sư',file:'characters/coop-v1/professor.glb',version:'1',height:1.81,seatOffset:.20,rig:'student-animation-v1'}),
        'merchant-coop-01':Object.freeze({id:'merchant-coop-01',name:'Thương nhân',file:'characters/coop-v1/merchant.glb',version:'1',height:1.81,seatOffset:.20,rig:'student-animation-v1'}),
        'coop-modular-01':Object.freeze({id:'coop-modular-01',name:'Nhân vật module',file:'characters/coop-v1/modular-human.glb',version:'1',height:1.81,seatOffset:.20,rig:'student-animation-v1',modules:{hair:'wavy',outfit:'polo',accessories:['backpack']}}),
        'garden-modular-01':Object.freeze({id:'garden-modular-01',name:'Sinh viên · Mô-đun vườn riêng',file:'characters/private-garden-v1/modular-student.glb',version:'1',height:1.78,rig:'student-animation-v1',modules:{hair:'wavy',outfit:'polo',accessories:[]}}),
        'student-campus-01':Object.freeze({id:'student-campus-01',name:'Sinh viên giảng đường',file:'characters/campus-v1/student.glb',version:'1',height:1.81,seatOffset:.20,rig:'student-animation-v1'}),
        'student-female-campus-01':Object.freeze({id:'student-female-campus-01',name:'Sinh viên đồng phục',file:'characters/campus-v1/student-female.glb',version:'1',height:1.81,seatOffset:.20,rig:'student-animation-v1'}),
        'campus-modular-01':Object.freeze({id:'campus-modular-01',name:'Nhân vật module học đường',file:'characters/campus-v1/modular-human.glb',version:'1',height:1.81,seatOffset:.20,rig:'student-animation-v1',moduleSlots:campusSlots,modules:{hair:'wavy',outfit:'polo',accessories:['backpack']}})
    });
    const defaultId='student-polo-01';
    const resolve=id=>Object.hasOwn(catalogue,id)?catalogue[id]:catalogue[defaultId];
    function normaliseModules(input={},allowedSlots=slots) {
        if(!input||typeof input!=='object')input={};
        return {hair:allowedSlots.hair.includes(input.hair)?input.hair:'wavy',outfit:allowedSlots.outfit.includes(input.outfit)?input.outfit:'polo',
            accessories:[...new Set((Array.isArray(input.accessories)?input.accessories:[]).filter(id=>allowedSlots.accessories.includes(id)))]};
    }
    function applyModules(root,input,allowedSlots=slots) {
        const choice=normaliseModules(input,allowedSlots);
        if(root)for(const node of root.getDescendants()) {
            const name=node.name.slice(node.name.lastIndexOf(':')+1);
            const match=/^module__(hair|outfit|accessory)__([^_]+)__/.exec(name);
            if(match)node.setEnabled(match[1]==='accessory'?choice.accessories.includes(match[2]):choice[match[1]]===match[2]);
        }
        return choice;
    }
    const forPlayer=(player,mapId)=>{
        const selected=player?.characterAssetId||player?.playerInfo?.characterAssetId;
        const descriptor=resolve(Object.hasOwn(catalogue,selected)?selected:String(mapId).startsWith('bench-private:')?'garden-modular-01':mapId==='khu-a'?'student-coop-01':mapId==='khu-c'?'student-campus-01':defaultId);
        return descriptor.modules?{...descriptor,modules:normaliseModules(player?.characterModules||player?.playerInfo?.characterModules||descriptor.modules,descriptor.moduleSlots)}:descriptor;
    };
    return Object.freeze({defaultId,list:()=>Object.values(catalogue),resolve,forPlayer,slots,campusSlots,normaliseModules,applyModules});
})();
if(typeof module!=='undefined')module.exports=CharacterAssets;
