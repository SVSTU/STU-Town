/* Canteen ordering UI. Shared state and helpers are provided by ui-panels.js. */

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
