// ============================================================
// Global "direct invite" popup — a real CSS/DOM overlay, not
// Phaser canvas, so it can appear on top of ANY scene (Menu,
// Friends, Lobby...) without that scene needing to know about it.
//
// Initialized once from main.js. Listens on the shared NetClient
// event bus for the two WebSocket events the backend pushes:
//   - directInviteReceived   { fromUsername, code }   -> show accept/decline
//   - directInviteDeclined   { byUsername }           -> tell the inviter
// ============================================================

import net from '../net/NetClient';

let initialized = false;

function buildDom() {
    if (document.getElementById('invite-toast')) return;

    const box = document.createElement('div');
    box.id = 'invite-toast';
    box.innerHTML = `
        <div id="invite-toast-title"></div>
        <div id="invite-toast-actions">
            <button id="invite-toast-accept">ACCEPT</button>
            <button id="invite-toast-decline">DECLINE</button>
        </div>
    `;
    document.body.appendChild(box);

    const info = document.createElement('div');
    info.id = 'invite-info-toast';
    document.body.appendChild(info);
}

function showInvitePopup(fromUsername, code) {
    const box = document.getElementById('invite-toast');
    const title = document.getElementById('invite-toast-title');
    const acceptBtn = document.getElementById('invite-toast-accept');
    const declineBtn = document.getElementById('invite-toast-decline');

    title.textContent = fromUsername + ' invited you to Online Co-op';
    box.classList.add('visible');

    // Replace handlers each time so we never stack duplicate listeners
    // across repeated invites.
    acceptBtn.onclick = () => {
        box.classList.remove('visible');
        net.joinRoom(code);

        const game = window.__battleArenaGame;
        if (game) {
            const active = game.scene.getScenes(true)[0];
            if (active) active.scene.start('LobbyScene', { fromInvite: true });
        }
    };

    declineBtn.onclick = () => {
        box.classList.remove('visible');
        net.declineInvite(fromUsername);
    };
}

function showInfoToast(text) {
    const info = document.getElementById('invite-info-toast');
    info.textContent = text;
    info.classList.add('visible');
    clearTimeout(info._hideTimer);
    info._hideTimer = setTimeout(() => info.classList.remove('visible'), 3200);
}

export function initInviteOverlay() {
    if (initialized) return;
    initialized = true;

    buildDom();

    net.on('directInviteReceived', (msg) => {
        showInvitePopup(msg.fromUsername, msg.code);
    });

    net.on('directInviteDeclined', (msg) => {
        showInfoToast(msg.byUsername + ' declined your invite');
    });
}