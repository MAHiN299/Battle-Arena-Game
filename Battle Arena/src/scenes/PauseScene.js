import Phaser from 'phaser';

// ============================================================
// Pause menu — was plain Phaser text buttons on a black rectangle;
// now a centered dark-glass modal reusing the same title/underline/
// button classes as the Main Menu and Options, so all three feel like
// one consistent system. All four button destinations and their
// exact logic are unchanged.
// ============================================================
export default class PauseScene extends Phaser.Scene
{
    constructor() {
        super('PauseScene');
    }

    create()
    {
        this.buildOverlay();

        this.events.on('pause', () => { if (this.overlayEl) this.overlayEl.style.visibility = 'hidden'; });
        this.events.on('resume', () => { if (this.overlayEl) this.overlayEl.style.visibility = 'visible'; });

        this.events.once('shutdown', () => this.destroyOverlay());
    }

    // ============================================================
    // DOM OVERLAY
    // ============================================================
    buildOverlay()
    {
        const items = [
            { label: 'Continue',     color: '#8cff9b', callback: () => {
                this.scene.resume('Game');
                this.scene.wake('UIScene');
                this.scene.stop();
            } },
            { label: 'Restart',      color: '#44aaff', callback: () => {
                this.sound.stopAll();
                this.scene.stop('UIScene');
                this.scene.get('Game').scene.restart();
                this.scene.stop();
            } },
            { label: 'Option',       color: '#ffd166', callback: () => {
                this.scene.pause();
                this.scene.launch('OptionScene', { parentScene: 'PauseScene' });
            } },
            { label: 'Exit to Menu', color: '#ff7b7b', callback: () => {
                this.sound.stopAll();
                this.scene.stop('Game');
                this.scene.stop('UIScene');
                this.scene.start('MenuScene');
            } }
        ];
        this.pauseItems = items;

        const el = document.createElement('div');
        el.id = 'pause-overlay';
        el.innerHTML = `
            <div class="pause-panel">
                <div class="option-glow"></div>
                <div class="menu-title pause-title">
                    <span class="menu-title-torii">⛩</span>
                    <span class="menu-title-1">PAUSED</span>
                </div>
                <div class="menu-title-underline pause-underline"></div>
                <div class="menu-btn-list" id="pause-btn-list"></div>
            </div>
        `;
        document.body.appendChild(el);
        this.overlayEl = el;

        this.listEl = el.querySelector('#pause-btn-list');
        this.listEl.innerHTML = items.map((item, i) => `
            <button type="button" class="menu-btn" style="--accent:${item.color}; --glow:${this.hexToRgba(item.color, 0.55)}; --delay:${i * 55}ms" data-i="${i}">
                <span class="menu-btn-tag"></span>
                <span class="menu-btn-label">${this.escape(item.label)}</span>
            </button>
        `).join('');

        this.listEl.querySelectorAll('.menu-btn').forEach((btn, i) => {
            btn.addEventListener('click', () => items[i].callback());
        });

        requestAnimationFrame(() => {
            el.classList.add('visible');
            void this.listEl.offsetWidth;
            this.listEl.classList.add('enter');
        });
    }

    destroyOverlay()
    {
        if (this.overlayEl) { this.overlayEl.remove(); this.overlayEl = null; }
    }

    escape(str)
    {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }

    hexToRgba(hex, alpha)
    {
        const clean = String(hex).replace('#', '');
        const r = parseInt(clean.substring(0, 2), 16);
        const g = parseInt(clean.substring(2, 4), 16);
        const b = parseInt(clean.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
}