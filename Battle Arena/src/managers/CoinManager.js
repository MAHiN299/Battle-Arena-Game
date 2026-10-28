// New File

import Phaser from 'phaser';
import { playSfx } from './Sfx';

// ============================================================
// Coins earned during a run. Tracked locally, banked to the
// account when the run ends.
// ============================================================

export const COINS = {
    PER_KILL:        5,
    PER_BOMBER:      12,
    PER_BOSS:        150,

    // Wave completion bonus, scales with wave number
    WAVE_BASE:       40,
    WAVE_PER_LEVEL:  15,

    // Extra for clearing without losing a crate
    CRATE_BONUS:     30,

    // Extra for nobody going down during the wave
    FLAWLESS_BONUS:  50
};

export default class CoinManager
{
    constructor(scene)
    {
        this.scene = scene;
        this.total = 0;
        this.runEarned = 0;
    }

    // ============================================================
    // EARNING
    // ============================================================

    // ============================================================
    // OLD CODE REPLACED BELOW:
    // Original addKill did not accept or pass the killer Player object.
    // ============================================================
    // addKill(enemy, x, y)
    // {
    //     const kind = enemy.enemyKind || 'base';
    //
    //     let amount = COINS.PER_KILL;
    //     if (kind === 'bomber') amount = COINS.PER_BOMBER;
    //     if (kind === 'boss')   amount = COINS.PER_BOSS;
    //
    //     this.add(amount, x, y);
    //     return amount;
    // }

    // ============================================================
    // NEW CODE: Updated addKill to accept killer and forward it to add()
    // ============================================================
    addKill(enemy, x, y, killer)
    {
        const kind = enemy.enemyKind || 'base';

        let amount = COINS.PER_KILL;
        if (kind === 'bomber') amount = COINS.PER_BOMBER;
        if (kind === 'boss')   amount = COINS.PER_BOSS;

        this.add(amount, x, y, killer);
        return amount;
    }

    addWaveBonus(waveNumber, cratesIntact, nobodyDowned)
    {
        let amount = COINS.WAVE_BASE + (waveNumber - 1) * COINS.WAVE_PER_LEVEL;

        const lines = [['WAVE BONUS', amount]];

        if (cratesIntact) {
            amount += COINS.CRATE_BONUS;
            lines.push(['CRATES SAFE', COINS.CRATE_BONUS]);
        }

        if (nobodyDowned) {
            amount += COINS.FLAWLESS_BONUS;
            lines.push(['FLAWLESS', COINS.FLAWLESS_BONUS]);
        }

        // ============================================================
        // OLD CODE REPLACED BELOW:
        // Original addWaveBonus updated team totals without splitting share per player.
        // ============================================================
        // this.total += amount;
        // this.runEarned += amount;
        // this.showBonusBreakdown(lines, amount);

        // ============================================================
        // NEW CODE: Split wave completion bonus evenly into each player's tracked total
        // ============================================================
        this.total += amount;
        this.runEarned += amount;

        const players = [this.scene.player1, this.scene.player2].filter(Boolean);
        const share = Math.round(amount / players.length);
        players.forEach(p => { p.coinsEarned = (p.coinsEarned || 0) + share; });

        this.showBonusBreakdown(lines, amount);
        this.scene.events.emit('coinsChanged', this.total);

        return amount;
    }

    // ============================================================
    // OLD CODE REPLACED BELOW:
    // Original add() method without player attribution parameter.
    // ============================================================
    // add(amount, x, y)
    // {
    //     this.total += amount;
    //     this.runEarned += amount;
    //
    //     if (x !== undefined) this.flyCoin(x, y, amount);
    //
    //     this.scene.events.emit('coinsChanged', this.total);
    // }

    // ============================================================
    // NEW CODE: Attributing coin earnings per-player and launching flyCoin to target player
    // ============================================================
    add(amount, x, y, player)
    {
        this.total += amount;
        this.runEarned += amount;

        // Attributed to whichever player actually earned it — each
        // player's own running total, tracked directly on their
        // own Player object so UIScene can read it per-panel
        if (player) {
            player.coinsEarned = (player.coinsEarned || 0) + amount;
        }

        if (x !== undefined) this.flyCoin(x, y, amount, player);

        this.scene.events.emit('coinsChanged', this.total);
    }

    spend(amount)
    {
        if (amount > this.total) return false;

        this.total -= amount;
        this.scene.events.emit('coinsChanged', this.total);
        return true;
    }

    canAfford(amount)
    {
        return this.total >= amount;
    }

    // ============================================================
    // COIN FLIGHT ANIMATION
    // Coins arc from the kill toward the HUD counter
    // ============================================================

    // ============================================================
    // OLD CODE REPLACED BELOW:
    // Original flyCoin with static top-right HUD target position.
    // ============================================================
    // flyCoin(x, y, amount)
    // {
    //     playSfx(this.scene, 'coin');
    //
    //     const count = Math.min(5, Math.max(1, Math.floor(amount / 4)));
    //
    //     // Where the HUD coin counter sits, in screen space
    //     const targetX = this.scene.cameras.main.width - 150;
    //     const targetY = 40;

    // ============================================================
    // NEW CODE: Dynamic target position targeting player-specific HUD readout
    // ============================================================
    flyCoin(x, y, amount, player)
    {
        playSfx(this.scene, 'coin');

        const count = Math.min(5, Math.max(1, Math.floor(amount / 4)));

        // Flies to whichever player earned it — their own panel's
        // coin readout, not a single shared corner display
        const isRight = player && this.scene.player2 && player === this.scene.player2;
        const targetX = isRight ? this.scene.cameras.main.width - 60 : 60;
        const targetY = 95;

        for (let i = 0; i < count; i++) {
            const coin = this.scene.add.circle(x, y, 7, 0xffcc00)
                .setStrokeStyle(2, 0x8a6a00)
                .setDepth(60);

            const inner = this.scene.add.text(x, y, '$', {
                fontFamily: 'Impact, sans-serif',
                fontSize: '10px',
                fill: '#8a6a00'
            }).setOrigin(0.5).setDepth(61);

            // Pop outward first, so they scatter from the kill
            const popX = x + Phaser.Math.Between(-50, 50);
            const popY = y - Phaser.Math.Between(20, 60);

            this.scene.tweens.add({
                targets: [coin, inner],
                x: popX,
                y: popY,
                duration: 260,
                delay: i * 45,
                ease: 'Cubic.Out',
                onComplete: () => {
                    // Then home in on the counter
                    this.scene.tweens.add({
                        targets: [coin, inner],
                        x: targetX,
                        y: targetY,
                        scale: 0.5,
                        duration: 420,
                        ease: 'Cubic.In',
                        onComplete: () => {
                            coin.destroy();
                            inner.destroy();
                            this.scene.events.emit('coinLanded');
                        }
                    });
                }
            });

            // Spin while travelling
            this.scene.tweens.add({
                targets: coin,
                scaleX: 0.3,
                duration: 180,
                yoyo: true,
                repeat: 3
            });
        }

        // Floating number at the kill site
        const label = this.scene.add.text(x, y - 30, '+' + amount, {
            fontFamily: 'Impact, sans-serif',
            fontSize: '17px',
            fill: '#ffcc00',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(60);

        this.scene.tweens.add({
            targets: label,
            y: label.y - 34,
            alpha: 0,
            duration: 700,
            onComplete: () => label.destroy()
        });
    }

    // ============================================================
    // WAVE BONUS BREAKDOWN
    // ============================================================
    showBonusBreakdown(lines, total)
    {
        const cam = this.scene.cameras.main;
        const cx = cam.width / 2;
        const cy = cam.height * 0.42;

        const elements = [];

        // Panel behind the numbers
        const panel = this.scene.add.rectangle(cx, cy + 40, 420, 40 + lines.length * 34, 0x0a0a0e)
            .setStrokeStyle(2, 0xffcc00, 0.8)
            .setDepth(158).setScrollFactor(0).setAlpha(0);

        const header = this.scene.add.text(cx, cy - 6, 'WAVE COMPLETE', {
            fontFamily: 'Impact, sans-serif',
            fontSize: '30px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(160).setScrollFactor(0).setAlpha(0);

        elements.push(panel, header);

        this.scene.tweens.add({
            targets: [panel, header], alpha: 1, duration: 300
        });

        // Each bonus line
        lines.forEach((entry, i) => {
            const [label, value] = entry;
            const y = cy + 34 + i * 32;

            const l = this.scene.add.text(cx - 170, y, label, {
                fontSize: '16px', color: '#aaaaaa', fontStyle: 'bold'
            }).setOrigin(0, 0.5).setDepth(160).setScrollFactor(0).setAlpha(0);

            const v = this.scene.add.text(cx + 170, y, '+' + value, {
                fontFamily: 'Impact, sans-serif',
                fontSize: '22px', color: '#ffcc00',
                stroke: '#000000', strokeThickness: 3
            }).setOrigin(1, 0.5).setDepth(160).setScrollFactor(0).setAlpha(0);

            elements.push(l, v);

            this.scene.tweens.add({
                targets: [l, v], alpha: 1, x: '+=8',
                duration: 240, delay: 400 + i * 260
            });

            // Coins fly to the counter as each line lands
            this.scene.time.delayedCall(400 + i * 260, () => {
                this.flyCoinFromPoint(cx + 170, y, value);
            });
        });

        // Total, after the breakdown
        const totalY = cy + 34 + lines.length * 32 + 8;

        const totalTxt = this.scene.add.text(cx, totalY, 'TOTAL  +' + total, {
            fontFamily: 'Impact, sans-serif',
            fontSize: '28px', color: '#88ff9b',
            stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(160).setScrollFactor(0).setAlpha(0).setScale(0.7);

        elements.push(totalTxt);

        this.scene.tweens.add({
            targets: totalTxt, alpha: 1, scale: 1,
            duration: 400, ease: 'Back.Out',
            delay: 400 + lines.length * 260
        });

        this.scene.cameras.main.flash(200, 255, 220, 100);

        // Clear it all away
        this.scene.time.delayedCall(400 + lines.length * 260 + 2200, () => {
            elements.forEach(e => {
                this.scene.tweens.add({
                    targets: e, alpha: 0, duration: 400,
                    onComplete: () => e.destroy()
                });
            });
        });
    }

    // Coins flying from a fixed screen point rather than a world position
    flyCoinFromPoint(x, y, amount)
    {
        const count = Math.min(6, Math.max(2, Math.floor(amount / 12)));
        const targetX = this.scene.cameras.main.width - 150;
        const targetY = 40;

        for (let i = 0; i < count; i++) {
            const coin = this.scene.add.circle(x, y, 6, 0xffcc00)
                .setStrokeStyle(2, 0x8a6a00)
                .setDepth(165).setScrollFactor(0);

            this.scene.tweens.add({
                targets: coin,
                x: targetX,
                y: targetY,
                scale: 0.5,
                duration: 500,
                delay: i * 60,
                ease: 'Cubic.In',
                onComplete: () => {
                    coin.destroy();
                    this.scene.events.emit('coinLanded');
                }
            });
        }
    }

    // ============================================================
    // BANKING
    // ============================================================
    async bankToAccount()
    {
        if (this.runEarned <= 0) return { banked: 0 };

        try {
            const api = (await import('../api/api')).default;

            const res = await api.post('/api/match/complete', {
                coinsEarned: this.total
            });

            return res;
        } catch (err) {
            console.log('Could not bank coins:', err.message);
            return { banked: 0, error: err.message };
        }
    }
}