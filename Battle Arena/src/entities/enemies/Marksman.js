import Phaser from 'phaser';
import BaseEnemy from './BaseEnemy';
import Bullet from '../Bullet';

// ============================================================
// A third combat archetype, distinct from melee infantry and
// the bomb-planting Bomber: a ranged unit that keeps its
// distance and fires rather than closing in. Reuses the same
// 'enemy1' texture as every other troop — visually distinguished
// by tint and scale only, no new art required.
// ============================================================

const PREFERRED_RANGE = 260;   // tries to stay roughly this far away
const FIRE_RANGE       = 420;  // will shoot from anywhere inside this
const RETREAT_RANGE    = 140;  // backs away if the player gets this close
const FIRE_COOLDOWN_MS = 1400;

export default class Marksman extends BaseEnemy {
    constructor(scene, x, y) {
        super(scene, x, y, 'enemy1');

        this.enemyKind = 'marksman';

        // Visually distinct: smaller, orange-tinted — reads as
        // "different" at a glance without needing a new sprite
        this.setScale(0.17);
        this.setTint(0xff9944);

        this.moveSpeed = 130;
        this.nextFireAt = 0;
    }

    update(players) {
        if (this.isDead || !this.body) return;
        if (this.isBlasted || this.isStandingUp || this.isHurt || this.isConfused) {
            super.update(players);   // let the base class handle these shared states
            return;
        }

        let target = null;
        let minDist = Infinity;

        (Array.isArray(players) ? players : [players]).forEach(p => {
            if (p && !p.isDead) {
                const d = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
                if (d < minDist) { minDist = d; target = p; }
            }
        });

        if (!target) {
            this.setVelocityX(0);
            this.anims.play(this.texturePrefix + 'Idle', true);
            return;
        }

        this.setFlipX(target.x < this.x);
        const isOnGround = this.body.blocked.down || this.body.touching.down;

        if (minDist < RETREAT_RANGE) {
            // Too close — back away rather than fight in melee
            const dir = target.x < this.x ? 1 : -1;
            this.setVelocityX(this.moveSpeed * dir);
            if (isOnGround) this.anims.play(this.texturePrefix + 'Run', true);

        } else if (minDist > PREFERRED_RANGE) {
            // Too far — close the gap, but only up to preferred range
            const dir = target.x < this.x ? -1 : 1;
            this.setVelocityX(this.moveSpeed * dir);
            if (isOnGround) this.anims.play(this.texturePrefix + 'Run', true);

        } else {
            // In the sweet spot — hold position and shoot
            this.setVelocityX(0);
            this.anims.play(this.texturePrefix + 'Idle', true);
        }

        if (minDist <= FIRE_RANGE && this.scene.time.now >= this.nextFireAt) {
            this.fireAt(target);
            this.nextFireAt = this.scene.time.now + FIRE_COOLDOWN_MS;
        }
    }

    fireAt(target) {
        const direction = target.x < this.x ? 'left' : 'right';
        const offsetX = direction === 'left' ? -30 : 30;

        const bullet = new Bullet(this.scene, this.x + offsetX, this.y - 10, direction);
        bullet.setTint(0xff9944);   // matches the shooter, reads as "enemy fire"

        if (this.scene.ground) {
            this.scene.physics.add.collider(bullet, this.scene.ground, () => bullet.hitWall());
        }

        // Damages whichever real player(s) exist in this scene
        [this.scene.player1, this.scene.player2].filter(Boolean).forEach(p => {
            this.scene.physics.add.overlap(bullet, p, () => {
                if (p.isDead) return;
                bullet.hitWall();
                p.takeDamage(12);
            });
        });

        if (this.scene.sound && this.scene.cache.audio.exists('SMGShootSound')) {
            this.scene.sound.play('SMGShootSound', { volume: 0.25, detune: -200 });
        }
    }
}