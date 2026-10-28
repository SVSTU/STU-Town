console.log("GAME STARTING...");

const serverUrl = ['localhost', '127.0.0.1'].includes(location.hostname)
    ? `${location.protocol}//${location.hostname}:3000`
    : "https://stu-town-server.onrender.com";
const socket = io(serverUrl, { autoConnect: false });
const PROFILE_STORAGE_KEY = 'stu-town-profile';
const REACTION_EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '🔥'];
let profile = loadProfile();

let players = {};
let privateConversations = new Map();
let privateUnreadByPeer = new Map();
let activePrivatePeerId = '';
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

function preload() { this.load.image('avatar-default-source', 'stu.png'); }

function create() {
    sceneRef = this;
    createCircularTexture(sceneRef, 'avatar-default', sceneRef.textures.get('avatar-default-source').getSourceImage());
    console.log("SCENE CREATED SUCCESSFULLY!");

    cursors = sceneRef.input.keyboard.createCursorKeys();

    ['chat-input', 'private-chat-input'].forEach((id) => {
        const input = document.getElementById(id);
        input.addEventListener('focus', () => { sceneRef.input.keyboard.enabled = false; });
        input.addEventListener('blur', () => { sceneRef.input.keyboard.enabled = true; });
        input.addEventListener('keydown', (event) => event.stopPropagation());
    });

    sceneRef.input.on('pointerdown', (pointer) => {
        targetPosition = { x: pointer.x, y: pointer.y };
    });

    socket.on('connect', () => {
        console.log("Connected to server, my socket ID:", socket.id);
        socket.emit('updateProfile', profile);
    });

    socket.on('currentPlayers', (serverPlayers) => {
        Object.keys(serverPlayers).forEach((id) => {
            if (!players[id]) {
                createPlayer(sceneRef, serverPlayers[id], id);
            }
        });
        updatePrivateRecipientList();
    });

    socket.on('newPlayer', (playerInfo) => {
        if (!players[playerInfo.id]) {
            createPlayer(sceneRef, playerInfo, playerInfo.id);
        }
        updatePrivateRecipientList();
    });

    socket.on('playerMoved', (playerInfo) => {
        if (players[playerInfo.id] && playerInfo.id !== socket.id) {
            const p = players[playerInfo.id];
            p.x = playerInfo.x;
            p.y = playerInfo.y;
        }
    });

    socket.on('playerProfileUpdated', (data) => {
        const player = players[data.id];
        if (!player) return;
        updatePlayerName(player, data.nickname, data.id);
        if (data.avatar) updatePlayerAvatar(sceneRef, player, data.avatar);
        updatePrivateRecipientList();
    });

    socket.on('playerDisconnected', (id) => {
        if (players[id]) {
            players[id].destroy();
            delete players[id];
        }
        updatePrivateRecipientList();
        if (activePrivatePeerId === id) {
            activePrivatePeerId = '';
            document.getElementById('private-recipient').value = '';
            document.getElementById('private-status').textContent = 'Người chơi đã thoát phiên.';
            document.getElementById('private-conversation-title').textContent = 'Người nhận đã thoát phiên';
            renderPrivateMessages();
        }
    });

    socket.on('chatMessage', (data) => {
        const isMe = (data.id === socket.id);
        const shortId = data.id.substring(0, 4);
        const senderName = isMe ? (profile.nickname || 'Bạn') : (data.nickname || `Khách (${shortId})`);

        const now = new Date();
        const timeString = now.toTimeString().split(' ')[0];
        
        const chatMessages = document.getElementById('chat-messages');
        const line = document.createElement('div');
        line.className = 'chat-line';
        const time = document.createElement('span');
        time.className = 'chat-time';
        time.textContent = `[${timeString}] `;
        const sender = document.createElement('b');
        sender.textContent = `${senderName}: `;
        const messageText = document.createElement('span');
        messageText.textContent = String(data.message).slice(0, 300);
        line.dataset.messageId = data.messageId || '';
        const content = document.createElement('div');
        content.className = 'chat-message-content';
        content.append(sender, messageText);
        const reactions = document.createElement('div');
        reactions.className = 'chat-reactions';
        const addReaction = document.createElement('button');
        addReaction.type = 'button';
        addReaction.className = 'reaction-add';
        addReaction.setAttribute('aria-label', 'Chọn reaction');
        addReaction.textContent = '+';
        const reactionPicker = document.createElement('div');
        reactionPicker.className = 'reaction-picker';
        REACTION_EMOJIS.forEach((emoji) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'reaction-choice';
            button.dataset.emoji = emoji;
            button.setAttribute('aria-label', `Chọn reaction ${emoji}`);
            button.textContent = emoji;
            reactionPicker.appendChild(button);
        });
        reactions.append(addReaction, reactionPicker);
        line.append(time, content, reactions);
        chatMessages.appendChild(line);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        if (players[data.id]) {
            showChatBubble(sceneRef, players[data.id], data.message);
        }
    });

    socket.on('privateChatMessage', (data) => {
        const peerId = data.peerId;
        if (!privateConversations.has(peerId)) privateConversations.set(peerId, []);
        privateConversations.get(peerId).push(data);
        if (data.id !== socket.id && activePrivatePeerId !== peerId) {
            privateUnreadByPeer.set(peerId, (privateUnreadByPeer.get(peerId) || 0) + 1);
            updatePrivateUnreadBadge();
        }
        if (activePrivatePeerId === peerId) renderPrivateMessages();
        if (players[data.id]) showChatBubble(sceneRef, players[data.id], data.message);
    });

    socket.on('privateMessageError', (message) => {
        document.getElementById('private-status').textContent = message;
    });

    socket.on('chatReaction', (data) => {
        const line = [...document.querySelectorAll('.chat-line')]
            .find((item) => item.dataset.messageId === data.messageId);
        if (!line) return;
        const reactions = line.querySelector('.chat-reactions');
        let button = reactions.querySelector(`.reaction-button[data-emoji="${CSS.escape(data.emoji)}"]`);
        if (!data.count) {
            button?.remove();
            return;
        }
        if (!button) {
            button = document.createElement('button');
            button.type = 'button';
            button.className = 'reaction-button';
            button.dataset.emoji = data.emoji;
            button.setAttribute('aria-label', `Reaction ${data.emoji}`);
            reactions.insertBefore(button, reactions.querySelector('.reaction-add'));
        }
        button.classList.toggle('is-active', data.reactedBy.includes(socket.id));
        button.textContent = `${data.emoji} ${data.count}`;
        line.querySelector('.reaction-picker').classList.remove('is-open');
    });

    document.getElementById('chat-messages').addEventListener('click', (event) => {
        const addButton = event.target.closest('.reaction-add');
        const line = event.target.closest('.chat-line');
        if (addButton && line) {
            line.querySelector('.reaction-picker').classList.toggle('is-open');
            return;
        }
        const button = event.target.closest('.reaction-choice, .reaction-button');
        if (button && line?.dataset.messageId) {
            socket.emit('reactToMessage', { messageId: line.dataset.messageId, emoji: button.dataset.emoji });
        }
    });

    document.getElementById('chat-toggle').addEventListener('click', toggleChat);
    document.getElementById('settings-toggle').addEventListener('click', toggleSettings);
    document.getElementById('group-mode-button').addEventListener('click', () => setChatMode('group'));
    document.getElementById('private-mode-button').addEventListener('click', () => setChatMode('private'));
    document.getElementById('private-recipient').addEventListener('change', (event) => {
        activePrivatePeerId = event.target.value;
        privateUnreadByPeer.delete(activePrivatePeerId);
        updatePrivateUnreadBadge();
        document.getElementById('private-status').textContent = activePrivatePeerId
            ? `Đang chat riêng với ${players[activePrivatePeerId]?.playerNickname || 'người chơi'}.`
            : 'Chọn một người chơi để bắt đầu chat riêng.';
        document.getElementById('private-conversation-title').textContent = activePrivatePeerId
            ? `🔒 Chat riêng · ${players[activePrivatePeerId]?.playerNickname || 'Người chơi'} (${activePrivatePeerId.substring(0, 4)})`
            : 'Chưa chọn người nhận';
        renderPrivateMessages();
    });
    document.getElementById('emoji-toggle').addEventListener('click', () => {
        document.getElementById('emoji-picker').classList.toggle('is-open');
    });
    document.getElementById('emoji-picker').addEventListener('click', (event) => {
        const button = event.target.closest('[data-emoji]');
        if (!button) return;
        const input = document.getElementById('chat-input');
        input.value += button.dataset.emoji;
        input.focus();
    });
    document.getElementById('nickname-input').value = profile.nickname;

    // Đăng ký toàn bộ listener trước khi kết nối để không bỏ lỡ currentPlayers.
    socket.connect();
}

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

function loadProfile() {
    try {
        const stored = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || '{}');
        return {
            nickname: typeof stored.nickname === 'string' ? stored.nickname.slice(0, 24) : '',
            avatar: typeof stored.avatar === 'string' && stored.avatar.startsWith('data:image/') ? stored.avatar : null
        };
    } catch {
        return { nickname: '', avatar: null };
    }
}

function compressAvatar(image, maxBytes = 180 * 1024) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const webpSupported = canvas.toDataURL('image/webp').startsWith('data:image/webp;');
    const mimeType = webpSupported ? 'image/webp' : 'image/jpeg';
    const sourceSide = Math.min(image.width, image.height);
    const sourceX = (image.width - sourceSide) / 2;
    const sourceY = (image.height - sourceSide) / 2;

    for (const size of [256, 192, 128, 96]) {
        canvas.width = size;
        canvas.height = size;
        if (!webpSupported) {
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, size, size);
        }
        context.drawImage(image, sourceX, sourceY, sourceSide, sourceSide, 0, 0, size, size);
        for (const quality of [0.82, 0.68, 0.54]) {
            const dataUrl = canvas.toDataURL(mimeType, quality);
            const payload = dataUrl.slice(dataUrl.indexOf(',') + 1);
            const byteSize = Math.ceil(payload.length * 3 / 4);
            if (byteSize <= maxBytes) return dataUrl;
        }
    }

    throw new Error('Không thể nén ảnh avatar xuống dung lượng cho phép.');
}

function saveProfile(event) {
    event.preventDefault();
    const fileInput = document.getElementById('avatar-input');
    const file = fileInput.files[0];
    const nicknameInput = document.getElementById('nickname-input');
    profile.nickname = nicknameInput.value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 24);

    const applyProfile = () => {
        nicknameInput.value = profile.nickname;
        try {
            localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
        } catch {
            alert('Không đủ bộ nhớ trình duyệt để lưu avatar. Hãy chọn ảnh nhỏ hơn.');
        }
        if (socket.connected) socket.emit('updateProfile', profile);
        const player = players[socket.id];
        if (player) {
            updatePlayerName(player, profile.nickname, socket.id);
            if (profile.avatar) updatePlayerAvatar(sceneRef, player, profile.avatar);
        }
        setSettingsOpen(false);
        console.log('Đã lưu hồ sơ cá nhân.');
    };

    if (!file) {
        applyProfile();
        return;
    }

    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type) || file.size > 15 * 1024 * 1024) {
        alert('Chọn ảnh PNG, JPEG, WebP hoặc GIF tối đa 15 MB.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64String = e.target.result;
        const image = new Image();
        image.onload = function() {
            if (image.width > 8192 || image.height > 8192) {
                alert('Kích thước ảnh tối đa là 8192 × 8192.');
                return;
            }
            try {
                profile.avatar = compressAvatar(image);
                applyProfile();
                fileInput.value = '';
            } catch (error) {
                alert(error.message);
            }
        };
        image.onerror = () => alert('Tệp ảnh không hợp lệ.');
        image.src = base64String;
    };
    reader.readAsDataURL(file);
}

function toggleChat() {
    const container = document.getElementById('chat-container');
    const toggle = document.getElementById('chat-toggle');
    const collapsed = container.classList.toggle('is-collapsed');
    toggle.textContent = collapsed ? '+' : '−';
    toggle.setAttribute('aria-label', collapsed ? 'Mở rộng khung chat' : 'Thu nhỏ khung chat');
    toggle.setAttribute('aria-expanded', String(!collapsed));
}

function setSettingsOpen(isOpen) {
    const panel = document.getElementById('settings-panel');
    const toggle = document.getElementById('settings-toggle');
    panel.classList.toggle('is-open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Đóng cài đặt hồ sơ' : 'Mở cài đặt hồ sơ');
}

function toggleSettings() {
    const panel = document.getElementById('settings-panel');
    setSettingsOpen(!panel.classList.contains('is-open'));
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

function setChatMode(mode) {
    const isPrivate = mode === 'private';
    document.getElementById('group-chat-view').hidden = isPrivate;
    document.getElementById('private-chat-view').hidden = !isPrivate;
    document.getElementById('group-mode-button').classList.toggle('is-active', !isPrivate);
    document.getElementById('private-mode-button').classList.toggle('is-active', isPrivate);
    document.getElementById('group-mode-button').setAttribute('aria-selected', String(!isPrivate));
    document.getElementById('private-mode-button').setAttribute('aria-selected', String(isPrivate));
    if (isPrivate) updatePrivateRecipientList();
}

function updatePrivateRecipientList() {
    const select = document.getElementById('private-recipient');
    if (!select) return;
    const previousValue = activePrivatePeerId;
    select.replaceChildren(new Option('Chọn người chơi đang online', ''));
    Object.entries(players).forEach(([id, player]) => {
        if (id === socket.id) return;
        const shortId = id.substring(0, 4);
        const label = player.playerNickname ? `${player.playerNickname} (${shortId})` : `Khách (${shortId})`;
        select.add(new Option(label, id));
    });
    activePrivatePeerId = players[previousValue] ? previousValue : '';
    select.value = activePrivatePeerId;
    if (!activePrivatePeerId) {
        document.getElementById('private-status').textContent = select.options.length > 1
            ? 'Chọn một người chơi để bắt đầu chat riêng.'
            : 'Chưa có người chơi khác trong phiên.';
    }
}

function updatePrivateUnreadBadge() {
    const badge = document.getElementById('private-unread');
    const unread = [...privateUnreadByPeer.values()].reduce((total, count) => total + count, 0);
    badge.hidden = unread === 0;
    badge.textContent = unread ? String(unread) : '';
}

function renderPrivateMessages() {
    const container = document.getElementById('private-messages');
    if (!container) return;
    container.replaceChildren();
    const messages = privateConversations.get(activePrivatePeerId) || [];
    messages.forEach((data) => {
        const line = document.createElement('div');
        const isMine = data.id === socket.id;
        line.className = `private-message ${isMine ? 'is-mine' : 'is-theirs'}`;
        const sender = document.createElement('b');
        sender.className = 'private-message-sender';
        sender.textContent = isMine ? 'Bạn' : `Từ ${data.nickname || 'Người chơi'} (${data.id.substring(0, 4)})`;
        const body = document.createElement('span');
        body.className = 'private-message-body';
        body.textContent = String(data.message).slice(0, 300);
        const time = document.createElement('time');
        time.className = 'private-message-time';
        const sentAt = new Date(data.sentAt);
        const validSentAt = Number.isNaN(sentAt.getTime()) ? new Date() : sentAt;
        time.dateTime = validSentAt.toISOString();
        time.textContent = validSentAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        line.append(sender, body, time);
        container.appendChild(line);
    });
    container.scrollTop = container.scrollHeight;
}

function sendPrivateMessage(event) {
    event.preventDefault();
    const input = document.getElementById('private-chat-input');
    const message = input.value.trim();
    if (!activePrivatePeerId) {
        document.getElementById('private-status').textContent = 'Chọn người chơi để gửi tin nhắn riêng.';
        return;
    }
    if (message) {
        socket.emit('sendPrivateMessage', { to: activePrivatePeerId, message });
        input.value = '';
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
