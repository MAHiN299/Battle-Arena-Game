// New File

import Phaser from 'phaser';
import { AMMO } from '../managers/WaveConfig';

// ============================================================
// Overlay shown during the between-wave breather. Spend coins
// on supplies, or save them for characters in the main shop.
// ============================================================

export const SHOP_ITEMS = [
    {
        key: 'ammo',
        label: 'AMMO',
        detail: '+50 rounds',
        baseCost: 40,
        color: 0xffcc44
    },
    {
        key: 'grenade',
        label: 'GRENADE',
        detail: '+1 grenade',
        baseCost: 60,
        color: 0x88ff9b
    },
    {
        key: 'health',
        label: 'MEDKIT',
        detail: 'Full health',
        baseCost: 80,
        color: 0xff7b7b
    }
];

export const SHOP_SETTINGS = {
    MAX_PURCHASES_PER_WAVE: 3,
    COST_SCALING_PER_WAVE:  0.12   // prices rise 12% each wave
};

export default class WaveShopScene extends Phaser.Scene
{
    constructor() {
        super('WaveShopScene');
    }

    init(data)
    {
        this.players     = data.players || [];
        this.coinManager = data.coinManager;
        this.waveNumber  = data.waveNumber || 1;
        this.durationMs  = data.durationMs || 6000;

        this.purchases   = 0;
        this.cards       = [];
    }

    create()
    {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        // Dim the game behind without hiding it
        this.add.rectangle(0, 0, w, h, 0x000000, 0.55).setOrigin(0, 0);

        this.add.text(w / 2 - 130, h * 0.20, '⛩', {
            fontSize: '30px', fill: '#ff3b3b'
        }).setOrigin(0.5);

        this.add.text(w / 2, h * 0.20, 'RESUPPLY', {
            fontFamily: 'Impact, sans-serif',
            fontSize: '44px', fill: '#ffffff',
            stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5);

        this.coinText = this.add.text(w / 2, h * 0.28, '', {
            fontFamily: 'Impact, sans-serif',
            fontSize: '30px', fill: '#ffcc00',
            stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5);

        this.limitText = this.add.text(w / 2, h * 0.33, '', {
            fontSize: '15px', fill: '#999999', fontStyle: 'bold'
        }).setOrigin(0.5);

        this.buildCards(w, h);
        this.buildCountdown(w, h);

        this.refresh();

        // Closes itself when the breather ends
        this.time.delayedCall(this.durationMs, () => this.close());

        this.input.keyboard.on('keydown-ESC', () => this.close());
    }

    currentCost(item)
    {
        const scale = 1 + (this.waveNumber - 1) * SHOP_SETTINGS.COST_SCALING_PER_WAVE;
        return Math.round(item.baseCost * scale);
    }

    buildCards(w, h)
    {
        const cardW = 220;
        const gap = 34;
        const totalW = SHOP_ITEMS.length * cardW + (SHOP_ITEMS.length - 1) * gap;
        const startX = (w - totalW) / 2 + cardW / 2;
        const y = h * 0.55;

        SHOP_ITEMS.forEach((item, i) => {
            const x = startX + i * (cardW + gap);
            this.cards.push(this.buildCard(item, x, y, cardW, i));
        });
    }

    buildCard(item, x, y, cardW, index)
    {
        const cardH = 190;
        const cost = this.currentCost(item);

        const container = this.add.container(x, y).setAlpha(0);

        // Rounded glass card, drawn via Graphics (local coords, since
        // the container itself carries the x/y position), with a
        // separate invisible interactive rectangle over it for hit
        // testing/hover — Rectangle GameObjects can't have rounded
        // corners, Graphics objects can't be made interactive.
        const frame = this.add.graphics();
        const drawFrame = (strokeColor, strokeAlpha, fillColor = 0x16161a) => {
            frame.clear();
            frame.fillStyle(fillColor, 1);
            frame.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 14);
            frame.lineStyle(2, strokeColor, strokeAlpha);
            frame.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 14);
        };
        drawFrame(item.color, 0.85);

        const panel = this.add.rectangle(0, 0, cardW, cardH, 0x000000, 0.001)
            .setInteractive({ cursor: 'pointer' });
        panel.drawFrame = drawFrame; // exposed so refresh()/hover can redraw the rounded frame

        const icon = this.add.circle(0, -52, 30, item.color, 0.22)
            .setStrokeStyle(2, item.color, 0.7);

        const label = this.add.text(0, -6, item.label, {
            fontFamily: 'Impact, sans-serif',
            fontSize: '25px', fill: '#ffffff',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);

        const detail = this.add.text(0, 20, item.detail, {
            fontSize: '14px', fill: '#999999', fontStyle: 'bold'
        }).setOrigin(0.5);

        const price = this.add.text(0, 58, '$ ' + cost, {
            fontFamily: 'Impact, sans-serif',
            fontSize: '26px', fill: '#ffcc00',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);

        const keyHint = this.add.text(0, 82, 'PRESS ' + (index + 1), {
            fontSize: '11px', fill: '#666666', fontStyle: 'bold'
        }).setOrigin(0.5);

        panel.on('pointerover', () => {
            if (!this.canBuy(cost)) return;
            container.setScale(1.05);
            drawFrame(item.color, 1, 0x22222a);
        });

        panel.on('pointerout', () => {
            container.setScale(1);
            drawFrame(item.color, 0.85, 0x16161a);
        });

        panel.on('pointerdown', () => this.buy(item, cost, container));

        // Keyboard shortcut, since players are mid-fight and mouse is slow
        this.input.keyboard.on('keydown-' + (index + 1), () => {
            this.buy(item, cost, container);
        });

        container.add([frame, panel, icon, label, detail, price, keyHint]);

        this.tweens.add({
            targets: container,
            alpha: 1,
            y: { from: y + 30, to: y },
            duration: 280,
            delay: index * 80,
            ease: 'Cubic.Out'
        });

        return { container, panel, price, item, cost };
    }

    canBuy(cost)
    {
        if (this.purchases >= SHOP_SETTINGS.MAX_PURCHASES_PER_WAVE) return false;
        if (!this.coinManager) return false;
        return this.coinManager.canAfford(cost);
    }

    buy(item, cost, container)
    {
        if (this.purchases >= SHOP_SETTINGS.MAX_PURCHASES_PER_WAVE) {
            this.flash('PURCHASE LIMIT REACHED', '#ff7b7b');
            return;
        }

        if (!this.coinManager.canAfford(cost)) {
            this.flash('NOT ENOUGH COINS', '#ff7b7b');
            this.cameras.main.shake(100, 0.003);
            return;
        }

        this.coinManager.spend(cost);
        this.purchases++;

        this.applyItem(item);

        this.cameras.main.flash(140, 255, 220, 100);
        this.flash(item.label + ' PURCHASED', '#88ff9b');

        this.tweens.add({
            targets: container, scale: 1.12,
            duration: 120, yoyo: true
        });

        this.refresh();
    }

    // Supplies go to whoever needs them most
    applyItem(item)
    {
        const alive = this.players.filter(p => p && !p.isDead);
        if (alive.length === 0) return;

        switch (item.key) {

            case 'ammo': {
                // Split across both players
                const each = Math.floor(50 / alive.length);
                alive.forEach(p => {
                    p.reserveAmmo = Math.min(AMMO.RESERVE_MAX, (p.reserveAmmo || 0) + each);
                });
                break;
            }

            case 'grenade': {
                // Goes to whoever has fewest
                const target = alive.reduce((a, b) => a.grenades <= b.grenades ? a : b);
                target.inventory.grenade = Math.min(AMMO.GRENADE_MAX, (target.inventory.grenade || 0) + 1);
                target.grenades = target.inventory.grenade;
                break;
            }

            case 'health': {
                // Goes to whoever is most hurt
                const target = alive.reduce((a, b) =>
                    (a.hp / a.maxHp) <= (b.hp / b.maxHp) ? a : b);

                target.hp = target.maxHp;
                this.scene.get('Game').events.emit('playerHealthChanged', target);
                break;
            }
        }
    }

    refresh()
    {
        const coins = this.coinManager ? this.coinManager.total : 0;
        this.coinText.setText('$ ' + coins);

        const left = SHOP_SETTINGS.MAX_PURCHASES_PER_WAVE - this.purchases;
        this.limitText.setText(left + ' purchase' + (left === 1 ? '' : 's') + ' remaining this wave');

        this.cards.forEach(card => {
            const ok = this.canBuy(card.cost);
            card.panel.drawFrame(ok ? card.item.color : 0x444444, ok ? 0.85 : 0.6);
            card.price.setFill(ok ? '#ffcc00' : '#666666');
            card.container.setAlpha(ok ? 1 : 0.55);
        });
    }

    buildCountdown(w, h)
    {
        this.countdownText = this.add.text(w / 2, h * 0.78, '', {
            fontFamily: 'Impact, sans-serif',
            fontSize: '22px', fill: '#ff9966',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);

        this.add.rectangle(w / 2, h * 0.83, 320, 6, 0x000000).setAlpha(0.7);
        this.timeBar = this.add.rectangle(w / 2 - 160, h * 0.83, 320, 6, 0xff9966)
            .setOrigin(0, 0.5);

        this.openedAt = this.time.now;
    }

    flash(text, color)
    {
        if (this.flashText) this.flashText.destroy();

        this.flashText = this.add.text(
            this.cameras.main.width / 2, this.cameras.main.height * 0.70, text, {
                fontFamily: 'Impact, sans-serif',
                fontSize: '20px', fill: color,
                stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5).setDepth(80);

        this.tweens.add({
            targets: this.flashText, alpha: 0,
            delay: 900, duration: 400
        });
    }

    update(time)
    {
        const elapsed = time - this.openedAt;
        const left = Math.max(0, this.durationMs - elapsed);
        const secs = Math.ceil(left / 1000);

        this.countdownText.setText('NEXT WAVE IN ' + secs);
        this.timeBar.width = 320 * (left / this.durationMs);

        if (secs <= 2) this.countdownText.setFill('#ff4444');
    }

    close()
    {
        this.scene.stop();
    }
}