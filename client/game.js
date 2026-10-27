console.log("GAME STARTING...");

// 1. Kết nối Socket.io chạy độc lập ngay từ đầu, không phụ thuộc vào Phaser preload
const socket = io("https://stu-town-server.onrender.com");

let players = {};
let targetPosition = null;
let cursors;
let sceneRef = null;

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#2d2d2d',
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

function preload() {
    // Tải sẵn ảnh stu.png, nếu không tìm thấy vẫn không làm chết game
    this.load.image('default_stu', 'stu.png');
}

function create() {
    sceneRef = this;
    console.log("SCENE CREATED SUCCESSFULLY!");

    cursors = sceneRef.input.keyboard.createCursorKeys();

    const chatInput = document.getElementById('chat-input');
    chatInput.addEventListener('focus', () => {
        if (sceneRef && sceneRef.input && sceneRef.input.keyboard) {
            sceneRef.input.keyboard.enabled = false;
        }
    });
    chatInput.addEventListener('blur', () => {
        if (sceneRef && sceneRef.input && sceneRef.input.keyboard) {
            sceneRef.input.keyboard.enabled = true;
        }
    });
    chatInput.addEventListener('keydown', (e) => {
        e.stopPropagation();
    });

    sceneRef.input.on('pointerdown', (pointer) => {
        targetPosition = { x: pointer.x, y: pointer.y };
    });

    // 2. Các sự kiện Socket được lắng nghe ngay khi scene tạo xong
    socket.on('connect', () => {
        console.log("Connected to server, my socket ID:", socket.id);
    });

    socket.on('currentPlayers', (serverPlayers) => {
        Object.keys(serverPlayers).forEach((id) => {
            if (!players[id]) {
                createPlayer(sceneRef, serverPlayers[id], id);
            }
        });
    });

    socket.on('newPlayer', (playerInfo) => {
        if (!players[playerInfo.id]) {
            createPlayer(sceneRef, playerInfo, playerInfo.id);
        }
    });

    socket.on('playerMoved', (playerInfo) => {
        if (players[playerInfo.id] && playerInfo.id !== socket.id) {
            const p = players[playerInfo.id];
            p.x = playerInfo.x;
            p.y = playerInfo.y;
        }
    });

    socket.on('playerAvatarUpdated', (data) => {
        if (players[data.id]) {
            updatePlayerAvatar(sceneRef, players[data.id], data.avatar, data.id);
        }
    });

    socket.on('playerDisconnected', (id) => {
        if (players[id]) {
            players[id].destroy();
            delete players[id];
        }
    });

    socket.on('chatMessage', (data) => {
        const isMe = (data.id === socket.id);
        const shortId = data.id.substring(0, 4);
        const senderName = isMe ? "Bạn" : `Khách (${shortId})`;

        const now = new Date();
        const timeString = now.toTimeString().split(' ')[0];
        
        const chatMessages = document.getElementById('chat-messages');
        const line = document.createElement('div');
        line.className = 'chat-line';
        line.innerHTML = `<span style="color: #aaa; font-size: 11px;">[${timeString}]</span> <b>${senderName}:</b> ${data.message}`;
        chatMessages.appendChild(line);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        if (players[data.id]) {
            showChatBubble(sceneRef, players[data.id], data.message);
        }
    });
}

function createPlayer(scene, info, id) {
    if (!scene) return;
    if (players[id]) {
        players[id].destroy();
    }

    const isMe = (id === socket.id);
    const radius = isMe ? 18 : 15;
    const borderColor = isMe ? 0x00ff55 : 0xff5500; // Bạn: Viền xanh lá, Khách: Viền cam

    const container = scene.add.container(info.x, info.y);

    // 1. Nhãn tên hiển thị trên đầu
    const shortId = id.substring(0, 4);
    const labelText = isMe ? "Bạn" : `Khách (${shortId})`;
    const textLabel = scene.add.text(0, -28, labelText, {
        font: '13px Arial',
        fill: '#ffffff',
        backgroundColor: '#00000088',
        padding: { x: 4, y: 2 }
    }).setOrigin(0.5);
    container.add(textLabel);
    container.textLabel = textLabel;

    // 2. Hiển thị Avatar: Nếu có ảnh base64 thì dùng, nếu chưa có thì dùng ảnh mặc định 'default_stu' hoặc vẽ vòng tròn dự phòng nếu chưa load kịp
    if (info.avatar && info.avatar.startsWith('data:image')) {
        setAvatarFromBase64(scene, container, info.avatar, radius, borderColor);
    } else if (scene.textures.exists('default_stu')) {
        setAvatarFromTexture(scene, container, 'default_stu', radius, borderColor);
    } else {
        // Dự phòng bằng hình tròn nếu ảnh stu.png chưa tải xong
        const bgCircle = scene.add.circle(0, 0, radius, borderColor);
        container.add(bgCircle);
        container.bgCircle = bgCircle;
    }

    scene.add.existing(container);
    players[id] = container;
}

function setAvatarFromTexture(scene, container, textureKey, radius, borderColor) {
    if (container.bgCircle) {
        container.bgCircle.destroy();
    }
    if (container.avatarSprite) {
        container.avatarSprite.destroy();
    }

    const avatarSprite = scene.add.image(0, 0, textureKey);
    avatarSprite.setDisplaySize(radius * 2, radius * 2);

    const maskShape = scene.make.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.beginPath();
    maskShape.arc(0, 0, radius, 0, Math.PI * 2);
    maskShape.fillPath();

    const mask = new Phaser.Display.Masks.GeometryMask(scene, maskShape);
    avatarSprite.setMask(mask);

    container.add(avatarSprite);

    if (container.borderRing) {
        container.borderRing.destroy();
    }
    const borderRing = scene.add.circle(0, 0, radius);
    borderRing.setStrokeStyle(2, borderColor);
    container.add(borderRing);
    container.borderRing = borderRing;

    if (container.textLabel) {
        container.bringToTop(container.textLabel);
    }
    container.avatarSprite = avatarSprite;
}

function setAvatarFromBase64(scene, container, base64Str, radius, borderColor) {
    const img = new Image();
    img.src = base64Str;
    img.onload = function() {
        const textureKey = 'avatar_custom_' + Math.random();
        if (scene.textures.exists(textureKey)) {
            scene.textures.remove(textureKey);
        }
        scene.textures.addImage(textureKey, img);
        setAvatarFromTexture(scene, container, textureKey, radius, borderColor);
    };
}

function updatePlayerAvatar(scene, container, base64Str, id) {
    const isMe = (id === socket.id);
    const radius = isMe ? 18 : 15;
    const borderColor = isMe ? 0x00ff55 : 0xff5500;
    setAvatarFromBase64(scene, container, base64Str, radius, borderColor);
}

function applyAvatar() {
    const fileInput = document.getElementById('avatar-input');
    const file = fileInput.files[0];
    if (!file) {
        alert("Vui lòng chọn một tệp ảnh trước khi bấm Áp dụng!");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64String = e.target.result;

        if (sceneRef && players[socket.id]) {
            updatePlayerAvatar(sceneRef, players[socket.id], base64String, socket.id);
        }

        socket.emit('updateAvatar', base64String);
        console.log("Đã áp dụng ảnh đại diện thành công!");
    };
    reader.readAsDataURL(file);
}

function showChatBubble(scene, playerContainer, message) {
    if (!scene || !playerContainer) return;
    if (playerContainer.chatBubble) {
        playerContainer.chatBubble.destroy();
    }

    const bubble = scene.add.text(0, -50, message, {
        font: '12px Arial',
        fill: '#000',
        backgroundColor: '#ffffff',
        padding: { x: 6, y: 4 },
        align: 'center'
    }).setOrigin(0.5);

    playerContainer.chatBubble = bubble;
    playerContainer.add(bubble);
    if (playerContainer.textLabel) {
        playerContainer.bringToTop(playerContainer.textLabel);
    }

    scene.time.delayedCall(4000, () => {
        if (playerContainer.chatBubble === bubble) {
            bubble.destroy();
            playerContainer.chatBubble = null;
        }
    });
}

function sendChat(event) {
    event.preventDefault();
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (text !== "") {
        socket.emit('sendChatMessage', text);
        input.value = "";
    }
}

function update() {
    if (!socket.id || !players[socket.id]) return;

    const p = players[socket.id];
    let speed = 4;
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

    if (isMoved) {
        socket.emit('playerMovement', { x: p.x, y: p.y });
    }
}