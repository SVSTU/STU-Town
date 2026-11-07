/* Local player movement controller and server movement synchronization. */

const mobileMoveState = { up: false, down: false, left: false, right: false };

function bindMobileMovementControls() {
    const pad = document.getElementById('mobile-movement-pad');
    if (!pad || pad.dataset.bound === 'true') return;
    pad.dataset.bound = 'true';
    const stopAll = () => Object.keys(mobileMoveState).forEach((direction) => { mobileMoveState[direction] = false; });
    pad.querySelectorAll('[data-move-direction]').forEach((button) => {
        const direction = button.dataset.moveDirection;
        const start = (event) => {
            event.preventDefault();
            mobileMoveState[direction] = true;
            targetPosition = null;
            button.classList.add('is-pressed');
            try { button.setPointerCapture(event.pointerId); } catch {}
        };
        const stop = (event) => {
            if (event) event.preventDefault();
            mobileMoveState[direction] = false;
            button.classList.remove('is-pressed');
        };
        button.addEventListener('pointerdown', start);
        button.addEventListener('pointerup', stop);
        button.addEventListener('pointercancel', stop);
        button.addEventListener('lostpointercapture', stop);
        button.addEventListener('contextmenu', (event) => event.preventDefault());
    });
    window.addEventListener('blur', stopAll);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopAll(); });
}

function update(time, delta) {
    renderEnvironmentOverlay(time, delta);
    if (!socket.id || !players[socket.id]) return;

    const p = players[socket.id];
    if (currentMapId === 'fountain') targetPosition = null;
    const previousX = p.x;
    const previousY = p.y;
    const fatigue = Number(playerStatsState.stats.fatigue) || 0;
    let speed = fatigue >= 80 ? 2.2 : fatigue >= 50 ? 3 : 4;
    if ((Number(playerStatsState.stats.hunger) || 0) <= 0) speed = Math.min(speed, 2);
    let isMoved = false;

    let keyActive = false;
    const moveLeft = cursors.left.isDown || mobileMoveState.left;
    const moveRight = cursors.right.isDown || mobileMoveState.right;
    const moveUp = cursors.up.isDown || mobileMoveState.up;
    const moveDown = cursors.down.isDown || mobileMoveState.down;
    speed *= Math.min(Number(delta) || 16.667, 50) / 16.667;
    if ((moveLeft || moveRight) && (moveUp || moveDown)) speed /= Math.SQRT2;
    if (moveLeft) { p.x -= speed; keyActive = true; }
    else if (moveRight) { p.x += speed; keyActive = true; }

    if (moveUp) { p.y -= speed; keyActive = true; }
    else if (moveDown) { p.y += speed; keyActive = true; }

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

    if (isBlockedPosition(p.x, p.y) || (currentMapId === 'fountain' && FountainPhysics.blockedPath(previousX,previousY,p.x,p.y))) {
        p.x = previousX;
        p.y = previousY;
        targetPosition = null;
        isMoved = false;
    }

    if (isMoved) {
        socket.emit('playerMovement', { x: p.x, y: p.y });
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
    updateBabylonFountainPlayers?.();
}
