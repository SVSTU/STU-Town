/* STU-Town UI panels: inventory, stats, services, trading and food orders. */

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
    if (['khu-a', 'canteen'].includes(currentMapId)) {
        // Do not replace the active merchant form on periodic player-state updates:
        // replacing its select/input interrupts focus and makes the trade UI flicker.
        if (zoneServiceView.screen === 'trade' && zoneServiceView.target === 'merchant') {
            updateTradeSummary();
        } else {
            renderZoneServices(currentMapId);
        }
    }
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
        // Preserve the user's in-progress typing. Only normalize the field after
        // editing ends; periodic state updates must never overwrite the caret/value.
        if (document.activeElement !== quantityInput) {
            quantityInput.value = String(zoneServiceView.quantity);
        }
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
