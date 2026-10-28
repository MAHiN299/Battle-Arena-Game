import Phaser from 'phaser';

export default class Boss extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'bossIdle1');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.enemyKind = 'boss';
        this.texturePrefix = 'boss'; 

        this.setScale(0.25);
        this.body.setSize(350, 480); 
        this.body.setOffset(180, 100);
        this.setDepth(5);

        this.hp = 2500;
        this.maxHp = 2500;
        this.moveSpeed = 90;
        this.attackDamage = 20;

        // 🧠 বসের স্টেট (States)
        this.isDead = false;
        this.isAttacking = false;
        this.isCooldown = false;
        this.isTeleporting = false; 
        this.isInvulnerable = false;
        this.isFirstSpawn = true;
        this.isKnockedOut = false;

        this.hasTriggeredPhase2KO = false;
        this.hasTriggeredPhase3KO = false;

        this.currentPhase = 1; 
        this.isCastingSuper = false; 
        this.lastSuperCastTime = 0;
        this.lastMinionSpawnTime = 0;
        this.lastTeleportTime = 0;
        
       this.isCastingLightningStorm = false;
        this.lastLightningStormTime = 0;

        this.hasTriggeredPhase2KO = false;
        this.hasTriggeredPhase3KO = false;

        // 🚀 নতুন: আকাশ থেকে পড়ার স্টেট
        this.isDropping = true; 

        scene.time.delayedCall(0, () => {
            // বসকে স্ক্রিনের অনেক উপরে (-200 পিক্সেল) পাঠিয়ে দেওয়া হলো
            this.y = -200; 
            // 🚀 সুপার ফাস্ট স্পিডে নিচে পড়ার জন্য গ্র্যাভিটি/ভেলোসিটি দেওয়া হলো
            this.setVelocityY(2500); 
        });
    }

   playSpawnIntroduction() {
        if (!this.isFirstSpawn) return;
        this.isFirstSpawn = false;

        this.isTeleporting = true; 
        this.setVelocityX(0); 

        this.scene.cameras.main.shake(400, 0.025);

        // 🔊 লাইটনিং সাউন্ড প্লে হবে
        this.scene.sound.play('lightningSound', { volume: 0.8 });

        const lightning = this.scene.add.sprite(this.x, this.y, 'lightningEffect1');
        lightning.setDepth(6); 
        lightning.setScale(0.7); 
        
        lightning.play('lightningEffect'); 
        
        lightning.once('animationcomplete', () => {
            lightning.destroy();
        });

        this.anims.play('bossTeleport', true);

        this.once('animationcomplete-bossTeleport', () => {
            if (this.isDead) return;
            this.isTeleporting = false; 
            this.anims.play('bossIdle', true);
        });
    }

    // 🚀 ফিক্স: সুপার হার্ড রিসেট (নকআউট হলে আগের সব ক্যানসেল)
    triggerKO() {
        this.isKnockedOut = true;
        this.setVelocityX(0);
        
        // 🛠️ বসের অন্যান্য সব অ্যাকশন জোর করে ফলস করে দেওয়া হলো
        this.isAttacking = false;
        this.isTeleporting = false;
        this.isCastingSuper = false;
        this.isCastingLightningStorm = false;
        this.isCooldown = false;

        // যদি টেলিপোর্টের মাঝখানে নকআউট হয়, তাহলে আবার নরমাল ভিজ্যুয়াল ফিরিয়ে আনা
        this.scene.tweens.killTweensOf(this);
        this.setAlpha(1);
        this.setScale(0.25);
        this.body.enable = true;
        this.clearTint(); 
        
        this.anims.play('bossKO', true);

        this.scene.time.delayedCall(5000, () => {
            if (this.isDead) return;
            this.isKnockedOut = false;
            this.anims.play('bossIdle', true);
            
            // ফেজ ৩ এর লাল কালার আবার ফিরিয়ে দেওয়া
            if (this.currentPhase === 3) this.setTint(0xffaaaa); 

            this.isCooldown = true;
            this.scene.time.delayedCall(1000, () => {
                if (!this.isDead) this.isCooldown = false;
            });
        });
    }

    checkPhase() {
        const healthPercent = (this.hp / this.maxHp) * 100;
        
        // 🚀 ফিক্স: ফ্ল্যাগ দিয়ে গ্যারান্টি দিলাম যে ১ বারের বেশি নকআউট হবে না
        if (healthPercent <= 33 && !this.hasTriggeredPhase3KO) {
            this.hasTriggeredPhase3KO = true;
            this.hasTriggeredPhase2KO = true; // একসাথে অনেক ড্যামেজ খেলে ফেজ ২ স্কিপ হবে
            this.currentPhase = 3;
            this.moveSpeed = 120; 
            this.triggerKO(); 
        } 
        else if (healthPercent <= 66 && !this.hasTriggeredPhase2KO) {
            this.hasTriggeredPhase2KO = true;
            this.currentPhase = 2;
            this.moveSpeed = 100; 
            this.triggerKO();
        }
    }

    update(players) {
        if (this.isDropping) {
            // মাটিতে ধাম করে ধাক্কা খেলে (blocked.down)
            if (this.body.blocked.down || this.body.touching.down) {
                this.isDropping = false;
                this.playSpawnIntroduction(); // মাটিতে পড়ার পর ইফেক্ট শুরু
            }
            return; // মাটিতে না পড়া পর্যন্ত অন্য কোনো কাজ করবে না
        }

        const time = this.scene.time.now;

        // কোনো স্পেশাল কাজ বা নকআউট থাকলে নিচের লজিক কাজ করবে না
        if (this.isDead || this.isKnockedOut || this.isAttacking || this.isTeleporting || this.isCastingSuper || this.isCastingLightningStorm) return;

        this.checkPhase();

        let target = null;
        let minDistance = Infinity;

        players.forEach(p => {
            if (!p.isDead) {
                const dist = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
                if (dist < minDistance) {
                    minDistance = dist;
                    target = p; 
                }
            }
        });

        if (!target) {
            this.setVelocityX(0);
            this.anims.play('bossIdle', true);
            return;
        }

        // 🔥 ফেজ ৩ এর লাইটনিং স্পেশাল (প্রতি ১৮ সেকেন্ড পরপর)
        if (this.currentPhase === 3 && time > this.lastLightningStormTime + 18000) {
            this.castLightningStorm(time);
            return;
        }

        // 🔥 ফেজ ২ ও ৩ এর ফায়ার অর্ব (প্রতি ১৫ সেকেন্ড পরপর)
        if (this.currentPhase >= 2 && time > this.lastSuperCastTime + 15000) { 
            this.castSuperFireOrb(target, time);
            return; 
        }

        // 💣 ফেজ ৩ এর বোম্বার এনিমি (প্রতি ১৫ সেকেন্ড পরপর)
        if (this.currentPhase === 3 && time > this.lastMinionSpawnTime + 15000) {
            this.spawnBomberMinions();
            this.lastMinionSpawnTime = time;
        }

        const distX = Math.abs(target.x - this.x);
        const distY = Math.abs(target.y - this.y); 

        // 🚀 ফিক্স: স্পাইকের হার্ডকোড পজিশন বাদ দিয়ে ডায়নামিক পজিশন ট্র্যাক করা হলো
        let nearSpike = false;
        if (this.scene.selectedMap === 'arena2' && this.scene.spikeZone && this.scene.spikeZone.active) {
            const spikeBounds = this.scene.spikeZone.getBounds();
            
            // স্পাইকের বাম থেকে ৪০ পিক্সেল আগে এবং ডান থেকে ৪০ পিক্সেল পর পর্যন্ত ডেঞ্জার জোন
            nearSpike = (this.x > spikeBounds.left - 40 && this.x < spikeBounds.right + 40) && (this.y > spikeBounds.top - 150); 
        }

        const isBlocked = this.body.blocked.left || this.body.blocked.right; 
        const canTeleportByTime = time > this.lastTeleportTime + 6000; 

        if (nearSpike || (distY > 80 && (isBlocked || canTeleportByTime))) {
            this.startTeleportSequence(target, time);
            return; 
        }

        if (distX < 90 && distY < 60) {
            this.setVelocityX(0);
            this.attackPlayer(target);
        } else {
            this.chaseTarget(target);
        }
    }

    // ⚡⚡ ফেজ ৩ স্পেশাল: ডুমসডে লাইটনিং স্টর্ম
    castLightningStorm(currentTime) {
        this.isCastingLightningStorm = true;
        this.lastLightningStormTime = currentTime;
        this.setVelocityX(0);

        this.anims.play('bossTeleport', true);

        const animUpdateListener = (anim, frame) => {
            // 🚀 ফিক্স: ৯ নম্বর ফ্রেমে থামিয়ে দেওয়া এবং সেফটি চেক
            if (anim.key === 'bossTeleport' && frame.index >= 9) {
                this.off('animationupdate', animUpdateListener); 
                
                // যদি নকআউট হয়ে থাকে তবে আর স্টর্ম দিবে না
                if (this.isDead || this.isKnockedOut || !this.isCastingLightningStorm) return; 
                
                this.anims.pause(); 

                let strikesCount = 0;
                const strikeInterval = this.scene.time.addEvent({
                    delay: 800,
                    loop: true,
                    callback: () => {
                        // 🚀 ফিক্স: প্রতিবার চেক করবে বস নকআউট বা ডেড কিনা
                        if (this.isDead || this.isKnockedOut || !this.isCastingLightningStorm) {
                            strikeInterval.remove();
                            return;
                        }
                        this.spawnLightningStrike();
                        strikesCount++;
                        
                        if (strikesCount >= 8) strikeInterval.remove();
                    }
                });

                this.scene.time.delayedCall(7000, () => {
                    if (this.isDead || this.isKnockedOut || !this.isCastingLightningStorm) return;
                    
                    if (this.anims.currentAnim && this.anims.currentAnim.key === 'bossTeleport') {
                        this.anims.resume(); 
                    }
                });
            }
        };

        this.on('animationupdate', animUpdateListener);

        this.once('animationcomplete-bossTeleport', () => {
            // 🚀 ফিক্স: অ্যানিমেশন শেষ হলেও যদি বস নকআউট থাকে, তাহলে ইগনোর করবে
            if (this.isDead || !this.isCastingLightningStorm) return; 
            
            this.isCastingLightningStorm = false;
            this.isCooldown = true;
            this.anims.play('bossIdle', true);
            this.scene.time.delayedCall(1500, () => {
                if (!this.isDead) this.isCooldown = false;
            });
        });
    }

   
   // ⚡ বাজের ওয়ার্নিং (টেলিগ্রাফ) এবং অ্যাটাক
    spawnLightningStrike() {
        if (this.isDead) return;

        const cam = this.scene.cameras.main;
        const activePlayers = [this.scene.player1, this.scene.player2].filter(p => p && !p.isDead);
        
        let targetX;
        if (activePlayers.length > 0 && Math.random() > 0.5) {
            const randomPlayer = Phaser.Utils.Array.GetRandom(activePlayers);
            targetX = randomPlayer.x + Phaser.Math.Between(-30, 30);
        } else {
            targetX = Phaser.Math.Between(50, cam.width - 50);
        }

        const warningLine = this.scene.add.rectangle(targetX, cam.height / 2, 90, cam.height, 0x44ddff, 0.6);
        warningLine.setDepth(1);

        this.scene.tweens.add({
            targets: warningLine,
            width: 0,
            alpha: 0,
            duration: 1000,
            ease: 'Linear',
            onComplete: () => {
                warningLine.destroy();
                if (this.isDead) return;

                const isArena2 = this.scene.selectedMap === 'arena2';
                const groundY = (cam.height / 2) + (isArena2 ? 0 : 10); 
                
                const lightning = this.scene.add.sprite(targetX, groundY, 'lightningEffect1');
                lightning.setDepth(6);
                
                // 🔊 বাজ পড়ার সাউন্ড
                this.scene.sound.play('lightningSound', { volume: 0.8 });

                lightning.setScale(0.5, 1.8); 
                lightning.play('lightningEffect');

                this.scene.cameras.main.shake(150, 0.015);

                const hitRadius = 80;

                activePlayers.forEach(p => {
                    const distX = Math.abs(p.x - targetX);
                    if (distX < hitRadius) { 
                        p.takeDamage(40); 
                    }
                });

                if (this.scene.waveManager && this.scene.waveManager.enemyGroup) {
                    this.scene.waveManager.enemyGroup.getChildren().forEach(enemy => {
                        if (!enemy.isDead && enemy !== this) { 
                            const distToEnemy = Math.abs(enemy.x - targetX);
                            if (distToEnemy < hitRadius) {
                                enemy.takeDamage(150, this); 
                            }
                        }
                    });
                }

                lightning.once('animationcomplete', () => lightning.destroy());
            }
        });
    }

    castSuperFireOrb(target, currentTime) {
        this.isCastingSuper = true;
        this.lastSuperCastTime = currentTime;
        this.setVelocityX(0);
        this.setFlipX(target.x < this.x);

        this.anims.stop();
        this.setTexture('bossSuper'); 

        // 🔊 সুপার অ্যাটাকের সাউন্ড
        this.scene.sound.play('super', { volume: 0.9 });

        const orbStartX = this.x;
        const orbStartY = this.y - 150; 
        
        const orb = this.scene.physics.add.sprite(orbStartX, orbStartY, 'fireOrb1'); 
        orb.play('fireOrb'); 
        orb.body.allowGravity = false; 
        orb.setScale(0.1); 
        orb.setDepth(6); 

        // ... (ফাংশনের বাকি অংশ আগের মতোই থাকবে)
        this.scene.tweens.add({
            targets: orb,
            scale: 0.8, 
            duration: 2500, 
            ease: 'Sine.easeInOut',
            onComplete: () => {
                if (this.isDead) {
                    if (orb && orb.active) orb.destroy();
                    return;
                }

                const angle = Phaser.Math.Angle.Between(orb.x, orb.y, target.x, target.y);
                const speed = 400; 
                
                orb.setVelocityX(Math.cos(angle) * speed);
                orb.setVelocityY(Math.sin(angle) * speed);

                const playersList = [this.scene.player1, this.scene.player2].filter(Boolean);
                this.scene.physics.add.overlap(orb, playersList, (projectile, player) => {
                    if (!player.isDead) {
                        player.takeDamage(30); 
                        projectile.destroy();
                    }
                });

                this.scene.time.delayedCall(3000, () => {
                    if (orb && orb.active) orb.destroy();
                });

                this.isCastingSuper = false;
                this.anims.play('bossIdle', true);
            }
        });
    }
    spawnBomberMinions() {
        if (!this.scene.waveManager) return;
        
        if (this.scene.waveManager.spawnOne) {
            this.scene.waveManager.spawnOne('bomber');
            this.scene.waveManager.spawnOne('base');
        }
    }

    startTeleportSequence(target, currentTime = 0) {
        this.isTeleporting = true;
        this.lastTeleportTime = currentTime || this.scene.time.now; 
        
        this.setVelocityX(0);
        this.anims.play('bossIdle', true);

        this.scene.time.delayedCall(2000, () => {
            if (this.isDead || this.isKnockedOut || !this.isTeleporting) return; 

            this.scene.tweens.add({
                targets: this,
                scaleX: 0,
                scaleY: 0,
                duration: 300, 
                ease: 'Back.easeIn', 
                onComplete: () => {
                    this.body.enable = false;
                    this.setAlpha(0); 

                    const targetX = target.x;
                    const targetY = target.y - 50; 

                    const warningCircle = this.scene.add.circle(targetX, target.y, 60, 0xff0000, 0.4);
                    warningCircle.setDepth(2);
                    
                    this.scene.tweens.add({
                        targets: warningCircle,
                        scale: 1.5,
                        alpha: 0,
                        duration: 500,
                        yoyo: true,
                        repeat: 1
                    });

                    this.scene.time.delayedCall(1000, () => {
                        if (this.isDead || this.isKnockedOut) {
                            warningCircle.destroy();
                            return;
                        }
                        
                        warningCircle.destroy();
                        this.setPosition(targetX, targetY);
                        
                        this.setScale(0.25);
                        this.setAlpha(1);
                        this.body.enable = true;
                        this.setFlipX(target.x < this.x);

                        this.scene.cameras.main.shake(250, 0.015);

                        // 🔊 টেলিপোর্ট হওয়ার পর অ্যাটাক সাউন্ড
                        this.scene.sound.play('attackSound', { volume: 0.7 });
                        this.anims.play('bossTeleport', true);

                        this.scene.time.delayedCall(300, () => {
                            if (!this.isDead && target && !target.isDead) {
                                const finalDistX = Math.abs(this.x - target.x);
                                const finalDistY = Math.abs(this.y - target.y);
                                
                                if (finalDistX < 120 && finalDistY < 80) {
                                    target.takeDamage(this.attackDamage);
                                }
                            }
                        });

                        this.once('animationcomplete-bossTeleport', () => {
                            if (this.isDead || !this.isTeleporting) return; 
                            this.isTeleporting = false;
                            this.isCooldown = true;
                            this.anims.play('bossIdle', true);

                            this.scene.time.delayedCall(1000, () => {
                                if (!this.isDead) this.isCooldown = false;
                            });
                        });
                    });
                }
            });
        });
    }

    chaseTarget(target) {
        if (this.isAttacking || this.isTeleporting || this.isCastingSuper) return;

        const distX = Math.abs(target.x - this.x);

        if (distX < 10) {
            this.setVelocityX(0);
            this.anims.play('bossIdle', true);
            return;
        }

        const direction = target.x > this.x ? 1 : -1;
        this.setVelocityX(this.moveSpeed * direction);
        this.setFlipX(direction === -1);

        this.anims.play('bossRun', true);
    }

    attackPlayer(player) {
        if (this.isAttacking || this.isCooldown || this.isTeleporting || this.isCastingSuper) return;
        
        this.isAttacking = true;
        let hitSuccess = false; 

        this.setVelocityX(0);
        this.setFlipX(player.x < this.x);
        this.anims.play('bossAttack', true);

        // 🔊 বেসিক অ্যাটাক সাউন্ড
        this.scene.sound.play('attackSound', { volume: 0.7 });

        this.scene.time.delayedCall(300, () => {
            if (!this.isDead && player && !player.isDead) {
                const finalDistX = Math.abs(this.x - player.x);
                const finalDistY = Math.abs(this.y - player.y);
                
                if (finalDistX < 100 && finalDistY < 60) {
                    player.takeDamage(this.attackDamage);
                    hitSuccess = true; 
                }
            }
        });

        this.once('animationcomplete-bossAttack', () => {
            if (this.isDead) return;
            
            if (hitSuccess) {
                // 🔊 হিট লাগলে বসের হাসির সাউন্ড
                this.scene.sound.play('laughingSound', { volume: 0.9 });
                this.anims.play('bosslaugh', true);
                
                this.once('animationcomplete-bosslaugh', () => {
                    if (this.isDead) return;
                    this.finishAttackSequence();
                });
            } else {
                this.finishAttackSequence();
            }
        });
    }
    finishAttackSequence() {
        this.isAttacking = false;
        this.isCooldown = true;
        this.anims.play('bossIdle', true);

        this.scene.time.delayedCall(1000, () => {
            if (!this.isDead) this.isCooldown = false;
        });
    }

    applyBlast(damage, blastX, blastY) {
        if (this.isDead || this.alpha === 0 || this.isInvulnerable) return;
        this.takeDamage(50, 'grenade');
    }

    takeDamage(amount, attacker) {
        if (this.isDead || this.alpha === 0 || this.isInvulnerable) return; 
        
        this.hp -= amount;
        
        // 🚀 ফিক্স: ড্যামেজ খাওয়ার সাথে সাথেই ফেজ চেক করবে (সরাসরি KO ট্রিগার হবে!)
        this.checkPhase();
        
        this.isInvulnerable = true;
        this.scene.time.delayedCall(200, () => {
            if (this && !this.isDead) this.isInvulnerable = false;
        });

        if (this.tintEvent) this.tintEvent.remove(); 
        
        this.setTint(0xff0000); 
        this.tintEvent = this.scene.time.delayedCall(150, () => {
            if (this.isDead || this.alpha === 0) return;
            if (this.currentPhase === 3) {
                this.setTint(0xffaaaa); 
            } else {
                this.clearTint(); 
            }
        });
        
        if (this.hp <= 0) {
            this.lastAttacker = attacker;
            this.die();
        }
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        
        this.setVelocityX(0);
        this.body.enable = false;
        this.scene.tweens.killTweensOf(this); // 🚀 মরার সময়ও ভিজ্যুয়াল রিসেট
        this.clearTint();

        this.anims.play('bossDeath', true);

        this.once('animationcomplete-bossDeath', () => {
            this.scene.tweens.add({
                targets: this,
                alpha: 0,
                y: this.y + 10,
                duration: 500,
                onComplete: () => this.destroy()
            });
        });

        if (this.scene.waveManager) {
            this.scene.waveManager.onRunCleared();
        }
    }
}