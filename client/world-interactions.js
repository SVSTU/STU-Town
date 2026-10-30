/* World interaction zones: benches, farm plots, event boxes and map interactions. */

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

/* Contextual interaction routing for interior and campus objects. */

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
