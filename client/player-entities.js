/* Player entity rendering: sprites, name labels, avatars. */

function createPlayer(scene, info, id) {
    if (!scene) return;
    if (players[id]) {
        players[id].destroy();
    }

    const isMe = (id === socket.id);
    const radius = isMe ? 18 : 15;
    const borderColor = isMe ? 0x00ff55 : 0xff5500; // Xanh lá cho bạn, Cam cho khách

    const container = scene.add.container(info.x, info.y);
    container.playerRadius = radius;
    container.borderColor = borderColor;
    const isPrivateBenchGuest = String(info.mapId || '').startsWith('bench-private:');
    if (isPrivateBenchGuest) {
        container.seatedShadow = scene.add.ellipse(0, 19, radius * 2.4, radius * 0.75, 0x1f3426, 0.42);
        container.seatedBody = scene.add.ellipse(0, 10, radius * 1.45, radius * 1.8, isMe ? 0x3a83b8 : 0xb76a45, 0.95);
        container.add(container.seatedShadow);
        container.addAt(container.seatedBody, 1);
    }

    // 1. Nhãn tên hiển thị trên đầu
    const shortId = id.substring(0, 4);
    const labelText = info.nickname || (isMe ? profile.nickname : '') || (isMe ? 'Bạn' : `Khách (${shortId})`);
    container.playerNickname = info.nickname || (isMe ? profile.nickname : '') || '';
    const textLabel = scene.add.text(0, -28, labelText, {
        font: '13px Arial',
        fill: '#ffffff',
        backgroundColor: '#00000088',
        padding: { x: 4, y: 2 }
    }).setOrigin(0.5);
    textLabel.setInteractive({ useHandCursor: true });
    textLabel.on('pointerdown', (pointer, localX, localY, event) => {
        event?.stopPropagation?.();
        showPlayerInfoCard(container);
    });
    container.add(textLabel);
    container.textLabel = textLabel;

    // 2. Tạo vòng tròn chỉ có viền nét stroke (không tô đặc màu nền)
    const borderRing = scene.add.circle(0, 0, radius);
    borderRing.setStrokeStyle(2, borderColor);
    container.add(borderRing);
    container.borderRing = borderRing;

    container.playerId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
    container.playerSocketId = id;
    container.playerInfo = { ...info };
    // 3. Avatar tùy chỉnh hoặc ảnh mặc định
    const avatar = info.avatar || (isMe ? profile.avatar : null);
    if (avatar && typeof avatar === 'string' && avatar.startsWith('data:image/')) {
        setAvatarFromBase64(scene, container, avatar);
    } else {
        container.avatarSprite = scene.add.image(0, 0, 'avatar-default').setDisplaySize(radius * 2, radius * 2);
        container.addAt(container.avatarSprite, 1);
    }

    scene.add.existing(container);
    players[id] = container;
    if (String(info.mapId || '') !== 'campus' && !isPrivateBenchGuest) {
        setPlayerHumanVisual(container, false);
    } else if (isPrivateBenchGuest) {
        // Không gian riêng luôn dùng hình người ngồi phong cách 3D giả lập,
        // không hiển thị avatar/vòng tròn; màu tên là dấu hiệu duy nhất.
        setPlayerSeatedVisual(container, true);
    } else if (typeof campusBenchOccupants !== 'undefined') {
        const seated = Object.values(campusBenchOccupants).some((ids) => {
            const list = Array.isArray(ids) ? ids : (ids ? [ids] : []);
            return list.includes(id);
        });
        setPlayerSeatedVisual(container, seated);
    }
}

function updatePlayerName(player, nickname, id) {
    if (!player.textLabel) return;
    player.playerNickname = nickname || '';
    if (player.playerInfo) player.playerInfo.nickname = nickname || '';
    const shortId = id.substring(0, 4);
    player.textLabel.setText(nickname || (id === socket.id ? 'Bạn' : `Khách (${shortId})`));
    if (player.isSeatedAtBench) player.textLabel.setColor(id === socket.id ? '#62ff9a' : '#ff9a4a');
    if (player.isHumanVisual) player.textLabel.setBackgroundColor(id === socket.id ? '#1c7d52' : '#9a4d2b');
}

// Hàm gán ảnh tải lên dạng Base64 vào nhân vật
function createCircularTexture(scene, textureKey, image) {
    if (!scene || !image || !image.width || !image.height) return false;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const context = canvas.getContext('2d');
    const side = Math.min(image.width, image.height);
    context.beginPath();
    context.arc(64, 64, 64, 0, Math.PI * 2);
    context.clip();
    context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 128, 128);
    if (scene.textures.exists(textureKey)) scene.textures.remove(textureKey);
    scene.textures.addCanvas(textureKey, canvas);
    return true;
}

function setAvatarFromBase64(scene, container, base64Str) {
    if (!scene || !container || typeof base64Str !== 'string' || !base64Str.startsWith('data:image/')) return;
    const textureKey = `avatar-${container.playerId}`;
    const player = container;
    const img = new Image();
    img.onload = function() {
        if (!player.scene || !createCircularTexture(scene, textureKey, img)) return;
        if (player.avatarSprite) player.avatarSprite.destroy();
        player.avatarSprite = scene.add.image(0, 0, textureKey)
            .setDisplaySize(player.playerRadius * 2, player.playerRadius * 2)
            .setVisible(!player.isSeatedAtBench && !player.isHumanVisual);
        player.addAt(player.avatarSprite, 1);
        if (player.textLabel) player.bringToTop(player.textLabel);
    };
    img.onerror = () => console.warn('Không thể đọc ảnh avatar.');
    img.src = base64Str;
}

function updatePlayerAvatar(scene, container, base64Str) {
    if (container?.playerInfo) container.playerInfo.avatar = base64Str;
    setAvatarFromBase64(scene, container, base64Str);
}

function showPlayerInfoCard(player) {
    if (!player) return;
    let card = document.getElementById('player-info-card');
    if (!card) {
        card = document.createElement('section');
        card.id = 'player-info-card';
        card.className = 'player-info-card';
        document.body.appendChild(card);
    }
    const info = player.playerInfo || {};
    const isMe = player.playerId === socket.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const stats = info.stats && typeof info.stats === 'object' ? info.stats : {};
    const avatar = typeof info.avatar === 'string' && info.avatar.startsWith('data:image/')
        ? `<img src="${escapeHtml(info.avatar)}" alt="Avatar của ${escapeHtml(player.playerNickname || 'người chơi')}">`
        : '<div class="player-info-avatar-placeholder">👤</div>';
    const fullId = String(player.playerSocketId || '');
    const shortId = fullId ? fullId.slice(0, 8) : '--------';
    card.innerHTML = `<button type="button" class="player-info-close" aria-label="Đóng thông tin">×</button>
        <div class="player-info-main">${avatar}<div><strong>${escapeHtml(player.playerNickname || (isMe ? 'Bạn' : 'Khách'))}</strong><small>${isMe ? 'Bạn' : 'Khách'} · ${escapeHtml(info.mapId || currentMapId)}</small></div></div>
        <div class="player-info-id">Mã định danh: <code title="${escapeHtml(fullId)}">${escapeHtml(shortId)}</code></div>
        <div class="player-info-stats"><span>Đói <b>${Number(stats.hunger ?? 100)}</b></span><span>Sức mạnh <b>${Number(stats.strength ?? 100)}</b></span><span>Mệt <b>${Number(stats.fatigue ?? 0)}</b></span></div>
        <div class="player-info-wallet">🪙 ${Number(info.coins || 0)} · ⭐ ${Number(info.reputation || 0)}</div>`;
    card.querySelector('.player-info-close').addEventListener('click', () => card.remove());
    card.hidden = false;
}

function setPlayerSeatedVisual(container, seated) {
    if (!container) return;
    if (container.avatarSprite) container.avatarSprite.setVisible(!seated);
    if (container.borderRing) container.borderRing.setVisible(!seated);
    if (seated && !container.seatedFigure && container.scene) {
        const figure = container.scene.add.container(0, 0);
        const bodyColor = container.playerId === socket.id.replace(/[^a-zA-Z0-9_-]/g, '_') ? 0x26a866 : 0xe67835;
        const shadow = container.scene.add.ellipse(0, 14, 25, 8, 0x18251c, 0.5);
        const torso = container.scene.add.ellipse(0, 5, 17, 22, bodyColor, 1);
        const head = container.scene.add.circle(0, -10, 8, 0xf4c7a1, 1);
        const leg = container.scene.add.rectangle(0, 17, 22, 5, 0x493322, 1).setOrigin(0.5);
        figure.add([shadow, torso, head, leg]);
        figure.setDepth(2);
        container.add(figure);
        container.seatedFigure = figure;
    }
    if (container.seatedFigure) container.seatedFigure.setVisible(seated);
    if (container.textLabel) container.textLabel.setColor(seated
        ? (container.playerId === socket.id.replace(/[^a-zA-Z0-9_-]/g, '_') ? '#62ff9a' : '#ff9a4a')
        : '#ffffff');
    container.isSeatedAtBench = Boolean(seated);
}

function setPlayerHumanVisual(container, sitting = false) {
    if (!container || !container.scene) return;
    if (container.avatarSprite) container.avatarSprite.setVisible(false);
    if (container.borderRing) container.borderRing.setVisible(false);
    if (container.seatedFigure) container.seatedFigure.setVisible(false);
    if (container.humanFigure) container.humanFigure.destroy();
    const scene = container.scene;
    const figure = scene.add.container(0, sitting ? 0 : 2);
    const isMe = container.playerId === socket.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const shirt = isMe ? 0x2aa96b : 0xd87536;
    const skin = 0xf2c39f;
    const shadow = scene.add.ellipse(0, sitting ? 17 : 22, sitting ? 25 : 22, 8, 0x16251c, 0.48);
    const legs = sitting
        ? scene.add.rectangle(0, 15, 23, 5, 0x493322, 1)
        : scene.add.rectangle(0, 17, 12, 21, 0x334b75, 1);
    const torso = scene.add.rectangle(0, sitting ? 4 : 2, 16, sitting ? 19 : 22, shirt, 1);
    const head = scene.add.circle(0, sitting ? -10 : -15, 8, skin, 1);
    const hair = scene.add.arc(0, sitting ? -13 : -18, 8, 180, 360, false, 0x3b2a22, 1);
    const armLeft = scene.add.rectangle(-11, sitting ? 3 : 1, 5, 16, shirt, 1).setAngle(sitting ? -18 : 8);
    const armRight = scene.add.rectangle(11, sitting ? 3 : 1, 5, 16, shirt, 1).setAngle(sitting ? 18 : -8);
    figure.add([shadow, legs, torso, armLeft, armRight, head, hair]);
    figure.setDepth(2);
    container.add(figure);
    container.humanFigure = figure;
    container.isHumanVisual = true;
    container.isSeatedAtBench = Boolean(sitting);
    if (container.textLabel) {
        container.textLabel.setColor('#ffffff');
        container.textLabel.setBackgroundColor(isMe ? '#1c7d52' : '#9a4d2b');
        container.bringToTop(container.textLabel);
    }
}
