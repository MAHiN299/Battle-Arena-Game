import Phaser from 'phaser';

export default class Boar extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'boarIdle01');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(0.1);
        this.setCollideWorldBounds(true);
        this.setDepth(3);
        this.runningSound = scene.sound.add('boarRunningSound', { loop: true, volume: 0.45 });
        
        // বোরের হিটবক্স (দরকার হলে সাইজ অ্যাডজাস্ট করে নেবেন)
        this.body.setSize(350, 700);

        this.hp = 150;
        this.maxHp = 150;
        this.isDead = false;
        this.enemyKind = 'boar';

        this.currentState = 'IDLE'; // স্টেট: IDLE, RUNNING, BREAKING
        this.runSpeed = 250; // বোর অনেক ফাস্ট দৌড়াবে!
        this.targetPlayer = null;
        
        this.runDirection = 1; // 1 মানে ডান, -1 মানে বাম
        this.damageCooldown = false; // বারবার যেন ড্যামেজ না দেয়
    }

    update(players, crates) {
        if (this.isDead) return;

        // ১. সবচেয়ে কাছের হিরোকে টার্গেট করা
        let closest = null;
        let minDist = Infinity;
        players.forEach(p => {
            if (p && !p.isDead) {
                const d = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
                if (d < minDist) { minDist = d; closest = p; }
            }
        });

        this.targetPlayer = closest;

        // ব্রেক করার সময় নড়াচড়া বন্ধ
        if (this.currentState === 'BREAKING') {
            if (this.runningSound.isPlaying) this.runningSound.stop();
            this.setVelocityX(this.body.velocity.x * 0.9); // আস্তে আস্তে থামবে (Friction)
            return; 
        }

        if (!this.targetPlayer) {
            this.setIdle();
            return;
        }

        // ২. হিরো কি একই প্ল্যাটফর্মে আছে? (Y অক্ষের দূরত্ব চেক)
        const isSamePlatform = Math.abs(this.targetPlayer.y - this.y) < 60; 

        if (!isSamePlatform) {
            this.setIdle();
        } else {
            if (this.currentState === 'IDLE') {
                this.currentState = 'RUNNING';
                this.runDirection = this.targetPlayer.x < this.x ? -1 : 1;
                this.setFlipX(this.runDirection === -1); // বোরের স্প্রাইটের উপর নির্ভর করে 1 বা -1 হতে পারে
            }
        }

        // ৩. দৌড়ানোর লজিক
        if (this.currentState === 'RUNNING') {
            this.setVelocityX(this.runSpeed * this.runDirection);
            this.anims.play('boarRunning', true);
            if (!this.runningSound.isPlaying) this.runningSound.play();

            // হিরোকে ধাক্কা দেওয়া
            if (!this.damageCooldown) {
                const distX = Math.abs(this.x - this.targetPlayer.x);
                const distY = Math.abs(this.y - this.targetPlayer.y);
                
                if (distX < 60 && distY < 60) {
                    this.hitPlayer(this.targetPlayer);
                }
            }

            // ৪. হিরোকে ক্রস করে গেলে (Overshoot) বা দেয়ালে ধাক্কা খেলে ব্রেক (Break) করবে
            const passedTarget = (this.runDirection === 1 && this.x > this.targetPlayer.x + 120) ||
                                 (this.runDirection === -1 && this.x < this.targetPlayer.x - 120);
                                 
            const hitWall = this.body.blocked.left || this.body.blocked.right;

            if (passedTarget || hitWall) {
                this.currentState = 'BREAKING';
                if (this.runningSound.isPlaying) this.runningSound.stop();
                this.anims.play('boarBreak', true);
                
                this.once('animationcomplete-boarBreak', () => {
                    if (this.isDead) return;
                    this.setIdle();
                });
            }
        }
    }

    setIdle() {
        this.currentState = 'IDLE';
        this.setVelocityX(0);
        if (this.runningSound.isPlaying) this.runningSound.stop();
        this.anims.play('boarIdle', true);
    }

    hitPlayer(player) {
        this.damageCooldown = true;
        this.scene.time.delayedCall(1000, () => { this.damageCooldown = false; });

        // হিরোকে ছিটকে ফেলার ফাংশন কল করা (Player.js এ অ্যাড করব)
        if (player.takeKnockdown) {
            player.takeKnockdown(this, 30); // বোর ৩০ ড্যামেজ দেবে
        } else {
            player.takeDamage(30);
        }
    }

    takeDamage(amount) {
        if (this.isDead) return;
        this.hp -= amount;
        
        this.setTint(0xff0000);
        this.scene.time.delayedCall(150, () => { if (!this.isDead) this.clearTint(); });
        
        if (this.hp <= 0) {
            this.die();
        }
    }

    applyBlast(x, amt) {
        this.takeDamage(amt);
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.setVelocity(0);
        this.body.enable = false;
        this.clearTint();
        if (this.runningSound.isPlaying) this.runningSound.stop();
        this.runningSound.destroy();
        
        this.anims.play('boarDeath', true);
        this.scene.sound.play('boarDeathSound', { volume: 0.7 });

        this.once('animationcomplete-boarDeath', () => {
            this.destroy();
        });
    }
}