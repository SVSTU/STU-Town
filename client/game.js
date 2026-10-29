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

    // Ghế gỗ tách lớp để đổi kiểu hiển thị theo trạng thái có người ngồi.
    campusBenchGraphics = scene.add.graphics().setDepth(-8.8);
    drawCampusBenches(scene);

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

function drawCampusBenches(scene) {
    if (!scene) return;
    if (!campusBenchGraphics || !campusBenchGraphics.scene) {
        campusBenchGraphics = scene.add.graphics().setDepth(-8.8);
    }
    campusBenchGraphics.clear();
    CAMPUS_BENCHES.forEach(({ id, x, y }) => {
        const occupied = Boolean(campusBenchOccupants[id]);
        const backDark = occupied ? 0x31543a : 0x51351f;
        const backWood = occupied ? 0x56875a : 0xb4773e;
        const seatDark = occupied ? 0x31543a : 0x684326;
        const seatWood = occupied ? 0x6a9c66 : 0xc58a4e;
        campusBenchGraphics.fillStyle(backDark, 1).fillRoundedRect(x - 19, y - 11, 38, 5, 2);
        campusBenchGraphics.fillStyle(backWood, 1).fillRoundedRect(x - 18, y - 10, 36, 3, 1);
        campusBenchGraphics.fillStyle(backDark, 1).fillRoundedRect(x - 18, y - 6, 36, 3, 1);
        campusBenchGraphics.fillStyle(seatDark, 1).fillRoundedRect(x - 18, y - 4, 36, 7, 2);
        campusBenchGraphics.fillStyle(seatWood, 1).fillRoundedRect(x - 17, y - 4, 34, 3, 1);
        campusBenchGraphics.fillStyle(backDark, 1)
            .fillRoundedRect(x - 15, y + 2, 3, 10, 1)
            .fillRoundedRect(x + 12, y + 2, 3, 10, 1)
            .fillRoundedRect(x - 21, y - 6, 3, 8, 1)
            .fillRoundedRect(x + 18, y - 6, 3, 8, 1);
        campusBenchGraphics.lineStyle(1, occupied ? 0xc7e7a9 : 0xe0b77f, 0.95)
            .strokeRoundedRect(x - 18, y - 4, 36, 7, 2);
        if (occupied) {
            campusBenchGraphics.fillStyle(0xffd28b, 1).fillCircle(x, y - 16, 4);
            campusBenchGraphics.fillStyle(0x274b37, 1).fillRoundedRect(x - 5, y - 12, 10, 7, 3);
        }
    });
}

function getServerRankingRows(category) {
    const serverData = sessionLeaderboard.server && typeof sessionLeaderboard.server === 'object'
        ? sessionLeaderboard.server
        : sessionLeaderboard;
    return Array.isArray(serverData[category]) ? serverData[category] : [];
}

function ensureCanteenRankingModal() {
    let modal = document.getElementById('canteen-ranking-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'canteen-ranking-modal';
    modal.className = 'canteen-ranking-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <section class="canteen-ranking-dialog" role="dialog" aria-modal="true" aria-labelledby="canteen-ranking-title">
        <header><strong id="canteen-ranking-title">🏆 BẢNG VINH DANH THÀNH VIÊN TOP</strong><button type="button" data-close-canteen-ranking aria-label="Đóng">×</button></header>
        <nav class="canteen-ranking-tabs" aria-label="Chọn hạng mục">
          <button type="button" data-canteen-ranking="reputation" aria-pressed="true">Danh tiếng</button>
          <button type="button" data-canteen-ranking="coins" aria-pressed="false">Tiền đồng</button>
        </nav>
        <ol id="canteen-ranking-list"></ol>
        <p>Thứ hạng lấy theo dữ liệu toàn server đã lưu.</p>
      </section>`;
    document.body.append(modal);
    const close = () => { modal.hidden = true; };
    modal.querySelector('[data-close-canteen-ranking]').addEventListener('click', close);
    modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
    modal.querySelectorAll('[data-canteen-ranking]').forEach((button) => {
        button.addEventListener('click', () => {
            modal.querySelectorAll('[data-canteen-ranking]').forEach((tab) => tab.setAttribute('aria-pressed', String(tab === button)));
            renderCanteenRankingModal(button.dataset.canteenRanking);
        });
    });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
    return modal;
}

function renderCanteenRankingModal(category = 'reputation') {
    const modal = ensureCanteenRankingModal();
    const list = modal.querySelector('#canteen-ranking-list');
    const rows = getServerRankingRows(category);
    list.replaceChildren();
    if (!rows.length) {
        const empty = document.createElement('li');
        empty.textContent = 'Chưa có dữ liệu xếp hạng toàn server.';
        list.append(empty);
        return;
    }
    rows.slice(0, 10).forEach((entry, index) => {
        const item = document.createElement('li');
        const name = document.createElement('span');
        name.textContent = `${index + 1}. ${String(entry.nickname || 'Người chơi')}`;
        const score = document.createElement('strong');
        score.textContent = `${(Number(entry.score) || 0).toLocaleString('vi-VN')} ${category === 'coins' ? 'tiền đồng' : 'danh tiếng'}`;
        item.append(name, score);
        list.append(item);
    });
}

function openCanteenRanking(category) {
    const modal = ensureCanteenRankingModal();
    modal.hidden = false;
    modal.querySelectorAll('[data-canteen-ranking]').forEach((tab) => tab.setAttribute('aria-pressed', String(tab.dataset.canteenRanking === category)));
    renderCanteenRankingModal(category);
}

function drawCanteenHallOfFame(scene) {
    // Restore the two TOP 1 awards; clicking either opens the full ranking.
    const createAward = (x, category, title, color) => {
        const frame = scene.add.rectangle(x, 310, 170, 32, 0x243b2d, 0.98)
            .setDepth(-8).setStrokeStyle(2, color).setInteractive({ useHandCursor: true });
        const heading = scene.add.text(x, 278, `🏆 TOP 1 ${title}`, {
            font: 'bold 13px Arial', color: '#ffffff', align: 'center',
            wordWrap: { width: 174 }, padding: { x: 2, y: 2 }
        }).setOrigin(0.5).setDepth(-7).setInteractive({ useHandCursor: true });
        const top = getServerRankingRows(category)[0];
        const winner = scene.add.text(x, 310, top ? String(top.nickname || 'Người chơi') : 'Chưa có dữ liệu', {
            font: 'bold 12px Arial', color: '#ffffff', align: 'center',
            wordWrap: { width: 156 }, padding: { x: 3, y: 3 }
        }).setOrigin(0.5).setDepth(-7).setInteractive({ useHandCursor: true });
        winner.setData('canteenAwardCategory', category);
        const open = () => openCanteenRanking(category);
        frame.on('pointerdown', open);
        heading.on('pointerdown', open);
        winner.on('pointerdown', open);
        [heading, winner].forEach((label) => {
            label.on('pointerover', () => label.setStyle({ color: '#ffe08a' }));
            label.on('pointerout', () => label.setStyle({ color: '#ffffff' }));
        });
    };

    // Quick-buy buttons sit directly on the two brown counters below.
    const createFoodButton = (x, itemId, color) => {
        const food = FOOD_INFO[itemId];
        if (!food) return;
        const frame = scene.add.rectangle(x, 365, 100, 50, 0x806a48, 0.98)
            .setDepth(-7).setStrokeStyle(2, color).setInteractive({ useHandCursor: true });
        const label = scene.add.text(x, 365, `${food.icon} ${food.name}\n${food.coins.toLocaleString('vi-VN')} tiền đồng`, {
            font: 'bold 12px Arial', color: '#ffffff', align: 'center',
            wordWrap: { width: 94 }, padding: { x: 2, y: 2 }
        }).setOrigin(0.5).setDepth(-6);
        const buy = () => {
            if (currentMapId !== 'canteen') return;
            if (!socket.connected) {
                showToast('Chưa kết nối máy chủ.');
                return;
            }
            const confirmed = window.confirm(`Xác nhận mua ${food.name} với giá ${food.coins.toLocaleString('vi-VN')} tiền đồng?`);
            if (!confirmed) return;
            socket.emit('canteenPurchase', { itemId, currency: 'coins', quantity: 1 });
        };
        frame.on('pointerdown', buy);
        label.setInteractive({ useHandCursor: true }).on('pointerdown', buy);
        label.on('pointerover', () => label.setStyle({ color: '#ffe08a' }));
        label.on('pointerout', () => label.setStyle({ color: '#ffffff' }));
    };

    createAward(260, 'reputation', 'DANH TIẾNG', 0xffd166);
    createAward(540, 'coins', 'TIỀN ĐỒNG', 0x9ed2ff);
    createFoodButton(300, 'bread', 0xffd166);
    createFoodButton(500, 'water', 0x9ed2ff);
}

function drawInteriorMap(scene, mapId) {
    const firstMapChild = scene.children.list.length;
    const labels = mapId.startsWith('halloween:') ? ['Tầng Halloween', '50 hộp quà · Mỗi hộp chỉ mở một lần'] : ({
        sports: ['Sân thể thao', 'Sân bóng và khu vực vận động'],
        fountain: ['Đài phun nước', 'Quảng trường và điểm hẹn'],
        farm: ['Nông trại cộng đồng', 'Bốn luống dùng chung · túi đồ riêng cho từng người'],
        'khu-a': ['Khu A · Hành chính & giao dịch', 'Thương nhân · Giáo sư · Trạm hồi phục'],
        canteen: ['Căn tin · Ẩm thực', 'Mua món ăn bằng tiền đồng hoặc danh tiếng'],
        auditorium: ['Hội trường A · Bảng thông báo', 'Bài viết mới nhất từ Sinh Viên STU'],
        'khu-e': ['Khu E', 'Bản đồ khu vực E'],
        'khu-f': ['Khu F', 'Bản đồ khu vực F']
    }[mapId] || ['Khu vực', '']);
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
        } else if (mapId === 'auditorium') {
            g.fillStyle(0x624b35, 1).fillRoundedRect(235, 210, 330, 185, 10);
            g.fillStyle(0xe4e7df, 1).fillRoundedRect(250, 225, 300, 155, 6);
            g.lineStyle(3, 0x829a78, 0.9).strokeRoundedRect(250, 225, 300, 155, 6);
            scene.add.text(400, 242, '📢 BẢNG THÔNG BÁO', {
                font: 'bold 18px Arial', color: '#29402d', backgroundColor: '#ffffff99', padding: { x: 8, y: 5 }
            }).setOrigin(0.5).setDepth(-9);
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
            drawCanteenHallOfFame(scene);
            g.fillStyle(0x3c5364, 1).fillRoundedRect(620, 300, 60, 100, 8);
            g.fillStyle(0x9ed2d1, 1).fillRoundedRect(628, 309, 44, 30, 4);
            g.fillStyle(0x243b2d, 1).fillRoundedRect(628, 345, 44, 38, 4);
            scene.add.text(650, 324, '🎫', { font: '20px Arial' }).setOrigin(0.5).setDepth(-9);
            scene.add.text(650, 393, 'MÁY THẺ', { font: 'bold 9px Arial', color: '#fff' }).setOrigin(0.5).setDepth(-9);
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
    if (mapId.startsWith('halloween:')) drawHalloweenMap(scene);
    mapObjects = scene.children.list.slice(firstMapChild);
}

function drawHalloweenMap(scene) {
    const floor = scene.add.graphics().setDepth(-8.5);
    floor.fillStyle(0x422a20, 0.72).fillRoundedRect(70, 205, 660, 320, 14);
    halloweenBoxGraphics = scene.add.graphics().setDepth(-7.5);
    halloweenBoxLabels = HALLOWEEN_BOX_POSITIONS.map(({ x, y }, index) => scene.add.text(x, y + 1, '', {
        font: '16px Arial', color: '#fff'
    }).setOrigin(0.5).setDepth(-7));
    drawHalloweenBoxStates();
}

function drawHalloweenBoxStates() {
    if (!halloweenBoxGraphics) return;
    halloweenBoxGraphics.clear();
    HALLOWEEN_BOX_POSITIONS.forEach(({ x, y }, index) => {
        const opened = halloweenOpenedBoxes.has(index);
        halloweenBoxGraphics.fillStyle(opened ? 0x64534a : 0x9a5b28, 1).fillRoundedRect(x - 17, y - 15, 34, 30, 5);
        halloweenBoxGraphics.lineStyle(2, opened ? 0x9f9083 : 0xffd06a, 1).strokeRoundedRect(x - 17, y - 15, 34, 30, 5);
        halloweenBoxGraphics.lineStyle(3, opened ? 0x84766d : 0x633a1d, 1).lineBetween(x - 17, y - 2, x + 17, y - 2);
        halloweenBoxLabels[index]?.setText(opened ? '·' : '🎁');
    });
}

function switchMapVisuals(mapId) {
    mapObjects.forEach((object) => object.destroy());
    mapObjects = [];
    farmGraphics = null;
    halloweenBoxGraphics = null;
    halloweenBoxLabels = [];
    campusBenchGraphics = null;
    if (mapId === 'campus') drawCampusMap(sceneRef);
    else drawInteriorMap(sceneRef, mapId);
    document.getElementById('map-exit').hidden = mapId === 'campus';
    document.getElementById('map-exit').textContent = mapId.startsWith('halloween:') ? '← Trở về Căng tin' : '← Trở về sân trường';
    document.getElementById('announcements-panel').hidden = mapId !== 'auditorium';
    document.getElementById('interaction-hud').hidden = true;
    document.getElementById('farm-seed-picker').hidden = true;
    document.getElementById('farm-plot-list').hidden = true;
    if (mapId !== 'farm') {
        farmMouseMarker?.destroy();
        farmMouseMarker = null;
    }
    document.getElementById('zone-service-panel').hidden = true;
    document.getElementById('zone-service-feedback').textContent = '';
    zoneServiceView = { screen: 'closed', target: '', tradeAction: 'buy-seed', cropKey: 'carrot', quantity: 1, itemId: 'bread', currency: 'coins' };
    activeInteriorObjectId = '';
    activeFarmPlotId = '';
    interactedFarmPlotId = '';
    renderZoneServices(mapId);
    if (mapId === 'campus') activeInteractionZoneId = '__map-transition__';
    else if (mapId !== 'farm') activeInteractionZoneId = '';
    if (mapId === 'farm') {
        activeInteractionZoneId = 'farm';
        updateFarmPlotControls();
        socket.emit('getFarmState');
    }
}

function createFarmPlotControls() {
    const list = document.getElementById('farm-plot-list');
    list.replaceChildren();
}

function updateFarmPlotControls() {
    const list = document.getElementById('farm-plot-list');
    if (!list) return;
    const selectedPlot = FARM_PLOT_LAYOUT.find((plot) => plot.id === activeFarmPlotId);
    const hasInteracted = currentMapId === 'farm' && selectedPlot && interactedFarmPlotId === selectedPlot.id;
    list.hidden = !hasInteracted;
    document.getElementById('farm-seed-picker').hidden = true;
    if (hasInteracted) {
        const plotIndex = FARM_PLOT_LAYOUT.findIndex((plot) => plot.id === selectedPlot.id) + 1;
        const state = farmPlots[selectedPlot.id];
        list.replaceChildren();
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.farmPlot = selectedPlot.id;
        if (!state?.plantedAt) {
            const cropKey = document.getElementById('farm-seed-type')?.value || 'carrot';
            const seedCount = Number(inventory.seeds?.[cropKey]) || 0;
            document.getElementById('farm-seed-picker').hidden = false;
            button.disabled = seedCount < 1;
            button.dataset.action = 'plant';
            button.textContent = `🌱 Gieo hạt · Luống ${plotIndex} (${seedCount})`;
        } else {
            const ageMs = Date.now() - state.plantedAt;
            if (ageMs >= FARM_GROWTH_MS) {
                const wilted = ageMs >= FARM_WILT_MS;
                button.disabled = false;
                button.dataset.action = 'harvest';
                button.textContent = `🧺 Thu hoạch · Luống ${plotIndex} (${wilted ? 1 : 3}) · ${wilted ? 'héo' : 'khỏe'}`;
            } else {
                button.disabled = true;
                button.dataset.action = '';
                button.textContent = `🌿 ${state.crop || 'Cây trồng'} · ${Math.ceil((FARM_GROWTH_MS - ageMs) / 1000)} giây nữa`;
            }
        }
        list.append(button);
    } else list.replaceChildren();
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
    const itemNames = {
        eventGoldCoin: '🟡 Đồng vàng sự kiện', elevatorTicket: '🎫 Thẻ thang máy',
        recoveryMeal: '🥪 Phần ăn hồi phục', recoveryDrink: '🧃 Nước hồi phục',
        eventLantern: '🏮 Đèn lồng sự kiện', halloweenPumpkin: '🎃 Bí ngô Halloween',
        bread: '🥖 Bánh mì', bao: '🥟 Bánh bao', water: '💧 Nước suối', soda: '🥤 Nước ngọt'
    };
    const itemEntries = Object.entries(inventory.items)
        .filter(([, count]) => Number(count) > 0)
        .map(([name, count]) => ({ label: itemNames[name] || name, count, itemId: name }));
    renderInventorySection('inventory-items', itemEntries, 'Chưa có vật phẩm');
}

function setAnnouncementZoom(value) {
    announcementZoom = Math.max(0.8, Math.min(1.6, Math.round(value * 10) / 10));
    const panel = document.getElementById('announcements-panel');
    if (!panel) return;
    panel.querySelector('#announcements-status').style.fontSize = `${13 * announcementZoom}px`;
    panel.querySelectorAll('.announcement-post h3').forEach((element) => { element.style.fontSize = `${14 * announcementZoom}px`; });
    panel.querySelectorAll('.announcement-post time').forEach((element) => { element.style.fontSize = `${11 * announcementZoom}px`; });
    panel.querySelectorAll('.announcement-post p').forEach((element) => { element.style.fontSize = `${12 * announcementZoom}px`; });
    panel.querySelectorAll('.announcement-post img').forEach((element) => { element.style.maxHeight = `min(${320 * announcementZoom}px, 42vh)`; });
}

function updateEnvironmentClock() {
    const now = new Date();
    const clock = document.getElementById('environment-clock');
    if (!clock) return;
    clock.textContent = now.toLocaleTimeString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    });
      updateEnvironmentIcon();
  }

  function updateEnvironmentIcon() {
      const hud = document.getElementById('environment-hud');
      const button = document.getElementById('environment-toggle');
      if (!hud || !button) return;
      const collapsed = hud.classList.contains('is-collapsed');
      const hour = Number(new Intl.DateTimeFormat('en', {
          timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hourCycle: 'h23'
      }).format(new Date()));
      const isDay = typeof environmentConditions?.isDay === 'boolean' ? environmentConditions.isDay : hour >= 6 && hour < 18;
      const code = Number(environmentConditions?.weatherCode);
      let icon = isDay ? '☀️' : '🌙';
      if ([45, 48].includes(code)) icon = '🌫️';
      else if (code >= 95) icon = '⛈️';
      else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) icon = '🌧️';
      else if (code === 2 || code === 3) icon = '☁️';
      else if (code === 1) icon = '🌤️';
      button.textContent = collapsed ? icon : '−';
      button.setAttribute('aria-expanded', String(!collapsed));
      button.setAttribute('aria-label', collapsed ? 'Mở thông tin thời gian và thời tiết' : 'Thu gọn thông tin thời gian và thời tiết');
      button.title = `${document.getElementById('environment-clock')?.textContent || ''} · ${document.getElementById('environment-condition')?.textContent || 'Thời tiết'}`;
}

function positionEnvironmentHud() {
    const hud = document.getElementById('environment-hud');
    const canvas = document.querySelector('canvas');
    if (!hud || !canvas) return;
    const bounds = canvas.getBoundingClientRect();
    hud.style.left = `${bounds.right - 10}px`;
    hud.style.top = `${bounds.bottom - 10}px`;
}

function describeWeather(code) {
    if (code === 0) return '☀️ Trời quang';
    if ([1, 2].includes(code)) return '🌤️ Có mây';
    if (code === 3) return '☁️ Nhiều mây';
    if ([45, 48].includes(code)) return '🌫️ Sương mù';
    if (code >= 51 && code <= 57) return '🌦️ Mưa phùn';
    if (code >= 61 && code <= 67) return '🌧️ Có mưa';
    if (code >= 71 && code <= 77) return '❄️ Có tuyết';
    if (code >= 80 && code <= 82) return '🌧️ Mưa rào';
    if ([85, 86].includes(code)) return '🌨️ Mưa tuyết';
    if (code >= 95) return '⛈️ Dông';
    return '🌤️ Thời tiết hiện tại';
}

async function loadEnvironmentConditions() {
    const condition = document.getElementById('environment-condition');
    if (!condition) return;
    try {
        const response = await fetch(`${serverUrl}/api/environment`, { headers: { accept: 'application/json' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        environmentConditions = await response.json();
        const temperature = Number.isFinite(environmentConditions.temperature)
            ? ` · ${Math.round(environmentConditions.temperature)}°C` : '';
        condition.textContent = `${describeWeather(environmentConditions.weatherCode)}${temperature}`;
        document.getElementById('environment-location').textContent = environmentConditions.stale
            ? 'Chánh Hưng · dữ liệu thời tiết lưu gần nhất'
            : 'Chánh Hưng · TP. Hồ Chí Minh';
          updateEnvironmentIcon();
    } catch (error) {
        condition.textContent = 'Chưa tải được thời tiết';
          updateEnvironmentIcon();
        console.warn('Không tải được thời tiết Chánh Hưng:', error);
    }
}

function renderEnvironmentOverlay(time, delta) {
    if (!environmentOverlay) return;
    environmentOverlay.clear();
    const hour = Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
    const isDay = typeof environmentConditions?.isDay === 'boolean' ? environmentConditions.isDay : hour >= 6 && hour < 18;
    if (!isDay) environmentOverlay.fillStyle(0x101a39, 0.25).fillRect(0, 0, 800, 600);
    else if (environmentConditions?.cloudCover >= 65) {
        environmentOverlay.fillStyle(0x53616b, Math.min(0.18, environmentConditions.cloudCover / 600)).fillRect(0, 0, 800, 600);
    }

    const code = Number(environmentConditions?.weatherCode);
    const isWet = (environmentConditions?.rain || 0) > 0 || (environmentConditions?.showers || 0) > 0
        || (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
    if (!isWet || !['campus', 'sports', 'fountain', 'farm'].includes(currentMapId)) return;
    const offset = (time * 0.22) % 850;
    environmentOverlay.lineStyle(1, isDay ? 0xb8d9e8 : 0x8197c0, 0.42);
    for (let index = 0; index < 75; index++) {
        const x = (index * 137 + offset) % 820 - 10;
        const y = (index * 83 + offset * 1.7) % 620 - 10;
        environmentOverlay.lineBetween(x, y, x - 5, y + 13);
    }
}

async function loadAnnouncements() {
    const status = document.getElementById('announcements-status');
    const list = document.getElementById('announcements-list');
    if (!status || !list) return;
    status.textContent = 'Đang tải bài viết mới nhất…';
    list.replaceChildren();
    try {
        const response = await fetch(`${serverUrl}/api/announcements`, { headers: { accept: 'application/json' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const posts = Array.isArray(data.posts) ? data.posts : [];
        if (posts.length === 0) {
            status.textContent = 'Blog chưa có bài viết để hiển thị.';
            return;
        }
        posts.forEach((post) => {
            let url;
            try { url = new URL(post.url); } catch { return; }
            if (url.protocol !== 'https:' || url.hostname !== 'stusinhvien.blogspot.com') return;

            const article = document.createElement('article');
            article.className = 'announcement-post';
            const heading = document.createElement('h3');
            const link = document.createElement('a');
            link.href = url.href;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = String(post.title || 'Bài viết mới');
            heading.appendChild(link);
            article.appendChild(heading);
            if (post.publishedAt) {
                const date = new Date(post.publishedAt);
                if (!Number.isNaN(date.getTime())) {
                    const time = document.createElement('time');
                    time.dateTime = date.toISOString();
                    time.textContent = date.toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
                    article.appendChild(time);
                }
            }
            if (post.image) {
                let imageUrl;
                try { imageUrl = new URL(post.image); } catch { imageUrl = null; }
                const host = imageUrl?.hostname || '';
                const isBloggerImageHost = host === 'blogger.googleusercontent.com'
                    || host.endsWith('.blogger.googleusercontent.com')
                    || /^\d+\.bp\.blogspot\.com$/.test(host);
                if (imageUrl?.protocol === 'https:' && isBloggerImageHost) {
                    const image = document.createElement('img');
                    image.src = imageUrl.href;
                    image.alt = String(post.title || 'Ảnh bài viết');
                    image.loading = 'lazy';
                    image.referrerPolicy = 'no-referrer';
                    article.appendChild(image);
                }
            }
            if (post.summary) {
                const summary = document.createElement('p');
                summary.textContent = String(post.summary);
                article.appendChild(summary);
            }
            list.appendChild(article);
        });
        setAnnouncementZoom(announcementZoom);
        status.textContent = data.stale ? 'Đang hiển thị bản lưu gần nhất.' : `Bài viết mới nhất từ ${data.source || 'Sinh Viên STU'}`;
    } catch (error) {
        status.textContent = 'Không tải được bài viết. Hãy thử tải lại hoặc mở blog Sinh Viên STU.';
        console.warn('Không tải được bảng thông báo:', error);
    }
}

function queueSystemAnnouncement(event) {
    const message = typeof event === 'string' ? event : event?.message;
    if (typeof message !== 'string' || !message.trim()) return;
    systemAnnouncementQueue.push(message.slice(0, 300));
    showNextSystemAnnouncement();
}

function queueFarmEvent(event) {
    const message = typeof event === 'string' ? event : event?.message;
    if (typeof message !== 'string' || !message.trim()) return;
    farmEventQueue.push(message.slice(0, 300));
    showNextFarmEvent();
}

function showNextFarmEvent() {
    if (farmEventActive || farmEventQueue.length === 0) return;
    const lane = document.getElementById('farm-event-lane');
    positionFarmEventLane();
    const banner = document.createElement('div');
    banner.className = 'farm-event-message is-blinking';
    banner.textContent = `🎪 SỰ KIỆN: ${farmEventQueue.shift()}`;
    farmEventActive = true;
    lane.appendChild(banner);
    if (banner.scrollWidth > lane.clientWidth) banner.classList.replace('is-blinking', 'is-scrolling');
    banner.addEventListener('animationend', () => {
        banner.remove();
        farmEventActive = false;
        showNextFarmEvent();
    }, { once: true });
}

function positionFarmEventLane() {
    const lane = document.getElementById('farm-event-lane');
    const mapCanvas = document.querySelector('#game-container canvas, canvas');
    if (!lane || !mapCanvas) return;
    const bounds = mapCanvas.getBoundingClientRect();
    const inset = Math.min(12, bounds.width * 0.02);
    lane.style.left = `${bounds.left + inset}px`;
    lane.style.top = `${bounds.top + 5}px`;
    lane.style.width = `${Math.max(0, bounds.width - inset * 2)}px`;
}

function showNextSystemAnnouncement() {
    if (systemAnnouncementActive || systemAnnouncementQueue.length === 0) return;
    const lane = document.getElementById('system-announcement-lane');
    positionSystemAnnouncementLane();
    const message = systemAnnouncementQueue.shift();
    const banner = document.createElement('div');
    banner.className = 'system-announcement is-blinking';
    banner.textContent = `⚙ SYSTEM: ${message}`;
    systemAnnouncementActive = true;
    lane.appendChild(banner);
    if (banner.scrollWidth > lane.clientWidth) {
        banner.classList.replace('is-blinking', 'is-scrolling');
    }
    banner.addEventListener('animationend', () => {
        banner.remove();
        systemAnnouncementActive = false;
        showNextSystemAnnouncement();
    }, { once: true });
}

function positionSystemAnnouncementLane() {
    const lane = document.getElementById('system-announcement-lane');
    const mapCanvas = document.querySelector('#game-container canvas, canvas');
    if (!lane || !mapCanvas) return;
    const bounds = mapCanvas.getBoundingClientRect();
    const inset = Math.min(12, bounds.width * 0.02);
    lane.style.left = `${bounds.left + inset}px`;
    lane.style.top = `${bounds.top + 5}px`;
    lane.style.width = `${Math.max(0, bounds.width - inset * 2)}px`;
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
    visibleEntries.forEach(({ label, count, itemId }) => {
        const row = document.createElement('div');
        row.className = 'inventory-entry';
        const itemName = document.createElement('span');
        itemName.textContent = String(label);
        const itemCount = document.createElement('strong');
        itemCount.textContent = `×${Math.max(0, Number(count) || 0)}`;
        row.append(itemName, itemCount);
        if (['recoveryMeal', 'recoveryDrink', 'bread', 'bao', 'water', 'soda'].includes(itemId)) {
            const useButton = document.createElement('button');
            useButton.type = 'button';
            useButton.className = 'inventory-use-item';
            useButton.dataset.useItem = itemId;
            useButton.textContent = 'Dùng';
            row.append(useButton);
        }
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
        `🪙 ${playerStatsState.coins} tiền đồng  ·  ⭐ ${playerStatsState.reputation} danh tiếng`;
    if (['khu-a', 'canteen'].includes(currentMapId)) renderZoneServices(currentMapId);
}

function addServiceButton(parent, label, action, data = {}, disabled = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.dataset.serviceAction = action;
    if (action === 'service-back') button.classList.add('service-back');
    Object.entries(data).forEach(([key, value]) => { button.dataset[key] = String(value); });
    button.disabled = disabled;
    parent.appendChild(button);
}

function renderZoneServices(mapId) {
    const panel = document.getElementById('zone-service-panel');
    const title = document.getElementById('zone-service-title');
    const content = document.getElementById('zone-service-content');
    if (!panel || !content) return;
    panel.hidden = !['khu-a', 'canteen'].includes(mapId) || zoneServiceView.screen === 'closed' || !zoneServiceView.target;
    if (panel.hidden) return;
    content.replaceChildren();
    if (mapId === 'khu-a') {
        if (zoneServiceView.target === 'merchant' && zoneServiceView.screen === 'merchant-home') {
            title.textContent = 'Thương nhân trồng trọt';
            addServiceButton(content, '🛒 Mua hạt giống', 'open-trade', { tradeAction: 'buy-seed' });
            addServiceButton(content, '📦 Bán nông sản', 'open-trade', { tradeAction: 'sell-crop' });
            return;
        }
        if (zoneServiceView.screen === 'trade') {
            renderTradeScreen(content, title);
            return;
        }
        if (zoneServiceView.screen === 'recovery') {
            title.textContent = 'Trạm hồi phục';
            const description = document.createElement('p');
            description.textContent = 'Gói hồi phục · 500 tiền đồng · +50 đói, +50 sức mạnh, −50 mệt.';
            content.appendChild(description);
            addServiceButton(content, 'Xác nhận sử dụng', 'confirm-heal', {}, playerStatsState.coins < 500);
            return;
        }
        if (zoneServiceView.target === 'professor') {
            title.textContent = 'Giáo sư';
            const professor = document.createElement('p');
            professor.textContent = 'Nhiệm vụ chưa mở.';
            content.appendChild(professor);
        }
        return;
    }
    if (zoneServiceView.target === 'elevator-vending') {
        title.textContent = 'Máy bán thẻ thang máy';
        const ticketCount = Number(inventory.items?.elevatorTicket) || 0;
        const coinCount = Number(inventory.items?.eventGoldCoin) || 0;
        const closedForClasses = isLectureHoursNow();
        const description = document.createElement('p');
        description.textContent = `${closedForClasses ? 'Máy đang đóng trong giờ giảng đường.' : 'Máy đang hoạt động.'} Đổi 1 đồng vàng sự kiện lấy 1 thẻ một lần. Dùng thẻ ban đêm để vào tầng Halloween riêng có 50 hộp; các khung giờ khác nhận vật phẩm theo thời điểm. Bạn có ${ticketCount} thẻ.`;
        content.appendChild(description);
        addServiceButton(content, `🎫 Đổi thẻ · 1 đồng vàng sự kiện (${coinCount} có)`, 'buy-elevator-ticket', {}, closedForClasses || coinCount < 1);
        addServiceButton(content, `🛗 Dùng thẻ thang máy (${ticketCount})`, 'use-elevator-ticket', {}, closedForClasses || ticketCount < 1);
        return;
    }
    if (zoneServiceView.screen === 'food-order') {
        renderFoodOrder(content, title);
        return;
    }
    title.textContent = 'Quầy ẩm thực';
    addServiceButton(content, '🍽️ Chọn món ăn / thức uống', 'open-food-order');
}

function isLectureHoursNow() {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const minutes = Number(parts.find((part) => part.type === 'hour')?.value || 0) * 60
        + Number(parts.find((part) => part.type === 'minute')?.value || 0);
    return (minutes >= 420 && minutes < 690) || (minutes >= 780 && minutes < 1020);
}

function getTradeQuantityLimit() {
    const crop = CROP_INFO[zoneServiceView.cropKey];
    if (!crop) return 0;
    if (zoneServiceView.tradeAction === 'buy-seed') {
        return Math.min(99, Math.floor((Number(playerStatsState.coins) || 0) / crop.price));
    }
    return Math.min(99, Number(inventory.produce?.[zoneServiceView.cropKey]) || 0);
}

function syncTradeDraftFromForm() {
    const cropSelect = document.getElementById('trade-crop');
    const quantityInput = document.getElementById('trade-quantity');
    if (cropSelect) zoneServiceView.cropKey = cropSelect.value;
    if (quantityInput) {
        const parsed = Number(quantityInput.value);
        const amount = Number.isInteger(parsed) ? parsed : 1;
        const limit = getTradeQuantityLimit();
        zoneServiceView.quantity = limit > 0 ? Math.max(1, Math.min(limit, amount)) : 1;
    }
}

function updateTradeSummary() {
    const crop = CROP_INFO[zoneServiceView.cropKey];
    const summary = document.getElementById('trade-summary');
    const submit = document.getElementById('trade-submit');
    const quantityInput = document.getElementById('trade-quantity');
    if (!crop || !summary || !submit) return;
    const isBuying = zoneServiceView.tradeAction === 'buy-seed';
    const limit = getTradeQuantityLimit();
    zoneServiceView.quantity = limit > 0 ? Math.max(1, Math.min(limit, zoneServiceView.quantity)) : 1;
    if (quantityInput) {
        quantityInput.max = String(Math.max(1, limit));
        quantityInput.value = String(zoneServiceView.quantity);
    }
    const quantity = zoneServiceView.quantity;
    const total = crop.price * quantity;
    const available = isBuying ? playerStatsState.coins : Number(inventory.produce?.[zoneServiceView.cropKey]) || 0;
    summary.textContent = isBuying
        ? `Tổng ${total.toLocaleString('vi-VN')}đ · Ví ${playerStatsState.coins.toLocaleString('vi-VN')}đ`
        : `Nhận ${total.toLocaleString('vi-VN')}đ · Có ${available} ${crop.name}`;
    submit.disabled = limit < 1 || quantity > limit || (isBuying && total > playerStatsState.coins);
}

function renderTradeScreen(content, title) {
    const isBuying = zoneServiceView.tradeAction === 'buy-seed';
    title.textContent = isBuying ? 'Mua hạt giống' : 'Bán nông sản';
    addServiceButton(content, '← Quay lại thương nhân', 'service-back');

    const cropLabel = document.createElement('label');
    cropLabel.textContent = 'Chọn loại';
    const cropSelect = document.createElement('select');
    cropSelect.id = 'trade-crop';
    Object.entries(CROP_INFO).forEach(([key, crop]) => {
        const option = new Option(`${crop.icon} ${crop.name} · ${crop.price}đ/${isBuying ? 'gói' : 'quả'}`, key);
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
    quantityInput.max = String(Math.max(1, getTradeQuantityLimit()));
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
        const parsed = Number(quantityInput.value);
        const amount = Number.isInteger(parsed) ? parsed : 1;
        const item = FOOD_INFO[zoneServiceView.itemId];
        const owned = Number(inventory.items?.[zoneServiceView.itemId]) || 0;
        const balance = Number(playerStatsState[zoneServiceView.currency]) || 0;
        const limit = item ? Math.max(0, Math.min(99, 10 - owned, Math.floor(balance / item[zoneServiceView.currency]))) : 0;
        zoneServiceView.quantity = limit > 0 ? Math.max(1, Math.min(limit, amount)) : 1;
    }
}

function updateFoodSummary() {
    const item = FOOD_INFO[zoneServiceView.itemId];
    const summary = document.getElementById('food-summary');
    const submit = document.getElementById('food-submit');
    const quantityInput = document.getElementById('food-quantity');
    if (!item || !summary || !submit) return;
    const maxByCapacity = Math.max(0, 10 - (Number(inventory.items?.[zoneServiceView.itemId]) || 0));
    const maxByBalance = Math.floor((Number(playerStatsState[zoneServiceView.currency]) || 0) / item[zoneServiceView.currency]);
    const limit = Math.max(0, Math.min(99, maxByCapacity, maxByBalance));
    zoneServiceView.quantity = limit > 0 ? Math.max(1, Math.min(limit, zoneServiceView.quantity)) : 1;
    if (quantityInput) {
        quantityInput.max = String(Math.max(1, limit));
        quantityInput.value = String(zoneServiceView.quantity);
    }
    const quantity = zoneServiceView.quantity;
    const cost = item[zoneServiceView.currency] * quantity;
    const balance = Number(playerStatsState[zoneServiceView.currency]) || 0;
    const ownedCount = Number(inventory.items?.[zoneServiceView.itemId]) || 0;
    const currencyName = zoneServiceView.currency === 'coins' ? 'tiền đồng' : 'danh tiếng';
    summary.textContent = `${item.icon} ${item.effect} · Túi: ${ownedCount}/10 · Tổng: ${cost} ${currencyName} · Đang có: ${balance}`;
    submit.disabled = limit < 1 || cost > balance || ownedCount + quantity > 10;
}

function renderFoodOrder(content, title) {
    title.textContent = 'Căn tin · Chọn món và số lượng';
    addServiceButton(content, '← Đóng quầy ẩm thực', 'service-back');
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
    const initialItem = FOOD_INFO[zoneServiceView.itemId];
    const initialOwned = Number(inventory.items?.[zoneServiceView.itemId]) || 0;
    const initialBalance = Number(playerStatsState[zoneServiceView.currency]) || 0;
    quantityInput.max = String(Math.max(1, Math.min(99, 10 - initialOwned, initialItem ? Math.floor(initialBalance / initialItem[zoneServiceView.currency]) : 0)));
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

function isWithinInteractionArea(player, target, padding = 20) {
    const bounds = target.bounds || (Number.isFinite(target.width) && Number.isFinite(target.height) ? target : null);
    if (bounds) {
        const { x, y, width, height } = bounds;
        return player.x >= x - padding && player.x <= x + width + padding
            && player.y >= y - padding && player.y <= y + height + padding;
    }
    return Phaser.Math.Distance.Between(player.x, player.y, target.x, target.y) <= target.radius;
}

function updateInteractionZone(player) {
    if (currentMapId.startsWith('halloween:')) {
        updateHalloweenBoxInteraction(player);
        return;
    }
    if (currentMapId === 'farm') {
        updateFarmPlotInteraction(player);
        return;
    }
    if (currentMapId === 'khu-a' || currentMapId === 'canteen') {
        updateInteriorInteraction(player);
        return;
    }
    if (currentMapId !== 'campus') return;
    const nearestZone = CAMPUS_ZONES
        .map((zone) => ({ zone, distance: Phaser.Math.Distance.Between(player.x, player.y, zone.x, zone.y) }))
        .filter(({ zone }) => isWithinInteractionArea(player, zone, 20))
        .sort((a, b) => a.distance - b.distance)[0]?.zone || null;
    const nextZoneId = nearestZone?.id || '';
    if (nextZoneId === activeInteractionZoneId) {
        if (nearestZone?.id.startsWith('bench-')) updateBenchInteractionState(nearestZone);
        return;
    }

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
    interactionButton.disabled = false;
    interactionButton.textContent = nearestZone.id.startsWith('bench-')
        ? 'Ngồi nghỉ (E)'
        : nearestZone.locked || nearestZone.loginRequired ? 'Khu vực đang khóa' : 'Vào bản đồ khu vực (E)';
    if (nearestZone.id.startsWith('bench-')) updateBenchInteractionState(nearestZone);
}

function updateBenchInteractionState(bench) {
    const button = document.getElementById('interaction-button');
    const occupantId = campusBenchOccupants[bench.id];
    const occupiedByOther = Boolean(occupantId && occupantId !== socket.id);
    const occupiedBySelf = Boolean(occupantId && occupantId === socket.id);
    button.disabled = occupiedByOther || occupiedBySelf;
    button.textContent = occupiedByOther ? 'Ghế đang có người' : occupiedBySelf ? 'Bạn đang ngồi nghỉ' : 'Ngồi nghỉ (E)';
    document.getElementById('interaction-zone-description').textContent = occupiedByOther
        ? 'Ghế đang được người chơi khác sử dụng.'
        : occupiedBySelf ? 'Bạn đang ngồi nghỉ. Di chuyển để nhường ghế.' : bench.detail;
}

function updateFarmPlotInteraction(player) {
    const nearestPlot = FARM_PLOT_LAYOUT
        .map((plot) => ({ plot, distance: Phaser.Math.Distance.Between(player.x, player.y, plot.x + plot.width / 2, plot.y + plot.height / 2) }))
        .filter(({ plot }) => isWithinInteractionArea(player, plot, 18))
        .sort((a, b) => a.distance - b.distance)[0]?.plot || null;
    const nextPlotId = nearestPlot?.id || '';
    if (nextPlotId !== activeFarmPlotId) {
        activeFarmPlotId = nextPlotId;
        interactedFarmPlotId = '';
        activeInteractionZoneId = nextPlotId ? `farm-plot:${nextPlotId}` : 'farm';
        document.getElementById('interaction-feedback').textContent = '';
        updateFarmPlotControls();
    }

    const hud = document.getElementById('interaction-hud');
    const interactionButton = document.getElementById('interaction-button');
    hud.hidden = !nearestPlot;
    if (!nearestPlot) {
        document.getElementById('farm-seed-picker').hidden = true;
        document.getElementById('farm-plot-list').hidden = true;
        return;
    }

    const plotNumber = FARM_PLOT_LAYOUT.findIndex((plot) => plot.id === nearestPlot.id) + 1;
    const state = farmPlots[nearestPlot.id];
    let detail = 'Luống trống · chọn để gieo hạt.';
    if (state?.plantedAt) {
        const ageMs = Date.now() - state.plantedAt;
        if (ageMs < FARM_GROWTH_MS) {
            detail = `${state.crop || 'Cây trồng'} đang lớn · trưởng thành sau ${formatFarmTime(FARM_GROWTH_MS - ageMs)}.`;
        } else if (ageMs < FARM_WILT_MS) {
            detail = `Cây đã trưởng thành · héo sau ${formatFarmTime(FARM_WILT_MS - ageMs)}. Có thể thu hoạch 3 nông sản.`;
        } else {
            detail = 'Cây đã héo · có thể thu hoạch 1 nông sản. Cây ở vườn cộng đồng không chết.';
        }
    }
    document.getElementById('interaction-zone-name').textContent = `Luống ${plotNumber}`;
    document.getElementById('interaction-zone-description').textContent = detail;
    const hasInteracted = interactedFarmPlotId === nearestPlot.id;
    interactionButton.hidden = hasInteracted;
    interactionButton.textContent = `Tương tác luống ${plotNumber} (E)`;
}

function updateHalloweenBoxInteraction(player) {
    const nearest = HALLOWEEN_BOX_POSITIONS
        .map((box, index) => ({ box, index, distance: Phaser.Math.Distance.Between(player.x, player.y, box.x, box.y) }))
        .filter(({ distance }) => distance <= 38)
        .sort((a, b) => a.distance - b.distance)[0];
    const nextIndex = nearest?.index ?? -1;
    const nextZoneId = nextIndex >= 0 ? `halloween-box:${nextIndex}` : '';
    if (nextIndex === activeHalloweenBox) {
        if (nearest && halloweenOpenedBoxes.has(nextIndex)) {
            document.getElementById('interaction-zone-description').textContent = 'Hộp quà này đã được mở.';
            document.getElementById('interaction-button').hidden = true;
        }
        return;
    }
    activeHalloweenBox = nextIndex;
    activeInteractionZoneId = nextZoneId;
    const hud = document.getElementById('interaction-hud');
    const button = document.getElementById('interaction-button');
    hud.hidden = !nearest;
    if (!nearest) return;
    const isOpened = halloweenOpenedBoxes.has(nextIndex);
    document.getElementById('interaction-zone-name').textContent = `Hộp quà ${nextIndex + 1}`;
    document.getElementById('interaction-zone-description').textContent = isOpened
        ? 'Hộp quà này đã được mở.' : 'Tiến lại gần và nhấn E để mở. Mỗi hộp chỉ mở được một lần.';
    document.getElementById('farm-seed-picker').hidden = true;
    document.getElementById('farm-plot-list').hidden = true;
    button.hidden = isOpened;
    button.disabled = isOpened;
    button.textContent = '🎁 Mở hộp quà (E)';
}

function renderHalloweenLeaderboard(finders) {
    const panel = document.getElementById('halloween-leaderboard');
    const list = document.getElementById('halloween-leaderboard-list');
    if (!panel || !list) return;
    if (!Array.isArray(finders) || finders.length === 0) {
        panel.hidden = true;
        list.replaceChildren();
        return;
    }
    panel.hidden = false;
    list.replaceChildren();
    finders.forEach((finder, index) => {
        const row = document.createElement('li');
        row.textContent = `${index + 1}. ${String(finder.nickname || `Khách (${finder.id || '????'})`)} · ${Number(finder.count) || 0} bí ngô`;
        list.appendChild(row);
    });
}

function renderSessionLeaderboard() {
    const list = document.getElementById('session-leaderboard-list');
    if (!list) return;
    document.querySelectorAll('.session-leaderboard-tabs [data-ranking]').forEach((tab) => {
        tab.setAttribute('aria-selected', String(tab.dataset.ranking === activeRankingCategory));
    });
    const scopeData = sessionLeaderboard[activeLeaderboardScope] && typeof sessionLeaderboard[activeLeaderboardScope] === 'object'
        ? sessionLeaderboard[activeLeaderboardScope]
        : sessionLeaderboard;
    const rows = Array.isArray(scopeData[activeRankingCategory]) ? scopeData[activeRankingCategory] : [];
    list.replaceChildren();
    if (activeRankingCategory === 'event') {
        const groups = rows.filter((group) => group && Array.isArray(group.rows));
        if (!groups.some((group) => group.rows.length)) {
            const empty = document.createElement('li');
            empty.textContent = 'Chưa có vật phẩm sự kiện trong túi người chơi.';
            list.append(empty);
            return;
        }
        groups.forEach((group) => {
            if (!group.rows.length) return;
            const heading = document.createElement('li');
            heading.className = 'session-leaderboard-event-heading';
            heading.textContent = String(group.label || group.itemId || 'Vật phẩm sự kiện');
            list.append(heading);
            group.rows.slice(0, 5).forEach((entry, index) => {
                const row = document.createElement('li');
                row.textContent = `${index + 1}. ${String(entry.nickname || 'Người chơi')} · ${(Number(entry.score) || 0).toLocaleString('vi-VN')} cái`;
                list.append(row);
            });
        });
        return;
    }
    if (rows.length === 0) {
        const empty = document.createElement('li');
        empty.textContent = 'Chưa có người chơi trong phiên.';
        list.append(empty);
        return;
    }
    rows.slice(0, 10).forEach((entry, index) => {
        const row = document.createElement('li');
        const score = Number(entry.score) || 0;
        const unit = activeRankingCategory === 'reputation' ? 'danh tiếng' : 'tiền đồng';
        row.textContent = `${index + 1}. ${String(entry.nickname || 'Người chơi')} · ${score.toLocaleString('vi-VN')} ${unit}`;
        list.append(row);
    });
}

function formatFarmTime(milliseconds) {
    const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
    if (totalSeconds < 60) return `${totalSeconds} giây`;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return seconds ? `${minutes} phút ${seconds} giây` : `${minutes} phút`;
}

function updateInteriorInteraction(player) {
    const nearestObject = (INTERIOR_OBJECTS[currentMapId] || [])
        .map((object) => ({ object, distance: Phaser.Math.Distance.Between(player.x, player.y, object.x, object.y) }))
        .filter(({ object }) => isWithinInteractionArea(player, object, 20))
        .sort((a, b) => a.distance - b.distance)[0]?.object || null;
    const nextObjectId = nearestObject?.id || '';
    if (nextObjectId === activeInteriorObjectId) return;

    const previousObjectId = activeInteriorObjectId;
    activeInteriorObjectId = nextObjectId;
    activeInteractionZoneId = nextObjectId ? `interior:${nextObjectId}` : '';
    document.getElementById('interaction-feedback').textContent = '';
    const hud = document.getElementById('interaction-hud');
    hud.hidden = !nearestObject;
    const previousTarget = previousObjectId === 'canteen-counter' ? 'canteen' : previousObjectId;
    if (previousObjectId && zoneServiceView.target === previousTarget) {
        zoneServiceView = { ...zoneServiceView, screen: 'closed', target: '' };
        renderZoneServices(currentMapId);
    }
    if (!nearestObject) return;
    document.getElementById('interaction-zone-name').textContent = nearestObject.name;
    document.getElementById('interaction-zone-description').textContent = nearestObject.detail;
    document.getElementById('farm-plot-list').hidden = true;
    document.getElementById('farm-seed-picker').hidden = true;
    document.getElementById('interaction-button').hidden = false;
    document.getElementById('interaction-button').textContent = 'Tương tác (E)';
}

function interactWithCurrentZone() {
    if (currentMapId.startsWith('halloween:') && activeHalloweenBox >= 0) {
        if (!halloweenOpenedBoxes.has(activeHalloweenBox) && socket.connected) socket.emit('openHalloweenBox', activeHalloweenBox);
        return;
    }
    if (currentMapId === 'farm' && activeFarmPlotId && activeInteractionZoneId === `farm-plot:${activeFarmPlotId}`) {
        interactedFarmPlotId = activeFarmPlotId;
        document.getElementById('interaction-button').hidden = true;
        updateFarmPlotControls();
        return;
    }
    if (activeInteractionZoneId.startsWith('interior:')) {
        const objectId = activeInteriorObjectId;
        const target = objectId === 'canteen-counter' ? 'canteen' : objectId;
        if (!target) return;
        const screen = target === 'merchant' ? 'merchant-home'
            : target === 'recovery' ? 'recovery'
                : target === 'professor' ? 'professor'
                    : target === 'elevator-vending' ? 'elevator-machine'
                    : 'food-order';
        zoneServiceView = { ...zoneServiceView, screen, target, quantity: 1 };
        document.getElementById('zone-service-feedback').textContent = '';
        renderZoneServices(currentMapId);
        return;
    }
    const zone = CAMPUS_ZONES.find((item) => item.id === activeInteractionZoneId);
    if (!zone) return;
    if (zone.id.startsWith('bench-')) {
        if (socket.connected) socket.emit('restAtCampusBench', zone.id);
        return;
    }
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
    // Campus buildings only occupy the campus map. Reusing these collision
    // rectangles in interiors blocks movement at unrelated coordinates.
    if (currentMapId !== 'campus') return false;
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
