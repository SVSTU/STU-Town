/* Validated character catalogue. Add future body/outfit models here without changing movement. */
const CharacterAssets=(()=>{
    const catalogue=Object.freeze({
        'student-polo-01':Object.freeze({id:'student-polo-01',name:'Sinh viên áo polo',file:'characters/student-male-01.glb',version:'1',height:1.78,seatOffset:.20,rig:'student-animation-v1',materialSlots:['char.skin','char.hair','char.shirt','char.trim','char.trousers','char.shoes']}),
        'student-coop-01':Object.freeze({id:'student-coop-01',name:'Sinh viên hợp tác xã',file:'characters/coop-v1/student.glb',version:'1',height:1.81,seatOffset:.20,rig:'student-animation-v1'}),
        'professor-coop-01':Object.freeze({id:'professor-coop-01',name:'Giáo sư',file:'characters/coop-v1/professor.glb',version:'1',height:1.81,seatOffset:.20,rig:'student-animation-v1'}),
        'merchant-coop-01':Object.freeze({id:'merchant-coop-01',name:'Thương nhân',file:'characters/coop-v1/merchant.glb',version:'1',height:1.81,seatOffset:.20,rig:'student-animation-v1'}),
        'coop-modular-01':Object.freeze({id:'coop-modular-01',name:'Nhân vật module',file:'characters/coop-v1/modular-human.glb',version:'1',height:1.81,seatOffset:.20,rig:'student-animation-v1',modules:{hair:'wavy',outfit:'polo',accessories:['backpack']}})
    });
    const defaultId='student-polo-01';
    const resolve=id=>Object.hasOwn(catalogue,id)?catalogue[id]:catalogue[defaultId];
    const slots=Object.freeze({hair:Object.freeze(['wavy','braid','gray']),outfit:Object.freeze(['polo','apron','vest']),accessories:Object.freeze(['backpack','glasses'])});
    function normaliseModules(input={}) {
        if(!input||typeof input!=='object')input={};
        return {hair:slots.hair.includes(input.hair)?input.hair:'wavy',outfit:slots.outfit.includes(input.outfit)?input.outfit:'polo',
            accessories:[...new Set((Array.isArray(input.accessories)?input.accessories:[]).filter(id=>slots.accessories.includes(id)))]};
    }
    function applyModules(root,input) {
        const choice=normaliseModules(input);
        if(root)for(const node of root.getDescendants()) {
            const match=/^module__(hair|outfit|accessory)__([^_]+)__/.exec(node.name);
            if(match)node.setEnabled(match[1]==='accessory'?choice.accessories.includes(match[2]):choice[match[1]]===match[2]);
        }
        return choice;
    }
    const forPlayer=(player,mapId)=>resolve(Object.hasOwn(catalogue,player?.characterAssetId)?player.characterAssetId:mapId==='khu-a'?'student-coop-01':defaultId);
    return Object.freeze({defaultId,list:()=>Object.values(catalogue),resolve,forPlayer,slots,normaliseModules,applyModules});
})();
if(typeof module!=='undefined')module.exports=CharacterAssets;
