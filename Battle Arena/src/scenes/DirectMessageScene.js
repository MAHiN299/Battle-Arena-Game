import Phaser from 'phaser';
import api from '../api/api';
import net from '../net/NetClient';

// Friend-to-friend chat — CSS/DOM overlay (was pure Phaser canvas with
// a hand-rolled keystroke buffer; now a real <input>), same lifecycle
// pattern as Profile/Friends/Shop. Opened from FriendsScene's or
// ProfileScene's "MESSAGE" button with { friendUsername }. History is
// loaded from the server (messages are persisted, see
// DirectMessageService), and new messages from this friend arrive
// live over the same 'directMessage' WebSocket event that
// GlobalChatScene pops a toast for elsewhere.
export default class DirectMessageScene extends Phaser.Scene
{
    constructor() { super('DirectMessageScene'); }

    init(data)
    {
        this.friendUsername = data && data.friendUsername ? data.friendUsername : null;
    }

    create()
    {
        const w = this.cameras.main.width, h = this.cameras.main.height;
        this.add.rectangle(0, 0, w, h, 0x08080a).setOrigin(0, 0);

        this.messages = [];

        this.buildOverlay();
        this.wire();
        this.events.once('shutdown', () => this.destroyOverlay());

        if (!this.friendUsername) {
            this.setStatus('No friend selected', true);
            return;
        }

        this.loadHistory();
    }

    // ============================================================
    // DOM OVERLAY LIFECYCLE
    // ============================================================
    buildOverlay()
    {
        const el = document.createElement('div');
        el.id = 'dm-overlay';
        el.innerHTML = `
            <header class="dm-header">
                <button id="dm-back" type="button">&larr;&nbsp;BACK</button>
                <div class="dm-title">${this.escape((this.friendUsername || 'CHAT').toUpperCase())}</div>
                <div class="dm-header-spacer"></div>
            </header>
            <div id="dm-log"></div>
            <div id="dm-status"></div>
            <div class="dm-inputrow">
                <input id="dm-input" type="text" maxlength="480" placeholder="Type a message..." autocomplete="off" />
                <button id="dm-send" type="button">SEND</button>
            </div>
        `;
        document.body.appendChild(el);
        this.overlayEl = el;

        requestAnimationFrame(() => el.classList.add('visible'));

        this.logEl = el.querySelector('#dm-log');
        this.statusEl = el.querySelector('#dm-status');
        this.inputEl = el.querySelector('#dm-input');

        el.querySelector('#dm-back').addEventListener('click', () => this.scene.start('FriendsScene'));
        el.querySelector('#dm-send').addEventListener('click', () => this.sendCurrent());

        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); this.sendCurrent(); }
            e.stopPropagation();
        });

        this.input.keyboard.on('keydown-ESC', () => this.scene.start('FriendsScene'));

        if (this.friendUsername) this.inputEl.focus();
    }

    destroyOverlay()
    {
        if (this.overlayEl) { this.overlayEl.remove(); this.overlayEl = null; }
    }

    setStatus(text, isError)
    {
        this.statusEl.textContent = text;
        this.statusEl.className = isError ? 'dm-status-error' : 'dm-status-ok';
    }

    // ============================================================
    // NETWORK
    // ============================================================
    async loadHistory()
    {
        this.setStatus('Loading...', false);
        try {
            this.messages = await api.getConversation(this.friendUsername);
            this.setStatus('', false);
            this.renderMessages();
            api.markMessagesRead(this.friendUsername).catch(() => {});
        } catch (err) {
            this.setStatus('Could not load — ' + err.message, true);
        }
    }

    async sendCurrent()
    {
        const text = this.inputEl.value.trim();
        if (!text || !this.friendUsername) return;

        this.inputEl.value = '';

        try {
            const saved = await api.sendDirectMessage(this.friendUsername, text);
            this.messages.push(saved);
            this.renderMessages();
        } catch (err) {
            this.setStatus(err.message, true);
        }
    }

    wire()
    {
        // Live delivery from GameSocketHandler.sendDirectMessage(...) —
        // only append here if it's from the friend we're actually
        // looking at; GlobalChatScene handles the toast for every case.
        this.onDirectMessage = (msg) => {
            if (msg.type !== 'directMessage' || msg.from !== this.friendUsername) return;
            this.messages.push({
                fromUsername: msg.from,
                toUsername: api.getUser() ? api.getUser().username : null,
                text: msg.text,
                createdAt: msg.createdAt
            });
            this.renderMessages();
            // We're already looking at this conversation, so it's read —
            // ping the server (loadHistory won't be called again here).
            api.markMessagesRead(this.friendUsername).catch(() => {});
        };
        net.on('directMessage', this.onDirectMessage);

        this.events.once('shutdown', () => {
            net.off('directMessage', this.onDirectMessage);
        });
    }

    // ============================================================
    // MESSAGES
    // ============================================================
    renderMessages()
    {
        this.logEl.innerHTML = '';
        const me = api.getUser() ? api.getUser().username : null;
        const visible = this.messages.slice(-60);

        visible.forEach(m => this.appendRow(m, m.fromUsername === me));

        this.logEl.scrollTop = this.logEl.scrollHeight;
    }

    appendRow(m, isMe)
    {
        const row = document.createElement('div');
        row.className = 'dm-row' + (isMe ? ' mine' : '');
        row.innerHTML = `
            <div class="dm-from" style="color:${isMe ? '#ffcc66' : '#8ab4ff'}">${this.escape(isMe ? 'You' : m.fromUsername)}</div>
            <div class="dm-bubble">${this.escape(m.text)}</div>
        `;
        this.logEl.appendChild(row);
    }

    escape(str)
    {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }
}