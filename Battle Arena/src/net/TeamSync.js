import Phaser from 'phaser';
import net from './NetClient';

// ============================================================
// N-player sync for team TDM. Separate from GameSync entirely —
// that file stays untouched so co-op's proven, working sync is
// never put at risk by this.
//
// Host is authoritative. Broadcasts an array of every connected
// player's state, keyed by username rather than fixed slots.
// ============================================================

const STATE_HZ = 20;
const LERP = 0.25;
const SNAP_DIST = 240;

export default class TeamSync
{
    constructor(scene, isHost, myUsername)
    {
        this.scene = scene;
        this.isHost = isHost;
        this.myUsername = myUsername;

        this.localPlayers = new Map();   // username -> Player instance (this client's Phaser objects)
        this.remoteInputs  = new Map();  // username -> latest input, host only

        this.stateAccum = 0;
        this.inputAccum = 0;

        this.wire();
    }

    registerPlayer(username, playerObj) {
        this.localPlayers.set(username, playerObj);
    }

    wire()
    {
        if (this.isHost) {
            this.onInput = (msg) => {
                this.remoteInputs.set(msg.username, msg.i);
            };
            net.on('teamInput', this.onInput);
        } else {
            this.onState = (msg) => this.applyState(msg.players);
            net.on('teamState', this.onState);
        }

        this.scene.events.once('shutdown', () => this.destroy());
    }

    update(delta)
    {
        if (this.isHost) {
            this.stateAccum += delta;
            if (this.stateAccum >= 1000 / STATE_HZ) {
                this.stateAccum = 0;
                this.broadcastState();
            }
        } else {
            this.inputAccum += delta;
            if (this.inputAccum >= 1000 / 30) {
                this.inputAccum = 0;
                this.sendMyInput();
            }
            this.smoothRemotes(delta);
        }
    }

    // ============================================================
    // HOST
    // ============================================================
    broadcastState()
    {
        const players = [];

        this.localPlayers.forEach((p, username) => {
            if (!p) return;
            players.push({
                username,
                team: p.team,
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
            });
        });

        net.send('teamState', { players });
    }

    getRemoteInputs(username)
    {
        const i = this.remoteInputs.get(username);
        if (!i) {
            return { left: false, right: false, up: false, down: false,
                      jump: false, attack: false, throw: false, shoot: false,
                      reload: false, interact: false, revive: false };
        }
        return {
            left: i.l === 1, right: i.r === 1, up: i.u === 1, down: i.d === 1,
            jump: i.j === 1, attack: i.a === 1, throw: i.t === 1, shoot: i.s === 1,
            reload: false, interact: i.e === 1, revive: i.e === 1
        };
    }

    // ============================================================
    // GUEST
    // ============================================================
    applyState(playersData)
    {
        if (!playersData) return;

        playersData.forEach(data => {
            // My own character: host is authoritative on hp/ammo,
            // but I trust my own local position unless it has drifted
            if (data.username === this.myUsername) {
                const mine = this.localPlayers.get(this.myUsername);
                if (!mine) return;

                const dist = Phaser.Math.Distance.Between(mine.x, mine.y, data.x, data.y);
                if (dist > SNAP_DIST) mine.setPosition(data.x, data.y);

                mine.hp = data.h;
                mine.bullets = data.a;
                mine.reserveAmmo = data.r;
                mine.grenades = data.g;
                mine.inventory.grenade = data.g;
                if (typeof data.mo === 'number') mine.inventory.molotov = data.mo;
                if (typeof data.lm === 'number') mine.inventory.landmine = data.lm;

                if (data.d === 1 && !mine.isDead) {
                    mine.isDead = true;
                    if (mine.body) mine.body.enable = false;
                }
                return;
            }

            // Everyone else: pure remote puppet, smoothed toward the
            // host's reported position
            const p = this.localPlayers.get(data.username);
            if (!p) return;

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
                if (p.anims) p.anims.play(p.heroPrefix + 'Death', true);
            } else if (!shouldBeDead && p.isDead) {
                p.isDead = false;
                if (p.body) p.body.enable = true;
            }

            if (data.an && !p.isDead && p.anims) {
                const current = p.anims.currentAnim ? p.anims.currentAnim.key : null;
                if (current !== data.an) {
                    try { p.anims.play(data.an, true); } catch (e) {}
                }
            }
        });
    }

    smoothRemotes(delta)
    {
        this.localPlayers.forEach((p, username) => {
            if (username === this.myUsername) return;
            if (!p || p.netTargetX === undefined) return;

            const dist = Phaser.Math.Distance.Between(p.x, p.y, p.netTargetX, p.netTargetY);
            if (dist > SNAP_DIST) {
                p.setPosition(p.netTargetX, p.netTargetY);
                return;
            }
            p.x = Phaser.Math.Linear(p.x, p.netTargetX, LERP);
            p.y = Phaser.Math.Linear(p.y, p.netTargetY, LERP);
        });
    }

    sendMyInput()
    {
        const mine = this.localPlayers.get(this.myUsername);
        if (!mine || !mine.inputHandler) return;

        const i = mine.inputHandler.getInputs();

        net.send('teamInput', {
            username: this.myUsername,
            i: {
                l: i.left ? 1 : 0, r: i.right ? 1 : 0,
                u: i.up ? 1 : 0, d: i.down ? 1 : 0,
                j: i.jump ? 1 : 0, a: i.attack ? 1 : 0,
                t: i.throw ? 1 : 0, s: i.shoot ? 1 : 0,
                e: (i.interact || i.revive) ? 1 : 0
            }
        });
    }

    destroy()
    {
        if (this.onInput) net.off('teamInput', this.onInput);
        if (this.onState) net.off('teamState', this.onState);
    }
}