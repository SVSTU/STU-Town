/* Validated character catalogue. Add future body/outfit models here without changing movement. */
const CharacterAssets=(()=>{
    const catalogue=Object.freeze({
        'student-polo-01':Object.freeze({id:'student-polo-01',name:'Sinh viên áo polo',file:'characters/student-male-01.glb',version:'1',height:1.78,seatOffset:.20,rig:'student-animation-v1',materialSlots:['char.skin','char.hair','char.shirt','char.trim','char.trousers','char.shoes']})
    });
    const defaultId='student-polo-01';
    return Object.freeze({defaultId,list:()=>Object.values(catalogue),resolve:id=>Object.hasOwn(catalogue,id)?catalogue[id]:catalogue[defaultId]});
})();
if(typeof module!=='undefined')module.exports=CharacterAssets;
