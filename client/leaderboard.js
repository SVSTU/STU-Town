/* Leaderboard and event ranking client handlers. */

function registerLeaderboardSocketHandlers() {
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
}

function registerLeaderboardDomHandlers() {
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
}
