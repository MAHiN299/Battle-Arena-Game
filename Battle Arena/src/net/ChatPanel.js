import net from './NetClient';
import { QUICK_MESSAGES, findQuick, isKeyReservedForGameplay } from './QuickChat';
import { EMOJI_SET } from './Emoji';

// ============================================================
// In-game chat — CSS/DOM widget (was pure Phaser canvas text with a
// hand-rolled keystroke buffer; now a real <input> so typing, paste,
// cursor movement and text selection all just work). Collapsed to a
// floating icon by default; click or press T to open. Badge shows
// unread count while closed.
//
// One instance is meant to live for the whole online session — it's
// created once by ChatOverlayScene when you connect from the Lobby,
// and persists across Lobby → Character Select → Game without being
// recreated (see ChatOverlayScene.js). buildDom() removes any stale
// leftover node first, so even if something did construct a second
// one it wouldn't leave two floating icons on screen.
// ============================================================

export default class ChatPanel
{
    constructor(scene, config = {})
    {
        this.scene = scene;

        this.isOpen   = false;
        this.unread   = 0;
        this.messages = [];

        this.buildDom();
        this.wire();

        net.chatLog.forEach(m => this.pushMessage(m, false));
    }

    // ============================================================
    // DOM
    // ============================================================
    buildDom()
    {
        const stale = document.getElementById('ingame-chat-overlay');
        if (stale) stale.remove();

        const el = document.createElement('div');
        el.id = 'ingame-chat-overlay';
        el.innerHTML = `
            <div id="ingame-chat-panel">
                <header class="ingame-chat-header">
                    <span class="ingame-chat-title">CHAT</span>
                    <button id="ingame-chat-close" type="button">&#10005;</button>
                </header>
                <div id="ingame-chat-log"></div>
                <div id="ingame-chat-typing"></div>
                <div class="ingame-chat-quickrow" id="ingame-chat-quickrow"></div>
                <div class="ingame-chat-emojirow" id="ingame-chat-emojirow"></div>
                <div class="ingame-chat-inputrow">
                    <input id="ingame-chat-input" type="text" maxlength="140" placeholder="Type a message..." autocomplete="off" />
                    <button id="ingame-chat-send" type="button">&#10148;</button>
                </div>
            </div>
            <button id="ingame-chat-icon" type="button" title="Chat (T)">
                &#128172;
                <span id="ingame-chat-badge" class="ingame-chat-badge">0</span>
            </button>
        `;
        document.body.appendChild(el);
        this.el = el;

        this.iconEl   = el.querySelector('#ingame-chat-icon');
        this.badgeEl  = el.querySelector('#ingame-chat-badge');
        this.panelEl  = el.querySelector('#ingame-chat-panel');
        this.logEl    = el.querySelector('#ingame-chat-log');
        this.typingEl = el.querySelector('#ingame-chat-typing');
        this.inputEl  = el.querySelector('#ingame-chat-input');

        const quickRow = el.querySelector('#ingame-chat-quickrow');
        QUICK_MESSAGES.forEach(q => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'ingame-chat-quickbtn';
            btn.style.color = q.color;
            btn.title = q.text + '  (' + q.key + ')';
            btn.textContent = q.icon;
            btn.addEventListener('click', () => net.send('chat', { text: q.text, quick: true }));
            quickRow.appendChild(btn);
        });

        const emojiRow = el.querySelector('#ingame-chat-emojirow');
        EMOJI_SET.forEach(e => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'ingame-chat-emojibtn';
            btn.textContent = e;
            btn.addEventListener('click', () => {
                this.inputEl.value += e;
                this.inputEl.focus();
            });
            emojiRow.appendChild(btn);
        });

        this.iconEl.addEventListener('click', () => this.setOpen(!this.isOpen));
        el.querySelector('#ingame-chat-close').addEventListener('click', () => this.setOpen(false));
        el.querySelector('#ingame-chat-send').addEventListener('click', () => this.sendCurrent());

        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); this.sendCurrent(); }
            else if (e.key === 'Escape') { e.preventDefault(); this.setOpen(false); }
            e.stopPropagation();
        });
        this.inputEl.addEventListener('input', () => this.broadcastTyping());

        this.setOpen(false);
    }

    // ============================================================
    // OPEN / CLOSE
    // ============================================================
    setOpen(open)
    {
        this.isOpen = open;
        this.el.classList.toggle('open', open);

        if (open) {
            this.unread = 0;
            this.updateBadge();
            this.scrollToBottom();
            this.inputEl.focus();
        } else {
            this.inputEl.blur();
        }
    }

    // ============================================================
    // INPUT / HOTKEYS
    // ============================================================
    wire()
    {
        this.onChat = (msg) => this.pushMessage(msg, true);
        net.on('chat', this.onChat);

        this.onEvt = (msg) => this.handleEvent(msg);
        net.on('event', this.onEvt);

        // Global hotkeys (T to open, 1-6 quick messages while closed,
        // Escape to close) — bound on the document rather than a
        // particular Phaser scene's input plugin, so they keep working
        // across the Lobby → Character Select → Game transitions this
        // one widget instance lives through.
        this.keyHandler = (e) => this.onGlobalKey(e);
        document.addEventListener('keydown', this.keyHandler);

        if (this.scene && this.scene.events) {
            this.scene.events.once('shutdown', () => this.destroy());
        }
    }

    onGlobalKey(e)
    {
        // Never hijack keys while some other real text field is focused.
        const active = document.activeElement;
        const typingElsewhere = active && active !== this.inputEl
            && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
        if (typingElsewhere) return;

        if (!this.isOpen) {
            // Some digit keys double as gameplay hotkeys (boss-fight
            // supplies use 1/2/3) — while that feature has reserved a
            // key, skip the quick-chat message so one keypress doesn't
            // both use a supply and spam a chat line.
            if (isKeyReservedForGameplay(e.key)) return;

            const quick = findQuick(e.key);
            if (quick) {
                net.send('chat', { text: quick.text, quick: true });
                e.preventDefault();
                return;
            }
            if (e.key.toLowerCase() === 't') {
                this.setOpen(true);
                e.preventDefault();
            }
            return;
        }

        if (e.key === 'Escape' && active !== this.inputEl) {
            this.setOpen(false);
        }
    }

    sendCurrent()
    {
        const text = this.inputEl.value.trim();
        if (text) net.chat(text);
        this.inputEl.value = '';
    }

    broadcastTyping()
    {
        const now = Date.now();
        if (this.lastPing && now - this.lastPing < 1200) return;
        this.lastPing = now;
        net.sendEvent('typing', {});
    }

    handleEvent(msg)
    {
        if (msg.name !== 'typing') return;

        const other = net.otherPlayer();
        this.typingEl.textContent = (other ? other.username : 'Someone') + ' is typing...';

        clearTimeout(this.typingClear);
        this.typingClear = setTimeout(() => { this.typingEl.textContent = ''; }, 1800);
    }

    // ============================================================
    // MESSAGES
    // ============================================================
    pushMessage(msg, isNew)
    {
        const mine = msg.from === net.username;

        this.messages.push({ from: msg.from, text: msg.text, system: !!msg.system, mine });
        if (this.messages.length > 40) this.messages.shift();

        this.typingEl.textContent = '';
        clearTimeout(this.typingClear);

        this.appendRow(this.messages[this.messages.length - 1]);
        this.trimLog();

        if (this.isOpen) {
            this.scrollToBottom();
        } else if (isNew && !msg.system) {
            this.unread++;
            this.updateBadge();
            this.pingIcon();
        }
    }

    trimLog()
    {
        while (this.logEl.children.length > 40) {
            this.logEl.removeChild(this.logEl.firstChild);
        }
    }

    appendRow(m)
    {
        const row = document.createElement('div');

        if (m.system) {
            row.className = 'ingame-chat-system';
            row.textContent = '— ' + m.text + ' —';
        } else {
            row.className = 'ingame-chat-row' + (m.mine ? ' mine' : '');
            row.innerHTML = `
                <div class="ingame-chat-from">${this.escape(m.mine ? 'You' : m.from)}</div>
                <div class="ingame-chat-bubble">${this.escape(m.text)}</div>
            `;
        }

        this.logEl.appendChild(row);
    }

    scrollToBottom()
    {
        this.logEl.scrollTop = this.logEl.scrollHeight;
    }

    updateBadge()
    {
        const show = this.unread > 0;
        this.badgeEl.classList.toggle('visible', show);
        this.badgeEl.textContent = this.unread > 9 ? '9+' : String(this.unread);
    }

    pingIcon()
    {
        this.iconEl.classList.remove('ping');
        // Force reflow so the animation can retrigger on rapid messages.
        void this.iconEl.offsetWidth;
        this.iconEl.classList.add('ping');

        if (this.scene && this.scene.sound && this.scene.sound.get) {
            try { this.scene.sound.play('uiPing', { volume: 0.3 }); } catch (e) {}
        }
    }

    escape(str)
    {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }

    // ============================================================
    // PUBLIC
    // ============================================================
    isCapturingInput()
    {
        return this.isOpen;
    }

    destroy()
    {
        document.removeEventListener('keydown', this.keyHandler);
        net.off('chat', this.onChat);
        net.off('event', this.onEvt);
        clearTimeout(this.typingClear);
        if (this.el) { this.el.remove(); this.el = null; }
    }
}