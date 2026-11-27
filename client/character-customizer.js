/* Existing campus modules, shared across every 3D map. */
function readCharacterAppearance() {
    const hair = document.getElementById('character-hair');
    if (!hair) return null;
    return {characterAssetId:'campus-modular-01',characterModules:CharacterAssets.normaliseModules({
        hair:hair.value,outfit:document.getElementById('character-outfit').value,
        accessories:['backpack','glasses'].filter(id=>document.getElementById('character-'+id).checked)
    },CharacterAssets.campusSlots)};
}
function syncCharacterControls(appearance) {
    if (!document.getElementById('character-hair')) return;
    const choice=CharacterAssets.normaliseModules(appearance?.characterModules,CharacterAssets.campusSlots);
    document.getElementById('character-hair').value=choice.hair;
    document.getElementById('character-outfit').value=choice.outfit;
    for(const id of ['backpack','glasses'])document.getElementById('character-'+id).checked=choice.accessories.includes(id);
}
function applyCharacterAppearance(id,appearance) {
    const player=players[id];
    if(player)player.playerInfo={...(player.playerInfo||{}),...appearance};
}
function saveCharacterAppearance(appearance) {
    applyCharacterAppearance(socket.id,appearance);
    const status=document.getElementById('character-save-status');
    if(!socket.connected){if(status)status.textContent='Đã lưu trên trình duyệt; sẽ đồng bộ khi kết nối lại.';return;}
    socket.timeout(5000).emit('updateCharacterAppearance',appearance,(error,result)=>{
        if(status)status.textContent=error||!result?.ok?'Chưa đồng bộ được. Hãy lưu lại khi kết nối ổn định.':'Đã đồng bộ nhân vật.';
    });
}
function initialiseCharacterCustomizer() {
    syncCharacterControls(profile.characterAppearance);
    socket.on('playerAppearanceUpdated',data=>applyCharacterAppearance(data.id,data));
    socket.on('playerIdentity',identity=>{
        // Restored server data takes precedence over this browser's previous player.
        if(identity.characterAppearance){
            profile.characterAppearance=identity.characterAppearance;
            try{localStorage.setItem(PROFILE_STORAGE_KEY,JSON.stringify(profile));}catch{}
            syncCharacterControls(profile.characterAppearance);
            applyCharacterAppearance(socket.id,profile.characterAppearance);
        }else if(profile.characterAppearance)saveCharacterAppearance(profile.characterAppearance);
    });
}
