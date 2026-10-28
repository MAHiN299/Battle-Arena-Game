import Phaser from 'phaser';
import audioManager from '../managers/AudioManager';

// ============================================================
// Options — was a plain black rectangle with hand-drawn Phaser text
// "<"/">" buttons; now a CSS/DOM modal matching the dark-glass,
// Impact-font, torii-accented look used everywhere else (Shop, Lobby,
// Main Menu). Volume is now a real <input type="range"> instead of
// discrete +/-10% taps, so it can be dragged to any value smoothly.
// Launched via `this.scene.launch('OptionScene', { parentScene })` on
// top of a paused MenuScene, so this only needs to manage its own
// overlay — the parent scene's DOM stays untouched underneath it.
// ============================================================
export default class OptionScene extends Phaser.Scene
{
    constructor() {
        super('OptionScene');
    }

    init(data) {
        this.parentScene = (data && data.parentScene) || 'MenuScene';
    }

    create()
    {
        this.buildOverlay();
        this.events.once('shutdown', () => this.destroyOverlay());
    }

    // ============================================================
    // DOM OVERLAY
    // ============================================================
    buildOverlay()
    {
        const el = document.createElement('div');
        el.id = 'option-overlay';
        el.innerHTML = `
            <div class="option-panel">
                <div class="option-glow"></div>
                <div class="option-title">
                    <span class="option-title-torii">⛩</span>
                    <span class="option-title-1">OPTIONS</span>
                </div>
                <div class="option-title-underline"></div>

                <div class="option-body">
                    ${this.sliderRow('master', 'MASTER VOLUME', '\u{1F50A}', '#ff3b3b', audioManager.masterVolume)}
                    ${this.sliderRow('music', 'MUSIC VOLUME', '\u{1F3B5}', '#ffcc00', audioManager.musicVolume)}
                </div>

                <button type="button" class="option-back" id="option-back">
                    <span>&larr;</span> BACK TO MENU
                </button>
            </div>
        `;
        document.body.appendChild(el);
        this.overlayEl = el;

        requestAnimationFrame(() => el.classList.add('visible'));

        this.wireSlider('master', (v) => audioManager.setMasterVolume(v));
        this.wireSlider('music', (v) => audioManager.setMusicVolume(v));

        el.querySelector('#option-back').addEventListener('click', () => this.close());

        // Clicking the dim backdrop (outside the panel) also backs out.
        el.addEventListener('mousedown', (e) => {
            if (e.target === el) this.close();
        });

        this.onKey = (e) => {
            if (e.key === 'Escape') { e.preventDefault(); this.close(); }
        };
        document.addEventListener('keydown', this.onKey);
    }

    destroyOverlay()
    {
        if (this.onKey) { document.removeEventListener('keydown', this.onKey); this.onKey = null; }
        if (this.overlayEl) { this.overlayEl.remove(); this.overlayEl = null; }
    }

    // ============================================================
    // SLIDER ROWS
    // ============================================================
    sliderRow(id, label, icon, color, value)
    {
        const pct = Math.round(value * 100);
        return `
            <div class="option-row">
                <div class="option-row-head">
                    <span class="option-row-icon">${icon}</span>
                    <span class="option-row-label">${this.escape(label)}</span>
                    <span class="option-row-value" id="option-${id}-value" style="color:${color}">${pct}%</span>
                </div>
                <input type="range" min="0" max="100" step="5" value="${pct}"
                       id="option-${id}-slider" class="option-slider"
                       style="--accent:${color}; --glow:${this.hexToRgba(color, 0.55)}; --fill:${pct}%" />
            </div>
        `;
    }

    wireSlider(id, apply)
    {
        const slider = this.overlayEl.querySelector(`#option-${id}-slider`);
        const valueEl = this.overlayEl.querySelector(`#option-${id}-value`);

        slider.addEventListener('input', () => {
            const pct = Number(slider.value);
            slider.style.setProperty('--fill', pct + '%');
            valueEl.textContent = pct + '%';
            apply(pct / 100);
        });
    }

    close()
    {
        this.scene.stop();
        this.scene.resume(this.parentScene);
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