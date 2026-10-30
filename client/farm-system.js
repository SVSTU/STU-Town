/* Farm gameplay client handlers: plot state, mouse events and plot actions. */

function registerFarmSocketHandlers() {
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
}

function registerFarmDomHandlers() {
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
}
