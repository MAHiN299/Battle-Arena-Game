import Phaser from 'phaser';
import net from './NetClient';
import Pickup from '../entities/Pickup';

// ============================================================
// Keeps two machines showing the same game.
//
// HOST  is authoritative. It runs the wave manager, spawns
//       enemies, and decides damage. It broadcasts state.
// GUEST sends its inputs, applies host state, and predicts
//       its own movement locally so controls feel instant.
// ============================================================

export const SYNC = {
    STATE_HZ:   20,      // host broadcasts per second
    INPUT_HZ:   30,      // guest sends inputs per second
    LERP:       0.25,    // how hard remote entities snap to host truth
    SNAP_DIST:  240      // beyond this, teleport instead of interpolating
};

export default class GameSync
{
    constructor(scene, isHost)
    {
        this.scene  = scene;
        this.isHost = isHost;

        this.remoteInput = null;     // host: latest input from the guest
        this.lastState   = null;     // guest: latest state from the host

        this.stateAccum = 0;
        this.inputAccum = 0;

        this.wire();
    }

    wire()
    {
        if (this.isHost) {
            this.onInput = (msg) => { this.remoteInput = msg.i; };
            net.on('input', this.onInput);
        } else {
            this.onState = (msg) => { this.applyState(msg.s); };
            net.on('state', this.onState);
        }

        this.onEvent = (msg) => this.handleEvent(msg);
        net.on('event', this.onEvent);

        this.scene.events.once('shutdown', () => this.destroy());
    }

    // ============================================================
    // MAIN LOOP — called from Game.update
    // ============================================================
    update(delta)
    {
        if (this.isHost) {
            this.stateAccum += delta;

            const interval = 1000 / SYNC.STATE_HZ;
            if (this.stateAccum >= interval) {
                this.stateAccum = 0;
                this.broadcastState();
            }
        } else {
            this.inputAccum += delta;

            const interval = 1000 / SYNC.INPUT_HZ;
            if (this.inputAccum >= interval) {
                this.inputAccum = 0;
                this.sendInput();
            }

            this.smoothRemote(delta);
        }
    }

    // ============================================================
    // HOST — broadcast the world
    // ============================================================
    broadcastState()
    {
        const s = this.scene;

        const state = {
            p1: this.packPlayer(s.player1),
            p2: this.packPlayer(s.player2),
            e:  this.packEnemies(),
            c:  this.packCrates(),
            pk: this.packPickups(),
            w:  s.waveManager ? s.waveManager.currentWave : 0,
            co: s.coinManager ? s.coinManager.total : 0,
            k:  s.totalKills || 0
        };

        net.sendState(state);
    }

    packPlayer(p)
    {
        if (!p) return null;

        return {
            x: Math.round(p.x),
            y: Math.round(p.y),
            f: p.flipX ? 1 : 0,
            h: Math.round(p.hp),
            a: p.bullets,
            r: p.reserveAmmo || 0,
            g: p.grenades,
            mo: p.inventory.molotov || 0,
            lm: p.inventory.landmine || 0,
            d: p.isDead ? 1 : 0,
            an: p.anims && p.anims.currentAnim ? p.anims.currentAnim.key : null
        };
    }

    packEnemies()
    {
        const wm = this.scene.waveManager;
        if (!wm || !wm.enemyGroup) return [];

        return wm.enemyGroup.getChildren()
            .filter(e => e.active)
            .map(e => ({
                i: e.netId,
                x: Math.round(e.x),
                y: Math.round(e.y),
                f: e.flipX ? 1 : 0,
                h: Math.round(e.hp),
                d: e.isDead ? 1 : 0,
                k: e.enemyKind || 'base'
            }));
    }

    packCrates()
    {
        const list = this.scene.supplyCrates;
        if (!list) return [];

        const arr = list.getChildren ? list.getChildren() : list;

        return arr.map((c, i) => ({
            i,
            x: Math.round(c.x),
            y: Math.round(c.y),
            e: c.isExploded ? 1 : 0
        }));
    }

    packPickups()
    {
        const group = this.scene.pickups;
        if (!group) return [];

        return group.getChildren()
            .filter(item => item.active && !item.collected && item.netId !== undefined)
            .map(item => ({
                i: item.netId,
                k: item.kind,
                x: Math.round(item.x),
                y: Math.round(item.y),
                vx: Math.round(item.body.velocity.x),
                vy: Math.round(item.body.velocity.y)
            }));
    }

    // ============================================================
    // GUEST — apply the world
    // ============================================================
    applyState(state)
    {
        if (!state) return;

        this.lastState = state;

        const s = this.scene;

        // The guest controls player 2; player 1 is remote
        this.applyRemotePlayer(s.player1, state.p1);

        // Correct our own position gently if it has drifted
        this.correctLocal(s.player2, state.p2);

        this.applyEnemies(state.e);
        this.applyCrates(state.c);
        if (Array.isArray(state.pk)) this.applyPickups(state.pk);

        if (s.waveManager && state.w) {
            s.waveManager.currentWave = state.w;
        }

        if (s.coinManager && typeof state.co === 'number') {
            s.coinManager.total = state.co;
            s.events.emit('coinsChanged', state.co);
        }

        // Kills are host-authoritative — the guest never runs
        // sweepDeaths() itself, so without this its own kill
        // count would stay at zero for the whole match
        if (typeof state.k === 'number') {
            s.totalKills = state.k;
        }
    }

    applyRemotePlayer(p, data)
    {
        if (!p || !data) return;

        p.netTargetX = data.x;
        p.netTargetY = data.y;

        p.setFlipX(data.f === 1);
        p.hp = data.h;
        p.bullets = data.a;
        p.reserveAmmo = data.r;
        p.grenades = data.g;
        p.inventory.grenade = data.g;
        if (typeof data.mo === 'number') p.inventory.molotov = data.mo;
        if (typeof data.lm === 'number') p.inventory.landmine = data.lm;

        const shouldBeDead = data.d === 1;

        if (shouldBeDead && !p.isDead) {
            p.isDead = true;
            if (p.body) p.body.enable = false;
            p.anims.play(p.heroPrefix + 'Death', true);
        }
        else if (!shouldBeDead && p.isDead) {
            p.isDead = false;
            if (p.body) p.body.enable = true;
        }

        // Mirror the animation the host is playing
        if (data.an && !p.isDead) {
            const current = p.anims.currentAnim ? p.anims.currentAnim.key : null;
            if (current !== data.an) {
                try { p.anims.play(data.an, true); } catch (e) {}
            }
        }
    }

    // Our own character: trust local movement, but pull back
    // toward the host if we have drifted badly
    correctLocal(p, data)
    {
        if (!p || !data) return;

        const dist = Phaser.Math.Distance.Between(p.x, p.y, data.x, data.y);

        if (dist > SYNC.SNAP_DIST) {
            p.setPosition(data.x, data.y);
        }

        // Health and ammo are always the host's call
        p.hp = data.h;
        p.bullets = data.a;
        p.reserveAmmo = data.r;
        p.grenades = data.g;
        p.inventory.grenade = data.g;
        if (typeof data.mo === 'number') p.inventory.molotov = data.mo;
        if (typeof data.lm === 'number') p.inventory.landmine = data.lm;

        if (data.d === 1 && !p.isDead) {
            p.isDead = true;
            if (p.body) p.body.enable = false;
            p.anims.play(p.heroPrefix + 'Death', true);
        }
    }

    applyEnemies(list)
    {
        if (!list) return;

        const wm = this.scene.waveManager;
        if (!wm || !wm.enemyGroup) return;

        const alive = new Set();

        list.forEach(data => {
            alive.add(data.i);

            let e = this.findEnemy(data.i);

            if (!e) {
                e = this.scene.spawnRemoteEnemy(data.k, data.x, data.y, data.i);
                if (!e) return;
            }

            e.netTargetX = data.x;
            e.netTargetY = data.y;
            e.setFlipX(data.f === 1);
            e.hp = data.h;

            if (data.d === 1 && !e.isDead) {
                e.isDead = true;
                if (e.die) e.die();
            }
        });

        // Anything the host no longer reports has gone
        wm.enemyGroup.getChildren().forEach(e => {
            if (e.netId !== undefined && !alive.has(e.netId) && !e.isDead) {
                e.destroy();
            }
        });
    }

    findEnemy(netId)
    {
        const wm = this.scene.waveManager;
        if (!wm || !wm.enemyGroup) return null;

        return wm.enemyGroup.getChildren().find(e => e.netId === netId) || null;
    }

    applyCrates(list)
    {
        if (!list) return;

        const crates = this.scene.supplyCrates;
        if (!crates) return;

        const arr = crates.getChildren ? crates.getChildren() : crates;

        list.forEach(data => {
            const c = arr[data.i];
            if (!c) return;

            if (data.e === 1 && !c.isExploded) {
                c.explode();
            }
        });
    }

    applyPickups(list)
    {
        const group = this.scene.pickups;
        if (!group) return;

        const alive = new Set();
        list.forEach(data => {
            alive.add(data.i);
            let item = group.getChildren().find(pickup => pickup.netId === data.i);

            if (!item) {
                item = new Pickup(this.scene, data.x, data.y, data.k);
                item.netId = data.i;
                group.add(item, true);
            }

            item.netTargetX = data.x;
            item.netTargetY = data.y;
            if (item.body) item.body.setVelocity(data.vx, data.vy);
        });

        group.getChildren().forEach(item => {
            if (item.netId !== undefined && !alive.has(item.netId) && !item.collected) {
                item.cleanup();
            }
        });
    }

    // Smooth remote entities toward their reported positions
    smoothRemote(delta)
    {
        const lerp = SYNC.LERP;

        const move = (o) => {
            if (!o || o.netTargetX === undefined) return;

            const dist = Phaser.Math.Distance.Between(o.x, o.y, o.netTargetX, o.netTargetY);

            if (dist > SYNC.SNAP_DIST) {
                o.setPosition(o.netTargetX, o.netTargetY);
                return;
            }

            o.x = Phaser.Math.Linear(o.x, o.netTargetX, lerp);
            o.y = Phaser.Math.Linear(o.y, o.netTargetY, lerp);
        };

        move(this.scene.player1);

        const wm = this.scene.waveManager;
        if (wm && wm.enemyGroup) {
            wm.enemyGroup.getChildren().forEach(move);
        }

        const pickups = this.scene.pickups;
        if (pickups) pickups.getChildren().forEach(move);
    }

    // ============================================================
    // GUEST — send inputs
    // ============================================================
    sendInput()
    {
        const p = this.scene.player2;
        if (!p || !p.inputHandler) return;

        const i = p.inputHandler.getInputs();

        net.sendInput({
            l: i.left ? 1 : 0,
            r: i.right ? 1 : 0,
            u: i.up ? 1 : 0,
            d: i.down ? 1 : 0,
            j: i.jump ? 1 : 0,
            s: i.shoot ? 1 : 0,
            a: i.attack ? 1 : 0,
            t: i.throw ? 1 : 0
        });
    }

    // Host reads the guest's input as if it were a local device
    getRemoteInputs()
    {
        const i = this.remoteInput;

        if (!i) {
            return {
                left: false, right: false, up: false, down: false,
                jump: false, attack: false, throw: false, shoot: false,
                reload: false, interact: false
            };
        }

        return {
            left:   i.l === 1,
            right:  i.r === 1,
            up:     i.u === 1,
            down:   i.d === 1,
            jump:   i.j === 1,
            attack: i.a === 1,
            throw:  i.t === 1,
            shoot:  i.s === 1,
            reload: false,
            interact: false
        };
    }

    // ============================================================
    // ONE-OFF EVENTS
    // ============================================================
    handleEvent(msg)
    {
        const s = this.scene;

        switch (msg.name) {

            case 'shot':
                // Visual only; damage is the host's decision
                s.events.emit('remoteShot', msg.data);
                break;

            case 'grenade':
                s.events.emit('remoteGrenade', msg.data);
                break;

            case 'gameOver':
                s.endRun(msg.data.victory);
                break;
        }
    }

    destroy()
    {
        if (this.onInput) net.off('input', this.onInput);
        if (this.onState) net.off('state', this.onState);
        if (this.onEvent) net.off('event', this.onEvent);
    }
}