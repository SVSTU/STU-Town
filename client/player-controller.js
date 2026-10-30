/* Local player movement controller and server movement synchronization. */

function update(time, delta) {
    renderEnvironmentOverlay(time, delta);
    if (!socket.id || !players[socket.id]) return;

    const p = players[socket.id];
    const previousX = p.x;
    const previousY = p.y;
    const fatigue = Number(playerStatsState.stats.fatigue) || 0;
    let speed = fatigue >= 80 ? 2.2 : fatigue >= 50 ? 3 : 4;
    if ((Number(playerStatsState.stats.hunger) || 0) <= 0) speed = Math.min(speed, 2);
    let isMoved = false;

    let keyActive = false;
    if (cursors.left.isDown) { p.x -= speed; keyActive = true; }
    else if (cursors.right.isDown) { p.x += speed; keyActive = true; }

    if (cursors.up.isDown) { p.y -= speed; keyActive = true; }
    else if (cursors.down.isDown) { p.y += speed; keyActive = true; }

    if (keyActive) {
        targetPosition = null;
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

    if (isBlockedPosition(p.x, p.y)) {
        p.x = previousX;
        p.y = previousY;
        targetPosition = null;
        isMoved = false;
    }

    if (isMoved) {
        socket.emit('playerMovement', { x: p.x, y: p.y });
    }
    updateInteractionZone(p);
}
