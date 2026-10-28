// ============================================================
// WebSocket client. One instance shared across scenes.
//
// Scenes subscribe with on(type, handler) and send with
// send(type, payload). Reconnection is not attempted — on a
// LAN a dropped socket means the host closed the game.
// ============================================================

import api from '../api/api';

// Derived from the page host so a laptop on the LAN reaches
// the PC automatically, rather than its own localhost.
function socketUrl() {
    const host = window.location.hostname || 'localhost';
    return 'ws://' + host + ':8081/ws/game';
}

class NetClient
{
    constructor()
    {
        this.ws = null;
        this.handlers = {};

        this.connected = false;
        this.roomCode  = null;
        this.isHost    = false;
        this.username  = 'Player';
        this.players   = [];
        this.seed      = 0;

        this.chatLog   = [];
    }

    // ============================================================
    // CONNECTION
    // ============================================================
    connect(username)
    {
        this.username = username || 'Player';

        return new Promise((resolve, reject) => {

            if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
                resolve();
                return;
            }

            try {
                this.ws = new WebSocket(socketUrl());
            } catch (e) {
                reject(new Error('Could not open socket'));
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error('Connection timed out'));
            }, 6000);

            this.ws.onopen = () => {
                clearTimeout(timeout);
                this.connected = true;
                this.send('identify', {
                    username: this.username,
                    token: api.getToken()
                });
                resolve();
            };

            this.ws.onerror = () => {
                clearTimeout(timeout);
                this.connected = false;
                reject(new Error('Cannot reach server'));
            };

            this.ws.onclose = () => {
                this.connected = false;
                this.emit('disconnected', {});
            };

            this.ws.onmessage = (e) => {
                let msg;
                try { msg = JSON.parse(e.data); } catch (err) { return; }

                this.handleInternal(msg);
                this.emit(msg.type, msg);
            };
        });
    }

    disconnect()
    {
        if (this.ws) {
            this.send('leaveRoom', {});
            this.ws.close();
        }

        this.ws = null;
        this.connected = false;
        this.roomCode = null;
        this.isHost = false;
        this.players = [];
        this.chatLog = [];
    }

    // Tracks state the scenes need without each one re-deriving it
    handleInternal(msg)
    {
        switch (msg.type) {

            case 'roomCreated':
            case 'roomJoined':
                this.roomCode = msg.code;
                this.isHost = msg.isHost;
                break;

            case 'roomState':
                this.players = msg.players || [];
                break;

            case 'gameStarting':
                this.seed = msg.seed || 0;
                break;

            case 'chat':
                this.chatLog.push({
                    from: msg.from,
                    text: msg.text,
                    system: msg.system,
                    at: Date.now()
                });
                if (this.chatLog.length > 60) this.chatLog.shift();
                break;
        }
    }

    // ============================================================
    // MESSAGING
    // ============================================================
    send(type, payload = {})
    {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;

        this.ws.send(JSON.stringify({ type, ...payload }));
        return true;
    }

    on(type, handler)
    {
        if (!this.handlers[type]) this.handlers[type] = [];
        this.handlers[type].push(handler);
    }

    off(type, handler)
    {
        if (!this.handlers[type]) return;
        this.handlers[type] = this.handlers[type].filter(h => h !== handler);
    }

    // Removes every handler a scene registered, called on shutdown
    offAll()
    {
        this.handlers = {};
    }

    emit(type, msg)
    {
        const list = this.handlers[type];
        if (!list) return;

        list.forEach(h => {
            try { h(msg); } catch (e) { console.error('handler error', e); }
        });
    }

    // ============================================================
    // ROOM ACTIONS
    // ============================================================
    createRoom(mode = 'coop') { this.send('createRoom', { username: this.username, mode }); }
    joinRoom(code)    { this.send('joinRoom', { code: code.toUpperCase(), username: this.username }); }
    // New: invite an online friend straight into a room, no code needed
    sendDirectInvite(targetUsername) { this.send('directInvite', { targetUsername }); }
    // New: tell the inviter their invite was turned down
    declineInvite(fromUsername)      { this.send('declineInvite', { fromUsername }); }
    setReady(ready)   { this.send('ready', { ready }); }
    startGame()       { this.send('startGame', {}); }
    chat(text)        { this.send('chat', { text }); }
    globalChat(text)  { this.send('globalChat', { text }); }

    // ============================================================
    // GAME SYNC
    // ============================================================
    sendState(state)            { this.send('state', { s: state }); }
    sendInput(input)            { this.send('input', { i: input }); }
    sendEvent(name, data)       { this.send('event', { name, data }); }
    sendGlobalEvent(name, data) { this.send('globalEvent', { name, data }); }

    // ============================================================
    // HELPERS
    // ============================================================
    otherPlayer()
    {
        return this.players.find(p => p.username !== this.username) || null;
    }

    allReady()
    {
        return this.players.length === 2 && this.players.every(p => p.ready || p.isHost);
    }
}

const net = new NetClient();
export default net;

// Temporary, for debugging
if (typeof window !== 'undefined') window.net = net;