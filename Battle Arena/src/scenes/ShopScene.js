import Phaser from 'phaser';
import api from '../api/api';

import shopBgAsset from '../Assets/shop/shopBg.jpg';

import shadowbladeAsset from '../Assets/shop/characters/shadowblade.jpg';
import seraphAsset from '../Assets/shop/characters/seraph.jpg';
import ironcladAsset from '../Assets/shop/characters/ironclad.jpg';
import kitsuneAsset from '../Assets/shop/characters/kitsune.jpg';

import ammoIconAsset from '../Assets/shop/items/ammoPack.jpg';
import grenadeIconAsset from '../Assets/shop/items/grenade.jpg';
import healthIconAsset from '../Assets/shop/items/healthKit.jpg';

// Display info for the 3 consumables — matches ConsumableCatalog on
// the backend (code, price) but only the backend is the source of
// truth for prices; this is just icon/label for the UI.
const CONSUMABLE_ICONS = {
    AMMO:    { img: ammoIconAsset,   label: 'Ammo Pack' },
    GRENADE: { img: grenadeIconAsset, label: 'Grenade' },
    HEALTH:  { img: healthIconAsset,  label: 'Health Kit' }
};

// The backend currently seeds every not-yet-revealed fighter with the
// literal placeholder name "LOCKED" and no artwork (see DataSeeder.java
// — hero3..hero8 all get displayName "LOCKED"), so there is nothing in
// the API response to match a real character against. Until that
// content is actually written on the backend, the reference names and
// portraits are applied here by POSITION: the shop always lists locked
// fighters in ascending unlockCost/sortOrder, so the Nth locked card
// gets the Nth entry below. This is purely cosmetic on the frontend —
// no backend data changed — so if a 5th+ locked slot appears it will
// fall back to a plain "L" avatar until it also gets a name+art.
const FIGHTER_REVEAL_ORDER = [
    { name: 'Shadowblade', portrait: shadowbladeAsset },
    { name: 'Seraph',      portrait: seraphAsset },
    { name: 'Ironclad',    portrait: ironcladAsset },
    { name: 'Kitsune',     portrait: kitsuneAsset }
];

function revealFor(idx, backendName) {
    // Never mask an already-unlocked / real name the backend sends —
    // only stand in for the "LOCKED" placeholder.
    if (backendName && backendName.trim().toUpperCase() !== 'LOCKED') return null;
    return FIGHTER_REVEAL_ORDER[idx] || null;
}

// ============================================================
// Shop — full-screen CSS/DOM overlay (same pattern as Profile and
// Friends), not drawn on the Phaser canvas. Two tabs: FIGHTERS
// (unlock new characters, left side-nav layout) and SUPPLIES
// (buy/sell Ammo Pack, Grenade, Health Kit — persistent inventory
// used during boss fights, top tab-bar layout). Both share the same
// background artwork.
// ============================================================
export default class ShopScene extends Phaser.Scene
{
    constructor() {
        super('ShopScene');
    }

    init() {
        this.items = [];
        this.consumables = [];
        this.coins = 0;
        this.busy = false;
        this.activeTab = 'fighters';
    }

    create()
    {
        const w = this.cameras.main.width, h = this.cameras.main.height;
        this.add.rectangle(0, 0, w, h, 0x08080a).setOrigin(0, 0);

        this.buildOverlay();
        this.loadShop();

        this.events.once('shutdown', () => this.destroyOverlay());
    }

    // ============================================================
    // DOM OVERLAY LIFECYCLE
    // ============================================================
    buildOverlay()
    {
        const el = document.createElement('div');
        el.id = 'shop-overlay';
        el.style.backgroundImage = `url(${shopBgAsset})`;
        document.body.appendChild(el);
        this.overlayEl = el;

        requestAnimationFrame(() => el.classList.add('visible'));

        this.input.keyboard.on('keydown-ESC', () => this.scene.start('MenuScene'));

        this.renderShell();
    }

    destroyOverlay()
    {
        if (this.confirmEl) { this.confirmEl.remove(); this.confirmEl = null; }
        if (this.overlayEl) {
            this.overlayEl.remove();
            this.overlayEl = null;
        }
    }

    // Single shared shell (top tab bar) for both tabs — same chrome you
    // approved for Supplies, just with the grid content swapped out.
    renderShell()
    {
        const isFighters = this.activeTab === 'fighters';
        const subtitle = isFighters
            ? 'Unlock new fighters and build your ultimate team'
            : 'Stock up for boss fights — boss waves drop no ammo, grenades or health kits';
        const gridClass = isFighters ? 'shop-grid-fighters' : 'shop-grid-supplies';

        this.overlayEl.innerHTML = `
            <header class="shop-header-top">
                <div class="shop-brand-top">⛩ SHOP<span>.</span></div>
                <div class="shop-coin-badge">🪙&nbsp;<span id="shop-coin-text">${this.coins}</span></div>
                <button id="shop-back" class="shop-back-pill">&lsaquo;&nbsp;BACK</button>
            </header>
            <div class="shop-tabs">
                <button class="shop-tab ${isFighters ? 'active' : ''}" data-tab="fighters">⚔ FIGHTERS</button>
                <button class="shop-tab ${isFighters ? '' : 'active'}" data-tab="supplies">🎒 SUPPLIES</button>
            </div>
            <div class="shop-title-sub shop-title-sub-center">${subtitle}</div>
            <main class="shop-content">
                <div id="shop-status"></div>
                <div id="shop-flash"></div>
                <div class="shop-grid ${gridClass}" id="shop-grid"></div>
            </main>
        `;
        this.bindShellEvents();
        this.renderActiveTab();
    }

    // Back button + tab switching — shared shell.
    bindShellEvents()
    {
        this.overlayEl.querySelector('#shop-back').addEventListener('click', () => {
            this.scene.start('MenuScene');
        });

        this.overlayEl.querySelectorAll('.shop-tab').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
    }

    switchTab(tab)
    {
        if (this.activeTab === tab || this.busy) return;
        this.activeTab = tab;
        this.renderShell();
    }

    // ============================================================
    // LOAD
    // ============================================================
    async loadShop()
    {
        const status = this.overlayEl.querySelector('#shop-status');
        try {
            const [items, balance, consumables] = await Promise.all([
                api.getShopCharacters(),
                api.getBalance(),
                api.getShopConsumables()
            ]);

            this.items = items || [];
            this.coins = balance.coins;
            this.consumables = consumables || [];

            const coinEl = this.overlayEl.querySelector('#shop-coin-text');
            if (coinEl) coinEl.textContent = this.coins;
            if (status) status.textContent = '';

            this.renderActiveTab();
        } catch (err) {
            if (status) {
                status.textContent = 'Could not load shop — ' + err.message;
                status.className = 'shop-status-error';
            }
        }
    }

    renderActiveTab()
    {
        if (this.activeTab === 'fighters') this.renderFighters();
        else this.renderSupplies();
    }

    // ============================================================
    // FIGHTERS
    // ============================================================
    renderFighters()
    {
        const grid = this.overlayEl.querySelector('#shop-grid');
        const status = this.overlayEl.querySelector('#shop-status');
        if (!grid) return;

        if (this.items.length === 0) {
            grid.innerHTML = '';
            if (status) {
                status.textContent = 'You own every fighter available. More coming soon.';
                status.className = 'shop-status-ok';
            }
            return;
        }
        if (status) { status.textContent = ''; status.className = ''; }

        grid.innerHTML = this.items.map((item, idx) => {
            const affordable = this.coins >= item.unlockCost;
            const reveal = revealFor(idx, item.name);
            const displayName = reveal ? reveal.name : item.name;
            const initial = (displayName || '?').charAt(0).toUpperCase();

            const portraitHtml = reveal
                ? `<div class="fighter-portrait" style="background-image:url(${reveal.portrait})"></div>`
                : `<div class="fighter-portrait fighter-portrait-fallback">${this.escape(initial)}</div>`;

            return `
                <div class="fighter-card ${affordable ? '' : 'unaffordable'}">
                    <div class="fighter-lock">🔒</div>
                    ${portraitHtml}
                    <div class="fighter-name">${this.escape(displayName)}</div>
                    <div class="fighter-locked-pill">🔒 LOCKED</div>
                    <div class="fighter-ability">${this.escape(item.ability || 'Ability revealed on release')}</div>
                    <button class="fighter-buy-btn" data-code="${this.escape(item.code)}" ${affordable ? '' : 'disabled'}>
                        $ ${item.unlockCost}
                    </button>
                </div>
            `;
        }).join('');

        grid.querySelectorAll('.fighter-buy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = this.items.find(i => i.code === btn.dataset.code);
                if (!item) return;
                if (this.coins < item.unlockCost) {
                    this.flash('Not enough coins for ' + item.name, '#ff7b7b');
                    return;
                }
                this.confirmPurchase(item);
            });
        });
    }

    confirmPurchase(item)
    {
        if (this.busy) return;
        this.busy = true;

        const el = document.createElement('div');
        el.id = 'shop-confirm-overlay';
        el.innerHTML = `
            <div class="shop-confirm-box">
                <div class="shop-confirm-title">Unlock ${this.escape(item.name)}?</div>
                <div class="shop-confirm-cost">Cost: $${item.unlockCost} &nbsp;&nbsp; Balance: $${this.coins}</div>
                <div class="shop-confirm-actions">
                    <button id="shop-confirm-yes">CONFIRM</button>
                    <button id="shop-confirm-no">CANCEL</button>
                </div>
            </div>
        `;
        document.body.appendChild(el);
        this.confirmEl = el;
        requestAnimationFrame(() => el.classList.add('visible'));

        const close = () => {
            el.remove();
            this.confirmEl = null;
            this.busy = false;
        };

        el.querySelector('#shop-confirm-yes').addEventListener('click', () => {
            close();
            this.doPurchase(item);
        });
        el.querySelector('#shop-confirm-no').addEventListener('click', close);
    }

    async doPurchase(item)
    {
        this.busy = true;
        this.flash('Processing...', '#ffffff');

        try {
            const res = await api.purchaseCharacter(item.code);

            if (res.success) {
                this.coins = res.newBalance;
                const coinEl = this.overlayEl.querySelector('#shop-coin-text');
                if (coinEl) coinEl.textContent = this.coins;
                this.flash(res.message, '#8cff9b');

                this.items = this.items.filter(i => i.code !== item.code);
                this.renderFighters();
            } else {
                this.flash(res.message, '#ff7b7b');
            }
        } catch (err) {
            this.flash(err.message, '#ff7b7b');
        } finally {
            this.busy = false;
        }
    }

    // ============================================================
    // SUPPLIES — buy AND sell Ammo/Grenade/Health, 1 at a time.
    // Persistent inventory, spent only during a boss fight (see
    // Game.js) since boss waves drop none of their own.
    // ============================================================
    renderSupplies()
    {
        const grid = this.overlayEl.querySelector('#shop-grid');
        const status = this.overlayEl.querySelector('#shop-status');
        if (!grid) return;
        if (status) { status.textContent = ''; status.className = ''; }

        grid.innerHTML = this.consumables.map(item => {
            const meta = CONSUMABLE_ICONS[item.code] || { img: '', label: item.displayName };
            const canBuy = this.coins >= item.buyPrice && item.owned < item.maxStack;
            const canSell = item.owned > 0;

            return `
                <div class="supply-card">
                    <img class="supply-icon-img" src="${meta.img}" alt="${this.escape(meta.label)}" />
                    <div class="supply-name">${this.escape(meta.label)}</div>
                    <div class="supply-owned">Owned: ${item.owned} / ${item.maxStack}</div>
                    <div class="supply-trade-row">
                        <button class="supply-buy-btn" data-code="${item.code}" data-action="buy" ${canBuy ? '' : 'disabled'}>
                            BUY $${item.buyPrice}
                        </button>
                        <button class="supply-sell-btn" data-code="${item.code}" data-action="sell" ${canSell ? '' : 'disabled'}>
                            SELL $${item.sellPrice}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        grid.querySelectorAll('button[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = this.consumables.find(c => c.code === btn.dataset.code);
                if (!item) return;
                this.doTrade(btn.dataset.action, item);
            });
        });
    }

    async doTrade(action, item)
    {
        if (this.busy) return;
        this.busy = true;

        try {
            const res = action === 'buy'
                ? await api.buyConsumable(item.code, 1)
                : await api.sellConsumable(item.code, 1);

            if (res.success) {
                this.coins = res.newBalance;
                const coinEl = this.overlayEl.querySelector('#shop-coin-text');
                if (coinEl) coinEl.textContent = this.coins;
                this.flash(res.message, '#8cff9b');

                const entry = this.consumables.find(c => c.code === item.code);
                if (entry) entry.owned = res.newQuantity;

                if (this.activeTab === 'supplies') this.renderSupplies();
            } else {
                this.flash(res.message, '#ff7b7b');
            }
        } catch (err) {
            this.flash(err.message, '#ff7b7b');
        } finally {
            this.busy = false;
        }
    }

    // ============================================================
    // HELPERS
    // ============================================================
    flash(text, color)
    {
        const el = this.overlayEl?.querySelector('#shop-flash');
        if (!el) return;
        el.textContent = text;
        el.style.color = color;
        el.style.opacity = '1';
        clearTimeout(this.flashTimer);
        this.flashTimer = setTimeout(() => { el.style.opacity = '0'; }, 2200);
    }

    escape(str)
    {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }
}