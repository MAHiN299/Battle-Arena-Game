import Phaser from 'phaser';
import Player from '../entities/Player';
import net from '../net/NetClient';
import TeamSync from '../net/TeamSync';
import { buildArena1 } from '../maps/Arena1';
import { buildArena2 } from '../maps/Arena2';
import { drawCard } from '../ui/PhaserUiKit';

export default class TeamTDMScene extends Phaser.Scene
{
    constructor() { super('TDMScene'); }

    init(data)
    {
        this.isHost  = !!data?.isHost;
        this.roster  = data?.roster || [];
        this.selections = data?.selections || {};
        this.selectedMap = data?.selectedMap === 'arena2' ? 'arena2' : 'arena1';
        this.myUsername = data?.myUsername || net.username;
        this.matchOver = false;
    }

    create()
    {
        if (!this.textures.exists('__WHITE')) {
            const g = this.make.graphics({ x: 0, y: 0, add: false });
            g.fillStyle(0xffffff, 1);
            g.fillRect(0, 0, 8, 8);
            g.generateTexture('__WHITE', 8, 8);
            g.destroy();
        }

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        this.physics.world.setBounds(0, 0, width, height);
        if (this.selectedMap === 'arena2') buildArena2(this, width, height);
        else buildArena1(this, width, height);

        if (this.roster.length !== 2) {
            this.add.text(width / 2, height / 2, 'PVP requires exactly two players', {
                fontFamily: 'Impact, sans-serif', fontSize: '36px', color: '#ff7b7b',
                stroke: '#000000', strokeThickness: 5, align: 'center'
            }).setOrigin(0.5).setDepth(200);
            this.time.delayedCall(2000, () => this.leaveMatch());
            return;
        }

        this.createPlayerAnimations();
        this.spawns = {
            red: { x: width * 0.13, y: this.selectedMap === 'arena2' ? height - 205 : height - 155 },
            blue: { x: width * 0.87, y: this.selectedMap === 'arena2' ? height - 205 : height - 155 }
        };

        this.players = [];
        this.sync = new TeamSync(this, this.isHost, this.myUsername);

        this.roster.forEach((entry, i) => {
            const isMe = entry.username === this.myUsername;
            const team = i === 0 ? 'red' : 'blue';
            const spawn = this.spawns[team];
            const selection = this.selections[entry.username] || {};
            const heroPrefix = selection.character === 'hero2' ? 'hero2' : 'hero';

            const player = new Player(
                this, spawn.x, spawn.y, heroPrefix,
                isMe ? 'keyboard' : 'remote', selection.startingItem
            );

            player.team = team;
            player.netName = entry.username;
            player.playerLabel.setText(i === 0 ? 'P1' : 'P2');

            if (!isMe && this.isHost) {
                player.inputHandler = {
                    getInputs: () => this.sync.getRemoteInputs(entry.username)
                };
            }

            this.physics.add.collider(player, this.ground);
            this.physics.add.collider(player, this.platforms);
            if (this.ground2) this.physics.add.collider(player, this.ground2);
            if (this.ground3) this.physics.add.collider(player, this.ground3);

            this.sync.registerPlayer(entry.username, player);
            this.players.push(player);
        });
        this.player1 = this.players[0];
        this.player2 = this.players[1];

        this.events.on('bulletFired', bullet => this.wirePvpBullet(bullet));

        this.events.on('playerHealthChanged', (p) => {
            if (this.isHost && p.isDead && !p.pvpHandled) {
                p.pvpHandled = true;
                this.onPlayerKilled(p);
            }
        });

        this.add.text(width / 2, 28, 'P V P', {
            fontFamily: 'Impact, sans-serif', fontSize: '30px', color: '#ffcc44',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(100);

        this.onDisconnected = () => {
            if (this.scene.isActive()) this.showDisconnected();
        };
        net.on('disconnected', this.onDisconnected);

        this.onPvpResult = msg => {
            if (msg.name === 'pvpResult' && !this.isHost) {
                this.finishMatch(msg.data.winner, msg.data.loser);
            }
        };
        net.on('event', this.onPvpResult);

        this.events.once('shutdown', () => {
            net.off('disconnected', this.onDisconnected);
            net.off('event', this.onPvpResult);
        });

        this.input.keyboard.on('keydown-ESC', () => this.leaveMatch());
    }

    createPlayerAnimations()
    {
        const animations = [
            ['Idle', 7, 6, -1], ['Run', 5, 18, -1], ['Jump', 9, 10, 0],
            ['Climb', 8, 12, -1], ['Attack', 4, 15, 0], ['Death', 6, 10, 0], ['Throw', 5, 15, 0]
        ];
        ['hero', 'hero2'].forEach(prefix => {
            animations.forEach(([name, count, frameRate, repeat]) => {
                const key = prefix + name;
                if (this.anims.exists(key)) return;
                const frameCount = name === 'Idle' && prefix === 'hero2' ? 5 : count;
                const frames = Array.from({ length: frameCount }, (_, i) => ({ key: prefix + name + (i + 1) }));
                this.anims.create({ key, frames, frameRate, repeat, yoyo: name === 'Idle' });
            });
        });
    }

    wirePvpBullet(bullet)
    {
        this.players.forEach(target => {
            if (target === bullet.owner) return;

            this.physics.add.overlap(bullet, target, () => {
                if (target.isDead) return;
                if (bullet.hitWall) bullet.hitWall();

                const dist = Phaser.Math.Distance.Between(bullet.owner.x, bullet.owner.y, target.x, target.y);
                const damage = Phaser.Math.Clamp(25 - Math.floor(dist / 20), 5, 25);
                target.takeDamage(damage);
            });
        });
    }

    onPlayerKilled(deadPlayer)
    {
        if (!this.isHost || this.matchOver) return;
        const winner = this.players.find(player => player !== deadPlayer);
        if (!winner) return;
        net.sendEvent('pvpResult', { winner: winner.netName, loser: deadPlayer.netName });
        this.finishMatch(winner.netName, deadPlayer.netName);
    }

    finishMatch(winnerName, loserName)
    {
        if (this.matchOver) return;
        this.matchOver = true;
        this.showResult(winnerName, loserName);
    }

    showResult(winnerName, loserName)
    {
        const w = this.cameras.main.width, h = this.cameras.main.height;
        const winner = this.players.find(player => player.netName === winnerName);
        const color = winner && winner.team === 'red' ? '#ff5555' : '#5599ff';
        const accentInt = winner && winner.team === 'red' ? 0xff5555 : 0x5599ff;

        drawCard(this, w / 2, h / 2, 600, 210, accentInt, { fillAlpha: 0.7, strokeAlpha: 0.8, depth: 200, border: false });

        this.add.text(w / 2, h / 2 - 45, winnerName + ' WINS', {
            fontFamily: 'Impact, sans-serif', fontSize: '48px', color,
            stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(201);
        this.add.text(w / 2, h / 2 + 25, loserName + ' DEFEATED', {
            fontFamily: 'Impact, sans-serif', fontSize: '25px', color: '#ffffff'
        }).setOrigin(0.5).setDepth(201);

        this.time.delayedCall(4000, () => this.leaveMatch());
    }

    showDisconnected()
    {
        if (this.disconnectShown) return;
        this.disconnectShown = true;
        this.matchOver = true;
        const w = this.cameras.main.width, h = this.cameras.main.height;

        drawCard(this, w / 2, h / 2, 480, 140, 0xff5555, { fillAlpha: 0.7, strokeAlpha: 0.8, depth: 300, border: false });

        this.add.text(w / 2, h / 2, 'CONNECTION LOST', {
            fontFamily: 'Impact, sans-serif', fontSize: '40px', color: '#ff5555',
            stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(301);
        this.time.delayedCall(2500, () => this.leaveMatch());
    }

    leaveMatch()
    {
        this.sound.stopAll();
        net.send('leaveRoom', {});
        this.scene.start('MenuScene');
    }

    update(time, delta)
    {
        if (this.matchOver) return;

        this.players.forEach(p => {
            if (!p) return;
            const isMine = p.netName === this.myUsername;
            if (!isMine && !this.isHost) return;   // guests only simulate themselves

            p.onLadder = false;
            p.currentLadder = null;
            this.physics.overlap(p, this.ladders, (player, ladder) => {
                player.onLadder = true;
                player.currentLadder = ladder;
            });
            p.update();
        });

        if (this.sync) this.sync.update(delta);
    }
}