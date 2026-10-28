import Phaser from 'phaser';
import BaseEnemy from '../entities/enemies/BaseEnemy';
import Bomber from '../entities/enemies/Bomber';
import Boss from '../entities/enemies/Boss';
import Boar from '../entities/enemies/Boar';
import { WAVES, WAVE_SETTINGS, waveScaling, waveCount, estimateWaveSeconds } from './WaveConfig';

export default class WaveManager {
    constructor(scene) {
        this.scene = scene;

        this.enemyGroup = this.scene.physics.add.group({
            runChildUpdate: false
        });

        this.currentWave     = 0;
        this.spawnedThisWave = 0;
        this.queue           = [];
        this.waveActive      = false;
        this.runOver         = false;
        this.boss            = null;

        this.playerCount = 1;

        this.waveStartTime   = 0;
        this.waveEstSeconds  = 0;
        this.nextWaveAt      = 0;

        this.waveTimes = [];
        this.waveClock = 0;

        this.deadSeen = new Set();
        this.setupCollisions();

        // TEMP DEBUG — remove once the empty-Wave-Times report is confirmed fixed.
        // If this logs more than once per match, a fresh WaveManager (and a
        // fresh, empty waveTimes) is being created mid-run.
        console.log('[WaveManager] NEW instance created — waveTimes reset to []');
    }

    setPlayerCount(n) {
        this.playerCount = Math.max(1, n);
    }

    setupCollisions() {
        if (this.scene.ground)  this.scene.physics.add.collider(this.enemyGroup, this.scene.ground);
        if (this.scene.ground2) this.scene.physics.add.collider(this.enemyGroup, this.scene.ground2);
        if (this.scene.ground3) this.scene.physics.add.collider(this.enemyGroup, this.scene.ground3);

        if (this.scene.platforms) {
            this.scene.physics.add.collider(this.enemyGroup, this.scene.platforms, null, (enemy, platform) => {
                if (enemy.isClimbing && enemy.body && enemy.body.velocity.y > 0) {
                    return false;
                }
                return true;
            });
        }
    }

    startWave1() {
        this.nextWaveAt = this.scene.time.now + WAVE_SETTINGS.FIRST_WAVE_DELAY;
        this.scene.time.delayedCall(WAVE_SETTINGS.FIRST_WAVE_DELAY, () => {
            this.startWave(1);
        });
    }

    startWave(waveNumber) {
        if (this.runOver) return;

        if (waveNumber > WAVES.length) {
            this.onRunCleared();
            return;
        }

        this.currentWave = waveNumber;
        this.waveActive      = true;
        this.spawnedThisWave = 0;
        this.killedThisWave  = 0;
        this.waveStartTime   = this.scene.time.now;
        this.waveClock       = 0;
        this.nextWaveAt      = 0;

        // 🔊 নতুন ওয়েভ শুরু হলে আগের ওয়ার্নিং সাউন্ড বন্ধ করে দেওয়া
        if (this.warningSound && this.warningSound.isPlaying) {
            this.warningSound.stop();
        }

        this.showBanner(waveNumber, waveNumber === 5 ? false : false);
        this.scene.events.emit('waveStarted', waveNumber);


        
        if (waveNumber === 1) { 
            this.queue = ['boss']; 
            this.waveEstSeconds = 120; 

            // 🔊 ওয়েভ ১০-এ ৫ সেকেন্ডের জন্য ওয়ার্নিং বাজবে
            this.warningSound = this.scene.sound.add('warning', { loop: true, volume: 0.6 });
            this.warningSound.play();
            
            // ৫ সেকেন্ড পর ওয়ার্নিং বন্ধ হয়ে যাবে
            this.scene.time.delayedCall(5000, () => {
                if (this.warningSound && this.warningSound.isPlaying) {
                    this.warningSound.stop();
                }
            });
            
            // 🚀 ৪ সেকেন্ড পর আকাশ থেকে বস স্পন হবে
            this.spawnTimer = this.scene.time.addEvent({
                delay: 4000,
                callback: () => this.spawnOne('boss')
            });
            return; 
        }
        
        // ============================================================
        // 🚀 WAVE 5: AIR BOMB SURVIVAL EVENT
        // ============================================================
        if (waveNumber === 5) {
            this.queue = []; 
            this.waveEstSeconds = 30; // 💡 ৩০ সেকেন্ডের সারভাইভাল ওয়েভ
            
            // 🔊 ওয়েভ ৫-এ পুরো ৩০ সেকেন্ড ওয়ার্নিং বাজবে
            this.warningSound = this.scene.sound.add('warning', { loop: true, volume: 0.5 });
            this.warningSound.play();

            this.startAirBombEvent();

            // ৩০ সেকেন্ড পর ওয়েভ ৫ অটোমেটিক ক্লিয়ার হয়ে ওয়েভ ৬ শুরু হবে
            this.wave5Timer = this.scene.time.delayedCall(30000, () => {
                if (this.runOver) return;
                
                if (this.airBombTimer) this.airBombTimer.remove();
                this.waveActive = false;

                // Wave 5 is another special-cased wave that completes via
                // its own timer rather than checkWaveComplete() — which is
                // the only other place that pushes into waveTimes. Without
                // this, wave 5's row was always missing from the Wave Times
                // table (same class of bug as the boss wave, fixed below in
                // onRunCleared()).
                if (!this.waveTimes.some(w => w.wave === this.currentWave)) {
                    this.waveTimes.push({
                        wave: this.currentWave,
                        seconds: Math.round(this.waveClock / 1000)
                    });
                }

                this.scene.events.emit('waveCleared', this.currentWave);

                if (this.currentWave >= WAVES.length) {
                    this.onRunCleared();
                    return;
                }

                this.nextWaveAt = this.scene.time.now + WAVE_SETTINGS.BREATHER_MS;
                this.scene.time.delayedCall(WAVE_SETTINGS.BREATHER_MS, () => {
                    this.startWave(this.currentWave + 1);
                });
            });
            return; // সাধারণ এনিমি স্পন স্কিপ করা হলো
        }
        // ============================================================

        const cfg = waveCount(waveNumber, this.playerCount);
        this.waveEstSeconds  = estimateWaveSeconds(waveNumber, this.playerCount);
        this.queue = this.buildQueue(cfg);

        this.spawnTimer = this.scene.time.addEvent({
            delay: cfg.spawnDelay,
            callback: () => this.spawnNext(cfg),
            repeat: this.queue.length - 1
        });

        if (cfg.boss && cfg.bossReinforceMs) {
            this.reinforceTimer = this.scene.time.addEvent({
                delay: cfg.bossReinforceMs,
                loop: true,
                callback: () => {
                    if (!this.boss || this.boss.isDead) return;
                    if (this.aliveCount() >= this.maxAlive()) return;
                    this.spawnOne('base');
                }
            });
        }
    }

    // ============================================================
    // 💣 AIR BOMB LOGIC & DYNAMIC TARGETING
    // ============================================================
    
    // 🚀 নতুন ফাংশন: ম্যাপ অনুযায়ী বম্ব পড়ার সঠিক জায়গা (X, Y) বের করবে
    // 🚀 নতুন ফাংশন: ম্যাপ অনুযায়ী বম্ব পড়ার সঠিক জায়গা (X, Y) বের করবে
    // 🚀 Update: Map er jekono random position e bomb porbe
    pickBombTarget() {
        const width  = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;

        // X position screen er 50px theke shuru kore width-50px er moddhe
        let targetX = Phaser.Math.Between(50, width - 50);
        // Y position hawa theke ground er jekono jaygay (100px theke nicher 50px er moddhe)
        let targetY = Phaser.Math.Between(100, height - 50);

        return { x: targetX, y: targetY };
    }

    startAirBombEvent() {
        if (this.runOver) return;

        this.airBombTimer = this.scene.time.addEvent({
            delay: 1000, // Proti 1 second e ekta kore bomb
            loop: true,
            callback: () => {
                if (this.currentWave !== 5 || this.runOver) return;

                const pos = this.pickBombTarget();
                const targetX = pos.x;
                const targetY = pos.y;

                // 1. Aim dekhano
                const aimSprite = this.scene.add.image(targetX, targetY, 'aim').setDepth(49).setScale(0.4);

                // 🔊 Fix: Aim lock howar sathe sathei 'bombTimer' sound ta ekbar bajbe
                this.scene.sound.play('bombTimer', { volume: 0.8 });

                this.scene.tweens.add({
                    targets: aimSprite,
                    alpha: 0.3,
                    scale: 0.5,
                    duration: 300,
                    yoyo: true,
                    repeat: -1
                });

                // 2. 1.5 second por bomb drop kora
                this.scene.time.delayedCall(1500, () => {
                    if (!aimSprite || !aimSprite.active) return;
                    aimSprite.destroy();
                    if (this.runOver) return;

                    // 🔊 Bomb hawa theke porar sound
                    this.scene.sound.play('misile', { volume: 0.9 });

                    const bomb = this.scene.add.sprite(targetX, -50, 'airBomb').setDepth(51).setScale(0.3);

                    this.scene.tweens.add({
                        targets: bomb,
                        y: targetY, // Bomb thik aim er height (Y) e eshe blast hobe
                        duration: 500,
                        ease: 'Linear',
                        onComplete: () => {
                            bomb.destroy();

                            // 3. Blast effect
                            if (this.scene.anims.exists('grenadeBlast')) {
                                const blast = this.scene.add.sprite(targetX, targetY, 'grenadeBlust1').setDepth(55).setScale(2);
                                blast.anims.play('grenadeBlast');
                                blast.once('animationcomplete', () => blast.destroy());
                            }

                            // 4. Damage calculation
                            const players = [this.scene.player1, this.scene.player2].filter(Boolean);
                            players.forEach(p => {
                                if (!p.isDead) {
                                    const dist = Phaser.Math.Distance.Between(targetX, targetY, p.x, p.y);
                                    if (dist < 120) { // Blast radius
                                        p.takeDamage(400);
                                    }
                                }
                            });
                        }
                    });
                });
            }
        });
    }

    maxAlive() {
        return WAVE_SETTINGS.MAX_ALIVE * this.playerCount;
    }

    buildQueue(cfg) {
        const q = [];

        // 🚀 বোর স্পন লজিক: ওয়েভ ৪ এবং ৫-এ ১টা আসবে, ওয়েভ ৬ থেকে সর্বোচ্চ ২টা আসবে
        let boarCount = 0;
        if (this.currentWave >= 4) {
            boarCount = this.currentWave < 6 ? 1 : 2;
        }

        // মোট এনিমি থেকে বোর, বোম্বার এবং বস বাদ দিয়ে বাকিগুলো সাধারণ এনিমি হবে
        const normals = cfg.total - cfg.bombers - (cfg.boss ? 1 : 0) - boarCount;

        for (let i = 0; i < normals; i++) q.push('base');
        for (let i = 0; i < boarCount; i++) q.push('boar');
        for (let i = 0; i < cfg.bombers; i++) q.push('bomber');

        // এনিমিদের লিস্টটা উল্টাপাল্টা (Shuffle) করে দেওয়া হলো যেন কে কখন আসবে বোঝা না যায়
        Phaser.Utils.Array.Shuffle(q);

        if (cfg.boss) q.unshift('boss');
        return q;
    }

   // ==========================================
    // 🚀 FIX 1: Safe Spawn System (Prevents Infinite Loop Crash)
    // ==========================================
    spawnNext(cfg) {
        if (this.runOver || !this.scene || !this.scene.sys.isActive()) return;
        
        // যদি queue ফাঁকা থাকে (যেমন ওয়েভ ৫ এ), তবে স্পন থামিয়ে দাও
        if (!this.queue || this.queue.length === 0 || this.spawnedThisWave >= this.queue.length) return;

        if (this.aliveCount() >= this.maxAlive()) {
            // ৯০০ মিলি-সেকেন্ড পর আবার চেক করবে, তবে যদি গেম ওভার হয়ে যায় তবে আর করবে না
            if (!this.runOver) {
                this.scene.time.delayedCall(900, () => this.spawnNext(cfg));
            }
            return;
        }
        
        const type = this.queue[this.spawnedThisWave];
        if (!type) return;
        
        // স্পন করার চেষ্টা করবে, ফেইল হলে অন্তত ক্র্যাশ করবে না
        try {
            this.spawnOne(type);
        } catch (e) {
            console.error("Failed to spawn enemy:", type, e);
        }
        
        this.spawnedThisWave++;
    }

    

    spawnOne(type) {
        const pos = this.pickSpawnPoint(type);
        const scale = waveScaling(this.currentWave);
        let enemy;

        if (type === 'boss') {
            enemy = new Boss(this.scene, this.scene.cameras.main.width / 2 + 200, 200);
            this.boss = enemy;
            this.scene.events.emit('bossSpawned', enemy);
        }
        else if (type === 'bomber') {
            this.scene.sound.play('bomberLaugh', { volume: 0.8 });
            enemy = new Bomber(this.scene, pos.x, pos.y);
            enemy.enemyKind = 'bomber';
        }
        // 🚀 নতুন বোর স্পন লজিক
        else if (type === 'boar') {
            enemy = new Boar(this.scene, pos.x, pos.y);
            enemy.enemyKind = 'boar';
        }
        else {
            enemy = new BaseEnemy(this.scene, pos.x, pos.y, 'enemy1');
            enemy.enemyKind = 'base';
            if (Math.random() > 0.5) {
                this.scene.sound.play('roar', { volume: 1.5 });
            }
        }

        this.applyScaling(enemy, scale, type);
        this.enemyGroup.add(enemy, true);
        return enemy;
    }

    applyScaling(enemy, scale, type) {
        if (type === 'boss') {
            enemy.enemyKind = 'boss';
            return;
        }
        enemy.hp = Math.round(100 * scale.hpMult);
        enemy.maxHp = enemy.hp;
        if (typeof enemy.moveSpeed === 'number') {
            enemy.moveSpeed = Math.round(enemy.moveSpeed * scale.speedMult);
        }
        enemy.damageMult = scale.damageMult;
        enemy.waveNumber = this.currentWave;
        enemy.hitsTaken = 0;
    }

   // ==========================================
    // 🚀 FIX 2: Safe Spawn Point Picker (Prevents Boar Crash)
    // ==========================================
    pickSpawnPoint(type = 'base') {
        const width  = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;

        // বোর (boar) শুধুমাত্র নিচের গ্রাউন্ডে স্পন হবে (0 বা 1)
        // অন্য এনিমিরা উপরে বা নিচে যেকোনো জায়গায় (0, 1, 2, 3) স্পন হতে পারে
        const spot = (type === 'boar') ? Phaser.Math.Between(0, 1) : Phaser.Math.Between(0, 3);

        const isArena2 = this.scene.selectedMap === 'arena2';

        if (isArena2) {
            if (spot === 0) return { x: -30,   y: height - 250 }; // গ্রাউন্ড লেফট
            if (spot === 1) return { x: width - 40, y: height - 250 }; // গ্রাউন্ড রাইট
            if (spot === 2) return { x: -30,   y: height * 0.35 - 100 }; // প্ল্যাটফর্ম লেফট
            // 🚀 ফিক্স: সেফ রিটার্ন
            return { x: width - 40, y: height * 0.35 - 100 };            // প্ল্যাটফর্ম রাইট
        } else {
            if (spot === 0) return { x: -20,   y: height - 200 }; // গ্রাউন্ড লেফট
            if (spot === 1) return { x: width - 40, y: height - 200 }; // গ্রাউন্ড রাইট
            if (spot === 2) return { x: -20,   y: height * 0.53 - 100 }; // প্ল্যাটফর্ম লেফট
            // 🚀 ফিক্স: সেফ রিটার্ন
            return { x: width - 40, y: height * 0.53 - 100 }; // প্ল্যাটফর্ম রাইট
        }
    }
    aliveCount() {
        if (!this.enemyGroup || !this.enemyGroup.children) return 0;
        return this.enemyGroup.getChildren().filter(e => e && !e.isDead).length;
    }

    allSpawned() {
        return this.spawnedThisWave >= this.queue.length;
    }

    waveProgress() {
        if (!this.waveActive) return 0;
        
        if (this.currentWave === 5) {
            if (this.wave5Timer) return this.wave5Timer.getProgress();
            return 0;
        }

        if (this.queue.length === 0) return 0;
        const total = this.queue.length;
        const remaining = (total - this.spawnedThisWave) + this.aliveCount();
        return Phaser.Math.Clamp(1 - (remaining / total), 0, 1);
    }

    countdownSeconds() {
        if (this.nextWaveAt === 0) return 0;
        return Math.max(0, Math.ceil((this.nextWaveAt - this.scene.time.now) / 1000));
    }

    sweepDeaths() {
        if (!this.enemyGroup || !this.enemyGroup.children) return;
        this.enemyGroup.getChildren().forEach(enemy => {
            if (!enemy.isDead) return;
            if (this.deadSeen.has(enemy)) return;
            this.deadSeen.add(enemy);
            this.scene.events.emit(
                'enemyKilled',
                enemy,
                enemy.lastAttacker || this.scene.player1
            );
        });
        if (this.deadSeen.size > 200) this.deadSeen.clear();
    }

    checkWaveComplete() {
        if (!this.waveActive || this.runOver) return;
        
        if (this.currentWave === 5) return;

        if (!this.allSpawned()) return;
        if (this.aliveCount() > 0) return;

        this.waveActive = false;
        this.waveTimes.push({
            wave: this.currentWave,
            seconds: Math.round(this.waveClock / 1000)
        });
        // TEMP DEBUG — remove once the empty-Wave-Times report is confirmed fixed.
        console.log('[WaveManager] checkWaveComplete pushed wave', this.currentWave, '— waveTimes now:', JSON.stringify(this.waveTimes));

        if (this.reinforceTimer) {
            this.reinforceTimer.remove();
            this.reinforceTimer = null;
        }

        this.scene.events.emit('waveCleared', this.currentWave);

        if (this.currentWave >= WAVES.length) {
            this.onRunCleared();
            return;
        }

        this.nextWaveAt = this.scene.time.now + WAVE_SETTINGS.BREATHER_MS;
        this.scene.time.delayedCall(WAVE_SETTINGS.BREATHER_MS, () => {
            this.startWave(this.currentWave + 1);
        });
    }

    onRunCleared() {
        this.runOver = true;
        // TEMP DEBUG — remove once the empty-Wave-Times report is confirmed fixed.
        console.log('[WaveManager] onRunCleared called — currentWave:', this.currentWave, 'waveTimes before backfill:', JSON.stringify(this.waveTimes));

        // The boss wave is completed directly from Boss.js on death
        // rather than through checkWaveComplete() (it spawns via its
        // own timer, so spawnedThisWave/allSpawned() never trip for
        // it) — which means the time-recording checkWaveComplete()
        // normally does never ran for the boss kill. Record it here so
        // it isn't missing from waveTimes on GameOver/Leaderboard.
        if (!this.waveTimes.some(w => w.wave === this.currentWave)) {
            this.waveTimes.push({
                wave: this.currentWave,
                seconds: Math.round(this.waveClock / 1000)
            });
        }

        this.scene.events.emit('runCleared', this.currentWave);
    }

    // New: true once the boss wave (the last entry in WAVES) has
    // started. Used to gate the normal per-kill Pickup drops off during
    // the boss fight — bought/persistent Ammo/Grenade/Health supplies
    // are the only source of them there.
    isBossWave() {
        return this.currentWave >= WAVES.length;
    }

    stop() {
        this.runOver = true;
        if (this.spawnTimer)     this.spawnTimer.remove();
        if (this.reinforceTimer) this.reinforceTimer.remove();
        if (this.airBombTimer)   this.airBombTimer.remove(); 
        if (this.wave5Timer)     this.wave5Timer.remove();
    }

    showBanner(waveNumber, isBoss) {
        const cam = this.scene.cameras.main;
        const label = isBoss ? 'FINAL WAVE' : 'WAVE ' + waveNumber;
        const color = isBoss ? '#ff4444' : '#ffffff';

        const text = this.scene.add.text(cam.width / 2, cam.height * 0.38, label, {
            fontFamily: 'Impact, sans-serif',
            fontSize: isBoss ? '72px' : '64px',
            fill: color,
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5).setDepth(200).setScrollFactor(0).setAlpha(0).setScale(0.7);

        this.scene.tweens.add({
            targets: text, alpha: 1, scale: 1,
            duration: 420, ease: 'Back.Out'
        });

        this.scene.tweens.add({
            targets: text, alpha: 0,
            delay: WAVE_SETTINGS.BANNER_MS, duration: 500,
            onComplete: () => text.destroy()
        });

        if (isBoss) this.scene.cameras.main.shake(600, 0.006);
    }

    update(players, crates, delta) {
        if (this.waveActive && delta) this.waveClock += delta;

        if (!players || players.length === 0 || !this.enemyGroup) return;

        this.enemyGroup.getChildren().forEach(enemy => {
            if (enemy.isDead) return;

            enemy.onLadder = false;
            enemy.currentLadder = null;

            if (this.scene.ladders) {
                this.scene.physics.overlap(enemy, this.scene.ladders, (e, ladder) => {
                    e.onLadder = true;
                    e.currentLadder = ladder;
                });
            }

            enemy.update(players, crates);
        });

        this.sweepDeaths();
        this.checkWaveComplete();
    }


    spawnSpecificEnemy(x, y, type) {
        if (!this.enemyGroup) return;
        
        let enemy;
        if (type === 'bomber') {
            // 🚀 ফিক্স: ইম্পোর্ট করা আসল নাম 'Bomber' ব্যবহার করতে হবে
            enemy = new Bomber(this.scene, x, y); 
            enemy.enemyKind = 'bomber';
        } 
        
        if(enemy) {
            const scale = waveScaling(this.currentWave);
            this.applyScaling(enemy, scale, type);
            this.enemyGroup.add(enemy, true);
        }
    }
}