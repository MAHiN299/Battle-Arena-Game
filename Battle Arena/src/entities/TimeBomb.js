import Phaser from 'phaser';

export default class TimeBomb extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, crate) {
        super(scene, x, y, 'timeBomb'); 

        this.scene = scene;
        this.targetCrate = crate; 

        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.setDepth(1.5); 
        this.body.setAllowGravity(false); 
        this.body.setImmovable(true);

        this.timeLeft = 30000;
        this.totalBombTime = 30000;
        this.defuseTimeRequired = 4000;
        this.defuseProgress = 0;
        
        this.isDefused = false;
        this.isExploded = false;
        this.exploded = false;
        
        // Track defusing player for state releases
        this.defusingPlayer = null; 
        this.defuser = null;

        // Prompt state tracker
        this.prompt = null;
        this.promptShown = false;

        this.timerText = scene.add.text(x, y - 30, '30.0s', {
            fontSize: '16px', fill: '#ff0000', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(20);

        this.defuseBarBg = scene.add.rectangle(x, y - 55, 50, 8, 0x000000).setOrigin(0.5).setVisible(false).setDepth(20);
        this.defuseBarFill = scene.add.rectangle(x - 25, y - 55, 0, 4, 0x00aaff).setOrigin(0, 0.5).setVisible(false).setDepth(21);
        
        this.defuseText = scene.add.text(x, y - 70, 'DEFUSING...', {
            fontSize: '12px', fill: '#00aaff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setVisible(false).setDepth(20);

        this.tickSound = scene.sound.add('bombTimer', { loop: true, volume: 0.6 });
        this.tickSound.play();

        this.scene.events.emit('bombPlanted', this);
    }

    update(time, delta, players) {
        if (this.isDefused || this.isExploded || this.exploded) return;

        this.timeLeft -= delta;

        if (this.timeLeft > 0) {
            let progress = 1 - (this.timeLeft / this.totalBombTime);
            let currentRate = 1 + (progress * 2);

            if (this.tickSound && this.tickSound.isPlaying) {
                this.tickSound.setRate(currentRate);
            }
        }

        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.explode(); 
            return;
        }

        this.timerText.setText((this.timeLeft / 1000).toFixed(1) + 's');
        
        if (this.timeLeft < 10000) {
            this.timerText.setFill((Math.floor(time / 250) % 2 === 0) ? '#ff0000' : '#ffffff');
        }

        let isBeingDefused = false;

        players.forEach(player => {
            if (player && !player.isDead && player.inputHandler) {
                const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
                const inputs = player.inputHandler.getInputs();

                if (dist < 60 && inputs.interact) {
                    isBeingDefused = true;
                    this.defusingPlayer = player;
                    
                    player.setVelocityX(0);
                    player.isDefusing = true;
                    player.isInteracting = true; // 🚀 ফিক্স

                    const isOnGround = player.body.blocked.down || player.body.touching.down;
                    if (isOnGround) {
                        player.anims.play(player.heroPrefix + 'Idle', true);
                    }
                } 
            }
        });

        if (isBeingDefused) {
            this.defuseProgress += delta;
            
            this.defuseBarBg.setVisible(true);
            this.defuseBarFill.setVisible(true);
            this.defuseText.setVisible(true);
            
            this.defuseBarFill.width = 50 * (this.defuseProgress / this.defuseTimeRequired);

            if (this.defuseProgress >= this.defuseTimeRequired) {
                this.defuse();
            }
        } else {
            // 🚀 ফিক্স: !this.isDefusing কন্ডিশনটা সরিয়ে দেওয়া হয়েছে, যেন প্লেয়ার সব সময় আনফ্রিজ হতে পারে
            if (this.defuseProgress > 0) {
                this.defuseProgress = 0;
                this.defuseBarBg.setVisible(false);
                this.defuseBarFill.setVisible(false);
                this.defuseText.setVisible(false);

                this.releasePlayer(); // 🚀 কল করা হলো মাস্টার আনফ্রিজ
            }
        }
    }

    // 🚀 মাস্টার আনফ্রিজ ফাংশন (যেকোনো অবস্থায় প্লেয়ারকে আনফ্রিজ করবে)
    releasePlayer() {
        const freeUp = (p) => {
            if (p) {
                p.isDefusing = false;
                p.isInteracting = false;
                p.isReviving = false;
                p.isAttacking = false;
            }
        };
        freeUp(this.defusingPlayer);
        freeUp(this.defuser);
        this.defusingPlayer = null;
        this.defuser = null;
    }

    defuse() {
        this.isDefused = true;
        if (this.targetCrate) this.targetCrate.hasBomb = false;

        this.stopTickSound();
        this.clearAllUI();

        this.releasePlayer(); // 🚀 বম্ব ডিফিউজ হলে প্লেয়ার ফ্রি

        this.destroy();
    }

    explode() {
        this.isExploded = true;
        this.exploded = true;

        this.stopTickSound();
        this.clearAllUI();

        this.releasePlayer(); // 🚀 বম্ব ফাটলেও প্লেয়ার ফ্রি

        const blast = this.scene.add.sprite(this.x, this.y, 'grenadeBlast').setScale(2).setDepth(10);
        blast.anims.play('grenadeBlast', true);

        this.applyAoEDamage();

        if (this.targetCrate) {
            this.targetCrate.explode(); 
        }

        blast.once('animationcomplete', () => {
            blast.destroy();
            this.destroy();
        });
    }

    applyAoEDamage() {
        const blastRadius = 250; 

        let playersToDamage = [];
        if (this.scene.players) playersToDamage = this.scene.players;
        else {
            if (this.scene.player1) playersToDamage.push(this.scene.player1);
            if (this.scene.player2) playersToDamage.push(this.scene.player2);
        }

        playersToDamage.forEach(p => {
            if (p && !p.isDead) {
                const dist = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
                if (dist <= blastRadius) p.takeDamage(50); 
            }
        });

        if (this.scene.waveManager && this.scene.waveManager.enemyGroup) {
            this.scene.waveManager.enemyGroup.getChildren().forEach(enemy => {
                if (!enemy.isDead && !enemy.isBlasted) {
                    const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
                    if (dist <= blastRadius) enemy.applyBlast(this.x, 150); 
                }
            });
        }
    }

    // Called by Game.js when a player stands near and holds the key
    startDefuse(player) {
        if (this.isDefusing || this.exploded) return;
        this.isDefusing = true;
        this.defuseProgress = 0;
        this.defuser = player;
        const w = 90;
        this.defuseBg = this.scene.add.rectangle(this.x, this.y - 46, w, 10, 0x000000)
            .setDepth(40).setAlpha(0.85);
        this.defuseBar = this.scene.add.rectangle(this.x - w / 2, this.y - 46, 0, 7, 0x44ddff)
            .setOrigin(0, 0.5).setDepth(41);
        this.defuseLabel = this.scene.add.text(this.x, this.y - 62, 'DEFUSING', {
            fontFamily: 'Impact, sans-serif',
            fontSize: '13px',
            color: '#44ddff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(41);
    }

    // Call every frame while the key is held
    tickDefuse(delta, durationMs = 1800) {
        if (!this.isDefusing || this.exploded) return false;
        this.defuseProgress += delta;
        const pct = Phaser.Math.Clamp(this.defuseProgress / durationMs, 0, 1);
        if (this.defuseBar) {
            this.defuseBar.width = 90 * pct;
            this.defuseBar.setPosition(this.x - 45, this.y - 46);
        }
        if (this.defuseBg)    this.defuseBg.setPosition(this.x, this.y - 46);
        if (this.defuseLabel) this.defuseLabel.setPosition(this.x, this.y - 62);
        if (pct >= 1) {
            this.completeDefuse();
            return true;
        }
        return false;
    }

    cancelDefuse() {
        if (!this.isDefusing) return;
        this.isDefusing = false;
        this.defuseProgress = 0;

        this.releasePlayer(); // 🚀 ডিফিউজ ক্যানসেল করলেও প্লেয়ার ফ্রি
        this.clearDefuseUI();
    }

    completeDefuse() {
        if (this.exploded) return;
        this.isDefusing = false;
        this.exploded = true;

        this.stopTickSound();

        if (this.fuseTimer && typeof this.fuseTimer.remove === 'function') this.fuseTimer.remove();
        if (this.tickTimer && typeof this.tickTimer.remove === 'function') this.tickTimer.remove();
        if (this.blinkTween && typeof this.blinkTween.remove === 'function') this.blinkTween.remove();

        if (this.targetCrate) this.targetCrate.hasBomb = false;

        this.clearAllUI();

        this.releasePlayer(); // 🚀 কমপ্লিট হলেও প্লেয়ার ফ্রি

        this.playDefuseEffect();
        this.scene.events.emit('bombDefused', this, this.defuser);
        this.destroy();
    }

    playDefuseEffect() {
        const t = this.scene.add.text(this.x, this.y - 40, 'DEFUSED', {
            fontFamily: 'Impact, sans-serif',
            fontSize: '22px',
            color: '#44ddff',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5).setDepth(60).setScale(0.6);
        this.scene.tweens.add({
            targets: t, scale: 1.1, duration: 200, ease: 'Back.Out'
        });
        this.scene.tweens.add({
            targets: t, y: t.y - 40, alpha: 0,
            duration: 900, delay: 300,
            onComplete: () => t.destroy()
        });
        // Cool blue ring, deliberately the opposite of an explosion
        const ring = this.scene.add.circle(this.x, this.y, 12, 0x44ddff, 0)
            .setStrokeStyle(3, 0x44ddff, 1).setDepth(50);
        this.scene.tweens.add({
            targets: ring, radius: 70, alpha: 0,
            duration: 450, onComplete: () => ring.destroy()
        });
        this.scene.cameras.main.flash(140, 80, 200, 255);
    }

    stopTickSound() {
        if (this.tickSound) {
            this.tickSound.stop();
            this.tickSound.destroy();
            this.tickSound = null;
        }
    }

    clearDefuseUI() {
        if (this.defuseBg)    { this.defuseBg.destroy();    this.defuseBg = null; }
        if (this.defuseBar)   { this.defuseBar.destroy();   this.defuseBar = null; }
        if (this.defuseLabel) { this.defuseLabel.destroy(); this.defuseLabel = null; }
    }

    clearPromptUI() {
        if (this.prompt) {
            this.prompt.destroy();
            this.prompt = null;
        }
        this.promptShown = false;
    }

    clearAllUI() {
        if (this.timerText) { this.timerText.destroy(); this.timerText = null; }
        if (this.defuseBarBg) { this.defuseBarBg.destroy(); this.defuseBarBg = null; }
        if (this.defuseBarFill) { this.defuseBarFill.destroy(); this.defuseBarFill = null; }
        if (this.defuseText) { this.defuseText.destroy(); this.defuseText = null; }
        this.clearDefuseUI();
        this.clearPromptUI();
    }

    destroy(fromScene) {
        this.stopTickSound();
        this.releasePlayer(); // 🚀 ফিক্স: ডিলিট হওয়ার ঠিক আগ মুহূর্তেও শিওর হয়ে নেওয়া যে প্লেয়ার ফ্রি আছে
        this.clearAllUI();
        super.destroy(fromScene);
    }
}