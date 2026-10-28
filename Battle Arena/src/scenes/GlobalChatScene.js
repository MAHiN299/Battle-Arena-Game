import Phaser from 'phaser';
import net from '../net/NetClient';
import api from '../api/api';

const REACTIONS = ['👍', '❤️', '😂', '🔥', '😮'];

const AVATAR_COLORS = ['#ff6b6b', '#4dabf7', '#69db7c', '#ffd43b', '#da77f2', '#ff922b'];

function colorForName(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ============================================================
// Global "Network Chat" — CSS/DOM overlay (was pure Phaser canvas
// with a hand-rolled keystroke buffer; now a real <input>). Runs
// continuously in the background from login onward (see LoginScene)
// so it can keep popping friend-request / DM toasts no matter which
// scene the player is actually on; the chat panel itself is toggled
// by the "Network Chat" menu button via setVisible()/isPanelVisible,
// same external API as before so MenuScene didn't need to change.
// ============================================================
export default class GlobalChatScene extends Phaser.Scene
{
    constructor() {
        super('GlobalChatScene');
    }

    create()
    {
        if (this.alreadyBuilt) return;
        this.alreadyBuilt = true;

        this.messages = [];
        this.msgIdCounter = 0;
        this.myReactions = new Set();
        this.openPickerId = null;
        this.isPanelVisible = false;
        this.toasts = [];

        this.buildOverlay();
        this.buildToastStack();
        this.wire();

        this.events.once('shutdown', () => this.destroyOverlay());
    }

    // ============================================================
    // DOM OVERLAY
    // ============================================================
    buildOverlay()
    {
        const el = document.createElement('div');
        el.id = 'globalchat-overlay';
        el.innerHTML = `
            <div id="globalchat-panel">
                <header class="globalchat-header">
                    <span class="globalchat-icon">🌐</span>
                    <span class="globalchat-title">NETWORK CHAT</span>
                    <span class="globalchat-presence-dot" id="globalchat-dot"></span>
                    <span class="globalchat-presence-text" id="globalchat-presence">connecting...</span>
                    <button id="globalchat-close" type="button">&#10005;</button>
                </header>
                <div id="globalchat-log"></div>
                <div class="globalchat-inputrow">
                    <input id="globalchat-input" type="text" maxlength="140" placeholder="Say something..." autocomplete="off" />
                    <button id="globalchat-send" type="button">&#10148;</button>
                </div>
            </div>
        `;
        document.body.appendChild(el);
        this.overlayEl = el;

        this.logEl = el.querySelector('#globalchat-log');
        this.inputEl = el.querySelector('#globalchat-input');
        this.presenceEl = el.querySelector('#globalchat-presence');

        el.querySelector('#globalchat-close').addEventListener('click', () => this.setVisible(false));
        el.querySelector('#globalchat-send').addEventListener('click', () => this.sendCurrent());

        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); this.sendCurrent(); }
            else if (e.key === 'Escape') { e.preventDefault(); this.setVisible(false); }
            e.stopPropagation();
        });

        // Clicking the dark backdrop (outside the panel) closes it too.
        el.addEventListener('mousedown', (e) => {
            if (e.target === el) this.setVisible(false);
        });
    }

    buildToastStack()
    {
        const el = document.createElement('div');
        el.id = 'chat-toast-stack';
        document.body.appendChild(el);
        this.toastStackEl = el;
    }

    destroyOverlay()
    {
        if (this.overlayEl) { this.overlayEl.remove(); this.overlayEl = null; }
        if (this.toastStackEl) { this.toastStackEl.remove(); this.toastStackEl = null; }
    }

    setVisible(visible)
    {
        this.isPanelVisible = visible;
        this.overlayEl.classList.toggle('visible', visible);

        if (visible) {
            this.renderMessages();
            this.inputEl.focus();
        } else {
            this.inputEl.blur();
        }
    }

    // ============================================================
    // NETWORK
    // ============================================================
    wire()
    {
        this.onGlobalChat = (msg) => {
            this.msgIdCounter++;
            this.messages.push({
                id: this.msgIdCounter,
                from: msg.from,
                text: msg.text,
                reactions: {},
                at: Date.now()
            });
            if (this.messages.length > 40) this.messages.shift();
            if (this.isPanelVisible) this.renderMessages();
        };
        net.on('globalChat', this.onGlobalChat);

        this.onReaction = (msg) => {
            if (msg.name !== 'reaction') return;
            const target = this.messages.find(m => m.id === msg.data.id);
            if (!target) return;

            target.reactions[msg.data.emoji] = (target.reactions[msg.data.emoji] || 0) + 1;
            if (this.isPanelVisible) this.renderMessages();
        };
        net.on('event', this.onReaction);

        this.onPresence = (msg) => {
            this.presenceEl.textContent = msg.count + (msg.count === 1 ? ' player online' : ' players online');
        };
        net.on('presence', this.onPresence);

        this.onFriendRequestReceived = (msg) => {
            this.showToast((msg.otherUsername || 'Someone') + ' sent you a friend request', '#8cff9b', '👤');
        };
        net.on('friendRequestReceived', this.onFriendRequestReceived);

        this.onFriendRequestAccepted = (msg) => {
            this.showToast((msg.otherUsername || 'Someone') + ' accepted your friend request', '#ffcc00', '🤝');
        };
        net.on('friendRequestAccepted', this.onFriendRequestAccepted);

        this.onDirectMessage = (msg) => {
            if (msg.type !== 'directMessage') return;
            const dmScene = this.scene.get('DirectMessageScene');
            const alreadyViewing = dmScene && this.scene.isActive('DirectMessageScene')
                && dmScene.friendUsername === msg.from;
            if (alreadyViewing) return;
            const preview = msg.text.length > 40 ? msg.text.slice(0, 40) + '…' : msg.text;
            this.showToast(msg.from + ': ' + preview, '#76d7ff', '💬');
        };
        net.on('directMessage', this.onDirectMessage);

        this.events.once('shutdown', () => {
            net.off('globalChat', this.onGlobalChat);
            net.off('event', this.onReaction);
            net.off('presence', this.onPresence);
            net.off('friendRequestReceived', this.onFriendRequestReceived);
            net.off('friendRequestAccepted', this.onFriendRequestAccepted);
            net.off('directMessage', this.onDirectMessage);
        });
    }

    sendCurrent()
    {
        const text = this.inputEl.value.trim();
        if (text) net.globalChat(text);
        this.inputEl.value = '';
    }

    // ============================================================
    // TOAST NOTIFICATIONS
    // ============================================================
    showToast(text, accentColor = '#76d7ff', icon = '👥')
    {
        const toast = document.createElement('div');
        toast.className = 'chat-toast';
        toast.style.setProperty('--accent', accentColor);
        toast.innerHTML = `
            <span class="chat-toast-icon">${icon}</span>
            <span class="chat-toast-text">${this.escape(text)}</span>
        `;
        this.toastStackEl.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('visible'));

        setTimeout(() => {
            toast.classList.remove('visible');
            toast.classList.add('leaving');
            setTimeout(() => toast.remove(), 260);
        }, 3200);
    }

    // ============================================================
    // MESSAGES
    // ============================================================
    renderMessages()
    {
        this.logEl.innerHTML = '';
        this.openPickerId = null;

        const visible = this.messages.slice(-40);
        const me = api.getUser() ? api.getUser().username : null;

        let lastFrom = null;
        visible.forEach((m) => {
            const isMe = m.from === me;
            const sameAsLast = m.from === lastFrom;
            this.renderRow(m, isMe, sameAsLast);
            lastFrom = m.from;
        });

        this.logEl.scrollTop = this.logEl.scrollHeight;
    }

    renderRow(m, isMe, sameAsLast)
    {
        const row = document.createElement('div');
        row.className = 'globalchat-row' + (isMe ? ' mine' : '') + (sameAsLast ? ' stacked' : '');

        const avatarColor = isMe ? '#ffcc66' : colorForName(m.from);
        const initial = (isMe ? 'You' : m.from).charAt(0).toUpperCase();

        const reactionEntries = Object.entries(m.reactions).filter(([, count]) => count > 0);
        const reactionsHtml = reactionEntries.length
            ? `<div class="globalchat-reactions">` + reactionEntries.map(([emoji, count]) => {
                const mine = this.myReactions.has(m.id + ':' + emoji);
                return `<button type="button" class="globalchat-reaction-chip${mine ? ' mine' : ''}" data-id="${m.id}" data-emoji="${emoji}">${emoji} ${count}</button>`;
            }).join('') + `</div>`
            : '';

        row.innerHTML = `
            ${sameAsLast ? '' : `<div class="globalchat-avatar" style="background:${avatarColor}">${this.escape(initial)}</div>`}
            <div class="globalchat-bubble-col">
                ${sameAsLast ? '' : `<div class="globalchat-name" style="color:${isMe ? '#ffcc66' : '#8ab4ff'}">${this.escape(isMe ? 'You' : m.from)}</div>`}
                <button type="button" class="globalchat-bubble" data-id="${m.id}">${this.escape(m.text)}</button>
                ${reactionsHtml}
                <div class="globalchat-picker" data-picker="${m.id}" hidden>
                    ${REACTIONS.map(e => `<button type="button" class="globalchat-picker-emoji" data-id="${m.id}" data-emoji="${e}">${e}</button>`).join('')}
                </div>
            </div>
        `;

        row.querySelector('.globalchat-bubble').addEventListener('click', (e) => {
            const id = Number(e.currentTarget.dataset.id);
            const picker = row.querySelector(`.globalchat-picker[data-picker="${id}"]`);
            const wasOpen = !picker.hidden;
            this.logEl.querySelectorAll('.globalchat-picker').forEach(p => p.hidden = true);
            picker.hidden = wasOpen;
        });

        row.querySelectorAll('.globalchat-picker-emoji').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = Number(btn.dataset.id);
                const emoji = btn.dataset.emoji;
                net.sendGlobalEvent('reaction', { id, emoji });
                this.myReactions.add(id + ':' + emoji);
                btn.closest('.globalchat-picker').hidden = true;
            });
        });

        row.querySelectorAll('.globalchat-reaction-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const id = Number(chip.dataset.id);
                const emoji = chip.dataset.emoji;
                net.sendGlobalEvent('reaction', { id, emoji });
                this.myReactions.add(id + ':' + emoji);
            });
        });

        this.logEl.appendChild(row);
    }

    escape(str)
    {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }
}