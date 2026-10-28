import Phaser from 'phaser';

// ============================================================
// Standalone playback of a saved "final moments" replay buffer
// (the last ~4 seconds of a past match, recorded by
// managers/ReplayRecorder.js and fetched from the backend by
// ProfileScene). Same ghost-sprite technique as the live TDM
// killcam, but with no live scene to freeze/resume — this scene
// IS the whole screen while it plays.
//
// The ghost-sprite playback itself has to stay on the Phaser canvas
// (it's driving real textures on a real camera), so only the chrome
// around it — the top title bar, back button, status line and
// "replay again" button — moved to a DOM overlay with a transparent
// middle, in the same dark-glass/Impact look as the rest of the menus.
// ============================================================

const STEP_MS = 60; // playback speed — a little slower than real time

export default class MatchReplayScene extends Phaser.Scene
{
    constructor() { super('MatchReplayScene'); }

    init(data)
    {
        this.frames = Array.isArray(data.frames) ? data.frames : [];
        this.mapCode = data.mapCode || 'arena1';
        this.returnScene = data.returnScene || 'ProfileScene';
        this.returnData = data.returnData || {};
    }

    create()
    {
        const w = this.cameras.main.width, h = this.cameras.main.height;

        // The real arena background, placed exactly like Arena1.js/
        // Arena2.js do in an actual match (same key, same world position/
        // size) — since the recorded x/y are real arena world
        // coordinates, this lines up correctly under the ghosts as the
        // camera follows them, instead of the flat black rectangle this
        // used to be.
        const bgKey = this.mapCode === 'arena2' ? 'arena2Bg' : 'arenaBg';
        if (this.textures.exists(bgKey)) {
            this.add.image(w / 2, h / 2, bgKey).setDisplaySize(w, h).setDepth(0);
        } else {
            // Fallback if the background asset somehow isn't loaded —
            // still better than nothing so it's not a bare black void.
            this.add.rectangle(w / 2, h / 2, w, h, 0x08080a).setDepth(0);
        }

        this.buildOverlay();
        this.events.once('shutdown', () => this.destroyOverlay());

        if (this.frames.length < 2) {
            this.setStatus('This replay has no usable data.');
            return;
        }

        // The recorded x/y are world coordinates from a (possibly wide)
        // arena, not this bare scene's canvas. A one-time centerOn() at
        // the first frame only got the opening instant right — as the
        // player(s) moved through the recorded ~4 seconds, they drifted
        // toward the edge of a static camera, leaving mostly empty black
        // around a small, off-corner character (there's no arena
        // background ever recorded to fill that space). Fixed by giving
        // the camera a real (invisible) target it follows smoothly for
        // the whole replay, moved to the live average ghost position
        // every tick below, plus a closer zoom so the character actually
        // reads clearly against the plain background.
        const firstSnaps = this.frames[0].snaps || [];
        const avgOf = (snaps, axis) => snaps.length
            ? snaps.reduce((sum, s) => sum + s[axis], 0) / snaps.length
            : 0;

        this.cameraTarget = this.add.rectangle(avgOf(firstSnaps, 'x'), avgOf(firstSnaps, 'y'), 1, 1).setAlpha(0);
        this.cameras.main.setZoom(1.6);
        this.cameras.main.startFollow(this.cameraTarget, true, 0.09, 0.09);

        // One ghost sprite per tracked player in the buffer (1 for solo, 2 for co-op).
        // Spawn each one at its actual first-frame position/texture rather
        // than the screen center — otherwise it visibly sits in the wrong
        // spot (off in unrelated world space) for the first STEP_MS before
        // playback()'s first tick corrects it.
        const firstFrameSnaps = firstSnaps;
        this.ghosts = [];
        for (let i = 0; i < firstFrameSnaps.length; i++) {
            const s = firstFrameSnaps[i];
            const tex = this.textures.exists(s.tex) ? s.tex : '__WHITE';
            // 0.2 matches the real in-game player scale (Player.js) and the
            // live in-match killcam ghost (ReplayRecorder.js) — this was
            // 0.9, making replayed characters render ~4.5x too large.
            const ghost = this.add.sprite(s.x, s.y, tex).setScale(0.2);
            ghost.setFlipX(!!s.flipX);
            ghost.setAlpha(s.alpha !== undefined ? s.alpha : 1);
            ghost.setAngle(s.angle || 0);
            this.ghosts.push(ghost);
        }

        // Enemy ghosts — a pool rather than a fixed count, since how many
        // enemies are alive changes frame to frame (spawns, kills, the
        // boss). playback() below grows/shows/hides this pool to match
        // each frame's actual enemy count instead of creating/destroying
        // sprites every tick.
        this.enemyGhosts = [];
        this.syncEnemyGhosts(this.frames[0].enemies || []);

        this.playback();
    }

    // Grows the enemy ghost pool as needed, updates each active one to
    // match this frame's enemy snapshots, and hides any leftover pool
    // sprites from a frame that had more enemies alive.
    syncEnemyGhosts(enemySnaps)
    {
        enemySnaps.forEach((s, gi) => {
            let ghost = this.enemyGhosts[gi];
            if (!ghost) {
                ghost = this.add.sprite(s.x, s.y, '__WHITE');
                this.enemyGhosts[gi] = ghost;
            }
            const tex = s.tex && this.textures.exists(s.tex) ? s.tex : '__WHITE';
            ghost.setTexture(tex);
            ghost.setPosition(s.x, s.y);
            ghost.setFlipX(!!s.flipX);
            ghost.setScale(s.scaleX || 1, s.scaleY || 1);
            ghost.setAngle(s.angle || 0);
            ghost.setVisible(true);
        });

        // Any pool sprites beyond this frame's actual enemy count are
        // left over from a busier earlier frame — hide rather than
        // destroy them, so they're ready to reuse if the count grows again.
        for (let gi = enemySnaps.length; gi < this.enemyGhosts.length; gi++) {
            if (this.enemyGhosts[gi]) this.enemyGhosts[gi].setVisible(false);
        }
    }

    // ============================================================
    // DOM OVERLAY (chrome only — transparent middle over the canvas)
    // ============================================================
    buildOverlay()
    {
        const el = document.createElement('div');
        el.id = 'replay-overlay';
        el.innerHTML = `
            <header class="replay-header">
                <button id="replay-back" type="button">&larr;&nbsp;BACK</button>
                <div class="replay-title">&#9654; MATCH REPLAY</div>
                <div class="replay-header-spacer"></div>
            </header>
            <div class="replay-footer">
                <div class="replay-status" id="replay-status"></div>
                <button type="button" class="replay-again" id="replay-again" hidden>&#8635; REPLAY AGAIN</button>
            </div>
        `;
        document.body.appendChild(el);
        this.overlayEl = el;

        requestAnimationFrame(() => el.classList.add('visible'));

        this.statusEl = el.querySelector('#replay-status');
        this.replayBtn = el.querySelector('#replay-again');

        el.querySelector('#replay-back').addEventListener('click', () => this.goBack());
        this.replayBtn.addEventListener('click', () => this.playback());
    }

    destroyOverlay()
    {
        if (this.overlayEl) { this.overlayEl.remove(); this.overlayEl = null; }
    }

    setStatus(text)
    {
        if (this.statusEl) this.statusEl.textContent = text;
    }

    playback()
    {
        this.replayBtn.hidden = true;
        this.setStatus('Playing...');

        let i = 0;
        if (this.step) this.step.remove();

        this.step = this.time.addEvent({
            delay: STEP_MS,
            repeat: this.frames.length - 1,
            callback: () => {
                const frame = this.frames[i];
                if (frame && frame.snaps) {
                    frame.snaps.forEach((s, gi) => {
                        const ghost = this.ghosts[gi];
                        if (!ghost) return;
                        if (this.textures.exists(s.tex)) ghost.setTexture(s.tex);
                        ghost.setPosition(s.x, s.y);
                        ghost.setFlipX(s.flipX);
                        ghost.setAlpha(s.alpha !== undefined ? s.alpha : 1);
                        ghost.setAngle(s.angle || 0);
                    });

                    // Keep the followed camera target on the live average
                    // position so the camera tracks the action instead of
                    // staying fixed on where it started.
                    if (this.cameraTarget && frame.snaps.length > 0) {
                        const avgX = frame.snaps.reduce((sum, s) => sum + s.x, 0) / frame.snaps.length;
                        const avgY = frame.snaps.reduce((sum, s) => sum + s.y, 0) / frame.snaps.length;
                        this.cameraTarget.setPosition(avgX, avgY);
                    }
                }

                // enemies is undefined on a replay saved before enemy
                // recording existed — treat that the same as "none this
                // frame" rather than erroring.
                this.syncEnemyGhosts((frame && frame.enemies) || []);

                i++;
            },
            callbackScope: this,
            onComplete: () => {
                this.setStatus('Replay ended');
                this.replayBtn.hidden = false;
            }
        });
    }

    goBack()
    {
        if (this.step) this.step.remove();
        this.scene.start(this.returnScene, this.returnData);
    }
}