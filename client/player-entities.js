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
    container.add(textLabel);
    container.textLabel = textLabel;

    // 2. Tạo vòng tròn chỉ có viền nét stroke (không tô đặc màu nền)
    const borderRing = scene.add.circle(0, 0, radius);
    borderRing.setStrokeStyle(2, borderColor);
    container.add(borderRing);
    container.borderRing = borderRing;

    container.playerId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
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
}

function updatePlayerName(player, nickname, id) {
    if (!player.textLabel) return;
    player.playerNickname = nickname || '';
    const shortId = id.substring(0, 4);
    player.textLabel.setText(nickname || (id === socket.id ? 'Bạn' : `Khách (${shortId})`));
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
        player.avatarSprite = scene.add.image(0, 0, textureKey).setDisplaySize(player.playerRadius * 2, player.playerRadius * 2);
        player.addAt(player.avatarSprite, 1);
        if (player.textLabel) player.bringToTop(player.textLabel);
    };
    img.onerror = () => console.warn('Không thể đọc ảnh avatar.');
    img.src = base64Str;
}

function updatePlayerAvatar(scene, container, base64Str) {
    setAvatarFromBase64(scene, container, base64Str);
}
