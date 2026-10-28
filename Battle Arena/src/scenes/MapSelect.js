import Phaser from 'phaser';
import net from '../net/NetClient';

import arenaAsset from '../Assets/Arena_1.png';
import arena2Asset from '../Assets/Arena_2.png';

// ============================================================
// Arena select — was two plain Phaser image thumbnails with a
// crossfading full-screen background; now a DOM overlay reusing the
// same two arena art files as real backgrounds/cards, in the same
// dark-glass/Impact/torii language as the rest of the menus. The
// default-dim / hover-brighten crossfade behavior is preserved
// (arena is subtly visible behind the cards at rest, brightens when
// its card is hovered).
// ============================================================
export default class MapSelect extends Phaser.Scene
{
    constructor() {
        super('MapSelect');
    }

    init(data)
    {
        this.pvp = !!data?.pvp;
    }

    create()
    {
        this.buildOverlay();
        if (this.pvp) {
            this.onPvpMapSelected = (msg) => {
                if (msg.name !== 'pvpMapSelected' || net.isHost) return;
                this.startPvpCharacterSelect(msg.data.map);
            };
            net.on('event', this.onPvpMapSelected);
            this.events.once('shutdown', () => net.off('event', this.onPvpMapSelected));
        }
        this.events.once('shutdown', () => this.destroyOverlay());
    }

    // ============================================================
    // DOM OVERLAY
    // ============================================================
    buildOverlay()
    {
        const el = document.createElement('div');
        el.id = 'mapselect-overlay';
        el.innerHTML = `
            <div class="mapselect-bg" id="mapselect-bg-a" style="background-image:url(${arenaAsset})"></div>
            <div class="mapselect-bg" id="mapselect-bg-b" style="background-image:url(${arena2Asset})"></div>
            <div class="mapselect-scrim"></div>

            <header class="mapselect-header">
                <button id="mapselect-back" type="button">&larr;&nbsp;BACK</button>
                <div class="mapselect-title"><span class="mapselect-title-torii">⛩</span> SELECT ARENA</div>
                <div class="mapselect-header-spacer"></div>
            </header>

            ${this.pvp ? `<div style="position:absolute;top:82px;left:0;right:0;text-align:center;color:#ffcc44;font: bold 16px Impact,sans-serif;z-index:2">${net.isHost ? 'HOST: SELECT THE MATCH ARENA' : 'WAITING FOR HOST TO SELECT THE ARENA'}</div>` : ''}

            <div class="mapselect-grid">
                <button type="button" class="mapselect-card" id="mapselect-arena1" style="background-image:url(${arenaAsset})">
                    <span class="mapselect-card-scrim"></span>
                    <span class="mapselect-card-label" style="color:#8cff9b">Ninja Academy</span>
                </button>
                <button type="button" class="mapselect-card" id="mapselect-arena2" style="background-image:url(${arena2Asset})">
                    <span class="mapselect-card-scrim"></span>
                    <span class="mapselect-card-label" style="color:#76d7ff">Death Valley</span>
                </button>
            </div>
        `;
        document.body.appendChild(el);
        this.overlayEl = el;

        requestAnimationFrame(() => el.classList.add('visible'));

        const arena1Btn = el.querySelector('#mapselect-arena1');
        const arena2Btn = el.querySelector('#mapselect-arena2');

        arena1Btn.addEventListener('mouseenter', () => el.classList.add('hover-arena1'));
        arena1Btn.addEventListener('mouseleave', () => el.classList.remove('hover-arena1'));
        arena2Btn.addEventListener('mouseenter', () => el.classList.add('hover-arena2'));
        arena2Btn.addEventListener('mouseleave', () => el.classList.remove('hover-arena2'));

        arena1Btn.addEventListener('click', () => this.selectArena('arena1'));
        arena2Btn.addEventListener('click', () => this.selectArena('arena2'));

        el.querySelector('#mapselect-back').addEventListener('click', () => {
            if (this.pvp) net.send('leaveRoom', {});
            this.scene.start('MenuScene');
        });
    }

    selectArena(map)
    {
        if (!this.pvp) {
            this.scene.start('CharacterSelect', { selectedMap: map });
            return;
        }
        if (!net.isHost) return;

        net.sendEvent('pvpMapSelected', { map });
        this.startPvpCharacterSelect(map);
    }

    startPvpCharacterSelect(map)
    {
        if (map !== 'arena1' && map !== 'arena2') return;
        this.scene.start('OnlineCharSelect', {
            mode: 'pvp',
            selectedMap: map,
            seed: net.seed
        });
    }

    destroyOverlay()
    {
        if (this.overlayEl) { this.overlayEl.remove(); this.overlayEl = null; }
    }
}