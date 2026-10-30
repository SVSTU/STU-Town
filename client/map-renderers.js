/* STU-Town map rendering module.
 * Loaded as a classic script before game.js. Functions intentionally resolve
 * shared game state (sceneRef, currentMapId, mapObjects, etc.) at call time.
 * Keep map-specific drawing and scene transitions in this file.
 */

function drawIsoDiamond(graphics, cx, cy, halfW, halfH, fillColor, alpha = 1, strokeColor = null) {
    const points = [
        new Phaser.Geom.Point(cx, cy - halfH),
        new Phaser.Geom.Point(cx + halfW, cy),
        new Phaser.Geom.Point(cx, cy + halfH),
        new Phaser.Geom.Point(cx - halfW, cy)
    ];
    graphics.fillStyle(fillColor, alpha).fillPoints(points, true);
    if (strokeColor !== null) {
        graphics.lineStyle(1, strokeColor, 0.45).strokePoints(points, true);
    }
}

function drawIsoGround(graphics, colorA = 0x86ad69, colorB = 0x7fa363) {
    graphics.fillStyle(0x29402d, 1).fillRect(0, 0, 800, 600);
    for (let row = -2; row < 19; row++) {
        for (let col = -2; col < 23; col++) {
            const x = col * 48 + (row % 2 ? 24 : 0);
            const y = row * 28;
            drawIsoDiamond(graphics, x, y, 48, 28,
                (row + col) % 2 === 0 ? colorA : colorB, 1, 0x456d42);
        }
    }
    // A clean cream perimeter frames the playable diorama.
    graphics.fillStyle(0xd8cfb6, 1).fillRoundedRect(18, 18, 764, 564, 20);
    graphics.fillStyle(colorA, 1).fillRoundedRect(30, 30, 740, 540, 15);
    graphics.lineStyle(3, 0xe6e0c8, 0.8).strokeRoundedRect(30, 30, 740, 540, 15);
}

function drawIsoBuilding(graphics, x, y, width, height, color) {
    const cx = x + width / 2;
    const cy = y + height / 2;
    const rx = width / 2;
    const ry = Math.max(15, height * 0.28);
    const wallHeight = Math.max(12, Math.min(28, height * 0.24));
    const top = [
        new Phaser.Geom.Point(cx, cy - ry),
        new Phaser.Geom.Point(cx + rx, cy),
        new Phaser.Geom.Point(cx, cy + ry),
        new Phaser.Geom.Point(cx - rx, cy)
    ];
    const front = [
        new Phaser.Geom.Point(cx - rx, cy),
        new Phaser.Geom.Point(cx, cy + ry),
        new Phaser.Geom.Point(cx, cy + ry + wallHeight),
        new Phaser.Geom.Point(cx - rx, cy + wallHeight)
    ];
    const right = [
        new Phaser.Geom.Point(cx + rx, cy),
        new Phaser.Geom.Point(cx, cy + ry),
        new Phaser.Geom.Point(cx, cy + ry + wallHeight),
        new Phaser.Geom.Point(cx + rx, cy + wallHeight)
    ];
    graphics.fillStyle(0x263d2a, 0.22).fillEllipse(cx + 5, cy + ry + wallHeight + 6, width * 1.05, Math.max(12, height * 0.24));
    graphics.fillStyle(Phaser.Display.Color.ValueToColor(color).darken(25).color, 1).fillPoints(front, true);
    graphics.fillStyle(Phaser.Display.Color.ValueToColor(color).darken(40).color, 1).fillPoints(right, true);
    graphics.fillStyle(color, 1).fillPoints(top, true);
    graphics.lineStyle(2, 0xf5e9c8, 0.9).strokePoints(top, true);
    // Roof highlight gives the building a friendly toy-like finish.
    graphics.lineStyle(2, 0xffffff, 0.3).lineBetween(cx - rx * 0.55, cy - ry * 0.45, cx, cy - ry * 0.85);
}

function drawCampusMap(scene) {
    const firstMapChild = scene.children.list.length;
    const map = scene.add.graphics().setDepth(-10);
    // Restore the original flat 2D campus map; interior maps keep their
    // isometric styling independently.
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

    // Original flat 2D campus trees, enhanced with gently swaying leaf clusters.
    const campusTreePositions = [
        [54, 45], [120, 48], [740, 52], [750, 500], [225, 490], [188, 420], [728, 195]
    ];
    campusTreePositions.forEach(([x, y], index) => {
        map.fillStyle(0x29452f, 0.22).fillEllipse(x + 2, y + 12, 27, 10);
        map.fillStyle(0x765536, 1).fillRoundedRect(x - 3, y + 2, 6, 13, 2);
        map.fillStyle(0x477b48, 1).fillCircle(x, y, 13);
        map.fillStyle(0x78b35d, 1).fillCircle(x - 3, y - 4, 9);

        // Animated highlights are decorative Phaser objects, not interactive zones.
        const leaf = scene.add.ellipse(x - 5, y - 7, 10, 5, 0xa5d57b, 0.9)
            .setDepth(-8.7).setRotation(-0.45);
        scene.tweens.add({
            targets: leaf,
            angle: { from: -18, to: 18 },
            scaleX: { from: 0.85, to: 1.18 },
            duration: 1700 + index * 145,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
            delay: index * 180
        });
        const sparkle = scene.add.circle(x + 5, y - 2, 1.8, 0xe4f5b8, 0.7).setDepth(-8.65);
        scene.tweens.add({
            targets: sparkle,
            alpha: { from: 0.18, to: 0.85 },
            scale: { from: 0.7, to: 1.35 },
            duration: 1250 + index * 110,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
            delay: index * 130
        });
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
        // A soft animated glint makes wooden benches feel alive without
        // changing their hitboxes, positions or resting interactions.
        const glint = scene.add.ellipse(x - 8, y - 2, 9, 2, 0xffe6b2, 0.42).setDepth(-8.75);
        scene.tweens.add({
            targets: glint,
            x: { from: x - 10, to: x + 10 },
            alpha: { from: 0.12, to: 0.58 },
            duration: 2100,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
            delay: CAMPUS_BENCHES.findIndex((bench) => bench.id === id) * 170
        });
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

function clearCanteenQuickBuyButtons() {
    canteenQuickBuyObjects.forEach((object) => {
        if (object && object.active) object.destroy();
    });
    canteenQuickBuyObjects = [];
}

function renderCanteenQuickBuyButtons(scene) {
    // A delayed server event must never draw canteen controls on another map.
    if (currentMapId !== 'canteen' || !scene || !scene.scene.isActive()) {
        clearCanteenQuickBuyButtons();
        return;
    }
    clearCanteenQuickBuyButtons();

    // Use actual best-selling products when available; starter choices are only a
    // temporary fallback until the canteen has recorded enough sales history.
    const products = canteenBestSellingProducts.length
        ? canteenBestSellingProducts.map((entry) => entry.itemId)
        : ['bread', 'water'];
    const shown = products.slice(0, 2);
    if (shown.length === 1) shown.push(shown[0] === 'bread' ? 'water' : 'bread');

    shown.forEach((itemId, index) => {
        const x = index === 0 ? 300 : 520;
        const color = index === 0 ? 0xffd166 : 0x9ed2ff;
        const food = FOOD_INFO[itemId];
        if (!food) return;
        const frame = scene.add.rectangle(x, 360, 100, 50,
            index === 0 ? 0x294b2e : 0x183d4a, 1)
            .setDepth(-7).setStrokeStyle(2, color, 1).setInteractive({ useHandCursor: true });
        const label = scene.add.text(x, 360, `${food.icon} ${food.name}\n${food.coins.toLocaleString('vi-VN')} tiền đồng`, {
            font: 'bold 12px Arial', color: '#ffffff', align: 'center',
            wordWrap: { width: 94 }, padding: { x: 2, y: 2 }
        }).setOrigin(0.5).setDepth(-6);
        const buy = () => {
            if (currentMapId !== 'canteen') return;
            if (!socket.connected) {
                showToast('Chưa kết nối máy chủ.');
                return;
            }
            if (!window.confirm(`Xác nhận mua ${food.name} với giá ${food.coins.toLocaleString('vi-VN')} tiền đồng?`)) return;
            socket.emit('canteenPurchase', { itemId, currency: 'coins', quantity: 1 });
        };
        frame.on('pointerdown', buy);
        label.setInteractive({ useHandCursor: true }).on('pointerdown', buy);
        label.on('pointerover', () => label.setStyle({ color: '#ffe08a' }));
        label.on('pointerout', () => label.setStyle({ color: '#ffffff' }));
        canteenQuickBuyObjects.push(frame, label);
    });
}

function drawCanteenHallOfFame(scene) {
    // TOP 1 reputation and coin awards remain fixed in the two upper corners.
    const createAward = (x, category, title, color) => {
        const frameColor = color === '#ffd166' ? 0xffc928 : 0x35dff2;
        const panel = scene.add.rectangle(x, 111, 190, 58,
            frameColor === 0xffc928 ? 0x274a2a : 0x183d4a, 0.98)
            .setDepth(-8).setStrokeStyle(2, frameColor, 1)
            .setInteractive({ useHandCursor: true });
        const heading = scene.add.text(x, 99, `🏆 TOP 1 ${title}`, {
            font: 'bold 12px Arial', color: '#ffffff', align: 'center',
            wordWrap: { width: 180 }, padding: { x: 2, y: 2 }
        }).setOrigin(0.5).setDepth(-7).setInteractive({ useHandCursor: true });
        const top = getServerRankingRows(category)[0];
        const winner = scene.add.text(x, 125, top
            ? `${String(top.nickname || 'Người chơi')} · ${(Number(top.score) || 0).toLocaleString('vi-VN')}`
            : 'Chưa có dữ liệu', {
            font: 'bold 11px Arial', color: '#ffffff', align: 'center',
            wordWrap: { width: 180 }, padding: { x: 2, y: 2 }
        }).setOrigin(0.5).setDepth(-7).setInteractive({ useHandCursor: true });
        const open = () => openCanteenRanking(category);
        panel.on('pointerdown', open);
        heading.on('pointerdown', open);
        winner.on('pointerdown', open);
        [heading, winner].forEach((label) => {
            label.on('pointerover', () => label.setStyle({ color }));
            label.on('pointerout', () => label.setStyle({ color: '#ffffff' }));
        });
    };

    createAward(130, 'reputation', 'DANH TIẾNG', '#ffd166');
    createAward(670, 'coins', 'TIỀN ĐỒNG', '#9ed2ff');
    renderCanteenQuickBuyButtons(scene);
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
    drawIsoGround(g, mapId === 'farm' ? 0x85ad6a : 0x82ad65, mapId === 'farm' ? 0x779d5e : 0x789c5d);
    g.fillStyle(0xd8cfb6, 1).fillRoundedRect(52, 52, 696, 496, 18);
    g.fillStyle(mapId === 'farm' ? 0x7eaa68 : 0x82ad65, 1).fillRoundedRect(68, 68, 664, 464, 14);
    // Tile the playable interior with alternating isometric diamonds.
    for (let row = 0; row < 18; row++) {
        for (let col = 0; col < 18; col++) {
            const x = 68 + col * 48 + (row % 2 ? 24 : 0);
            const y = 76 + row * 28;
            if (x < 68 || x > 732 || y < 68 || y > 532) continue;
            drawIsoDiamond(g, x, y, 24, 14,
                (row + col) % 2 ? 0x91b974 : 0x7ea764, 0.48, 0xc3dda1);
        }
    }
    // Isometric floor seams remain visible around the playable props.
    g.lineStyle(1, 0xd5e8b7, 0.16);
    for (let x = 95; x < 730; x += 48) {
        g.lineBetween(x, 80, x + 24, 105);
        g.lineBetween(x, 520, x + 24, 495);
    }
    // Soft edge highlights and tiny ground accents give each interior a
    // hand-painted 2D cartoon look while keeping gameplay coordinates unchanged.
    g.lineStyle(2, 0xdaf0c4, 0.42).strokeRoundedRect(72, 72, 656, 456, 12);
    if (mapId === 'farm') {
        g.fillStyle(0x5c864c, 1).fillRoundedRect(120, 220, 560, 180, 16);
        g.fillStyle(0x496f3e, 0.35).fillEllipse(400, 397, 535, 20);
        FARM_PLOT_LAYOUT.forEach((plot, index) => {
            g.fillStyle(0x354e31, 0.22).fillRoundedRect(plot.x - 5, plot.y + plot.height + 5, plot.width + 14, 9, 4);
            g.fillStyle(0xc9b778, 1).fillRoundedRect(plot.x - 8, plot.y - 12, plot.width + 16, plot.height + 24, 6);
            g.fillStyle(0xe6d39a, 1).fillRoundedRect(plot.x - 5, plot.y - 9, plot.width + 10, 4, 2);
            // Raised planting bed: darker front edge and highlighted top rim.
            g.fillStyle(0x493322, 1).fillRoundedRect(plot.x + 2, plot.y + 4, plot.width, plot.height, 4);
            g.fillStyle(0x6b4b32, 1).fillRoundedRect(plot.x, plot.y, plot.width, plot.height, 4);
            g.fillStyle(0x9a7650, 0.75).fillRoundedRect(plot.x + 2, plot.y + 1, plot.width - 4, 3, 2);
            for (let row = 1; row <= 3; row++) {
                g.lineStyle(1, 0x805b3a, 0.75).lineBetween(plot.x + 4, plot.y + row * plot.height / 4, plot.x + plot.width - 4, plot.y + row * plot.height / 4);
            }
            scene.add.text(plot.x + plot.width / 2, plot.y - 18, `LUỐNG ${index + 1}`, {
                font: 'bold 11px Arial', color: '#fff', backgroundColor: '#355b36', padding: { x: 4, y: 2 }
            }).setOrigin(0.5).setDepth(-9);
        });
    } else {
        g.fillStyle(0x5f9a61, 1).fillRoundedRect(180, 160, 440, 280, 12);
        g.lineStyle(3, 0xd5e6c2, 0.8).strokeRoundedRect(196, 176, 408, 248, 8);
        if (mapId === 'sports') {
            // Bright field stripes, center spot and goal mouths.
            g.fillStyle(0x6da967, 0.45).fillRoundedRect(204, 184, 392, 232, 8);
            g.lineStyle(3, 0xe4f0d1, 0.9).strokeRoundedRect(204, 184, 392, 232, 8);
            g.lineStyle(2, 0xe4f0d1, 0.9).lineBetween(400, 184, 400, 416).strokeCircle(400, 300, 42);
            g.strokeRect(204, 245, 52, 110).strokeRect(544, 245, 52, 110);
            g.fillStyle(0xe4f0d1, 0.9).fillCircle(400, 300, 4);
        } else if (mapId === 'fountain') {
            g.fillStyle(0x29402d, 0.25).fillEllipse(405, 385, 190, 42);
            g.fillStyle(0xe4e7df, 1).fillCircle(400, 300, 100);
            g.lineStyle(5, 0xc2cfc1, 1).strokeCircle(400, 300, 91);
            g.fillStyle(0x3299b5, 1).fillCircle(400, 300, 78);
            g.lineStyle(3, 0x78d9e8, 0.9).strokeCircle(400, 300, 62);
            g.fillStyle(0xb9f3ff, 1).fillCircle(400, 300, 35);
            g.fillStyle(0xffffff, 0.9).fillEllipse(384, 278, 20, 8).fillEllipse(415, 319, 13, 6);
            g.fillStyle(0xf4d77c, 1).fillCircle(400, 300, 8);
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
            // Counter with a soft shadow, wood face, cream trim and striped canopy.
            g.fillStyle(0x29402d, 0.28).fillEllipse(402, 291, 390, 42);
            g.fillStyle(0x8b633d, 1).fillRoundedRect(216, 218, 368, 66, 10);
            // Raised counter top with a bright front lip to suggest an isometric block.
            g.fillStyle(0x29402d, 0.28).fillRoundedRect(213, 218, 374, 76, 12);
            g.fillStyle(0xb9955d, 1).fillRoundedRect(216, 199, 368, 82, 12);
            g.fillStyle(0xf1d9a2, 1).fillRoundedRect(220, 202, 360, 72, 9);
            g.fillStyle(0xd4b67d, 1).fillRoundedRect(220, 205, 360, 63, 8);
            for (let i = 0; i < 8; i++) {
                g.fillStyle(i % 2 ? 0xf4e7c8 : 0xc86f55, 0.95)
                    .fillRoundedRect(228 + i * 43, 202, 22, 10, 3);
            }
            g.fillStyle(0x9b7148, 1).fillRoundedRect(234, 264, 332, 10, 4);
            g.fillStyle(0xf6e9c9, 0.85).fillRoundedRect(248, 216, 304, 37, 7);
            scene.add.text(400, 235, '🍽️ QUẦY ẨM THỰC', { font: 'bold 16px Arial', color: '#5d472d' }).setOrigin(0.5).setDepth(-9);
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
    // Explicit cleanup prevents quick-buy UI from leaking into farms or other maps.
    clearCanteenQuickBuyButtons();
    mapObjects.forEach((object) => {
        if (object && object.active) object.destroy();
    });
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
