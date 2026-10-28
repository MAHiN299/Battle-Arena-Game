import Phaser from 'phaser';
import { AMMO } from '../managers/WaveConfig';
import { playSfx } from '../managers/Sfx';

export const PICKUP = {
    LIFETIME_MS:   10000,
    WARN_AT_MS:    7000,

    AMMO_AMOUNT:   45,
    HEALTH_AMOUNT: 35,
    THROWABLE_MAX: AMMO.GRENADE_MAX,

    // Magnet: drops drift toward a nearby player
    MAGNET_RANGE:  110,
    MAGNET_SPEED:  380,

    WEIGHT_AMMO:    55,
    WEIGHT_GRENADE: 12,
    WEIGHT_MOLOTOV: 12,
    WEIGHT_LANDMINE: 12,
    WEIGHT_HEALTH:  27,

    // Safety net — below this reserve, kills always drop ammo
    DESPERATE_AMMO: 25
};

const STYLE = {
    ammo:    { color: 0xffcc44, glyph: '\u25AC', ring: 0xffee88 },
    grenade: { color: 0x88ff9b, glyph: '\u25CF', ring: 0xbbffcc },
    molotov: { color: 0xff9c42, glyph: '\u2668', ring: 0xffc078 },
    landmine:{ color: 0x8e9a9e, glyph: '\u2739', ring: 0xc4d0d4 },
    health:  { color: 0xff6666, glyph: '\u271A', ring: 0xffaaaa }
};

export default class Pickup extends Phaser.Physics.Arcade.Sprite
{
    constructor(scene, x, y, kind)
    {
        super(scene, x, y, '__PICKUP_BOX');

        this.kind = kind;
        this.style = STYLE[kind] || STYLE.ammo;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setDisplaySize(28, 28);
        this.setTint(this.style.color);
        this.setDepth(8);

        this.body.setSize(28, 28);
        this.setBounce(0.45);
        this.setDragX(200);
        this.setCollideWorldBounds(true);

        // Pops out of the corpse with a spin
        this.setVelocity(
            Phaser.Math.Between(-110, 110),
            Phaser.Math.Between(-280, -190)
        );
        this.setAngularVelocity(Phaser.Math.Between(-300, 300));

        this.collected = false;
        this.spawnedAt = scene.time.now;

        this.buildVisuals();
        this.startLifetime();
        this.playSpawnBurst();
    }

    // ============================================================
    // VISUALS
    // ============================================================
    buildVisuals()
    {
        this.glyph = this.scene.add.text(this.x, this.y, this.style.glyph, {
            fontFamily: 'Impact, sans-serif',
            fontSize: '16px',
            color: '#000000'
        }).setOrigin(0.5).setDepth(9);

        // Pulsing halo so drops are visible in a busy fight
        this.glow = this.scene.add.circle(this.x, this.y, 22, this.style.color, 0.22)
            .setDepth(7);

        this.scene.tweens.add({
            targets: this.glow,
            scale: 1.5, alpha: 0.05,
            duration: 750, yoyo: true, repeat: -1
        });

        // Rising beacon so you can spot drops off-screen edge
        this.beacon = this.scene.add.rectangle(this.x, this.y, 3, 26, this.style.ring, 0.35)
            .setDepth(6);

        this.scene.tweens.add({
            targets: this.beacon,
            y: '-=22', alpha: 0,
            duration: 900, repeat: -1
        });
    }

    // Ring burst the moment it drops
    playSpawnBurst()
    {
        const ring = this.scene.add.circle(this.x, this.y, 8, this.style.ring, 0)
            .setStrokeStyle(3, this.style.ring, 0.9)
            .setDepth(9);

        this.scene.tweens.add({
            targets: ring,
            radius: 46, alpha: 0,
            duration: 400, ease: 'Cubic.Out',
            onComplete: () => ring.destroy()
        });
    }

    startLifetime()
    {
        this.scene.time.delayedCall(PICKUP.WARN_AT_MS, () => {
            if (!this.active || this.collected) return;

            this.warnTween = this.scene.tweens.add({
                targets: [this, this.glyph],
                alpha: 0.2,
                duration: 160, yoyo: true, repeat: -1
            });
        });

        this.scene.time.delayedCall(PICKUP.LIFETIME_MS, () => {
            if (!this.collected) this.expire();
        });
    }

    // ============================================================
    // MAGNET + FOLLOW
    // ============================================================
    preUpdate(time, delta)
    {
        super.preUpdate(time, delta);

        if (this.collected) return;

        if (this.glyph)  this.glyph.setPosition(this.x, this.y);
        if (this.glow)   this.glow.setPosition(this.x, this.y);
        if (this.beacon) this.beacon.setX(this.x);

        // Drift toward a nearby player after it has settled
        if (time - this.spawnedAt < 600) return;

        const players = [this.scene.player1, this.scene.player2].filter(p => {
            if (!p || p.isDead) return false;
            // Only magnet toward someone who can actually use this
            if (this.kind === 'health'  && p.hp >= p.maxHp) return false;
            if (['grenade', 'molotov', 'landmine'].includes(this.kind) &&
                (p.inventory?.[this.kind] ?? (this.kind === 'grenade' ? p.grenades : 0)) >= PICKUP.THROWABLE_MAX) return false;
            if (this.kind === 'ammo'    && (p.reserveAmmo || 0) >= (p.reserveCap || AMMO.RESERVE_MAX)) return false;
            return true;
        });

        let nearest = null, best = PICKUP.MAGNET_RANGE;

        players.forEach(p => {
            const d = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
            if (d < best) { best = d; nearest = p; }
        });

        if (nearest) {
            const angle = Phaser.Math.Angle.Between(this.x, this.y, nearest.x, nearest.y);
            const pull = PICKUP.MAGNET_SPEED * (1 - best / PICKUP.MAGNET_RANGE);

            this.body.setVelocityX(Math.cos(angle) * pull);
            this.body.setVelocityY(Math.sin(angle) * pull - 60);
            this.body.setAllowGravity(false);
        } else {
            this.body.setAllowGravity(true);
        }
    }

    // ============================================================
    // COLLECTION
    // ============================================================
    collect(player)
    {
        if (this.collected) return null;

        const applied = Pickup.applyKindEffect(this.scene, player, this.kind);
        if (!applied) return null;

        this.collected = true;
        playSfx(this.scene, 'pickup');
        this.playCollectAnimation(player, applied);
        return applied;
    }

    // ============================================================
    // SHARED EFFECT LOGIC — extracted so a "use from inventory" action
    // (persistent Ammo/Grenade/Health bought in the Shop, used during a
    // boss fight where no pickups drop) can apply the exact same
    // effect as walking over a dropped Pickup, without needing an
    // actual sprite/collision. Returns the same `applied` shape
    // (or null if it couldn't be applied, e.g. already full) so callers
    // can decide whether to actually spend the inventory unit.
    // ============================================================
    static applyKindEffect(scene, player, kind)
    {
        switch (kind) {

            case 'ammo': {
                const cap = player.reserveCap || AMMO.RESERVE_MAX;
                const before = player.reserveAmmo || 0;
                if (before >= cap) return null;   // leave it for later

                player.reserveAmmo = Math.min(cap, before + PICKUP.AMMO_AMOUNT);
                return { text: '+' + (player.reserveAmmo - before) + ' AMMO', color: '#ffcc44' };
            }

            case 'grenade':
            case 'molotov':
            case 'landmine': {
                const count = player.inventory[kind] || 0;
                if (count >= PICKUP.THROWABLE_MAX) return null;

                player.inventory[kind] = count + 1;
                if (kind === 'grenade') player.grenades = player.inventory.grenade;

                const colors = {
                    grenade: '#88ff9b',
                    molotov: '#ff9c42',
                    landmine: '#c4d0d4'
                };
                return { text: '+1 ' + kind.toUpperCase(), color: colors[kind] };
            }

            case 'health': {
                const noHeal = scene.waveManager && scene.waveManager.noHealActive;
                if (noHeal) {
                    return { text: 'HEALING DISABLED', color: '#ff6666' };
                }
                if (player.hp >= player.maxHp) return null;

                const before = player.hp;
                player.hp = Math.min(player.maxHp, player.hp + PICKUP.HEALTH_AMOUNT);
                scene.events.emit('playerHealthChanged', player);

                return { text: '+' + (player.hp - before) + ' HP', color: '#ff8888' };
            }

            default:
                return null;
        }
    }

    playCollectAnimation(player, applied)
    {
        // Box shoots into the player and shrinks
        this.body.enable = false;

        this.scene.tweens.add({
            targets: [this, this.glyph],
            x: player.x,
            y: player.y - 20,
            scale: 0.2,
            alpha: 0,
            duration: 180,
            ease: 'Cubic.In',
            onComplete: () => this.cleanup()
        });

        // Expanding ring at the pickup point
        const ring = this.scene.add.circle(this.x, this.y, 10, this.style.ring, 0)
            .setStrokeStyle(3, this.style.ring, 1).setDepth(50);

        this.scene.tweens.add({
            targets: ring, radius: 52, alpha: 0,
            duration: 350, onComplete: () => ring.destroy()
        });

        // Particles converging on the player
        for (let i = 0; i < 8; i++) {
            const a = (Math.PI * 2 / 8) * i;
            const sx = this.x + Math.cos(a) * 26;
            const sy = this.y + Math.sin(a) * 26;

            const p = this.scene.add.circle(sx, sy, 3, this.style.color).setDepth(50);

            this.scene.tweens.add({
                targets: p,
                x: player.x, y: player.y - 20,
                alpha: 0,
                duration: 260,
                delay: i * 18,
                ease: 'Cubic.In',
                onComplete: () => p.destroy()
            });
        }

        // Flash on the player
        player.setTintFill(this.style.ring);
        this.scene.time.delayedCall(90, () => {
            if (!player.isDead) player.clearTint();
        });

        if (applied) this.floatText(player, applied);
    }

    floatText(player, applied)
    {
        Pickup.showFloatText(this.scene, player, applied);
    }

    // Static twin of the above — used when applying an effect with no
    // real Pickup instance around (e.g. using a Shop-bought supply
    // during a boss fight).
    static showFloatText(scene, player, applied)
    {
        const t = scene.add.text(player.x, player.y - 56, applied.text, {
            fontFamily: 'Impact, sans-serif',
            fontSize: '19px',
            color: applied.color,
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5).setDepth(60).setScale(0.6);

        scene.tweens.add({
            targets: t, scale: 1, duration: 180, ease: 'Back.Out'
        });

        scene.tweens.add({
            targets: t, y: t.y - 44, alpha: 0,
            duration: 800, delay: 200,
            onComplete: () => t.destroy()
        });
    }

    expire()
    {
        this.scene.tweens.add({
            targets: [this, this.glyph, this.glow, this.beacon],
            alpha: 0, scale: 0.3,
            duration: 280,
            onComplete: () => this.cleanup()
        });
    }

    cleanup()
    {
        if (this.warnTween) this.warnTween.remove();
        if (this.glyph)   this.glyph.destroy();
        if (this.glow)    this.glow.destroy();
        if (this.beacon)  this.beacon.destroy();
        this.destroy();
    }

    // ============================================================
    // WHAT DROPS
    // ============================================================
    static rollKind(player)
    {
        if (!player) return 'ammo';

        const reserve  = player.reserveAmmo || 0;
        const hpRatio  = player.hp / player.maxHp;

        // Safety net: nearly out of ammo means a guaranteed refill.
        // Without this a player can reach a state they cannot escape.
        if (reserve <= PICKUP.DESPERATE_AMMO) return 'ammo';

        // Badly hurt takes priority next
        if (hpRatio <= 0.25) return 'health';

        let wAmmo      = PICKUP.WEIGHT_AMMO;
        let wGrenade   = PICKUP.WEIGHT_GRENADE;
        let wMolotov   = PICKUP.WEIGHT_MOLOTOV;
        let wLandmine  = PICKUP.WEIGHT_LANDMINE;
        let wHealth    = PICKUP.WEIGHT_HEALTH;

        if (reserve < 70)   wAmmo   *= 2.0;
        if (hpRatio < 0.55) wHealth *= 1.8;

        if ((player.inventory?.grenade ?? player.grenades ?? 0) >= PICKUP.THROWABLE_MAX) wGrenade = 0;
        if ((player.inventory?.molotov || 0) >= PICKUP.THROWABLE_MAX) wMolotov = 0;
        if ((player.inventory?.landmine || 0) >= PICKUP.THROWABLE_MAX) wLandmine = 0;
        if (hpRatio >= 1)             wHealth  *= 0.25;
        if (reserve >= (player.reserveCap || AMMO.RESERVE_MAX)) wAmmo *= 0.1;

        const total = wAmmo + wGrenade + wMolotov + wLandmine + wHealth;
        const r = Math.random() * total;

        if (r < wAmmo) return 'ammo';
        if (r < wAmmo + wGrenade) return 'grenade';
        if (r < wAmmo + wGrenade + wMolotov) return 'molotov';
        if (r < wAmmo + wGrenade + wMolotov + wLandmine) return 'landmine';
        return 'health';
    }
}