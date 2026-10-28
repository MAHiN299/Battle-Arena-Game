import Phaser from 'phaser';
import net from '../net/NetClient';
import api from '../api/api';

import lobbyBgAsset from '../Assets/lobby/lobbyBg.jpg';
import hostCardAsset from '../Assets/lobby/hostCard.jpg';
import joinCardAsset from '../Assets/lobby/joinCard.jpg';

// ============================================================
// Online Co-Op / Team Deathmatch lobby — CSS/DOM overlay (was pure
// Phaser canvas). Same three sub-screens as before (menu → host or
// join a room; joining → 4-character code entry; room → waiting
// room with ready-up), now over the supplied background art, with
// the Host/Join choices as the supplied illustrated cards.
// ============================================================
export default class LobbyScene extends Phaser.Scene
{
    constructor() {
        super('LobbyScene');
    }

    init(data)
    {
        this.mode = data?.mode === 'pvp' || data?.mode === 'tdm' ? 'pvp' : 'coop';
        this.uiMode = 'connecting';   // connecting | offline | menu | joining | room
        this.codeDigits = ['', '', '', ''];
    }

    create()
    {
        this.buildOverlay();
        this.wireNetwork();
        this.connect();

        this.input.keyboard.on('keydown-ESC', () => this.goBack());

        this.events.once('shutdown', () => this.destroyOverlay());
    }

    // ============================================================
    // DOM OVERLAY LIFECYCLE
    // ============================================================
    buildOverlay()
    {
        const el = document.createElement('div');
        el.id = 'lobby-overlay';
        el.style.backgroundImage = `url(${lobbyBgAsset})`;
        document.body.appendChild(el);
        this.overlayEl = el;

        requestAnimationFrame(() => el.classList.add('visible'));

        this.renderHeader();
        this.renderView();
    }

    destroyOverlay()
    {
        if (this.overlayEl) { this.overlayEl.remove(); this.overlayEl = null; }
    }

    renderHeader()
    {
        const titleText = this.mode === 'pvp' ? 'PLAYER VS PLAYER' : 'ONLINE CO-OP';
        const subtitleText = this.mode === 'pvp'
            ? 'Two players, same wifi, head-to-head battle'
            : 'Two players, same wifi, versus the waves';

        const header = document.createElement('header');
        header.className = 'lobby-header';
        header.innerHTML = `
            <button id="lobby-back" class="lobby-back-btn" type="button">&larr;&nbsp;BACK</button>
            <div class="lobby-title-block">
                <div class="lobby-title">⛩ <span class="lobby-title-1">${titleText.split(' ')[0]}</span> <span class="lobby-title-2">${titleText.split(' ').slice(1).join(' ')}</span></div>
                <div class="lobby-subtitle">${this.escape(subtitleText)}</div>
            </div>
        `;
        this.overlayEl.appendChild(header);
        header.querySelector('#lobby-back').addEventListener('click', () => this.goBack());

        const content = document.createElement('div');
        content.id = 'lobby-content';
        this.overlayEl.appendChild(content);
        this.contentEl = content;
    }

    setStatus(text, isError)
    {
        let statusEl = this.overlayEl.querySelector('#lobby-status');
        if (!statusEl) return;
        statusEl.textContent = text || '';
        statusEl.className = 'lobby-status' + (isError ? ' error' : '');
    }

    // ============================================================
    // CONNECTION
    // ============================================================
    async connect()
    {
        this.uiMode = 'connecting';
        this.renderView();

        const user = api.getUser();
        const name = user ? user.username : 'Player';

        try {
            await net.connect(name);

            if (!this.scene.isActive('ChatOverlayScene')) {
                this.scene.launch('ChatOverlayScene');
            }

            this.showMenu();
        } catch (err) {
            this.uiMode = 'offline';
            this.offlineMessage = err.message;
            this.renderView();
        }
    }

    // ============================================================
    // VIEW ROUTER
    // ============================================================
    renderView()
    {
        if (this.uiMode === 'connecting') return this.renderConnecting();
        if (this.uiMode === 'offline')    return this.renderOffline();
        if (this.uiMode === 'menu')       return this.renderMenu();
        if (this.uiMode === 'joining')    return this.renderJoining();
        if (this.uiMode === 'room')       return this.renderRoom();
    }

    renderConnecting()
    {
        this.contentEl.innerHTML = `<div class="lobby-status">Connecting...</div>`;
    }

    renderOffline()
    {
        this.contentEl.innerHTML = `
            <div class="lobby-offline">
                <div class="lobby-status error">${this.escape(this.offlineMessage || 'Could not reach the game server.')}</div>
                <p>Make sure the backend is running, and that the second device is on the same wifi network.</p>
            </div>
        `;
    }

    // ============================================================
    // MENU — host or join
    // ============================================================
    showMenu()
    {
        this.uiMode = 'menu';
        this.renderView();
    }

    renderMenu()
    {
        const otherDeviceUrl = 'http://' + window.location.hostname + ':' + window.location.port;

        this.contentEl.innerHTML = `
            <div class="lobby-cards">
                <button type="button" class="lobby-card" id="lobby-host-card" style="background-image:url(${hostCardAsset})"></button>
                <button type="button" class="lobby-card" id="lobby-join-card" style="background-image:url(${joinCardAsset})"></button>
            </div>
            <div class="lobby-info-pill">
                <span class="lobby-info-diamond">&#9670;</span>
                <span class="lobby-info-icon">&#128246;</span>
                <span>Other device should open:&nbsp;<b>${this.escape(otherDeviceUrl)}</b></span>
                <span class="lobby-info-diamond">&#9670;</span>
            </div>
            <div class="lobby-info-pill lobby-info-pill-sub">
                <span class="lobby-info-icon">&#8505;&#65039;</span>
                <span>If that says "localhost", find your PC's IP with&nbsp;<code>ipconfig</code></span>
            </div>
            <div class="lobby-status-row">
                <span class="lobby-status-diamond">&#9671;</span>
                <span class="lobby-status-dot"></span>
                <span class="lobby-status" id="lobby-status">Connected</span>
                <span class="lobby-status-diamond">&#9671;</span>
            </div>
        `;

        this.contentEl.querySelector('#lobby-host-card').addEventListener('click', () => this.hostRoom());
        this.contentEl.querySelector('#lobby-join-card').addEventListener('click', () => this.showJoin());
    }

    // ============================================================
    // HOSTING
    // ============================================================
    hostRoom()
    {
        this.setStatus('Creating room...', false);
        net.createRoom(this.mode);
    }

    // ============================================================
    // JOINING
    // ============================================================
    showJoin()
    {
        this.uiMode = 'joining';
        this.codeDigits = ['', '', '', ''];
        this.renderView();
    }

    renderJoining()
    {
        this.contentEl.innerHTML = `
            <div class="lobby-join">
                <div class="lobby-join-title">ENTER ROOM CODE</div>
                <div class="lobby-code-row" id="lobby-code-row"></div>
                <div class="lobby-join-hint">Type the code, then press ENTER or JOIN</div>
                <div class="lobby-status" id="lobby-status"></div>
                <div class="lobby-join-actions">
                    <button type="button" class="lobby-btn lobby-btn-cancel" id="lobby-cancel-btn">CANCEL</button>
                    <button type="button" class="lobby-btn lobby-btn-join" id="lobby-join-btn">JOIN</button>
                </div>
            </div>
        `;

        const row = this.contentEl.querySelector('#lobby-code-row');
        this.codeInputs = [];
        for (let i = 0; i < 4; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 1;
            input.className = 'lobby-code-box';
            input.autocomplete = 'off';
            input.spellcheck = false;

            input.addEventListener('input', () => {
                const ch = input.value.replace(/[^a-zA-Z0-9]/g, '').slice(-1).toUpperCase();
                input.value = ch;
                this.codeDigits[i] = ch;
                if (ch && this.codeInputs[i + 1]) this.codeInputs[i + 1].focus();
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !input.value && this.codeInputs[i - 1]) {
                    this.codeInputs[i - 1].focus();
                }
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.submitJoinCode();
                }
                e.stopPropagation();
            });

            this.codeInputs.push(input);
            row.appendChild(input);
        }
        this.codeInputs[0].focus();

        this.contentEl.querySelector('#lobby-cancel-btn').addEventListener('click', () => this.showMenu());
        this.contentEl.querySelector('#lobby-join-btn').addEventListener('click', () => this.submitJoinCode());
    }

    submitJoinCode()
    {
        const code = this.codeDigits.join('');
        if (code.length !== 4) {
            this.setStatus('Code must be 4 characters', true);
            return;
        }
        this.setStatus('Joining ' + code + '...', false);
        net.joinRoom(code);
    }

    // ============================================================
    // ROOM
    // ============================================================
    showRoom()
    {
        this.uiMode = 'room';
        this.renderView();
    }

    renderRoom()
    {
        this.contentEl.innerHTML = `
            <div class="lobby-room">
                <div class="lobby-room-code-label">ROOM CODE</div>
                <div class="lobby-room-code">${this.escape(net.roomCode || '----')}</div>
                <div class="lobby-slots">
                    <div class="lobby-slot" id="lobby-slot-0">
                        <div class="lobby-slot-name">Waiting...</div>
                        <div class="lobby-slot-role"></div>
                    </div>
                    <div class="lobby-slot" id="lobby-slot-1">
                        <div class="lobby-slot-name">Waiting...</div>
                        <div class="lobby-slot-role"></div>
                    </div>
                </div>
                <button type="button" class="lobby-btn lobby-btn-action" id="lobby-action-btn"></button>
                <button type="button" class="lobby-btn lobby-btn-leave" id="lobby-leave-btn">LEAVE ROOM</button>
                <div class="lobby-status" id="lobby-status"></div>
            </div>
        `;

        this.contentEl.querySelector('#lobby-action-btn').addEventListener('click', () => this.onAction());
        this.contentEl.querySelector('#lobby-leave-btn').addEventListener('click', () => this.leaveRoom());

        this.refreshRoom();
    }

    refreshRoom()
    {
        if (this.uiMode !== 'room') return;

        const players = net.players || [];
        const roomCodeEl = this.contentEl.querySelector('.lobby-room-code');
        if (roomCodeEl) roomCodeEl.textContent = net.roomCode || '----';

        [0, 1].forEach(i => {
            const slotEl = this.contentEl.querySelector('#lobby-slot-' + i);
            if (!slotEl) return;
            const p = players[i];
            const nameEl = slotEl.querySelector('.lobby-slot-name');
            const roleEl = slotEl.querySelector('.lobby-slot-role');

            slotEl.classList.remove('empty', 'host', 'ready', 'notready');

            if (!p) {
                nameEl.textContent = 'Waiting...';
                roleEl.textContent = '';
                slotEl.classList.add('empty');
                return;
            }

            nameEl.textContent = p.username;
            if (p.isHost) {
                roleEl.textContent = 'HOST';
                slotEl.classList.add('host');
            } else if (p.ready) {
                roleEl.textContent = 'READY';
                slotEl.classList.add('ready');
            } else {
                roleEl.textContent = 'NOT READY';
                slotEl.classList.add('notready');
            }
        });

        const me = players.find(p => p.username === net.username);
        const other = players.find(p => p.username !== net.username);
        const actionBtn = this.contentEl.querySelector('#lobby-action-btn');
        if (!actionBtn) return;

        if (net.isHost) {
            const canStart = other && other.ready;
            actionBtn.textContent = canStart ? 'START GAME' : 'WAITING FOR PLAYER';
            actionBtn.disabled = !canStart;
            actionBtn.classList.toggle('disabled', !canStart);
        } else {
            const ready = me && me.ready;
            actionBtn.textContent = ready ? 'NOT READY' : 'READY UP';
            actionBtn.disabled = false;
            actionBtn.classList.toggle('disabled', false);
            actionBtn.classList.toggle('is-ready', !!ready);
        }
    }

    onAction()
    {
        const actionBtn = this.contentEl.querySelector('#lobby-action-btn');
        if (actionBtn && actionBtn.disabled) return;

        if (net.isHost) {
            net.startGame();
        } else {
            const me = net.players.find(p => p.username === net.username);
            net.setReady(!(me && me.ready));
        }
    }

    // ============================================================
    // NETWORK EVENTS
    // ============================================================
    wireNetwork()
    {
        this.onRoomCreated  = () => this.showRoom();
        this.onRoomJoined   = () => this.showRoom();
        this.onRoomState    = () => this.refreshRoom();
        this.onGameStarting = () => this.launchGame();

        this.onNetError = (msg) => {
            this.setStatus(msg.message, true);
            this.time.delayedCall(2200, () => this.setStatus('', false));
        };

        this.onDisconnected = () => {
            this.setStatus('Disconnected from server', true);
        };

        net.on('roomCreated',  this.onRoomCreated);
        net.on('roomJoined',   this.onRoomJoined);
        net.on('roomState',    this.onRoomState);
        net.on('error',        this.onNetError);
        net.on('gameStarting', this.onGameStarting);
        net.on('disconnected', this.onDisconnected);

        this.events.once('shutdown', () => {
            net.off('roomCreated',  this.onRoomCreated);
            net.off('roomJoined',   this.onRoomJoined);
            net.off('roomState',    this.onRoomState);
            net.off('error',        this.onNetError);
            net.off('gameStarting', this.onGameStarting);
            net.off('disconnected', this.onDisconnected);
        });
    }

    launchGame()
    {
        this.setStatus('Starting...', false);
        this.overlayEl.classList.add('fading');

        this.time.delayedCall(380, () => {
            this.sound.stopAll();

            if (this.mode === 'pvp') {
                this.scene.start('MapSelect', { pvp: true });
            } else {
                this.scene.start('OnlineCharSelect', { seed: net.seed });
            }
        });
    }

    // ============================================================
    // HELPERS
    // ============================================================
    leaveRoom()
    {
        net.send('leaveRoom', {});
        net.roomCode = null;
        net.isHost = false;
        net.players = [];
        this.showMenu();
    }

    // Back behaves contextually rather than always exiting
    goBack()
    {
        switch (this.uiMode) {
            case 'joining':
                this.showMenu();
                break;
            case 'room':
                this.leaveRoom();
                break;
            case 'menu':
            default:
                // Was net.disconnect() here — but `net` is the ONE shared
                // socket also used by chat, friends, and the Leaderboard's
                // live push updates, not just Lobby matchmaking. Closing it
                // just to back out to the Menu killed all of those for the
                // rest of the session (until the player happened to re-open
                // the Lobby, which is the only other place that reconnects).
                // Simply not closing it here leaves the same persistent
                // connection running, the same as any other menu screen.
                this.scene.start('MenuScene');
                break;
        }
    }

    escape(str)
    {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }
}