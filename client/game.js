console.log("GAME STARTING...");

const serverUrl = ['localhost', '127.0.0.1'].includes(location.hostname)
    ? `${location.protocol}//${location.hostname}:3000`
    : "https://stu-town-server.onrender.com";
const socket = io(serverUrl, { autoConnect: false });
const PROFILE_STORAGE_KEY = 'stu-town-profile';
const REACTION_EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '🔥'];
const QUICK_FLOATING_EMOTES = ['👋', '❤️', '😂', '👍', '🔥', '🎉'];
const FARM_PLOT_LAYOUT = [
    { id: 'plot-1', x: 200, y: 290, width: 78, height: 42 },
    { id: 'plot-2', x: 310, y: 290, width: 78, height: 42 },
    { id: 'plot-3', x: 420, y: 290, width: 78, height: 42 },
    { id: 'plot-4', x: 530, y: 290, width: 78, height: 42 }
];
const CAMPUS_ZONES = [
    { id: 'canteen', name: 'Căng tin', detail: 'Ẩm thực, thức uống và hồi phục chỉ số.', x: 120, y: 145, radius: 74 },
    { id: 'khu-c', name: 'Khu C · Giảng đường', detail: 'Khu vực này chưa mở.', x: 355, y: 175, radius: 92, locked: true },
    { id: 'auditorium', name: 'Hội trường A · Khu B', detail: 'Khu vực này chưa mở.', x: 585, y: 155, radius: 100, locked: true },
    { id: 'khu-d', name: 'Khu D · Thang máy', detail: 'Khu vực này chưa mở.', x: 115, y: 330, radius: 95, locked: true },
    { id: 'khu-a', name: 'Khu A · Hành chính & giao dịch', detail: 'Mua hạt giống, bán nông sản và dùng trạm hồi phục.', x: 730, y: 340, radius: 54 },
    { id: 'personal-farm', name: 'Nông trại cá nhân · Khu A', detail: 'Cần đăng nhập để mở không gian nông trại cá nhân.', x: 734, y: 510, radius: 40, loginRequired: true },
    { id: 'sports', name: 'Sân thể thao', detail: 'Sân bóng và khu vận động ngoài trời.', x: 365, y: 365, radius: 116 },
    { id: 'fountain', name: 'Đài phun nước', detail: 'Điểm hẹn ở sân trung tâm.', x: 570, y: 360, radius: 52 },
    { id: 'dormitory', name: 'Ký túc xá', detail: 'Cần đăng nhập để tạo không gian nghỉ riêng (sẽ bổ sung sau).', x: 135, y: 510, radius: 76, loginRequired: true },
    { id: 'farm', name: 'Nông trại cộng đồng', detail: 'Gieo trồng và thu hoạch cùng người chơi khác.', x: 600, y: 505, radius: 112 },
    { id: 'khu-e', name: 'Khu E', detail: 'Mở 07:00–11:30 và 13:00–17:00 (giờ Việt Nam).', x: 250, y: 65, radius: 36, schedule: true },
    { id: 'khu-f', name: 'Khu F', detail: 'Mở 07:00–11:30 và 13:00–17:00 (giờ Việt Nam).', x: 250, y: 540, radius: 36, schedule: true }
];
const CAMPUS_BUILDINGS = [
    { x: 48, y: 72, width: 135, height: 110 },
    { x: 48, y: 278, width: 135, height: 105 },
    { x: 48, y: 478, width: 138, height: 70 },
    { x: 276, y: 40, width: 200, height: 52 },
    { x: 232, y: 106, width: 245, height: 112 },
    { x: 530, y: 92, width: 132, height: 120 },
    { x: 704, y: 228, width: 54, height: 220 },
    { x: 280, y: 520, width: 185, height: 43 }
];
const FARM_GROWTH_MS = 30_000;
const FARM_WILT_MS = FARM_GROWTH_MS * 10;
const CROP_INFO = {
    carrot: { icon: '🥕', name: 'Cà rốt', price: 100 },
    tomato: { icon: '🍅', name: 'Cà chua', price: 150 },
    corn: { icon: '🌽', name: 'Bắp', price: 180 },
    strawberry: { icon: '🍓', name: 'Dâu tây', price: 250 }
};
const FOOD_INFO = {
    bread: { icon: '🥖', name: 'Bánh mì', coins: 100, reputation: 20, effect: '+25 đói' },
    water: { icon: '💧', name: 'Nước suối', coins: 80, reputation: 16, effect: '-20 mệt' },
    bao: { icon: '🥟', name: 'Bánh bao', coins: 150, reputation: 30, effect: '+15 đói, +15 sức mạnh' },
    soda: { icon: '🥤', name: 'Nước ngọt', coins: 180, reputation: 36, effect: '+25 sức mạnh, -15 mệt' }
};
let profile = loadProfile();

let players = {};
let privateConversations = new Map();
let privateUnreadByPeer = new Map();
let activePrivatePeerId = '';
let farmPlots = {};
let farmGraphics = null;
let activeInteractionZoneId = '';
let currentMapId = 'campus';
let activeFarmMouseId = '';
let farmMouseMarker = null;
const systemAnnouncementQueue = [];
let systemAnnouncementActive = false;
let mapObjects = [];
let inventory = { seeds: {}, produce: {}, items: {} };
let playerStatsState = { stats: { hunger: 100, strength: 100, fatigue: 0 }, coins: 1500, reputation: 0, farmPlantCount: 0 };
let zoneServiceView = {
    screen: 'home', tradeAction: 'buy-seed', cropKey: 'carrot', quantity: 1,
    itemId: 'bread', currency: 'coins'
};
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
    drawCampusMap(sceneRef);
    createFarmPlotControls();
    renderInventory();
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
    sceneRef.input.keyboard.on('keydown-E', interactWithCurrentZone);
    window.setInterval(updateFarmPlotControls, 1000);

    socket.on('connect', () => {
        console.log("Connected to server, my socket ID:", socket.id);
        socket.emit('updateProfile', profile);
        socket.emit('getFarmState');
    });

    socket.on('farmState', (state) => {
        farmPlots = state && typeof state === 'object' ? state : {};
        updateFarmPlotControls();
    });

    socket.on('farmInteractionResult', (result) => {
        document.getElementById('interaction-feedback').textContent = result?.message || '';
    });

    socket.on('farmMouseState', (state) => {
        activeFarmMouseId = state?.active && typeof state.id === 'string' ? state.id : '';
        if (!activeFarmMouseId) {
            farmMouseMarker?.destroy();
            farmMouseMarker = null;
            return;
        }
        if (currentMapId !== 'farm' || !sceneRef || !Number.isFinite(state.x) || !Number.isFinite(state.y)) return;
        if (!farmMouseMarker) {
            farmMouseMarker = sceneRef.add.text(state.x, state.y, '🐭', {
                font: '30px Arial', color: '#fff', backgroundColor: '#56351f', padding: { x: 5, y: 2 }
            }).setOrigin(0.5).setDepth(10);
        } else farmMouseMarker.setPosition(state.x, state.y);
    });

    socket.on('farmMouseBite', (event) => {
        document.getElementById('interaction-feedback').textContent = String(event?.message || '🐭 Chuột vừa cắn túi tiền của bạn.');
    });

    socket.on('systemChatMessage', queueSystemAnnouncement);

    socket.on('inventoryState', (state) => {
        inventory = normalizeInventory(state);
        renderInventory();
    });

    socket.on('playerState', updatePlayerStats);

    socket.on('serviceResult', (result) => {
        document.getElementById('zone-service-feedback').textContent = String(result?.message || '');
        if (result?.state) updatePlayerStats(result.state);
        if (result?.inventory) {
            inventory = normalizeInventory(result.inventory);
            renderInventory();
            updateFarmPlotControls();
            renderZoneServices(currentMapId);
        }
    });

    socket.on('mapChangeDenied', (message) => {
        document.getElementById('interaction-feedback').textContent = String(message || 'Không thể vào khu vực này.');
    });

    socket.on('mapChanged', ({ mapId, players: mapPlayers }) => {
        currentMapId = mapId || 'campus';
        Object.values(players).forEach((player) => player.destroy());
        players = {};
        targetPosition = null;
        activeInteractionZoneId = '';
        switchMapVisuals(currentMapId);
        Object.entries(mapPlayers || {}).forEach(([id, info]) => createPlayer(sceneRef, info, id));
        updatePrivateRecipientList();
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

    socket.on('playerLeftMap', (id) => {
        if (players[id]) {
            players[id].destroy();
            delete players[id];
        }
        updatePrivateRecipientList();
        if (activePrivatePeerId === id) {
            activePrivatePeerId = '';
            document.getElementById('private-recipient').value = '';
            document.getElementById('private-status').textContent = 'Người chơi đang ở bản đồ khác.';
            document.getElementById('private-conversation-title').textContent = 'Người nhận đang ở khu vực khác';
            renderPrivateMessages();
        }
    });

    socket.on('playerFloatingEmote', (data) => {
        if (!data || !QUICK_FLOATING_EMOTES.includes(data.emoji)) return;
        const player = players[data.id];
        if (player) showFloatingEmote(sceneRef, player, data.emoji);
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
        if (!Array.isArray(data.reactions)) data.reactions = [];
        if (!privateConversations.has(peerId)) privateConversations.set(peerId, []);
        privateConversations.get(peerId).push(data);
        const isViewingConversation = !document.getElementById('private-chat-view').hidden
            && activePrivatePeerId === peerId;
        if (data.id !== socket.id && !isViewingConversation) {
            privateUnreadByPeer.set(peerId, (privateUnreadByPeer.get(peerId) || 0) + 1);
            updatePrivateUnreadBadge();
            updatePrivateRecipientList();
        }
        if (activePrivatePeerId === peerId) renderPrivateMessages();
        if (players[data.id]) showChatBubble(sceneRef, players[data.id], data.message, true);
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

    socket.on('privateChatReaction', (data) => {
        let conversationPeerId = '';
        let targetMessage = null;
        for (const [peerId, messages] of privateConversations) {
            targetMessage = messages.find((message) => message.messageId === data.messageId);
            if (targetMessage) {
                conversationPeerId = peerId;
                break;
            }
        }
        if (!targetMessage) return;

        if (!Array.isArray(targetMessage.reactions)) targetMessage.reactions = [];
        const reactionIndex = targetMessage.reactions.findIndex((reaction) => reaction.emoji === data.emoji);
        if (!data.count) {
            if (reactionIndex !== -1) targetMessage.reactions.splice(reactionIndex, 1);
        } else {
            const reaction = {
                emoji: data.emoji,
                count: data.count,
                reactedBy: Array.isArray(data.reactedBy) ? data.reactedBy : []
            };
            if (reactionIndex === -1) targetMessage.reactions.push(reaction);
            else targetMessage.reactions[reactionIndex] = reaction;
        }
        if (activePrivatePeerId === conversationPeerId) renderPrivateMessages();
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

    document.getElementById('private-messages').addEventListener('click', (event) => {
        const addButton = event.target.closest('.reaction-add');
        const line = event.target.closest('.private-message');
        if (addButton && line) {
            line.querySelector('.reaction-picker').classList.toggle('is-open');
            return;
        }
        const button = event.target.closest('.reaction-choice, .reaction-button');
        if (button && line?.dataset.messageId) {
            socket.emit('reactToPrivateMessage', {
                messageId: line.dataset.messageId,
                emoji: button.dataset.emoji
            });
        }
    });

    document.getElementById('quick-emotes').addEventListener('click', (event) => {
        const button = event.target.closest('[data-player-emote]');
        if (!button || !socket.connected) return;
        socket.emit('sendPlayerEmote', button.dataset.playerEmote);
    });

    document.getElementById('interaction-button').addEventListener('click', interactWithCurrentZone);
    document.getElementById('map-exit').addEventListener('click', () => socket.emit('returnToCampus'));
    document.querySelectorAll('[data-collapse-panel]').forEach((button) => {
        button.addEventListener('click', () => {
            const panel = document.getElementById(button.dataset.collapsePanel);
            if (!panel) return;
            const collapsed = panel.classList.toggle('is-collapsed');
            button.setAttribute('aria-expanded', String(!collapsed));
            const panelName = button.getAttribute('aria-label').replace(/^(Thu gọn|Mở rộng) /, '');
            button.setAttribute('aria-label', `${collapsed ? 'Mở rộng' : 'Thu gọn'} ${panelName}`);
            button.textContent = collapsed ? '+' : '−';
        });
    });
    document.getElementById('farm-plot-list').addEventListener('click', (event) => {
        const button = event.target.closest('[data-farm-plot]');
        if (!button || !socket.connected || currentMapId !== 'farm') return;
        socket.emit('interactFarmPlot', {
            plotId: button.dataset.farmPlot,
            action: button.dataset.action,
            cropKey: document.getElementById('farm-seed-type').value
        });
    });
    document.getElementById('farm-seed-type').addEventListener('change', updateFarmPlotControls);
    document.getElementById('zone-service-content').addEventListener('click', (event) => {
        const button = event.target.closest('[data-service-action]');
        if (!button) return;
        const action = button.dataset.serviceAction;
        if (action === 'open-trade') {
            zoneServiceView = { ...zoneServiceView, screen: 'trade', tradeAction: button.dataset.tradeAction, quantity: 1 };
            renderZoneServices(currentMapId);
        } else if (action === 'open-heal') {
            zoneServiceView.screen = 'recovery';
            renderZoneServices(currentMapId);
        } else if (action === 'service-back') {
            zoneServiceView.screen = 'home';
            renderZoneServices(currentMapId);
        } else if (action === 'submit-trade') {
            syncTradeDraftFromForm();
            if (!socket.connected) return;
            socket.emit('farmShopAction', {
                action: zoneServiceView.tradeAction,
                cropKey: zoneServiceView.cropKey,
                quantity: zoneServiceView.quantity
            });
        } else if (action === 'confirm-heal') {
            if (!socket.connected) return;
            socket.emit('useRecoveryStation');
            zoneServiceView.screen = 'home';
            renderZoneServices(currentMapId);
        } else if (action === 'open-food-order') {
            zoneServiceView.screen = 'food-order';
            zoneServiceView.quantity = 1;
            renderZoneServices(currentMapId);
        } else if (action === 'submit-food-order') {
            syncFoodDraftFromForm();
            if (!socket.connected) return;
            socket.emit('canteenPurchase', {
                itemId: zoneServiceView.itemId,
                currency: zoneServiceView.currency,
                quantity: zoneServiceView.quantity
            });
        }
    });
    document.getElementById('zone-service-content').addEventListener('input', (event) => {
        if (event.target.id === 'trade-quantity') {
            syncTradeDraftFromForm();
            event.target.value = String(zoneServiceView.quantity);
            updateTradeSummary();
        }
        if (event.target.id === 'food-quantity') {
            syncFoodDraftFromForm();
            event.target.value = String(zoneServiceView.quantity);
            updateFoodSummary();
        }
    });
    document.getElementById('zone-service-content').addEventListener('change', (event) => {
        if (event.target.id === 'trade-crop') {
            zoneServiceView.cropKey = event.target.value;
            zoneServiceView.quantity = 1;
            renderZoneServices(currentMapId);
        }
        if (event.target.id === 'food-item') {
            zoneServiceView.itemId = event.target.value;
            updateFoodSummary();
        }
        if (event.target.id === 'food-currency') {
            zoneServiceView.currency = event.target.value;
            updateFoodSummary();
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
        updatePrivateRecipientList();
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

function drawCampusMap(scene) {
    const firstMapChild = scene.children.list.length;
    const map = scene.add.graphics().setDepth(-10);
    map.fillStyle(0x6f9d5a, 1).fillRect(0, 0, 800, 600);
    map.fillStyle(0xd8cfb6, 1).fillRoundedRect(18, 18, 764, 564, 20);
    map.fillStyle(0x82ad65, 1).fillRoundedRect(30, 30, 740, 540, 15);

    // Lối đi chính và sân trung tâm theo bố cục sơ đồ trường.
    map.fillStyle(0xe5dcc7, 1);
    map.fillRect(30, 238, 740, 24);
    map.fillRect(196, 30, 24, 540);
    map.fillRect(495, 30, 22, 540);
    map.fillRect(30, 446, 740, 22);
    map.fillRect(240, 30, 22, 185);
    map.fillRect(680, 30, 22, 540);

    const drawBuilding = (x, y, width, height, label, color) => {
        map.fillStyle(0xc5b99b, 1).fillRoundedRect(x - 4, y - 4, width + 8, height + 8, 7);
        map.fillStyle(color, 1).fillRoundedRect(x, y, width, height, 5);
        map.lineStyle(2, 0xffffff, 0.8).strokeRoundedRect(x, y, width, height, 5);
        scene.add.text(x + width / 2, y + height / 2, label, {
            font: 'bold 14px Arial',
            color: '#35402d',
            align: 'center',
            wordWrap: { width: width - 14 },
            backgroundColor: '#ffffff88',
            padding: { x: 5, y: 3 }
        }).setOrigin(0.5).setDepth(-9);
    };

    drawBuilding(48, 72, 135, 110, 'CĂNG TIN', 0xdac49a);
    drawBuilding(48, 278, 135, 105, 'KHU D\nTHANG MÁY', 0xd7b18a);
    drawBuilding(48, 478, 138, 70, 'KÝ TÚC XÁ', 0x9eb8ca);
    drawBuilding(276, 40, 200, 52, 'KHU E', 0xb9c5d2);
    drawBuilding(232, 106, 245, 112, 'KHU C\nGIẢNG ĐƯỜNG', 0xdba7a8);
    drawBuilding(530, 92, 132, 120, 'HỘI TRƯỜNG A\nKHU B', 0xe2d1aa);
    drawBuilding(704, 228, 54, 220, 'KHU A', 0x91adcc);
    drawBuilding(280, 520, 185, 43, 'KHU F', 0xb7c3d2);

    // Sân thể thao và đài phun nước ở khoảng sân giữa các khu.
    map.fillStyle(0x5f9a61, 1).fillRoundedRect(238, 278, 244, 153, 8);
    map.lineStyle(2, 0xd5e6c2, 0.85).strokeRoundedRect(250, 288, 220, 132, 3);
    map.lineBetween(360, 289, 360, 419);
    map.strokeCircle(360, 354, 22);
    map.strokeRect(250, 324, 32, 60);
    map.strokeRect(438, 324, 32, 60);
    scene.add.text(360, 404, 'SÂN THỂ THAO', {
        font: 'bold 12px Arial', color: '#fff', backgroundColor: '#37663d', padding: { x: 4, y: 2 }
    }).setOrigin(0.5).setDepth(-9);

    map.fillStyle(0xe4e7df, 1).fillCircle(570, 350, 35);
    map.fillStyle(0x3299b5, 1).fillCircle(570, 350, 26);
    map.fillStyle(0xb9f3ff, 1).fillCircle(570, 350, 12);

    // Vườn cộng đồng nằm cạnh trục đường phía nam.
    map.fillStyle(0x60964d, 1).fillRoundedRect(520, 462, 168, 88, 10);
    map.lineStyle(2, 0xc9e6a8, 0.9).strokeRoundedRect(520, 462, 168, 88, 10);
    scene.add.text(604, 472, 'VƯỜN CỘNG ĐỒNG', {
        font: 'bold 11px Arial', color: '#fff', backgroundColor: '#355b36', padding: { x: 4, y: 2 }
    }).setOrigin(0.5).setDepth(-9);
    // Cổng Khu A dẫn tới khu nông trại cá nhân (đang khóa chờ đăng nhập).
    map.fillStyle(0x496c45, 1).fillRoundedRect(696, 456, 76, 96, 8);
    map.lineStyle(2, 0xc9e6a8, 0.9).strokeRoundedRect(696, 456, 76, 96, 8);
    scene.add.text(734, 493, '🔒\nNÔNG TRẠI\nCÁ NHÂN', {
        font: 'bold 11px Arial', color: '#fff', backgroundColor: '#355b36', padding: { x: 4, y: 2 }
    }).setOrigin(0.5).setDepth(-9);

    // Cây xanh viền sân trường.
    [[54, 45], [120, 48], [740, 52], [750, 500], [225, 490], [188, 420], [728, 195]].forEach(([x, y]) => {
        map.fillStyle(0x477b48, 1).fillCircle(x, y, 13);
        map.fillStyle(0x78b35d, 1).fillCircle(x - 3, y - 4, 9);
    });

    farmGraphics = scene.add.graphics().setDepth(-8);
    mapObjects = scene.children.list.slice(firstMapChild);
}

function drawInteriorMap(scene, mapId) {
    const firstMapChild = scene.children.list.length;
    const labels = {
        sports: ['Sân thể thao', 'Sân bóng và khu vực vận động'],
        fountain: ['Đài phun nước', 'Quảng trường và điểm hẹn'],
        farm: ['Nông trại cộng đồng', 'Bốn luống dùng chung · túi đồ riêng cho từng người'],
        'khu-a': ['Khu A · Hành chính & giao dịch', 'Thương nhân · Giáo sư · Trạm hồi phục'],
        canteen: ['Căn tin · Ẩm thực', 'Mua món ăn bằng tiền đồng hoặc danh tiếng'],
        'khu-e': ['Khu E', 'Bản đồ khu vực E'],
        'khu-f': ['Khu F', 'Bản đồ khu vực F']
    }[mapId] || ['Khu vực', ''];
    const g = scene.add.graphics().setDepth(-10);
    g.fillStyle(0x29402d, 1).fillRect(0, 0, 800, 600);
    g.fillStyle(0x6f9d5a, 1).fillRoundedRect(28, 28, 744, 544, 20);
    g.fillStyle(0xd8cfb6, 1).fillRoundedRect(52, 52, 696, 496, 18);
    g.fillStyle(mapId === 'farm' ? 0x7eaa68 : 0x82ad65, 1).fillRoundedRect(68, 68, 664, 464, 14);
    if (mapId === 'farm') {
        g.fillStyle(0x5c864c, 1).fillRoundedRect(120, 220, 560, 180, 16);
        FARM_PLOT_LAYOUT.forEach((plot, index) => {
            g.fillStyle(0xc9b778, 1).fillRoundedRect(plot.x - 8, plot.y - 12, plot.width + 16, plot.height + 24, 6);
            scene.add.text(plot.x + plot.width / 2, plot.y - 18, `LUỐNG ${index + 1}`, {
                font: 'bold 11px Arial', color: '#fff', backgroundColor: '#355b36', padding: { x: 4, y: 2 }
            }).setOrigin(0.5).setDepth(-9);
        });
    } else {
        g.fillStyle(0x5f9a61, 1).fillRoundedRect(180, 160, 440, 280, 12);
        g.lineStyle(3, 0xd5e6c2, 0.8).strokeRoundedRect(196, 176, 408, 248, 8);
        if (mapId === 'sports') {
            g.lineBetween(400, 178, 400, 422).strokeCircle(400, 300, 42);
            g.strokeRect(196, 245, 56, 110).strokeRect(548, 245, 56, 110);
        } else if (mapId === 'fountain') {
            g.fillStyle(0xe4e7df, 1).fillCircle(400, 300, 100);
            g.fillStyle(0x3299b5, 1).fillCircle(400, 300, 78);
            g.fillStyle(0xb9f3ff, 1).fillCircle(400, 300, 35);
        } else if (mapId === 'khu-a') {
            g.fillStyle(0xb8884d, 1).fillRoundedRect(220, 210, 160, 95, 8);
            g.fillStyle(0x8292a5, 1).fillRoundedRect(420, 210, 160, 95, 8);
            g.fillStyle(0x527448, 1).fillRoundedRect(300, 350, 200, 55, 8);
            scene.add.text(300, 250, '🧑‍🌾 THƯƠNG NHÂN', { font: 'bold 13px Arial', color: '#fff', align: 'center' }).setOrigin(0.5).setDepth(-9);
            scene.add.text(500, 250, '👨‍🏫 GIÁO SƯ', { font: 'bold 13px Arial', color: '#fff', align: 'center' }).setOrigin(0.5).setDepth(-9);
            scene.add.text(400, 378, '🩺 TRẠM HỖ TRỢ · 500 ĐỒNG', { font: 'bold 13px Arial', color: '#fff', align: 'center' }).setOrigin(0.5).setDepth(-9);
        } else if (mapId === 'canteen') {
            g.fillStyle(0xd4b67d, 1).fillRoundedRect(220, 205, 360, 75, 8);
            g.fillStyle(0x806a48, 1).fillRoundedRect(250, 340, 100, 50, 8);
            g.fillStyle(0x806a48, 1).fillRoundedRect(450, 340, 100, 50, 8);
            scene.add.text(400, 242, '🍽️ QUẦY ẨM THỰC', { font: 'bold 16px Arial', color: '#fff' }).setOrigin(0.5).setDepth(-9);
        } else {
            g.lineStyle(3, 0xc9e6a8, 0.8).strokeRoundedRect(240, 220, 320, 150, 8);
        }
    }
    scene.add.text(400, 112, labels[0].toUpperCase(), {
        font: 'bold 24px Arial', color: '#fff', backgroundColor: '#243b2d', padding: { x: 10, y: 6 }
    }).setOrigin(0.5).setDepth(-9);
    scene.add.text(400, 145, labels[1], { font: '16px Arial', color: '#243b2d' }).setOrigin(0.5).setDepth(-9);
    if (mapId === 'farm') {
        farmGraphics = scene.add.graphics().setDepth(-8);
        drawFarmPlots(scene);
    } else farmGraphics = null;
    mapObjects = scene.children.list.slice(firstMapChild);
}

function switchMapVisuals(mapId) {
    mapObjects.forEach((object) => object.destroy());
    mapObjects = [];
    farmGraphics = null;
    if (mapId === 'campus') drawCampusMap(sceneRef);
    else drawInteriorMap(sceneRef, mapId);
    document.getElementById('map-exit').hidden = mapId === 'campus';
    document.getElementById('interaction-hud').hidden = mapId !== 'farm';
    document.getElementById('farm-seed-picker').hidden = mapId !== 'farm';
    document.getElementById('farm-plot-list').hidden = mapId !== 'farm';
    if (mapId !== 'farm') {
        farmMouseMarker?.destroy();
        farmMouseMarker = null;
    }
    document.getElementById('zone-service-panel').hidden = !['khu-a', 'canteen'].includes(mapId);
    document.getElementById('zone-service-feedback').textContent = '';
    zoneServiceView = { screen: 'home', tradeAction: 'buy-seed', cropKey: 'carrot', quantity: 1, itemId: 'bread', currency: 'coins' };
    renderZoneServices(mapId);
    if (mapId === 'campus') activeInteractionZoneId = '__map-transition__';
    if (mapId === 'farm') {
        activeInteractionZoneId = 'farm';
        document.getElementById('interaction-zone-name').textContent = 'Nông trại cộng đồng';
        document.getElementById('interaction-zone-description').textContent = 'Gieo trồng và thu hoạch cùng người chơi khác.';
        document.getElementById('interaction-button').hidden = true;
        document.getElementById('farm-plot-list').hidden = false;
        updateFarmPlotControls();
        socket.emit('getFarmState');
    }
}

function createFarmPlotControls() {
    const list = document.getElementById('farm-plot-list');
    list.replaceChildren();
    FARM_PLOT_LAYOUT.forEach((plot, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.farmPlot = plot.id;
        button.textContent = `Gieo hạt · Luống ${index + 1}`;
        list.appendChild(button);
    });
}

function updateFarmPlotControls() {
    const list = document.getElementById('farm-plot-list');
    if (!list) return;
    FARM_PLOT_LAYOUT.forEach((plot, index) => {
        const button = list.querySelector(`[data-farm-plot="${plot.id}"]`);
        if (!button) return;
        const state = farmPlots[plot.id];
        if (!state?.plantedAt) {
            const cropKey = document.getElementById('farm-seed-type')?.value || 'carrot';
            button.disabled = (Number(inventory.seeds?.[cropKey]) || 0) < 1;
            button.dataset.action = 'plant';
            button.textContent = `🌱 Gieo hạt · Luống ${index + 1} (${Number(inventory.seeds?.[cropKey]) || 0})`;
            return;
        }

        const ageMs = Date.now() - state.plantedAt;
        if (ageMs >= FARM_GROWTH_MS) {
            const condition = ageMs >= FARM_WILT_MS ? 'wilted' : 'ripe';
            const yieldCount = condition === 'ripe' ? 3 : condition === 'wilted' ? 1 : 0;
            button.disabled = false;
            button.dataset.action = 'harvest';
            button.textContent = `🧺 Thu hoạch · Luống ${index + 1} (${yieldCount}) · ${condition === 'ripe' ? 'khỏe' : 'héo'}`;
        } else {
            const remainingMs = FARM_GROWTH_MS - ageMs;
            button.disabled = true;
            button.dataset.action = '';
            button.textContent = `🌿 ${state.crop || 'Cây trồng'} · ${Math.ceil(remainingMs / 1000)} giây`;
        }
    });
    if (currentMapId === 'farm') drawFarmPlots(sceneRef);
}

function renderInventory() {
    const cropKeys = Object.keys(CROP_INFO);
    renderInventorySection('inventory-seeds', cropKeys.map((key) => ({
        label: `${CROP_INFO[key].icon} ${CROP_INFO[key].name}`,
        count: inventory.seeds[key]
    })), 'Chưa có hạt giống');
    renderInventorySection('inventory-produce', cropKeys.map((key) => ({
        label: `${CROP_INFO[key].icon} ${CROP_INFO[key].name}`,
        count: inventory.produce[key]
    })), 'Chưa có nông sản');
    const itemEntries = Object.entries(inventory.items)
        .filter(([, count]) => Number(count) > 0)
        .map(([name, count]) => ({ label: name, count }));
    renderInventorySection('inventory-items', itemEntries, 'Chưa có vật phẩm');
}

function queueSystemAnnouncement(event) {
    const message = typeof event === 'string' ? event : event?.message;
    if (typeof message !== 'string' || !message.trim()) return;
    systemAnnouncementQueue.push(message.slice(0, 300));
    showNextSystemAnnouncement();
}

function showNextSystemAnnouncement() {
    if (systemAnnouncementActive || systemAnnouncementQueue.length === 0) return;
    const lane = document.getElementById('system-announcement-lane');
    const message = systemAnnouncementQueue.shift();
    const banner = document.createElement('div');
    banner.className = 'system-announcement';
    banner.textContent = `⚙ SYSTEM: ${message}`;
    systemAnnouncementActive = true;
    banner.addEventListener('animationend', () => {
        banner.remove();
        systemAnnouncementActive = false;
        showNextSystemAnnouncement();
    }, { once: true });
    lane.appendChild(banner);
}

function normalizeInventory(state) {
    const source = state && typeof state === 'object' ? state : {};
    return {
        seeds: source.seeds && typeof source.seeds === 'object' ? source.seeds : {},
        produce: source.produce && typeof source.produce === 'object' ? source.produce : {},
        items: source.items && typeof source.items === 'object' ? source.items : {}
    };
}

function renderInventorySection(id, entries, emptyMessage) {
    const container = document.getElementById(id);
    if (!container) return;
    container.replaceChildren();
    const visibleEntries = entries.filter((entry) => Number(entry.count) > 0);
    if (visibleEntries.length === 0) {
        const empty = document.createElement('small');
        empty.className = 'inventory-empty';
        empty.textContent = emptyMessage;
        container.append(empty);
        return;
    }
    visibleEntries.forEach(({ label, count }) => {
        const row = document.createElement('div');
        row.className = 'inventory-entry';
        const itemName = document.createElement('span');
        itemName.textContent = String(label);
        const itemCount = document.createElement('strong');
        itemCount.textContent = `×${Math.max(0, Number(count) || 0)}`;
        row.append(itemName, itemCount);
        container.append(row);
    });
}

function updatePlayerStats(state) {
    if (!state || typeof state !== 'object') return;
    playerStatsState = {
        ...playerStatsState,
        ...state,
        stats: { ...playerStatsState.stats, ...(state.stats || {}) }
    };
    ['hunger', 'strength', 'fatigue'].forEach((key) => {
        const value = Math.max(0, Math.min(100, Number(playerStatsState.stats[key]) || 0));
        document.getElementById(`${key}-value`).textContent = String(value);
        document.getElementById(`${key}-bar`).value = value;
    });
    document.getElementById('wallet-summary').textContent =
        `🪙 ${playerStatsState.coins} tiền đồng  ·  🟡 ${playerStatsState.goldCoins || 0} vàng  ·  ⭐ ${playerStatsState.reputation} danh tiếng`;
    if (['khu-a', 'canteen'].includes(currentMapId)) renderZoneServices(currentMapId);
}

function addServiceButton(parent, label, action, data = {}, disabled = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.dataset.serviceAction = action;
    Object.entries(data).forEach(([key, value]) => { button.dataset[key] = String(value); });
    button.disabled = disabled;
    parent.appendChild(button);
}

function renderZoneServices(mapId) {
    const panel = document.getElementById('zone-service-panel');
    const title = document.getElementById('zone-service-title');
    const content = document.getElementById('zone-service-content');
    if (!panel || !content) return;
    panel.hidden = !['khu-a', 'canteen'].includes(mapId);
    if (panel.hidden) return;
    content.replaceChildren();
    if (mapId === 'khu-a') {
        if (zoneServiceView.screen === 'trade') {
            renderTradeScreen(content, title);
            return;
        }
        if (zoneServiceView.screen === 'recovery') {
            title.textContent = 'Trạm hồi phục';
            const description = document.createElement('p');
            description.textContent = 'Gói hồi phục · 500 tiền đồng · +50 đói, +50 sức mạnh, −50 mệt.';
            content.appendChild(description);
            addServiceButton(content, '← Quay lại dịch vụ Khu A', 'service-back');
            addServiceButton(content, 'Xác nhận sử dụng', 'confirm-heal', {}, playerStatsState.coins < 500);
            return;
        }
        title.textContent = 'Khu A · Chọn dịch vụ';
        addServiceButton(content, '🛒 Mua hạt giống', 'open-trade', { tradeAction: 'buy-seed' });
        addServiceButton(content, '📦 Bán nông sản', 'open-trade', { tradeAction: 'sell-crop' });
        addServiceButton(content, '🩺 Trạm hồi phục', 'open-heal');
        const professor = document.createElement('p');
        professor.textContent = '👨‍🏫 Giáo sư · Nhiệm vụ chưa mở.';
        content.appendChild(professor);
        return;
    }
    if (zoneServiceView.screen === 'food-order') {
        renderFoodOrder(content, title);
        return;
    }
    title.textContent = 'Căn tin · Chọn dịch vụ';
    addServiceButton(content, '🍽️ Chọn món ăn / thức uống', 'open-food-order');
}

function syncTradeDraftFromForm() {
    const cropSelect = document.getElementById('trade-crop');
    const quantityInput = document.getElementById('trade-quantity');
    if (cropSelect) zoneServiceView.cropKey = cropSelect.value;
    if (quantityInput) {
        const amount = Number.parseInt(quantityInput.value, 10);
        zoneServiceView.quantity = Number.isInteger(amount) ? Math.max(1, Math.min(99, amount)) : 1;
    }
}

function updateTradeSummary() {
    const crop = CROP_INFO[zoneServiceView.cropKey];
    const quantity = zoneServiceView.quantity;
    const summary = document.getElementById('trade-summary');
    const submit = document.getElementById('trade-submit');
    if (!crop || !summary || !submit) return;
    const isBuying = zoneServiceView.tradeAction === 'buy-seed';
    const total = crop.price * quantity;
    const available = isBuying ? playerStatsState.coins : Number(inventory.produce?.[zoneServiceView.cropKey]) || 0;
    summary.textContent = isBuying
        ? `Tổng tiền: ${total} đồng · Ví có ${playerStatsState.coins} đồng`
        : `Nhận: ${total} đồng · Trong túi: ${available} ${crop.name}`;
    submit.disabled = isBuying ? total > playerStatsState.coins : quantity > available;
}

function renderTradeScreen(content, title) {
    const isBuying = zoneServiceView.tradeAction === 'buy-seed';
    title.textContent = isBuying ? 'Thương nhân · Mua hạt giống' : 'Thương nhân · Bán nông sản';
    addServiceButton(content, '← Quay lại dịch vụ Khu A', 'service-back');

    const cropLabel = document.createElement('label');
    cropLabel.textContent = 'Chọn loại';
    const cropSelect = document.createElement('select');
    cropSelect.id = 'trade-crop';
    Object.entries(CROP_INFO).forEach(([key, crop]) => {
        const option = new Option(`${crop.icon} ${crop.name} · ${crop.price} đồng/${isBuying ? 'gói hạt' : 'quả'}`, key);
        option.selected = key === zoneServiceView.cropKey;
        cropSelect.add(option);
    });
    cropLabel.appendChild(cropSelect);
    content.appendChild(cropLabel);

    const quantityLabel = document.createElement('label');
    quantityLabel.textContent = 'Số lượng';
    const quantityInput = document.createElement('input');
    quantityInput.id = 'trade-quantity';
    quantityInput.type = 'number';
    quantityInput.min = '1';
    quantityInput.max = '99';
    quantityInput.step = '1';
    quantityInput.value = String(zoneServiceView.quantity);
    quantityLabel.appendChild(quantityInput);
    content.appendChild(quantityLabel);

    const summary = document.createElement('p');
    summary.id = 'trade-summary';
    content.appendChild(summary);
    const submit = document.createElement('button');
    submit.id = 'trade-submit';
    submit.type = 'button';
    submit.dataset.serviceAction = 'submit-trade';
    submit.textContent = isBuying ? 'Xác nhận mua' : 'Xác nhận bán';
    content.appendChild(submit);
    updateTradeSummary();
}

function syncFoodDraftFromForm() {
    const itemSelect = document.getElementById('food-item');
    const currencySelect = document.getElementById('food-currency');
    const quantityInput = document.getElementById('food-quantity');
    if (itemSelect) zoneServiceView.itemId = itemSelect.value;
    if (currencySelect) zoneServiceView.currency = currencySelect.value;
    if (quantityInput) {
        const amount = Number.parseInt(quantityInput.value, 10);
        zoneServiceView.quantity = Number.isInteger(amount) ? Math.max(1, Math.min(99, amount)) : 1;
    }
}

function updateFoodSummary() {
    const item = FOOD_INFO[zoneServiceView.itemId];
    const quantity = zoneServiceView.quantity;
    const summary = document.getElementById('food-summary');
    const submit = document.getElementById('food-submit');
    if (!item || !summary || !submit) return;
    const cost = item[zoneServiceView.currency] * quantity;
    const balance = Number(playerStatsState[zoneServiceView.currency]) || 0;
    const currencyName = zoneServiceView.currency === 'coins' ? 'tiền đồng' : 'danh tiếng';
    summary.textContent = `${item.icon} ${item.effect} · Tổng: ${cost} ${currencyName} · Đang có: ${balance}`;
    submit.disabled = cost > balance;
}

function renderFoodOrder(content, title) {
    title.textContent = 'Căn tin · Chọn món và số lượng';
    addServiceButton(content, '← Quay lại dịch vụ Căn tin', 'service-back');
    const itemLabel = document.createElement('label');
    itemLabel.textContent = 'Chọn món';
    const itemSelect = document.createElement('select');
    itemSelect.id = 'food-item';
    Object.entries(FOOD_INFO).forEach(([key, item]) => {
        const option = new Option(`${item.icon} ${item.name}`, key);
        option.selected = key === zoneServiceView.itemId;
        itemSelect.add(option);
    });
    itemLabel.appendChild(itemSelect);
    content.appendChild(itemLabel);

    const currencyLabel = document.createElement('label');
    currencyLabel.textContent = 'Thanh toán bằng';
    const currencySelect = document.createElement('select');
    currencySelect.id = 'food-currency';
    [['coins', 'Tiền đồng'], ['reputation', 'Danh tiếng']].forEach(([key, label]) => {
        const option = new Option(label, key);
        option.selected = key === zoneServiceView.currency;
        currencySelect.add(option);
    });
    currencyLabel.appendChild(currencySelect);
    content.appendChild(currencyLabel);

    const quantityLabel = document.createElement('label');
    quantityLabel.textContent = 'Số lượng';
    const quantityInput = document.createElement('input');
    quantityInput.id = 'food-quantity';
    quantityInput.type = 'number';
    quantityInput.min = '1';
    quantityInput.max = '99';
    quantityInput.step = '1';
    quantityInput.value = String(zoneServiceView.quantity);
    quantityLabel.appendChild(quantityInput);
    content.appendChild(quantityLabel);

    const summary = document.createElement('p');
    summary.id = 'food-summary';
    content.appendChild(summary);
    const submit = document.createElement('button');
    submit.id = 'food-submit';
    submit.type = 'button';
    submit.dataset.serviceAction = 'submit-food-order';
    submit.textContent = 'Xác nhận mua';
    content.appendChild(submit);
    updateFoodSummary();
}

function drawFarmPlots(scene) {
    if (!farmGraphics || !scene) return;
    farmGraphics.clear();
    FARM_PLOT_LAYOUT.forEach((plot) => {
        const state = farmPlots[plot.id];
        farmGraphics.fillStyle(0x67442d, 1).fillRoundedRect(plot.x, plot.y, plot.width, plot.height, 3);
        farmGraphics.lineStyle(1, 0xd3b17d, 1).strokeRoundedRect(plot.x, plot.y, plot.width, plot.height, 3);
        if (!state?.plantedAt) return;
        const ageMs = Date.now() - state.plantedAt;
        const condition = ageMs >= FARM_WILT_MS ? 'wilted' : ageMs >= FARM_GROWTH_MS ? 'ripe' : 'growing';
        const cropColor = condition === 'wilted' ? 0x9b7347 : condition === 'ripe' ? 0xf2c14e : 0x9bd267;
        farmGraphics.fillStyle(cropColor, 1);
        farmGraphics.fillCircle(plot.x + 10, plot.y + 13, 4);
        farmGraphics.fillCircle(plot.x + 20, plot.y + 9, 5);
        farmGraphics.fillCircle(plot.x + 29, plot.y + 15, 4);
        farmGraphics.lineStyle(2, condition === 'wilted' ? 0x705031 : condition === 'ripe' ? 0x498344 : 0x2c6b3f, 1);
        farmGraphics.lineBetween(plot.x + 20, plot.y + 10, plot.x + 20, plot.y + 20);
    });
}

function updateInteractionZone(player) {
    if (currentMapId !== 'campus') return;
    const nearestZone = CAMPUS_ZONES
        .map((zone) => ({ zone, distance: Phaser.Math.Distance.Between(player.x, player.y, zone.x, zone.y) }))
        .filter(({ zone, distance }) => distance <= zone.radius)
        .sort((a, b) => a.distance - b.distance)[0]?.zone || null;
    const nextZoneId = nearestZone?.id || '';
    if (nextZoneId === activeInteractionZoneId) return;

    activeInteractionZoneId = nextZoneId;
    const hud = document.getElementById('interaction-hud');
    const farmList = document.getElementById('farm-plot-list');
    const interactionButton = document.getElementById('interaction-button');
    document.getElementById('interaction-feedback').textContent = '';
    hud.hidden = !nearestZone;
    if (!nearestZone) return;

    document.getElementById('interaction-zone-name').textContent = nearestZone.name;
    document.getElementById('interaction-zone-description').textContent = nearestZone.detail;
    farmList.hidden = true;
    interactionButton.hidden = false;
    interactionButton.textContent = nearestZone.locked || nearestZone.loginRequired ? 'Khu vực đang khóa' : 'Vào bản đồ khu vực (E)';
}

function interactWithCurrentZone() {
    const zone = CAMPUS_ZONES.find((item) => item.id === activeInteractionZoneId);
    if (!zone) return;
    if (zone.locked) {
        document.getElementById('interaction-feedback').textContent = 'Khu vực này hiện chưa mở.';
        return;
    }
    if (zone.loginRequired) {
        document.getElementById('interaction-feedback').textContent = 'Khu vực cá nhân sẽ yêu cầu đăng nhập; tính năng đang được lên kế hoạch.';
        return;
    }
    socket.emit('enterCampusMap', zone.id);
}

function isBlockedPosition(x, y) {
    const padding = 14;
    return CAMPUS_BUILDINGS.some((building) =>
        x >= building.x - padding && x <= building.x + building.width + padding
        && y >= building.y - padding && y <= building.y + building.height + padding
    );
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

function showChatBubble(scene, playerContainer, message, isPrivate = false) {
    if (!scene || !playerContainer) return;
    if (playerContainer.chatBubble) {
        playerContainer.chatBubble.destroy();
    }

    const bubble = scene.add.text(0, -50, message, {
        font: '12px Arial',
        fill: isPrivate ? '#ffffff' : '#000000',
        backgroundColor: isPrivate ? '#643b91' : '#ffffff',
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

function showFloatingEmote(scene, playerContainer, emoji) {
    if (!scene || !playerContainer || !QUICK_FLOATING_EMOTES.includes(emoji)) return;

    const emote = scene.add.text(0, -54, emoji, {
        font: '30px Arial',
        padding: { x: 2, y: 2 },
        shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 4, fill: true }
    }).setOrigin(0.5);
    playerContainer.add(emote);
    playerContainer.bringToTop(emote);
    scene.tweens.add({
        targets: emote,
        y: -108,
        alpha: 0,
        scale: 1.25,
        duration: 1300,
        ease: 'Cubic.Out',
        onComplete: () => emote.destroy()
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
        const playerName = player.playerNickname || `Khách (${shortId})`;
        const unread = privateUnreadByPeer.get(id) || 0;
        const label = unread
            ? `${playerName}  🔴 ${unread} tin chưa đọc`
            : playerName;
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
        const senderId = typeof data.id === 'string' ? data.id : '';
        const isMine = data.isMe === true || senderId === socket.id;
        line.className = `private-message ${isMine ? 'is-mine' : 'is-theirs'}`;
        line.dataset.messageId = data.messageId || '';
        const sender = document.createElement('div');
        sender.className = 'private-message-sender';
        const shortSenderId = senderId ? senderId.substring(0, 4) : '????';
        if (isMine) {
            const peer = players[activePrivatePeerId];
            const shortPeerId = activePrivatePeerId ? activePrivatePeerId.substring(0, 4) : '????';
            const peerName = peer?.playerNickname || 'Khách';
            sender.textContent = `🔒 Riêng tư · Bạn → ${peerName} (${shortPeerId})`;
        } else {
            const senderName = typeof data.nickname === 'string' && data.nickname.trim()
                ? data.nickname.trim()
                : `Khách (${shortSenderId})`;
            sender.textContent = `🔒 Riêng tư · Từ ${senderName}${data.nickname ? ` (${shortSenderId})` : ''}`;
        }
        const body = document.createElement('span');
        body.className = 'private-message-body';
        body.textContent = String(data.message ?? '').slice(0, 300);
        const time = document.createElement('time');
        time.className = 'private-message-time';
        const sentAt = new Date(data.sentAt);
        const validSentAt = Number.isNaN(sentAt.getTime()) ? new Date() : sentAt;
        time.dateTime = validSentAt.toISOString();
        time.textContent = validSentAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const reactions = document.createElement('div');
        reactions.className = 'chat-reactions';
        (Array.isArray(data.reactions) ? data.reactions : []).forEach((reaction) => {
            if (!REACTION_EMOJIS.includes(reaction.emoji) || !Number.isInteger(reaction.count) || reaction.count < 1) return;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'reaction-button';
            button.dataset.emoji = reaction.emoji;
            button.setAttribute('aria-label', `Reaction ${reaction.emoji}: ${reaction.count}`);
            button.classList.toggle('is-active', Array.isArray(reaction.reactedBy) && reaction.reactedBy.includes(socket.id));
            button.textContent = `${reaction.emoji} ${reaction.count}`;
            reactions.appendChild(button);
        });

        const addReaction = document.createElement('button');
        addReaction.type = 'button';
        addReaction.className = 'reaction-add';
        addReaction.setAttribute('aria-label', 'Chọn reaction cho tin nhắn riêng');
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
        line.append(sender, body, time, reactions);
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
