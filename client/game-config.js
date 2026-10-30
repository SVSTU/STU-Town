/* Shared game configuration and static world data. Load before all client modules. */
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
