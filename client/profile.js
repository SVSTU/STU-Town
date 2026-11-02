/* STU-Town local player profile and avatar persistence helpers. */

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

function updateRecoveryCodeField(token = socket.auth?.playerToken || '') {
    const field = document.getElementById('player-recovery-code');
    if (field) field.value = typeof token === 'string' ? token : '';
}

async function copyRecoveryCode() {
    const token = socket.auth?.playerToken || '';
    if (!token) return alert('Chưa nhận được mã khôi phục từ máy chủ. Hãy chờ kết nối xong.');
    try {
        await navigator.clipboard.writeText(token);
    } catch {
        const field = document.getElementById('player-recovery-code');
        field?.select();
        document.execCommand('copy');
    }
    const button = document.getElementById('copy-recovery-code');
    if (button) {
        const oldText = button.textContent;
        button.textContent = 'Đã sao chép';
        setTimeout(() => { button.textContent = oldText; }, 1500);
    }
}

function restoreRecoveryCode() {
    const input = document.getElementById('restore-recovery-code');
    const token = String(input?.value || '').trim();
    if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) {
        alert('Mã khôi phục không hợp lệ.');
        return;
    }
    try {
        localStorage.setItem(PLAYER_TOKEN_STORAGE_KEY, token);
    } catch {
        alert('Không thể lưu mã khôi phục trong trình duyệt này.');
        return;
    }
    socket.auth.playerToken = token;
    location.reload();
}
