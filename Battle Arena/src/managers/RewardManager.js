// New File

import Phaser from 'phaser';
import { AMMO } from './WaveConfig';

// ============================================================
// Converts kills into ammunition and grenades.
//
// Refund is tuned so close-range fighting sustains you and
// long-range spraying drains you. The falloff damage in
// Player.js becomes a resource decision rather than a detail.
// ============================================================

export default class RewardManager
{
    constructor(scene)
    {
        this.scene = scene;
    }

    // Called when an enemy dies. killer is the player credited.
    onEnemyKilled(enemy, killer)
    {
        if (!killer) return;

        const kind = enemy.enemyKind || 'base';
        const hits = enemy.hitsTaken || 0;
        const wasMelee = enemy.lastDamageWasMelee;

        let ammo = AMMO.KILL_REFUND;

        if (kind === 'bomber') ammo = AMMO.BOMBER_REFUND;
        if (kind === 'boss')   ammo = AMMO.BOSS_REFUND;

        // Efficiency bonus: killed in few hits means close range
        let bonusText = '';
        if (hits > 0 && hits <= AMMO.EFFICIENT_HITS) {
            ammo += AMMO.EFFICIENT_BONUS;
            bonusText = ' CLEAN';
        }

        if (wasMelee) {
            ammo += AMMO.MELEE_BONUS;
            bonusText = ' MELEE';
        }

        this.giveAmmo(killer, ammo, bonusText);

        // Grenade drop
        const chance = kind === 'bomber'
            ? AMMO.BOMBER_GRENADE_CHANCE
            : AMMO.GRENADE_DROP_CHANCE;

        if (Math.random() < chance) {
            this.giveGrenade(killer, enemy.x, enemy.y);
        }
    }

    giveAmmo(player, amount, suffix)
    {
        if (player.reserveAmmo === undefined) player.reserveAmmo = 0;

        const before = player.reserveAmmo;
        player.reserveAmmo = Math.min(AMMO.RESERVE_MAX, player.reserveAmmo + amount);

        const gained = player.reserveAmmo - before;
        if (gained <= 0) return;   // already full

        this.float(player, '+' + gained + suffix, '#ffcc44');
    }

    giveGrenade(player, x, y)
    {
        const count = player.inventory.grenade || 0;
        if (count >= AMMO.GRENADE_MAX) return;

        player.inventory.grenade = count + 1;
        player.grenades = player.inventory.grenade;
        this.float(player, '+1 GRENADE', '#88ff9b');
    }

    float(player, text, color)
    {
        const t = this.scene.add.text(player.x, player.y - 70, text, {
            fontFamily: 'Impact, sans-serif',
            fontSize: '18px',
            fill: color,
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(40);

        this.scene.tweens.add({
            targets: t,
            y: t.y - 40,
            alpha: 0,
            duration: 800,
            onComplete: () => t.destroy()
        });
    }
}