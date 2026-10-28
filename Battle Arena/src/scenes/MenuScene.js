import Phaser from 'phaser';
import audioManager from '../managers/AudioManager';

import menuVideoAsset from '../Assets/animationMenu.mp4';
import themeMusicMenuAsset from '../Assets/soundtrack/ThemeMusicMenu.mp3';

import api from '../api/api';
import net from '../net/NetClient';

// ============================================================
// Main Menu — the animated video background + music stay exactly as
// they were; the button panel (previously loose Phaser rectangles
// sliding in from off-screen) is now a CSS/DOM overlay so it can
// share the same dark-glass, Impact-font, colored-accent look used
// everywhere else (Shop, Lobby, Profile). No reference design was
// given for this one, so the layout below is an original take on
// that same visual language rather than a match to a mockup.
// ============================================================
export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        this.cameras.main.setBackgroundColor('#050505');
        this.cameras.main.fadeIn(400, 0, 0, 0);

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.background = this.add.video(width / 2, height / 2, 'menuVideo')
            .setAlpha(1)
            .setDepth(0);

        this.background.setMute(true);
        this.background.play(true);

        this.background.on('play', () => {
            const scaleX = width / this.background.width;
            const scaleY = height / this.background.height;
            const scale = Math.max(scaleX, scaleY);
            this.background.setScale(scale);
        });

        audioManager.init(this);
        audioManager.playMusic('themeMusicMenu');

        // Lighter vignette than before (was 0.35) — just enough to keep
        // the panel legible without dulling the footage; the DOM ambient
        // glow layer below does the actual "lit up" look.
        this.vignette = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.12)
            .setDepth(1);

        // Nudge the rendered canvas itself brighter/richer so the video
        // reads as glowing rather than washed-out under the vignette.
        this.applyCanvasGlow();

        this.panelKey = 'main';
        this.buildAmbientGlow();
        this.buildOverlay();
        this.showPanel('main');

        this.refreshUnreadBadge();
        this.onDmForBadge = () => this.refreshUnreadBadge();
        net.on('directMessage', this.onDmForBadge);

        this.events.once('shutdown', () => {
            net.off('directMessage', this.onDmForBadge);
            this.destroyOverlay();
            this.destroyAmbientGlow();
            this.clearCanvasGlow();
        });
    }

    // ============================================================
    // BACKGROUND GLOW — a CSS filter on the game canvas plus a
    // screen-blended color wash floating above it, so the whole scene
    // reads warmer/brighter rather than just the button column.
    // ============================================================
    applyCanvasGlow()
    {
        const canvas = this.game.canvas;
        if (!canvas) return;
        this._prevCanvasFilter = canvas.style.filter || '';
        canvas.style.filter = 'brightness(1.12) saturate(1.35) contrast(1.05)';
    }

    clearCanvasGlow()
    {
        const canvas = this.game.canvas;
        if (!canvas) return;
        canvas.style.filter = this._prevCanvasFilter || '';
    }

    buildAmbientGlow()
    {
        const el = document.createElement('div');
        el.id = 'menu-ambient-glow';
        document.body.appendChild(el);
        this.ambientGlowEl = el;
        requestAnimationFrame(() => el.classList.add('visible'));
    }

    destroyAmbientGlow()
    {
        if (this.ambientGlowEl) { this.ambientGlowEl.remove(); this.ambientGlowEl = null; }
    }

    // ============================================================
    // DOM OVERLAY
    // ============================================================
    buildOverlay()
    {
        const el = document.createElement('div');
        el.id = 'menu-overlay';
        el.innerHTML = `
            <div class="menu-panel">
                <div class="menu-glow menu-glow-a"></div>
                <div class="menu-glow menu-glow-b"></div>
                <div class="menu-title">
                    <span class="menu-title-torii">⛩</span>
                    <span class="menu-title-1" id="menu-title-1">MAIN</span>
                    <span class="menu-title-2" id="menu-title-2">MENU</span>
                </div>
                <div class="menu-title-underline"></div>
                <div class="menu-btn-list" id="menu-btn-list"></div>
                <div class="menu-toast" id="menu-toast"></div>
            </div>
        `;
        document.body.appendChild(el);
        this.overlayEl = el;

        requestAnimationFrame(() => el.classList.add('visible'));

        this.listEl = el.querySelector('#menu-btn-list');
        this.toastEl = el.querySelector('#menu-toast');
        this.titleEl1 = el.querySelector('#menu-title-1');
        this.titleEl2 = el.querySelector('#menu-title-2');
    }

    destroyOverlay()
    {
        if (this.overlayEl) { this.overlayEl.remove(); this.overlayEl = null; }
    }

    // ============================================================
    // PANELS
    // ============================================================
    getPanelData(key)
    {
        if (key === 'main') {
            return {
                title: ['MAIN', 'MENU'],
                items: [
                    { label: 'Start',         color: '#8cff9b', callback: () => this.showPanel('mode') },
                    { label: 'Shop',          color: '#ffcc00', callback: () => { this.sound.stopAll(); this.scene.start('ShopScene'); } },
                    { label: 'Network Chat',  color: '#76d7ff', callback: () => {
                        const chatScene = this.scene.get('GlobalChatScene');
                        if (chatScene) chatScene.setVisible(!chatScene.isPanelVisible);
                    } },
                    { label: 'Friends',       color: '#8cff9b', badge: true, callback: () => this.scene.start('FriendsScene') },
                    { label: 'Profile',       color: '#ffcc00', callback: () => this.scene.start('ProfileScene') },
                    { label: 'Option',        color: '#ffd166', callback: () => { this.scene.pause(); this.scene.launch('OptionScene'); } },
                    { label: 'Credits',       color: '#76d7ff', callback: () => this.showMessage('Battle Arena — Phaser game demo') },
                    { label: 'Logout',        color: '#cccccc', callback: () => { api.logout(); this.sound.stopAll(); this.scene.start('LoginScene'); } },
                    { label: 'Exit',          color: '#ff7b7b', callback: () => this.game.destroy(true) }
                ]
            };
        }

        if (key === 'mode') {
            return {
                title: ['SELECT', 'MODE'],
                items: [
                  //  { label: 'Story Mode',      color: '#8cff9b', callback: () => this.showPanel('single') },
                    { label: 'Local Co-op',     color: '#ffd166', callback: () => { audioManager.playMusic('selectionSound'); this.startNewGame(); } },
                    { label: 'Player vs Player (PVP)', color: '#ff7b7b', callback: () => { this.sound.stopAll(); this.scene.start('LobbyScene', { mode: 'pvp' }); } },
                    { label: 'Online Co-op',    color: '#76d7ff', callback: () => { audioManager.playMusic('selectionSound'); this.scene.start('LobbyScene'); } },
                    { label: 'Back',            color: '#ff7b7b', callback: () => this.showPanel('main') }
                ]
            };
        }

        // single
        return {
            title: ['STORY', 'MODE'],
            items: [
                { label: 'New Game',  color: '#8cff9b', callback: () => this.showMessage('Story mode coming soon!') },
                { label: 'Load Game', color: '#76d7ff', callback: () => this.showMessage('Load Game coming soon!') },
                { label: 'Back',      color: '#ff7b7b', callback: () => this.showPanel('mode') }
            ]
        };
    }

    showPanel(key)
    {
        this.panelKey = key;
        const data = this.getPanelData(key);

        this.titleEl1.textContent = data.title[0];
        this.titleEl2.textContent = data.title[1];

        this.listEl.classList.remove('enter');
        this.listEl.innerHTML = data.items.map((item, i) => `
            <button type="button" class="menu-btn" style="--accent:${item.color}; --glow:${this.hexToRgba(item.color, 0.55)}; --delay:${i * 55}ms" data-i="${i}">
                <span class="menu-btn-tag"></span>
                <span class="menu-btn-label">${this.escape(item.label)}</span>
                ${item.badge ? `<span class="menu-btn-badge" id="menu-friends-badge"></span>` : ''}
            </button>
        `).join('');

        this.listEl.querySelectorAll('.menu-btn').forEach((btn, i) => {
            btn.addEventListener('click', () => data.items[i].callback());
        });

        // Trigger the stagger-in transition.
        void this.listEl.offsetWidth;
        this.listEl.classList.add('enter');

        this.setUnreadCount(this.lastUnreadCount || 0);
    }

    // ============================================================
    // UNREAD DM BADGE — small red counter on the Friends button
    // ============================================================
    setUnreadCount(count) {
        this.lastUnreadCount = count;
        const badge = this.overlayEl && this.overlayEl.querySelector('#menu-friends-badge');
        if (!badge) return;
        const has = count > 0;
        badge.classList.toggle('visible', has);
        badge.textContent = count > 9 ? '9+' : String(count);
    }

    async refreshUnreadBadge() {
        try {
            const unread = await api.getUnreadFrom();
            this.setUnreadCount(unread.length);
        } catch (err) {
            // Non-critical — leave the badge as it was rather than erroring the menu
        }
    }

    startNewGame() {
        this.scene.start('MapSelect');
    }

    showMessage(text) {
        this.toastEl.textContent = text;
        this.toastEl.classList.remove('visible');
        void this.toastEl.offsetWidth;
        this.toastEl.classList.add('visible');
    }

    escape(str)
    {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }

    // Converts a "#rrggbb" accent color into an rgba() string so the
    // hover glow (box-shadow) can be tinted per-button without a solid
    // color washing out the glass background underneath it.
    hexToRgba(hex, alpha)
    {
        const clean = String(hex).replace('#', '');
        const r = parseInt(clean.substring(0, 2), 16);
        const g = parseInt(clean.substring(2, 4), 16);
        const b = parseInt(clean.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
}