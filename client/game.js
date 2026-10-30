console.log("GAME STARTING...");

const serverUrl = ['localhost', '127.0.0.1'].includes(location.hostname)
    ? `${location.protocol}//${location.hostname}:3000`
    : "https://stu-town-server.onrender.com";
const socket = io(serverUrl, { autoConnect: false });
const PROFILE_STORAGE_KEY = 'stu-town-profile';
const PLAYER_TOKEN_STORAGE_KEY = 'stu-town-player-token';
try {
    socket.auth = { playerToken: localStorage.getItem(PLAYER_TOKEN_STORAGE_KEY) || '' };
} catch {
    socket.auth = { playerToken: '' };
}
const REACTION_EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '🔥'];
const QUICK_FLOATING_EMOTES = ['👋', '❤️', '😂', '👍', '🔥', '🎉'];
const CAMPUS_BENCHES = [
    { id: 'bench-1', x: 540, y: 50 }, { id: 'bench-2', x: 625, y: 50 },
    { id: 'bench-3', x: 550, y: 285 }, { id: 'bench-4', x: 630, y: 285 },
    { id: 'bench-5', x: 670, y: 365 },
    { id: 'bench-6', x: 540, y: 435 }, { id: 'bench-7', x: 630, y: 435 }
];
const FARM_PLOT_LAYOUT = [
    { id: 'plot-1', x: 200, y: 290, width: 78, height: 42 },
    { id: 'plot-2', x: 310, y: 290, width: 78, height: 42 },
    { id: 'plot-3', x: 420, y: 290, width: 78, height: 42 },
    { id: 'plot-4', x: 530, y: 290, width: 78, height: 42 }
];
const HALLOWEEN_BOX_POSITIONS = Array.from({ length: 50 }, (_, index) => ({
    x: 112 + (index % 10) * 64,
    y: 242 + Math.floor(index / 10) * 54
}));
const CAMPUS_ZONES = [
    { id: 'canteen', name: 'Căng tin', detail: 'Ẩm thực, thức uống và hồi phục chỉ số.', x: 120, y: 145, radius: 74, bounds: { x: 48, y: 72, width: 135, height: 110 } },
    { id: 'khu-c', name: 'Khu C · Giảng đường', detail: 'Mở 07:00–11:30 và 13:00–17:00 (giờ Việt Nam).', x: 355, y: 175, radius: 92, bounds: { x: 232, y: 106, width: 245, height: 112 }, schedule: true },
    { id: 'auditorium', name: 'Hội trường A · Bảng thông báo', detail: 'Xem bài viết mới nhất từ Sinh Viên STU.', x: 585, y: 155, radius: 100, bounds: { x: 530, y: 92, width: 132, height: 120 } },
    { id: 'khu-d', name: 'Khu D · Thang máy', detail: 'Khu vực này chưa mở.', x: 115, y: 330, radius: 95, bounds: { x: 48, y: 278, width: 135, height: 105 }, locked: true },
    { id: 'khu-a', name: 'Khu A · Hành chính & giao dịch', detail: 'Mua hạt giống, bán nông sản và dùng trạm hồi phục.', x: 730, y: 340, radius: 54, bounds: { x: 704, y: 228, width: 54, height: 220 } },
    { id: 'personal-farm', name: 'Nông trại cá nhân · Khu A', detail: 'Cần đăng nhập để mở không gian nông trại cá nhân.', x: 734, y: 510, radius: 40, bounds: { x: 696, y: 456, width: 76, height: 96 }, loginRequired: true },
    { id: 'sports', name: 'Sân thể thao', detail: 'Sân bóng và khu vận động ngoài trời.', x: 365, y: 365, radius: 116, bounds: { x: 180, y: 250, width: 330, height: 200 } },
    { id: 'fountain', name: 'Đài phun nước', detail: 'Điểm hẹn ở sân trung tâm.', x: 570, y: 360, radius: 52 },
    { id: 'dormitory', name: 'Ký túc xá', detail: 'Cần đăng nhập để tạo không gian nghỉ riêng (sẽ bổ sung sau).', x: 135, y: 510, radius: 76, bounds: { x: 48, y: 478, width: 138, height: 70 }, loginRequired: true },
    { id: 'farm', name: 'Nông trại cộng đồng', detail: 'Gieo trồng và thu hoạch cùng người chơi khác.', x: 600, y: 505, radius: 112, bounds: { x: 520, y: 462, width: 168, height: 88 } },
    { id: 'khu-e', name: 'Khu E', detail: 'Khu vực hiện đang khóa.', x: 376, y: 66, radius: 36, bounds: { x: 276, y: 40, width: 200, height: 52 }, locked: true },
    { id: 'khu-f', name: 'Khu F', detail: 'Khu vực hiện đang khóa.', x: 372, y: 541, radius: 36, bounds: { x: 280, y: 520, width: 185, height: 43 }, locked: true },
    ...CAMPUS_BENCHES.map((bench, index) => ({
        id: bench.id, name: `Ghế nghỉ ${index + 1}`, detail: 'Ngồi nghỉ để giảm 10 điểm mệt.',
        x: bench.x, y: bench.y, radius: 38
    }))
];
const INTERIOR_OBJECTS = {
    'khu-a': [
        { id: 'merchant', name: 'Thương nhân trồng trọt', detail: 'Tới gần và tương tác để mua hạt giống hoặc bán nông sản.', x: 300, y: 255, radius: 80, bounds: { x: 220, y: 210, width: 160, height: 95 } },
        { id: 'professor', name: 'Giáo sư', detail: 'Nhiệm vụ chưa mở.', x: 500, y: 255, radius: 78, bounds: { x: 420, y: 210, width: 160, height: 95 } },
        { id: 'recovery', name: 'Trạm hồi phục', detail: 'Gói hồi phục giá 500 tiền đồng.', x: 400, y: 378, radius: 70, bounds: { x: 300, y: 350, width: 200, height: 55 } }
    ],
    canteen: [
        { id: 'canteen-counter', name: 'Quầy ẩm thực', detail: 'Tới gần quầy để chọn món ăn hoặc thức uống.', x: 400, y: 242, radius: 82, bounds: { x: 220, y: 205, width: 360, height: 75 } },
        { id: 'elevator-vending', name: 'Máy bán thẻ thang máy', detail: 'Đổi 1 đồng vàng sự kiện lấy thẻ dùng một lần. Máy hoạt động ngoài giờ giảng đường.', x: 650, y: 345, radius: 58, bounds: { x: 610, y: 300, width: 80, height: 100 } }
    ]
};
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
let announcementZoom = 1;
let environmentConditions = null;
let environmentOverlay = null;

let players = {};
let privateConversations = new Map();
let privateUnreadByPeer = new Map();
let activePrivatePeerId = '';
let farmPlots = {};
let farmGraphics = null;
let campusBenchGraphics = null;
let campusBenchOccupants = {};
let activeInteractionZoneId = '';
let activeInteriorObjectId = '';
let activeFarmPlotId = '';
let interactedFarmPlotId = '';
let currentMapId = 'campus';
let activeFarmMouseId = '';
let farmMouseMarker = null;
let halloweenOpenedBoxes = new Set();
let activeHalloweenBox = -1;
let halloweenBoxResultMessage = '';
let halloweenBoxGraphics = null;
let halloweenBoxLabels = [];
let sessionLeaderboard = { reputation: [], coins: [], event: [] };
let canteenBestSellingProducts = [];
let canteenQuickBuyObjects = [];
let activeRankingCategory = 'reputation';
let activeLeaderboardScope = 'server';
const systemAnnouncementQueue = [];
let systemAnnouncementActive = false;
const farmEventQueue = [];
let farmEventActive = false;
let mapObjects = [];
let inventory = { seeds: {}, produce: {}, items: {} };
let playerStatsState = { stats: { hunger: 100, strength: 100, fatigue: 0 }, coins: 1500, reputation: 0, farmPlantCount: 0 };
let zoneServiceView = {
    screen: 'closed', target: '', tradeAction: 'buy-seed', cropKey: 'carrot', quantity: 1,
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
    environmentOverlay = sceneRef.add.graphics().setDepth(-0.5);
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
    updateEnvironmentClock();
    positionEnvironmentHud();
    loadEnvironmentConditions();
    window.setInterval(updateEnvironmentClock, 1000);
    window.setInterval(loadEnvironmentConditions, 10 * 60 * 1000);
    window.addEventListener('resize', positionEnvironmentHud);
      document.getElementById('environment-toggle')?.addEventListener('click', () => {
          document.getElementById('environment-hud')?.classList.toggle('is-collapsed');
          updateEnvironmentIcon();
      });

    registerFarmSocketHandlers();

    socket.on('connect', () => {
        console.log("Connected to server, my socket ID:", socket.id);
        const saveStatus = document.getElementById('player-save-status');
        if (saveStatus) saveStatus.textContent = 'Đang kiểm tra kết nối lưu dữ liệu…';
        socket.emit('updateProfile', profile);
        socket.emit('getFarmState');
    });

    socket.on('connect_error', (error) => {
        console.error('Không kết nối được máy chủ game:', error?.message || error);
        const saveStatus = document.getElementById('player-save-status');
        if (saveStatus) saveStatus.textContent = 'Chưa kết nối máy chủ; dữ liệu chưa được lưu.';
        const feedback = document.getElementById('interaction-feedback');
        if (feedback) feedback.textContent = `Mất kết nối máy chủ game: ${error?.message || 'hãy thử tải lại trang.'}`;
    });

    socket.on('playerPersistenceStatus', (status = {}) => {
        const saveStatus = document.getElementById('player-save-status');
        if (status.enabled && !status.available) {
            if (saveStatus) saveStatus.textContent = 'Supabase chưa sẵn sàng; dữ liệu đang lưu trong phiên này.';
            console.error('Supabase chưa sẵn sàng; game vẫn hoạt động nhưng chưa lưu hồ sơ:', status.message || 'Lỗi đọc hồ sơ.');
        } else if (!status.enabled) {
            if (saveStatus) saveStatus.textContent = 'Chỉ lưu trong phiên hiện tại; server chưa cấu hình Supabase.';
            console.warn('Supabase chưa cấu hình; game đang chạy nhưng dữ liệu chưa được lưu lâu dài.');
        } else if (status.available) {
            if (saveStatus) saveStatus.textContent = 'Đã bật lưu hồ sơ trên Supabase.';
        }
    });

    socket.on('playerIdentity', ({ token } = {}) => {
        if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{40,100}$/.test(token)) return;
        socket.auth.playerToken = token;
        try {
            localStorage.setItem(PLAYER_TOKEN_STORAGE_KEY, token);
        } catch {
            console.warn('Không lưu được mã định danh người chơi trong trình duyệt này.');
        }
    });

    socket.on('systemChatMessage', queueSystemAnnouncement);
    socket.on('farmEventMessage', queueFarmEvent);
    socket.on('halloweenState', (state) => {
        halloweenOpenedBoxes = new Set(Array.isArray(state?.opened) ? state.opened : []);
        drawHalloweenBoxStates();
        const feedback = document.getElementById('interaction-feedback');
        if (state?.total && currentMapId.startsWith('halloween:')) {
            feedback.textContent = `Đã mở ${halloweenOpenedBoxes.size}/${state.total} hộp quà.`;
            if (players[socket.id]) updateHalloweenBoxInteraction(players[socket.id]);
        }
    });
    socket.on('halloweenBoxResult', (result) => {
        halloweenBoxResultMessage = String(result?.message || '');
        document.getElementById('interaction-feedback').textContent = halloweenBoxResultMessage;
        if (result?.foundPumpkin) document.getElementById('halloween-leaderboard').hidden = false;
        if (result?.spider && players[socket.id] && sceneRef) {
            const spider = sceneRef.add.text(players[socket.id].x, players[socket.id].y - 32, '🕷️', {
                font: '30px Arial', backgroundColor: '#321d1d', padding: { x: 4, y: 2 }
            }).setOrigin(0.5).setDepth(20);
            sceneRef.tweens.add({
                targets: spider, y: spider.y - 42, alpha: 0, duration: 1500,
                onComplete: () => spider.destroy()
            });
        }
    });
    socket.on('halloweenLeaderboard', (finders) => renderHalloweenLeaderboard(finders));
    socket.on('canteenBestSellingProducts', (products) => {
        canteenBestSellingProducts = Array.isArray(products)
            ? products.filter((entry) => entry && FOOD_INFO[entry.itemId]).slice(0, 2)
            : [];
        if (currentMapId === 'canteen' && sceneRef) renderCanteenQuickBuyButtons(sceneRef);
    });

    socket.on('sessionLeaderboard', (data) => {
        sessionLeaderboard = data && typeof data === 'object' ? data : { reputation: [], coins: [], event: [] };
        renderSessionLeaderboard();
        if (currentMapId === 'canteen' && sceneRef) {
            // Refresh the two clickable top-player plaques without redrawing the whole room.
            sceneRef.children.list.filter((object) => object.type === 'Text' && object.getData('canteenAwardCategory')).forEach((object) => {
                const category = object.getData('canteenAwardCategory');
                const top = getServerRankingRows(category)[0];
                object.setText(top ? String(top.nickname || 'Người chơi') : 'Chưa có dữ liệu');
            });
        }
    });

    socket.on('inventoryState', (state) => {
        inventory = normalizeInventory(state);
        renderInventory();
    });

    socket.on('playerState', updatePlayerStats);
    socket.on('campusBenchOccupancy', (occupants) => {
        campusBenchOccupants = occupants && typeof occupants === 'object' ? occupants : {};
        if (currentMapId === 'campus' && sceneRef) drawCampusBenches(sceneRef);
        if (currentMapId === 'campus' && socket.id && players[socket.id]) updateInteractionZone(players[socket.id]);
    });

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

    socket.on('benchRestResult', (result) => {
        document.getElementById('interaction-feedback').textContent = String(result?.message || '');
        if (result?.state) updatePlayerStats(result.state);
    });

    socket.on('mapChangeDenied', (message) => {
        document.getElementById('interaction-feedback').textContent = String(message || 'Không thể vào khu vực này.');
    });

    socket.on('mapChanged', ({ mapId, players: mapPlayers }) => {
        currentMapId = mapId || 'campus';
        // Public chat belongs to a single map room; do not leave old room messages visible.
        document.getElementById('chat-messages').replaceChildren();
        Object.values(players).forEach((player) => player.destroy());
        players = {};
        targetPosition = null;
        activeInteractionZoneId = '';
        activeHalloweenBox = -1;
        switchMapVisuals(currentMapId);
        document.getElementById('session-leaderboard').hidden = currentMapId !== 'khu-c';
        if (currentMapId === 'khu-c') renderSessionLeaderboard();
        if (currentMapId === 'auditorium') loadAnnouncements();
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
    document.querySelector('.session-leaderboard-tabs').addEventListener('click', (event) => {
        const tab = event.target.closest('[data-ranking]');
        if (!tab) return;
        activeRankingCategory = tab.dataset.ranking;
        renderSessionLeaderboard();
    });
    document.querySelector('.session-leaderboard-scopes').addEventListener('click', (event) => {
        const tab = event.target.closest('[data-scope]');
        if (!tab) return;
        activeLeaderboardScope = tab.dataset.scope;
        document.querySelectorAll('.session-leaderboard-scopes [data-scope]').forEach((button) => {
            button.setAttribute('aria-pressed', String(button.dataset.scope === activeLeaderboardScope));
        });
        renderSessionLeaderboard();
    });
    document.getElementById('session-leaderboard-toggle').addEventListener('click', (event) => {
        const panel = document.getElementById('session-leaderboard');
        const collapsed = panel.classList.toggle('is-collapsed');
        event.currentTarget.setAttribute('aria-expanded', String(!collapsed));
        event.currentTarget.setAttribute('aria-label', collapsed ? 'Mở bảng xếp hạng' : 'Thu gọn bảng xếp hạng');
        event.currentTarget.textContent = collapsed ? '+' : '−';
    });
    document.getElementById('halloween-leaderboard-toggle').addEventListener('click', (event) => {
        const panel = document.getElementById('halloween-leaderboard');
        const collapsed = panel.classList.toggle('is-collapsed');
        event.currentTarget.setAttribute('aria-expanded', String(!collapsed));
        event.currentTarget.setAttribute('aria-label', collapsed ? 'Mở bảng bí ngô' : 'Thu gọn bảng bí ngô');
        event.currentTarget.textContent = collapsed ? '+' : '−';
    });
    document.getElementById('announcements-refresh').addEventListener('click', loadAnnouncements);
    document.getElementById('announcements-zoom-out').addEventListener('click', () => setAnnouncementZoom(announcementZoom - 0.1));
    document.getElementById('announcements-zoom-in').addEventListener('click', () => setAnnouncementZoom(announcementZoom + 0.1));
    document.getElementById('zone-service-close').addEventListener('click', () => {
        zoneServiceView = { ...zoneServiceView, screen: 'closed', target: '' };
        renderZoneServices(currentMapId);
    });
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
    registerFarmDomHandlers();
    document.getElementById('inventory-items').addEventListener('click', (event) => {
        const button = event.target.closest('[data-use-item]');
        if (button && socket.connected) socket.emit('useInventoryItem', button.dataset.useItem);
    });
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
            if (zoneServiceView.target === 'merchant') zoneServiceView.screen = 'merchant-home';
            else zoneServiceView = { ...zoneServiceView, screen: 'closed', target: '' };
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
            zoneServiceView.screen = 'recovery';
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
        } else if (action === 'buy-elevator-ticket') {
            if (socket.connected) socket.emit('buyElevatorTicket');
        } else if (action === 'use-elevator-ticket') {
            if (socket.connected) socket.emit('useElevatorTicket');
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

// Shared isometric-style rendering helpers. Gameplay coordinates, hit zones and
// server movement remain unchanged; these primitives only affect the visual layer.
function formatFarmTime(milliseconds) {
    const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
    if (totalSeconds < 60) return `${totalSeconds} giây`;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return seconds ? `${minutes} phút ${seconds} giây` : `${minutes} phút`;
}

