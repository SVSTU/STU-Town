/* Per-pair seating, authoritative reach checks and room-scoped occupancy. */
function createPrivateBenchSystem({players,io,layouts,allowEvent=()=>true}) {
  const isPrivate=id=>typeof id==='string'&&id.startsWith('bench-private:');
  function occupants(mapId) {
    const slots=[null,null];
    if(isPrivate(mapId))for(const [id,p]of Object.entries(players))if(p.mapId===mapId&&Number.isInteger(p.privateSeatIndex)&&p.privateSeatIndex>=0&&p.privateSeatIndex<2)slots[p.privateSeatIndex]=id;
    return slots;
  }
  function broadcast(mapId) {if(isPrivate(mapId))io.to(`map:${mapId}`).emit('privateBenchOccupancy',{mapId,seats:occupants(mapId)});}
  function leave(id) {
    const p=players[id];if(!p||!Number.isInteger(p.privateSeatIndex))return;
    delete p.privateSeatIndex;broadcast(p.mapId);
  }
  function bind(socket) {
    socket.on('sitAtPrivateBench',()=>{
      if(!allowEvent(socket))return;
      const p=players[socket.id];if(!p||!isPrivate(p.mapId)||Number.isInteger(p.privateSeatIndex))return;
      if(!layouts.canInteract(p.mapId,p,'private-bench'))return socket.emit('privateBenchResult',{message:'Hãy đến phía trước ghế, không tương tác qua vật cản.'});
      const slots=occupants(p.mapId),index=slots.indexOf(null);
      if(index<0)return socket.emit('privateBenchResult',{message:'Ghế đã đủ hai người.'});
      const seat=layouts.get(p.mapId).seat;
      p.privateSeatIndex=index;p.x=seat.x+(index===0?-.5:.5)*seat.spacing*34;p.y=seat.approachY;
      socket.emit('playerMoved',{id:socket.id,x:p.x,y:p.y});
      socket.to(`map:${p.mapId}`).emit('playerMoved',{id:socket.id,x:p.x,y:p.y});
      broadcast(p.mapId);socket.emit('privateBenchResult',{message:'Bạn đang ngồi nghỉ. Di chuyển để đứng dậy.'});
    });
  }
  function canExit(player) {
    if(!isPrivate(player?.mapId))return true;
    const layout=layouts.get(player.mapId);
    return Math.hypot(player.x-layout.exit.x,player.y-layout.exit.y)<=layout.exitRadius;
  }
  return {isPrivate,occupants,broadcast,leave,bind,canExit};
}
module.exports={createPrivateBenchSystem};
