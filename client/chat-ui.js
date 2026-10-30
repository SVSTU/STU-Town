/* STU-Town chat UI and private messaging. */

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
