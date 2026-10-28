import Phaser from 'phaser';
import Player from '../entities/Player';
import WaveManager from '../managers/WaveManager';
import TimeBomb from '../entities/TimeBomb';
import CoinManager from '../managers/CoinManager';
import Pickup from '../entities/Pickup';
import audioManager from '../managers/AudioManager';
import api from '../api/api';
// New: records a short rolling buffer of player positions so the last
// few seconds of a match can be saved and replayed later from Profile
import ReplayRecorder from '../managers/ReplayRecorder';

// ম্যাপ ইম্পোর্ট
import { buildArena1 } from '../maps/Arena1';
import { buildArena2 } from '../maps/Arena2';

// ==========================================
// 🌐 NETWORKING & ONLINE SYNC IMPORTS
// ==========================================
import net from '../net/NetClient';
import GameSync from '../net/GameSync';
import { setKeysReservedForGameplay } from '../net/QuickChat';
import RemoteInput from '../inputs/RemoteInput';

// ==========================================
// 👾 ENEMY ENTITY IMPORTS (ADDED FOR REMOTE SPAWNING)
// ==========================================
import BaseEnemy from '../entities/enemies/BaseEnemy';
import Bomber from '../entities/enemies/Bomber';

export default class Game extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    // ==========================================
    // ⚙️ INIT SCENE (UPDATED WITH ONLINE DATA)
    // ==========================================
    init(data) {
        this.selectedMap = data?.map || 'arena1';
        this.isOnline = !!data?.online;
        this.isHost   = !!data?.isHost;

        this.p1Character = data?.p1Character || 'hero';
        this.p2Character = data?.p2Character || 'hero2';
        this.p1Data = data?.player1 || { character: 'hero1', startingItem: 'grenade' }; // 🚀 ফিক্স: startingItem
        this.p2Data = data?.player2 || null;

        this.spikeZone = null;

        this.player1 = null;
        this.player2 = null;
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        audioManager.init(this);
        audioManager.playMusic(this.selectedMap === 'arena2' ? 'arena2Music' : 'gameMusic');

        // ==========================================
        // 🚀 THE ULTIMATE AUDIO FIX
        // ==========================================
        this.sound.pauseOnBlur = false; // গেমের বাইরে ক্লিক করলেও সাউন্ড মিউট হবে না

        const resumeAudio = () => {
            if (this.sound.context && this.sound.context.state === 'suspended') {
                this.sound.context.resume();
            }
        };
        this.input.on('pointerdown', resumeAudio);
        this.input.keyboard.on('keydown', resumeAudio);
        // ==========================================

        this.physics.world.setBounds(-200, 0, width + 400, height);

        // ==========================================
        // 🗺️ MAP LOADING
        // ==========================================
        if (this.selectedMap === 'arena2') {
            buildArena2(this, width, height);
        } else {
            buildArena1(this, width, height);
        }

        // ==========================================
        // 🎬 ANIMATIONS REGISTRATION
        // ==========================================
        const heroPrefixes = ['hero', 'hero2'];

        const idleFrameCounts = { hero: 7, hero2: 5 };

        heroPrefixes.forEach(prefix => {
            const idleCount = idleFrameCounts[prefix] || 7;
            const idleFrames = [];
            for (let i = 1; i <= idleCount; i++) idleFrames.push({ key: prefix + 'Idle' + i });
            this.anims.create({ key: prefix + 'Idle', frames: idleFrames, frameRate: 6, repeat: -1, yoyo: true });
            this.anims.create({ key: prefix + 'Run', frames: [{ key: prefix + 'Run1' }, { key: prefix + 'Run2' }, { key: prefix + 'Run3' }, { key: prefix + 'Run4' }, { key: prefix + 'Run5' }], frameRate: 18, repeat: -1 });
            this.anims.create({ key: prefix + 'Jump', frames: [{ key: prefix + 'Jump1' }, { key: prefix + 'Jump2' }, { key: prefix + 'Jump3' }, { key: prefix + 'Jump4' }, { key: prefix + 'Jump5' }, { key: prefix + 'Jump6' }, { key: prefix + 'Jump7' }, { key: prefix + 'Jump8' }, { key: prefix + 'Jump9' }], frameRate: 10, repeat: 0 });
            this.anims.create({ key: prefix + 'Climb', frames: [{ key: prefix + 'Climb1' }, { key: prefix + 'Climb2' }, { key: prefix + 'Climb3' }, { key: prefix + 'Climb4' }, { key: prefix + 'Climb5' }, { key: prefix + 'Climb6' }, { key: prefix + 'Climb7' }, { key: prefix + 'Climb8' }], frameRate: 12, repeat: -1 });
            this.anims.create({ key: prefix + 'Attack', frames: [{ key: prefix + 'Attack1' }, { key: prefix + 'Attack2' }, { key: prefix + 'Attack3' }, { key: prefix + 'Attack4' }], frameRate: 15, repeat: 0 });
            this.anims.create({ key: prefix + 'Death', frames: [{ key: prefix + 'Death1' }, { key: prefix + 'Death2' }, { key: prefix + 'Death3' }, { key: prefix + 'Death4' }, { key: prefix + 'Death5' }, { key: prefix + 'Death6' }], frameRate: 10, repeat: 0 });
            this.anims.create({ key: prefix + 'Throw', frames: [{ key: prefix + 'Throw1' }, { key: prefix + 'Throw2' }, { key: prefix + 'Throw3' }, { key: prefix + 'Throw4' }, { key: prefix + 'Throw5' }], frameRate: 15, repeat: 0 });
        });

        this.anims.create({ key: 'grenadeBlast', frames: [{ key: 'grenadeBlust1' }, { key: 'grenadeBlust2' }, { key: 'grenadeBlust3' }, { key: 'grenadeBlust4' }, { key: 'grenadeBlust5' }, { key: 'grenadeBlust6' }, { key: 'grenadeBlust7' }], frameRate: 15, repeat: 0 });

        // 🚀 ফিক্স: মলোটোভের আগুন লুপ করার অ্যানিমেশন
        this.anims.create({
            key: 'fireEffect',
            frames: [
                { key: 'fireEffect1' }, { key: 'fireEffect2' },
                { key: 'fireEffect3' }, { key: 'fireEffect4' },
                { key: 'fireEffect5' }, { key: 'fireEffect6' }
            ],
            frameRate: 12,
            repeat: -1 // লুপ হবে
        });

        const enemyPrefix = 'enemy1';
        this.anims.create({ key: enemyPrefix + 'Idle', frames: [{ key: enemyPrefix + 'Idle1' }, { key: enemyPrefix + 'Idle2' }, { key: enemyPrefix + 'Idle3' }, { key: enemyPrefix + 'Idle4' }, { key: enemyPrefix + 'Idle5' }, { key: enemyPrefix + 'Idle6' }], frameRate: 6, repeat: -1 });
        this.anims.create({ key: enemyPrefix + 'Run', frames: [{ key: enemyPrefix + 'Run1' }, { key: enemyPrefix + 'Run2' }, { key: enemyPrefix + 'Run3' }, { key: enemyPrefix + 'Run4' }, { key: enemyPrefix + 'Run5' }, { key: enemyPrefix + 'Run6' }, { key: enemyPrefix + 'Run7' }], frameRate: 8, repeat: -1 });
        this.anims.create({ key: enemyPrefix + 'Attack', frames: [{ key: enemyPrefix + 'Attack1' }, { key: enemyPrefix + 'Attack2' }, { key: enemyPrefix + 'Attack3' }, { key: enemyPrefix + 'Attack4' }], frameRate: 7, repeat: 0 });
        this.anims.create({ key: enemyPrefix + 'Jump', frames: [{ key: enemyPrefix + 'Jump1' }, { key: enemyPrefix + 'Jump2' }, { key: enemyPrefix + 'Jump3' }, { key: enemyPrefix + 'Jump4' }], frameRate: 10, repeat: 0 });
        this.anims.create({ key: enemyPrefix + 'Climb', frames: [{ key: enemyPrefix + 'LadderClimb1' }, { key: enemyPrefix + 'LadderClimb2' }, { key: enemyPrefix + 'LadderClimb3' }, { key: enemyPrefix + 'LadderClimb4' }, { key: enemyPrefix + 'LadderClimb5' }, { key: enemyPrefix + 'LadderClimb6' }, { key: enemyPrefix + 'LadderClimb7' }, { key: enemyPrefix + 'LadderClimb8' }], frameRate: 12, repeat: -1 });
        this.anims.create({ key: enemyPrefix + 'Death', frames: [{ key: enemyPrefix + 'Death1' }, { key: enemyPrefix + 'Death2' }, { key: enemyPrefix + 'Death3' }, { key: enemyPrefix + 'Death4' }, { key: enemyPrefix + 'Death5' }, { key: enemyPrefix + 'Death6' }], frameRate: 10, repeat: 0 });
        this.anims.create({ key: enemyPrefix + 'StandUp', frames: [{ key: enemyPrefix + 'StandUp1' }, { key: enemyPrefix + 'StandUp2' }, { key: enemyPrefix + 'StandUp3' }, { key: enemyPrefix + 'StandUp4' }, { key: enemyPrefix + 'StandUp5' }, { key: enemyPrefix + 'StandUp6' }], frameRate: 8, repeat: 0 });

        const bomberPrefix = 'bomberEnemy';
        this.anims.create({ key: bomberPrefix + 'Idle', frames: [{ key: bomberPrefix + 'Idle1' }, { key: bomberPrefix + 'Idle2' }, { key: bomberPrefix + 'Idle3' }, { key: bomberPrefix + 'Idle4' }], frameRate: 6, repeat: -1 });
        this.anims.create({ key: bomberPrefix + 'Run', frames: [{ key: bomberPrefix + 'Run1' }, { key: bomberPrefix + 'Run2' }, { key: bomberPrefix + 'Run3' }, { key: bomberPrefix + 'Run4' }, { key: bomberPrefix + 'Run5' }, { key: bomberPrefix + 'Run6' }, { key: bomberPrefix + 'Run7' }], frameRate: 8, repeat: -1 });
        this.anims.create({ key: bomberPrefix + 'Climb', frames: [{ key: bomberPrefix + 'Climb1' }, { key: bomberPrefix + 'Climb2' }, { key: bomberPrefix + 'Climb3' }, { key: bomberPrefix + 'Climb4' }, { key: bomberPrefix + 'Climb5' }, { key: bomberPrefix + 'Climb6' }, { key: bomberPrefix + 'Climb7' }, { key: bomberPrefix + 'Climb8' }], frameRate: 12, repeat: -1 });
        this.anims.create({ key: bomberPrefix + 'BombSetUp', frames: [{ key: bomberPrefix + 'BombSetUp1' }, { key: bomberPrefix + 'BombSetUp2' }], frameRate: 5, repeat: 0 });
        this.anims.create({ key: bomberPrefix + 'Throw', frames: [{ key: bomberPrefix + 'Throw1' }, { key: bomberPrefix + 'Throw2' }, { key: bomberPrefix + 'Throw3' }, { key: bomberPrefix + 'Throw4' }, { key: bomberPrefix + 'Throw5' }, { key: bomberPrefix + 'Throw6' }, { key: bomberPrefix + 'Throw7' }], frameRate: 15, repeat: 0 });
        this.anims.create({ key: bomberPrefix + 'Death', frames: [{ key: bomberPrefix + 'Death1' }, { key: bomberPrefix + 'Death2' }, { key: bomberPrefix + 'Death3' }, { key: bomberPrefix + 'Death4' }, { key: bomberPrefix + 'Death5' }], frameRate: 10, repeat: 0 });
        this.anims.create({ key: bomberPrefix + 'StandUp', frames: [{ key: bomberPrefix + 'StandUp1' }, { key: bomberPrefix + 'StandUp2' }, { key: bomberPrefix + 'StandUp3' }, { key: bomberPrefix + 'StandUp4' }, { key: bomberPrefix + 'StandUp5' }, { key: bomberPrefix + 'StandUp6' }, { key: bomberPrefix + 'StandUp7' }], frameRate: 8, repeat: 0 });

        // ==========================================
        // 🐗 BOAR ANIMATIONS
        // ==========================================
        const boarFrames = (animation, frameNumbers) => frameNumbers.map(frame => ({
            key: `boar${animation}${String(frame).padStart(2, '0')}`
        }));
        this.anims.create({ key: 'boarIdle', frames: boarFrames('Idle', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), frameRate: 6, repeat: -1 });
        this.anims.create({ key: 'boarRunning', frames: boarFrames('Running', [1, 2, 3, 4, 5, 6, 7, 8, 9]), frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'boarBreak', frames: boarFrames('Break', [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12]), frameRate: 10, repeat: 0 });
        this.anims.create({ key: 'boarDeath', frames: boarFrames('Death', [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12]), frameRate: 10, repeat: 0 });

        // ==========================================
        // 👹 BOSS FULL ANIMATIONS SETUP
        // ==========================================
        const bossPrefix = 'boss';

        this.anims.create({
            key: bossPrefix + 'Idle',
            frames: [
                { key: bossPrefix + 'Idle1' }, { key: bossPrefix + 'Idle2' },
                { key: bossPrefix + 'Idle3' }, { key: bossPrefix + 'Idle4' },
                { key: bossPrefix + 'Idle5' }, { key: bossPrefix + 'Idle6' },
                { key: bossPrefix + 'Idle7' }, { key: bossPrefix + 'Idle8' },
                { key: bossPrefix + 'Idle9' }
            ],
            frameRate: 6, repeat: -1
        });

        this.anims.create({
            key: bossPrefix + 'Run',
            frames: [
                { key: bossPrefix + 'Walk1' }, { key: bossPrefix + 'Walk2' },
                { key: bossPrefix + 'Walk3' }, { key: bossPrefix + 'Walk4' },
                { key: bossPrefix + 'Walk5' }, { key: bossPrefix + 'Walk6' },
                { key: bossPrefix + 'Walk7' }, { key: bossPrefix + 'Walk8' },
                { key: bossPrefix + 'Walk9' }
            ],
            frameRate: 6, repeat: -1
        });

        this.anims.create({
            key: bossPrefix + 'Attack',
            frames: [
                { key: bossPrefix + 'Attack1' }, { key: bossPrefix + 'Attack2' },
                { key: bossPrefix + 'Attack3' }, { key: bossPrefix + 'Attack4' },
                { key: bossPrefix + 'Attack5' }, { key: bossPrefix + 'Attack6' },
                { key: bossPrefix + 'Attack7' }, { key: bossPrefix + 'Attack8' }
            ],
            frameRate: 10, repeat: 0
        });

        this.anims.create({
            key: bossPrefix + 'Death',
            frames: [
                { key: bossPrefix + 'Death1' }, { key: bossPrefix + 'Death2' },
                { key: bossPrefix + 'Death3' }, { key: bossPrefix + 'Death4' },
                { key: bossPrefix + 'Death5' }, { key: bossPrefix + 'Death6' },
                { key: bossPrefix + 'Death7' }, { key: bossPrefix + 'Death8' },
                { key: bossPrefix + 'Death9' }, { key: bossPrefix + 'Death10' },
                { key: bossPrefix + 'Death11' }, { key: bossPrefix + 'Death12' },
                { key: bossPrefix + 'Death13' }
            ],
            frameRate: 8, repeat: 0
        });

        this.anims.create({
            key: 'bossTeleport',
            frames: [
                { key: 'bossTeleport1' }, { key: 'bossTeleport2' },
                { key: 'bossTeleport3' }, { key: 'bossTeleport4' },
                { key: 'bossTeleport5' }, { key: 'bossTeleport6' },
                { key: 'bossTeleport7' }, { key: 'bossTeleport8' },
                { key: 'bossTeleport9' }, { key: 'bossTeleport10' },
                { key: 'bossTeleport11' }, { key: 'bossTeleport12' },
                { key: 'bossTeleport13' }
            ],
            frameRate: 12,
            repeat: 0
        });

        this.anims.create({
            key: 'bosslaugh',
            frames: [
                { key: 'bosslaugh1' }, { key: 'bosslaugh2' },
                { key: 'bosslaugh3' }, { key: 'bosslaugh4' },
                { key: 'bosslaugh5' }, { key: 'bosslaugh6' },
                { key: 'bosslaugh7' }, { key: 'bosslaugh8' },
                { key: 'bosslaugh9' }, { key: 'bosslaugh10' },
                { key: 'bosslaugh11' }
            ],
            frameRate: 10,
            repeat: 0,
            yoyo: true
        });

        this.anims.create({
            key: 'bossKO',
            frames: [
                { key: 'bossKO1' }, { key: 'bossKO2' },
                { key: 'bossKO3' }, { key: 'bossKO4' },
                { key: 'bossKO5' }
            ],
            frameRate: 10,
            repeat: -1,
            yoyo: true
        });

        this.anims.create({
            key: 'fireOrb',
            frames: [
                { key: 'fireOrb1' }, { key: 'fireOrb2' },
                { key: 'fireOrb3' }, { key: 'fireOrb4' },
                { key: 'fireOrb5' }, { key: 'fireOrb6' },
                { key: 'fireOrb7' }
            ],
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'fireEffect',
            frames: [
                { key: 'fireEffect1' }, { key: 'fireEffect2' },
                { key: 'fireEffect3' }, { key: 'fireEffect4' },
                { key: 'fireEffect5' }, { key: 'fireEffect6' }
            ],
            frameRate: 12,
            repeat: -1,
            yoyo:true
        });

        this.anims.create({
            key: 'lightningEffect',
            frames: [
                { key: 'lightningEffect1' }, { key: 'lightningEffect2' },
                { key: 'lightningEffect3' }, { key: 'lightningEffect4' },
                { key: 'lightningEffect5' }, { key: 'lightningEffect6' },
                { key: 'lightningEffect7' }, { key: 'lightningEffect8' }
            ],
            frameRate: 15,
            repeat: 0
        });

        // ==========================================
        // 🎮 PLAYERS & PHYSICS LOGIC
        // ==========================================
        const getPrefix = (charId) => charId === 'hero2' ? 'hero2' : 'hero';

        if (this.isOnline) {
            // 🚀 ফিক্স: startingItem ডেটা পাস করা হলো (this.p1Data.startingItem)
            this.player1 = new Player(this, width * 0.10, height * 0.30, this.p1Character,
                this.isHost ? 'keyboard' : 'remote', this.p1Data.startingItem);
            this.player2 = new Player(this, width * 0.80, height * 0.30, this.p2Character,
                this.isHost ? 'remote' : 'keyboard', this.p2Data?.startingItem);
            this.player2.setFlipX(true);

            this.player1.netName = 'Host';
            this.player2.netName = 'Guest';

            this.sync = new GameSync(this, this.isHost);

            if (!this.isHost) {
                this.onGuestGameOver = (msg) => {
                    if (msg.name === 'gameOver') this.endRun(msg.data.victory);
                };
                net.on('event', this.onGuestGameOver);
                this.events.once('shutdown', () => net.off('event', this.onGuestGameOver));
            }

            if (this.isHost) {
                this.player2.inputHandler = new RemoteInput(this.sync);
            } else {
                this.player1.inputHandler = new RemoteInput(this.sync);
            }
        } else {
            // Local co-op
            const p1Prefix = getPrefix(this.p1Data.character);
            this.player1 = new Player(this, width * 0.10, height * 0.30, p1Prefix, 'keyboard', this.p1Data.startingItem);

            if (this.p2Data) {
                const p2Prefix = getPrefix(this.p2Data.character);
                this.player2 = new Player(this, width * 0.80, height * 0.30, p2Prefix, 'gamepad', this.p2Data.startingItem);
                this.player2.setFlipX(true);
            }
        }

        const players = [this.player1];
        if (this.player2) players.push(this.player2);

        const leftWall = this.add.rectangle(-10, height / 2, 20, height, 0x000000, 0);
        this.physics.add.existing(leftWall, true);
        const rightWall = this.add.rectangle(width + 10, height / 2, 20, height, 0x000000, 0);
        this.physics.add.existing(rightWall, true);

        players.forEach(p => {
            this.physics.add.collider(p, leftWall);
            this.physics.add.collider(p, rightWall);
            if (this.ground) this.physics.add.collider(p, this.ground);
            if (this.ground2) this.physics.add.collider(p, this.ground2);
            if (this.ground3) this.physics.add.collider(p, this.ground3);
            if (this.platforms) {
                this.physics.add.collider(p, this.platforms, null, () => {
                    if (p.onLadder && p.inputHandler) {
                        const inputs = p.inputHandler.getInputs();
                        if (inputs.down) return false;
                    }
                    return true;
                });
            }
        });

        // ==========================================
        // ⚔️ MANAGERS & TIMERS
        // ==========================================
        this.timeBombs = [];
        this.waveManager = new WaveManager(this);
        const playerCount = this.player2 ? 2 : 1;
        this.waveManager.setPlayerCount(playerCount);
        this.waveManager.startWave1();

        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.pause();
            this.scene.sleep('UIScene');
            this.scene.launch('PauseScene');
        });

        this.scene.launch('UIScene', { player1: this.player1, player2: this.player2 });

        this.coinManager = new CoinManager(this);
        this.matchStartTime = this.time.now;
        this.totalKills = 0;
        this.runEnded = false;

        this.replayRecorder = new ReplayRecorder(this, [this.player1, this.player2].filter(Boolean));

        // ==========================================
        // 🛡️ EVENTS
        // ==========================================
        this.events.on('enemyKilled', (enemy, killer) => {
            this.totalKills++;
            if (killer) killer.matchKills = (killer.matchKills || 0) + 1;
            const dropX = enemy.x;
            const dropY = enemy.y - 20;

            // 🚀 THE AUDIO OVERLOAD FIX (Anti-Crash Limiter)
            const now = this.time.now;
            if (!this.lastDeathSoundTime || now - this.lastDeathSoundTime > 100) {
                if (enemy.enemyKind === 'bomber') {
                    this.sound.play('dead2', { volume: 0.5 });
                } else {
                    this.sound.play('dead', { volume: 0.5 });
                }
                this.lastDeathSoundTime = now;
            }

            if (this.coinManager) this.coinManager.addKill(enemy, dropX, dropY, killer);

            const isBossWave = this.waveManager && this.waveManager.isBossWave();

            if (!isBossWave && (!this.isOnline || this.isHost)) {
                const target = killer || this.player1;
                const drop = new Pickup(this, dropX, dropY, Pickup.rollKind(target));
                drop.netId = this.nextPickupNetId++;
                this.pickups.add(drop);

                if (enemy.enemyKind === 'bomber') {
                    const second = new Pickup(this, dropX + 36, dropY, Pickup.rollKind(target));
                    second.netId = this.nextPickupNetId++;
                    this.pickups.add(second);
                }
            }
        });

        this.events.on('runCleared', () => { this.endRun(true); });
        this.events.on('soloDeath', () => { this.endRun(false); });

        this.setupBossSupplies();

        this.anyoneDownedThisWave = false;
        this.events.on('playerHealthChanged', (p) => {
            if (p.isDead) this.anyoneDownedThisWave = true;
        });

        this.events.on('waveCleared', (waveNumber) => {
            const cratesCount = this.crates ? this.crates.filter(c => !c.isExploded).length : 0;
            this.coinManager.addWaveBonus(waveNumber, cratesCount >= 3, !this.anyoneDownedThisWave);
            this.anyoneDownedThisWave = false;
        });

        // ==========================================
        // 🎁 PICKUPS
        // ==========================================
        if (!this.textures.exists('__PICKUP_BOX')) {
            const pg = this.make.graphics({ x: 0, y: 0, add: false });
            pg.fillStyle(0xffffff, 1);
            pg.fillRect(0, 0, 28, 28);
            pg.lineStyle(3, 0x000000, 1);
            pg.strokeRect(0, 0, 28, 28);
            pg.generateTexture('__PICKUP_BOX', 28, 28);
            pg.destroy();
        }

        this.nextPickupNetId = 1;
        this.pickups = this.physics.add.group();
        [this.ground, this.ground2, this.ground3, this.platforms, this.groundLayer, this.floors].forEach(g => {
            if (g) this.physics.add.collider(this.pickups, g);
        });

        players.forEach(p => {
            this.physics.add.overlap(p, this.pickups, (player, item) => {
                if (item.collect) item.collect(player);
            });
        });

        this.activeBombs = [];
        this.events.on('bombPlanted', (bomb) => { this.activeBombs.push(bomb); });
        this.events.on('bombDefused', (bomb, player) => {
            this.activeBombs = this.activeBombs.filter(b => b !== bomb);
            if (this.coinManager) this.coinManager.add(25, bomb.x, bomb.y);

            if (player) {
                player.isDefusing = false;
                player.isInteracting = false;

                if (player.anims && player.heroPrefix) {
                    player.anims.play(player.heroPrefix + 'Idle', true);
                }
            }
        });
    }

    update(time, delta) {
        if (this.replayRecorder) this.replayRecorder.tick(time);

        if (this.sync) this.sync.update(delta);

        if (this.isOnline && !this.isHost) {
            const playersListGuest = [this.player1, this.player2].filter(Boolean);
            playersListGuest.forEach(p => {
                p.onLadder = false;
                p.currentLadder = null;
                if (this.ladders) {
                    this.physics.overlap(p, this.ladders, (player, ladder) => {
                        player.onLadder = true;
                        player.currentLadder = ladder;
                    });
                }
                p.update(time, delta); // 🚀 ফিক্স: time, delta পাস করা হলো
            });
            return;
        }

        this.checkDefeat();

        const playersList = [this.player1, this.player2].filter(Boolean);
        
        // ==========================================
        // ☠️ SAFE SPIKE ZONE LOGIC
        // ==========================================
        if (this.spikeZone && this.spikeZone.active) {
            const spikeBounds = this.spikeZone.getBounds();
            const mapCenterY = this.cameras.main.height / 2; 

            playersList.forEach(p => {
                if (!p.isDead && Phaser.Geom.Intersects.RectangleToRectangle(p.getBounds(), spikeBounds)) {
                    let safeX = p.x < spikeBounds.centerX ? spikeBounds.x - 250 : spikeBounds.right + 250; 
                    let safeY = spikeBounds.y - 100; 

                    p.x = safeX; 
                    p.y = safeY;
                    p.setVelocity(0, 0);
                    p.takeDamage(500);
                }
            });

            if (this.waveManager && this.waveManager.enemyGroup) {
                this.waveManager.enemyGroup.getChildren().forEach(enemy => {
                    if (enemy.isDead) return;

                    if (Phaser.Geom.Intersects.RectangleToRectangle(enemy.getBounds(), spikeBounds)) {
                        enemy.takeDamage(500);
                    }
                    
                    if (enemy.enemyKind !== 'boss') {
                        const isOnGround = enemy.body.blocked.down || enemy.body.touching.down;
                        const isOnLowerGround = enemy.y > mapCenterY;

                        if (isOnGround && isOnLowerGround && !enemy.isGapJumping) {
                            const diffX = spikeBounds.centerX - enemy.x;
                            const movingTowards = (diffX > 0 && enemy.body.velocity.x > 0) || (diffX < 0 && enemy.body.velocity.x < 0);

                            if (movingTowards && Math.abs(diffX) > 50 && Math.abs(diffX) < 120) {
                                enemy.isGapJumping = true;
                                enemy.setVelocityY(-550);

                                const originalSpeed = enemy.moveSpeed;
                                enemy.moveSpeed = 250; 

                                if (enemy.anims && enemy.texturePrefix) {
                                    enemy.anims.play(enemy.texturePrefix + 'Jump', true);
                                }

                                enemy.scene.time.delayedCall(1000, () => {
                                    if (enemy && !enemy.isDead) {
                                        enemy.moveSpeed = originalSpeed;
                                        enemy.isGapJumping = false;
                                    }
                                });
                            }
                        }
                    }
                });
            }
        }

        playersList.forEach(p => {
            p.onLadder = false;
            p.currentLadder = null;
            if (this.ladders) {
                this.physics.overlap(p, this.ladders, (player, ladder) => {
                    player.onLadder = true;
                    player.currentLadder = ladder;
                });
            }
            p.update(time, delta); // 🚀 ফিক্স: update এ time এবং delta পাঠানো হলো
        });

        if (this.waveManager) {
            const activePlayers = playersList.filter(p => !p.isDead);

            if (this.timeBombs) {
                this.timeBombs = this.timeBombs.filter(bomb => bomb.active && !bomb.isExploded && !bomb.isDefused);
                this.timeBombs.forEach(bomb => bomb.update(time, delta, activePlayers));
            }

            if (activePlayers.length > 0) {
                this.waveManager.update(activePlayers, this.crates || [], delta);
            }
        }

        this.updateDefusing(delta);

        if (this.player1 && this.player2) {
            this.handleRevive(this.player1, this.player2, delta);
            this.handleRevive(this.player2, this.player1, delta);
        }
    }

    updateDefusing(delta) {
        if (!this.crates) return;
        const players = [this.player1, this.player2].filter(p => p && !p.isDead);
        if (players.length === 0) return;

        players.forEach(p => p.isActuallyDefusingThisFrame = false);

        const bombs = this.children.list.filter(o => o.active && o.constructor && o.constructor.name === 'TimeBomb' && !o.exploded && !o.isDefused);

        if (bombs.length > 0) {
            bombs.forEach(bomb => {
                let defuser = null;
                players.forEach(p => {
                    const d = Phaser.Math.Distance.Between(bomb.x, bomb.y, p.x, p.y);
                    if (d > 100) return;
                    const inputs = p.inputHandler ? p.inputHandler.getInputs() : null;
                    if (inputs && inputs.interact) {
                        defuser = p;
                    }
                });

                if (!defuser) {
                    const near = players.some(p => Phaser.Math.Distance.Between(bomb.x, bomb.y, p.x, p.y) < 100);
                    if (near && !bomb.promptShown) {
                        bomb.promptShown = true;
                        bomb.prompt = this.add.text(bomb.x, bomb.y - 60, 'HOLD E', { fontFamily: 'Impact, sans-serif', fontSize: '15px', color: '#44ddff', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5).setDepth(45);
                    } else if (!near && bomb.promptShown) {
                        bomb.promptShown = false;
                        if (bomb.prompt) { bomb.prompt.destroy(); bomb.prompt = null; }
                    }

                    if (bomb.prompt) bomb.prompt.setPosition(bomb.x, bomb.y - 60);
                    if (bomb.isDefusing) bomb.cancelDefuse();
                    return;
                }

                if (bomb.prompt) { bomb.prompt.destroy(); bomb.prompt = null; bomb.promptShown = false; }
                if (!bomb.isDefusing) bomb.startDefuse(defuser);
                bomb.tickDefuse(delta, 1800);

                if (defuser) {
                    defuser.isActuallyDefusingThisFrame = true;
                    defuser.isDefusing = true;
                    defuser.isInteracting = true;
                }
            });
        }

        players.forEach(p => {
            if (!p.isActuallyDefusingThisFrame && (p.isDefusing || p.isInteracting)) {
                p.isDefusing = false;
                p.isInteracting = false;

                if (p.anims && p.heroPrefix) {
                    p.anims.play(p.heroPrefix + 'Idle', true);
                }
            }
        });
    }

    handleRevive(alivePlayer, deadPlayer, delta) {
        if (!alivePlayer.isDead && deadPlayer.needsRevive) {
            const dist = Phaser.Math.Distance.Between(alivePlayer.x, alivePlayer.y, deadPlayer.x, deadPlayer.y);
            const inputs = alivePlayer.inputHandler.getInputs();

            if (dist < 60 && inputs.revive) {
                alivePlayer.setVelocityX(0);
                alivePlayer.anims.play(alivePlayer.heroPrefix + 'Idle', true);

                deadPlayer.reviveProgress += delta;
                deadPlayer.helpText.setVisible(false);
                deadPlayer.reviveBarBg.setVisible(true);
                deadPlayer.reviveBarFill.setVisible(true);

                if (deadPlayer.reviveProgress >= 3000) {
                    deadPlayer.getRevived();
                }
            } else {
                if (deadPlayer.reviveProgress > 0) {
                    deadPlayer.reviveProgress = 0;
                    deadPlayer.reviveBarBg.setVisible(false);
                    deadPlayer.reviveBarFill.setVisible(false);
                    deadPlayer.helpText.setVisible(true);
                }
            }
        }
    }

    plantTimeBomb(crate) {
        const bomb = new TimeBomb(this, crate.x, crate.y, crate);
        this.timeBombs.push(bomb);
    }

    spawnRemoteEnemy(kind, x, y, netId) {
        if (!this.waveManager) return null;
        let enemy;
        if (kind === 'bomber') {
            enemy = new Bomber(this, x, y);
        } else {
            enemy = new BaseEnemy(this, x, y, 'enemy1');
        }
        enemy.netId = netId;
        enemy.enemyKind = kind;
        enemy.update = () => {}; 
        this.waveManager.enemyGroup.add(enemy, true);
        return enemy;
    }

    setupBossSupplies() {
        this.bossSupplies = null; 
        this.bossActive = false;

        this.events.on('bossSpawned', async () => {
            this.bossActive = true;
            setKeysReservedForGameplay(['1', '2', '3'], true);
            try {
                this.bossSupplies = await api.getConsumableInventory();
            } catch (e) {
                this.bossSupplies = { AMMO: 0, GRENADE: 0, HEALTH: 0 };
            }
            this.events.emit('bossSuppliesReady', this.bossSupplies);
        });

        this.events.on('runCleared', () => {
            this.bossActive = false;
            setKeysReservedForGameplay(['1', '2', '3'], false);
        });
        this.events.on('soloDeath', () => {
            this.bossActive = false;
            setKeysReservedForGameplay(['1', '2', '3'], false);
        });
        this.events.once('shutdown', () => setKeysReservedForGameplay(['1', '2', '3'], false));

        const KEY_TO_ITEM = {
            'keydown-ONE':   { code: 'AMMO',    kind: 'ammo' },
            'keydown-TWO':   { code: 'GRENADE', kind: 'grenade' },
            'keydown-THREE': { code: 'HEALTH',  kind: 'health' }
        };

        Object.entries(KEY_TO_ITEM).forEach(([keyEvent, { code, kind }]) => {
            this.input.keyboard.on(keyEvent, () => this.useBossSupply(code, kind));
        });
    }

    useBossSupply(code, kind) {
        if (!this.bossActive || !this.bossSupplies) return;
        if ((this.bossSupplies[code] || 0) <= 0) return;

        const target = this.player1;
        if (!target || target.isDead) return;

        const applied = Pickup.applyKindEffect(this, target, kind);
        if (!applied) return; 

        this.bossSupplies[code]--;
        Pickup.showFloatText(this, target, applied);
        this.events.emit('bossSuppliesReady', this.bossSupplies);

        api.consumeConsumable(code, 1).catch(() => {});
    }

    endRun(victory) {
        if (this.runEnded) return;
        this.runEnded = true;

        console.log('[Game] endRun() called, victory:', victory, 'waveTimes at this instant:', this.waveManager ? JSON.stringify(this.waveManager.waveTimes) : '(no waveManager)');

        if (this.isOnline && this.isHost && net.connected) {
            net.sendEvent('gameOver', { victory });
        }

        if (this.waveManager) this.waveManager.stop();

        const durationSec = Math.round((this.time.now - this.matchStartTime) / 1000);

        let mvpName = null, mvpReason = null;

        let myCoins = this.coinManager ? this.coinManager.total : 0;
        const mine = this.isOnline ? (this.isHost ? this.player1 : this.player2) : null;
        if (mine) myCoins = mine.coinsEarned || 0;

        const teammates = [];
        if (!this.isOnline && this.player2) {
            teammates.push(
                { name: 'Player 1', kills: this.player1.matchKills || 0, coins: this.player1.coinsEarned || 0 },
                { name: 'Player 2', kills: this.player2.matchKills || 0, coins: this.player2.coinsEarned || 0 }
            );
        }

        let wavesReachedFinal = this.waveManager ? this.waveManager.currentWave : 1;
        let waveTimesFinal    = this.waveManager ? this.waveManager.waveTimes : [];

        const finish = (theirStats) => {
            if (theirStats && Array.isArray(theirStats.players)) {
                teammates.push(...theirStats.players);
                mvpName = theirStats.mvpName || null;
                mvpReason = theirStats.mvpReason || null;
                const myResult = theirStats.players[this.isHost ? 0 : 1];
                if (myResult) myCoins = myResult.coins || 0;

                if (Array.isArray(theirStats.waveTimes)) waveTimesFinal = theirStats.waveTimes;
                if (typeof theirStats.wavesReached === 'number') wavesReachedFinal = theirStats.wavesReached;
            } else if (this.isOnline && this.isHost) {
                teammates.push(
                    { name: 'Host', kills: this.player1.matchKills || 0, coins: this.player1.coinsEarned || 0 },
                    { name: 'Guest', kills: this.player2.matchKills || 0, coins: this.player2.coinsEarned || 0 }
                );
            }

            if (!this.isOnline && teammates.length === 2) {
                const topKills = Math.max(...teammates.map(player => player.kills || 0));
                const leaders = teammates.filter(player => player.kills === topKills && topKills > 0);
                if (leaders.length === 1) {
                    mvpName = leaders[0].name;
                    mvpReason = topKills + ' kills';
                }
            }

            let replaySnapshot = null;
            if (this.replayRecorder && this.replayRecorder.buffer.length >= 3) {
                try {
                    replaySnapshot = JSON.stringify({
                        mapCode: this.selectedMap || 'arena1',
                        frames: this.replayRecorder.buffer
                    });
                } catch (e) { replaySnapshot = null; }
            }

            this.time.delayedCall(victory ? 2200 : 1800, () => {
                this.sound.stopAll();

                this.scene.stop('UIScene');

                console.log('[Game] about to scene.start(GameOver) with waveTimes:', JSON.stringify(waveTimesFinal), '(isHost:', this.isHost, ', isOnline:', this.isOnline, ')');

                this.scene.start('GameOver', {
                    victory,
                    wavesReached:  wavesReachedFinal,
                    enemiesKilled: this.totalKills,
                    coinsEarned:   myCoins,
                    durationSec,
                    mapCode:       this.selectedMap || 'arena1',
                    coOp:          !!this.player2,
                    waveTimes:     waveTimesFinal,
                    mvpName, mvpReason,
                    teammates,
                    replaySnapshot
                });
            });
        };

        if (this.isOnline && this.player2 && net.connected) {
            if (this.isHost) {
                const players = [
                    { name: 'Host', kills: this.player1.matchKills || 0, coins: this.player1.coinsEarned || 0 },
                    { name: 'Guest', kills: this.player2.matchKills || 0, coins: this.player2.coinsEarned || 0 }
                ];
                const topKills = Math.max(...players.map(player => player.kills));
                const leaders = players.filter(player => player.kills === topKills && topKills > 0);
                const result = {
                    players,
                    mvpName: leaders.length === 1 ? leaders[0].name : null,
                    mvpReason: leaders.length === 1 ? topKills + ' kills' : null,
                    waveTimes: this.waveManager ? this.waveManager.waveTimes : [],
                    wavesReached: this.waveManager ? this.waveManager.currentWave : 1
                };

                net.sendEvent('finalStats', result);
                finish(result);
            } else {
                let resolved = false;
                const onTheirs = (msg) => {
                    if (msg.name !== 'finalStats' || resolved) return;
                    if (!msg.data || !Array.isArray(msg.data.players) || msg.data.players.length < 2) return;
                    resolved = true;
                    net.off('event', onTheirs);
                    finish(msg.data);
                };

                net.on('event', onTheirs);
                this.time.delayedCall(1500, () => {
                    if (!resolved) {
                        resolved = true;
                        net.off('event', onTheirs);
                        finish(null);
                    }
                });
            }
        } else {
            finish(null);
        }
    }

    checkDefeat() {
        if (this.runEnded) return;
        const players = [this.player1, this.player2].filter(Boolean);
        if (players.length === 0) return;
        const allDown = players.every(p => p.isDead);
        if (allDown) this.endRun(false);
    }
}