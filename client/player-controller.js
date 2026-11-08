/* Local player movement controller and server movement synchronization. */

const mobileMoveState = { up: false, down: false, left: false, right: false };
const keyboardMoveState = { up: false, down: false, left: false, right: false };
const movementPointers = new Map();
const movementButtonKeys = new Set();
let lastMovementSentAt=0, movementWasActive=false;

function resetMovementInput() {
    Object.keys(mobileMoveState).forEach(direction=>mobileMoveState[direction]=false);
    Object.keys(keyboardMoveState).forEach(direction=>keyboardMoveState[direction]=false);
    movementPointers.clear();movementButtonKeys.clear();
    sceneRef?.input?.keyboard?.resetKeys();
    movementWasActive=false;lastMovementSentAt=0;
    readMovementDirections();
}

function readMovementDirections() {
    const enabled=sceneRef?.input?.keyboard?.enabled!==false;
    const state={};
    for(const direction of Object.keys(mobileMoveState)) {
        const keyboard=typeof babylonFountain!=='undefined'&&babylonFountain?keyboardMoveState[direction]:cursors?.[direction]?.isDown;
        state[direction]=Boolean((enabled&&keyboard)||mobileMoveState[direction]);
        const button=document.querySelector(`[data-move-direction="${direction}"]`);
        button?.classList.toggle('is-pressed',state[direction]);
        button?.setAttribute('aria-pressed',String(state[direction]));
    }
    return state;
}

function bindMobileMovementControls() {
    const pad = document.getElementById('mobile-movement-pad');
    if (!pad || pad.dataset.bound === 'true') return;
    pad.dataset.bound = 'true';
    const refreshPointers=()=>{
        for(const direction of Object.keys(mobileMoveState))mobileMoveState[direction]=[...movementPointers.values()].includes(direction)||movementButtonKeys.has(direction);
        readMovementDirections();
    };
    const releasePointer=event=>{movementPointers.delete(event.pointerId);refreshPointers();};
    window.addEventListener('pointerup',releasePointer,true);
    window.addEventListener('pointercancel',releasePointer,true);
    window.addEventListener('pointermove',event=>{
        if(event.pointerType==='mouse'&&event.buttons===0)releasePointer(event);
    },true);
    const keyDirections={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'};
    window.addEventListener('keydown',event=>{
        const direction=keyDirections[event.code];if(!direction)return;
        if(event.target?.closest?.('input,textarea,select,[contenteditable="true"]')||event.altKey||event.ctrlKey||event.metaKey)return;
        keyboardMoveState[direction]=true;
        if(babylonFountain)event.preventDefault();
        readMovementDirections();
    },true);
    window.addEventListener('keyup',event=>{
        const direction=keyDirections[event.code];if(direction)keyboardMoveState[direction]=false;
        if(event.code==='Space'||event.code==='Enter'){movementButtonKeys.clear();refreshPointers();}
        readMovementDirections();
    },true);
    document.addEventListener('focusin',event=>{
        if(event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))resetMovementInput();
    });
    const stopAll = () => {
        resetMovementInput();
    };
    pad.querySelectorAll('[data-move-direction]').forEach((button) => {
        const direction = button.dataset.moveDirection;
        const start = (event) => {
            event.preventDefault();
            if(event.pointerType==='mouse'&&event.button!==0)return;
            movementPointers.set(event.pointerId,direction);refreshPointers();
            targetPosition = null;
            button.classList.add('is-pressed');
            try { button.setPointerCapture(event.pointerId); } catch {}
        };
        const stop = (event) => {
            if (event) event.preventDefault();
            if(event&&movementPointers.get(event.pointerId)===direction)movementPointers.delete(event.pointerId);
            refreshPointers();
        };
        button.addEventListener('pointerdown', start);
        button.addEventListener('pointerup', stop);
        button.addEventListener('pointercancel', stop);
        button.addEventListener('lostpointercapture', stop);
        button.addEventListener('contextmenu', (event) => event.preventDefault());
        button.addEventListener('keydown',event=>{
            if((event.code==='Space'||event.code==='Enter')&&!event.repeat){event.preventDefault();movementButtonKeys.add(direction);refreshPointers();}
        });
        button.addEventListener('keyup',event=>{
            if(event.code==='Space'||event.code==='Enter'){event.preventDefault();movementButtonKeys.delete(direction);refreshPointers();}
        });
        button.addEventListener('blur',()=>{movementButtonKeys.delete(direction);refreshPointers();});
    });
    window.addEventListener('blur', stopAll);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopAll(); });
}

function update(time, delta) {
    renderEnvironmentOverlay(time, delta);
    if (!socket.id || !players[socket.id]) return;

    const p = players[socket.id];
    const is3D=Boolean(babylonFountain);
    if (is3D) targetPosition = null;
    const previousX = p.x;
    const previousY = p.y;
    const fatigue = Number(playerStatsState.stats.fatigue) || 0;
    let speed = fatigue >= 80 ? 2.2 : fatigue >= 50 ? 3 : 4;
    if ((Number(playerStatsState.stats.hunger) || 0) <= 0) speed = Math.min(speed, 2);
    let isMoved = false;

    let keyActive = false;
    const directions=readMovementDirections();
    const {left:moveLeft,right:moveRight,up:moveUp,down:moveDown}=directions;
    speed *= Math.min(Number(delta) || 16.667, 50) / 16.667;
    if ((moveLeft !== moveRight) && (moveUp !== moveDown)) speed /= Math.SQRT2;
    if(is3D) {
        const horizontal=Number(moveRight)-Number(moveLeft), vertical=Number(moveUp)-Number(moveDown);
        keyActive=Boolean(horizontal||vertical);
        const camera=babylonFountain.scene.activeCamera;
        const forward=camera.getForwardRay().direction;
        let fx=forward.x,fz=forward.z;
        if(Math.hypot(fx,fz)<.01){fx=Math.sin(camera.rotation?.y||0);fz=Math.cos(camera.rotation?.y||0);}
        const length=Math.hypot(fx,fz)||1;fx/=length;fz/=length;
        p.x+=(fz*horizontal+fx*vertical)*speed;
        p.y+=(-fx*horizontal+fz*vertical)*speed;
    }
    else if (moveLeft) { p.x -= speed; keyActive = true; }
    else if (moveRight) { p.x += speed; keyActive = true; }

    if (!is3D && moveUp) { p.y -= speed; keyActive = true; }
    else if (!is3D && moveDown) { p.y += speed; keyActive = true; }

    if (keyActive) {
        targetPosition = null;
        mapExitTarget = null;
        isMoved = true;
    } 
    else if (targetPosition !== null) {
        let dx = targetPosition.x - p.x;
        let dy = targetPosition.y - p.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > speed) {
            let angle = Math.atan2(dy, dx);
            p.x += Math.cos(angle) * speed;
            p.y += Math.sin(angle) * speed;
            isMoved = true;
        } else {
            p.x = targetPosition.x;
            p.y = targetPosition.y;
            targetPosition = null;
            isMoved = true;
        }
    }

    p.x = Phaser.Math.Clamp(p.x, 15, 785);
    p.y = Phaser.Math.Clamp(p.y, 15, 585);

    const blocked=(x,y)=>isBlockedPosition(x,y)
        ||(currentMapId==='fountain'&&FountainPhysics.blockedPath(previousX,previousY,x,y))
        ||(Map3DLayouts.get(currentMapId)&&Map3DLayouts.blockedPath(currentMapId,previousX,previousY,x,y));
    if (blocked(p.x,p.y)) {
        if(!blocked(p.x,previousY))p.y=previousY;
        else if(!blocked(previousX,p.y))p.x=previousX;
        else {p.x=previousX;p.y=previousY;}
        targetPosition = null;
        isMoved = p.x!==previousX||p.y!==previousY;
    }

    isMoved=Math.hypot(p.x-previousX,p.y-previousY)>.0001;
    if ((isMoved && time-lastMovementSentAt>=50) || (!isMoved&&movementWasActive)) {
        socket.emit('playerMovement', { x: p.x, y: p.y });
        lastMovementSentAt=time;
    }
    movementWasActive=isMoved;
    if(is3D) {
        babylonFountain.localMoving=isMoved;
        const exit=babylonFountain.exit;
        if(exit&&!babylonFountain.exitPending&&Math.hypot(p.x-exit.x,p.y-exit.y)<=(Map3DLayouts.get(currentMapId)?.exitRadius||24)) {
            // Socket order guarantees the server receives the final threshold position first.
            socket.emit('playerMovement',{x:p.x,y:p.y});lastMovementSentAt=time;
            babylonFountain.exitPending=true;socket.emit('returnToCampus');
        }
    }
    if (mapExitTarget && currentMapId !== 'campus') {
        const exitDistance = Phaser.Math.Distance.Between(p.x, p.y, mapExitTarget.x, mapExitTarget.y);
        if (exitDistance <= 42) {
            mapExitTarget = null;
            targetPosition = null;
            socket.emit('returnToCampus');
        }
    }
    updateInteractionZone(p);
}
