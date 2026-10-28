import Phaser from 'phaser';

// ============================================================
// KILLCAM / INSTANT REPLAY
//
// Continuously records a short rolling buffer of player
// positions, facing, and animation state. On a trigger (a kill,
// a wave clear), the last few seconds are played back in slow
// motion using ghost sprites layered over the live scene —
// no scene transition, no new textures, reuses whatever is
// already loaded.
// ============================================================

const BUFFER_MS   = 4000;   // how far back the recorder remembers
const RECORD_EVERY_MS = 50; // ~20 snapshots/sec is smooth enough at slow-mo
const REPLAY_SLOWMO   = 0.35;

export default class ReplayRecorder
{
    constructor(scene, players)
    {
        this.scene = scene;
        this.players = players;   // array of Player instances to watch
        this.buffer = [];         // [{t, snaps:[{x,y,flipX,tex,team}], enemies:[{x,y,flipX,tex,scaleX,scaleY,kind}]}]
        this.lastRecordAt = 0;
        this.isReplaying = false;
    }

    // Call once per frame from the scene's update()
    tick(time)
    {
        if (this.isReplaying) return;
        if (time - this.lastRecordAt < RECORD_EVERY_MS) return;
        this.lastRecordAt = time;

        const snaps = this.players.filter(Boolean).map(p => ({
            x: p.x,
            y: p.y,
            flipX: p.flipX,
            tex: p.texture ? p.texture.key : (p.heroPrefix + 'Idle1'),
            hp: p.hp,
            alpha: p.isDead ? 0.4 : 1,
            angle: p.angle || 0,
            team: p.team || null
        }));

        // New: also record every live enemy each tick — the standalone
        // Match Replay screen (post-match, no live scene to layer over)
        // wants to show the actual fight, not just the player alone in
        // empty space. The live in-match killcam (play() below) ignores
        // this extra field, so it's harmless there.
        const enemyGroup = this.scene.waveManager && this.scene.waveManager.enemyGroup;
        const enemies = enemyGroup
            ? enemyGroup.getChildren().filter(e => e && !e.isDead).map(e => ({
                x: e.x,
                y: e.y,
                flipX: !!e.flipX,
                tex: e.texture ? e.texture.key : null,
                scaleX: e.scaleX || 1,
                scaleY: e.scaleY || 1,
                angle: e.angle || 0,
                kind: e.enemyKind || 'base'
            }))
            : [];

        this.buffer.push({ t: time, snaps, enemies });

        const cutoff = time - BUFFER_MS;
        while (this.buffer.length && this.buffer[0].t < cutoff) {
            this.buffer.shift();
        }
    }

    // Plays back the last `windowMs` of recorded history, then
    // calls onComplete. Freezes live gameplay for the duration.
    play(windowMs, caption, onComplete)
    {
        if (this.isReplaying || this.buffer.length < 3) {
            if (onComplete) onComplete();
            return;
        }

        this.isReplaying = true;

        const scene = this.scene;
        const cutoffTime = this.buffer[this.buffer.length - 1].t - windowMs;
        const frames = this.buffer.filter(f => f.t >= cutoffTime);

        if (frames.length < 2) {
            this.isReplaying = false;
            if (onComplete) onComplete();
            return;
        }

        // Freeze the live scene without pausing timers (we need our
        // own timers to drive the replay), and hide the real players
        scene.physics.world.pause();
        this.players.forEach(p => { if (p) p.setVisible(false); });

        const w = scene.cameras.main.width;
        const h = scene.cameras.main.height;

        const overlay = [];

        const dim = scene.add.rectangle(0, 0, w, h, 0x000000, 0.55)
            .setOrigin(0, 0).setDepth(500).setScrollFactor(0);
        overlay.push(dim);

        const barTop = scene.add.rectangle(0, 0, w, 46, 0x000000, 1)
            .setOrigin(0, 0).setDepth(502).setScrollFactor(0);
        const barBottom = scene.add.rectangle(0, h - 46, w, 46, 0x000000, 1)
            .setOrigin(0, 0).setDepth(502).setScrollFactor(0);
        overlay.push(barTop, barBottom);

        const label = scene.add.text(w / 2, 23, '\u25B6 INSTANT REPLAY', {
            fontFamily: 'Impact, sans-serif', fontSize: '20px', color: '#ffcc44',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(503).setScrollFactor(0);
        overlay.push(label);

        if (caption) {
            const capText = scene.add.text(w / 2, h - 23, caption, {
                fontFamily: 'Impact, sans-serif', fontSize: '16px', color: '#ffffff'
            }).setOrigin(0.5).setDepth(503).setScrollFactor(0);
            overlay.push(capText);
        }

        // One ghost sprite per tracked player, reusing their real textures
        const ghosts = this.players.map(() =>
            scene.add.sprite(0, 0, '__WHITE').setDepth(501).setScale(0.2)
        );

        let i = 0;
        const stepDelay = Math.max(16, RECORD_EVERY_MS / REPLAY_SLOWMO);

        const step = scene.time.addEvent({
            delay: stepDelay,
            repeat: frames.length - 1,
            callback: () => {
                const frame = frames[i];
                if (frame) {
                    frame.snaps.forEach((s, gi) => {
                        const ghost = ghosts[gi];
                        if (!ghost) return;

                        if (scene.textures.exists(s.tex)) ghost.setTexture(s.tex);
                        ghost.setPosition(s.x, s.y);
                        ghost.setFlipX(s.flipX);
                        ghost.setAlpha(s.alpha);
                        ghost.setAngle(s.angle);
                        ghost.setVisible(true);
                    });
                }
                i++;
            },
            callbackScope: this,
            onComplete: () => this.finish(overlay, ghosts, onComplete)
        });
    }

    finish(overlay, ghosts, onComplete)
    {
        const scene = this.scene;

        this.scene.time.delayedCall(600, () => {
            overlay.forEach(o => o.destroy());
            ghosts.forEach(g => g.destroy());

            scene.physics.world.resume();
            this.players.forEach(p => { if (p) p.setVisible(true); });

            this.isReplaying = false;
            if (onComplete) onComplete();
        });
    }
}