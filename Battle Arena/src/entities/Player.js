import Phaser from 'phaser';
import Bullet from './Bullet';
import Grenade from './Grenade'; 
import Molotov from './Molotov';  
import Landmine from './Landmine'; 
import KeyboardInput from '../inputs/KeyboardInput'; 
import GamepadInput from '../inputs/GamepadInput';

import { AMMO } from '../managers/WaveConfig';
import { playSfx } from '../managers/Sfx';

export default class Player extends Phaser.Physics.Arcade.Sprite 
{
    constructor(scene, x, y, heroPrefix, controlType, startingItem) 
    {
        super(scene, x, y, heroPrefix + 'Idle1');

        this.heroPrefix = heroPrefix; 
        this.controlType = controlType; 

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(0.2); 
        this.setCollideWorldBounds(true);
        this.setBounce(0.0);
        this.setDepth(2);
        this.setDragX(900);

        this.baseWidth = this.width;   
        this.baseHeight = this.height;

        // 🚀 ফিক্সড হিটবক্স
        this.body.setSize(150, 400);   

        this.onLadder = false;
        this.isClimbing = false; 
        this.currentLadder = null;
        this.isAttacking = false; 
        this.isThrowing = false; 
        
        // 🚀 প্লেয়ারের স্ট্যাটাস
        this.maxHp = 100;
        this.hp = 100; 
        this.isDead = false;
        
        // ==========================================
        // 🚀 ইনভেন্টরি ও আইটেম সিস্টেম
        // ==========================================
        this.throwables = ['grenade', 'molotov', 'landmine'];
        
        // যেটা সিলেক্ট করেছে, প্লেয়ার শুরুতেই সেটা হাতে নিয়ে থাকবে
        this.currentThrowableIndex = this.throwables.indexOf(startingItem);
        if (this.currentThrowableIndex === -1) this.currentThrowableIndex = 0; 
        
        // সিলেক্ট করা আইটেম পাবে ৫টা, বাকিগুলো ০
        this.inventory = {
            grenade: startingItem === 'grenade' ? 5 : 0,
            molotov: startingItem === 'molotov' ? 5 : 0,
            landmine: startingItem === 'landmine' ? 5 : 0
        };
        
        this.grenades = this.inventory.grenade; // UI সিঙ্ক

        // 🚀 আইটেম সুইচ করার বাটন (SHIFT / Gamepad L1)
        this.switchKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.prevGamepadSwitch = false;

        // ==========================================
        // 🚀 Special Dash Ability (ALT / Gamepad X)
        // ==========================================
        this.specialKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ALT);
        this.prevGamepadSpecial = false;
        this.isSpecialDashing = false;
        this.canUseSpecial = true; // কুলডাউন চেকার

        // 🚀 অ্যামো ও শ্যুটিং
        this.maxBullets = AMMO.MAG_SIZE;
        this.bullets = AMMO.MAG_SIZE;
        this.reserveAmmo = AMMO.RESERVE_START;
        this.reserveCap = AMMO.RESERVE_MAX;
        this.isReloading = false;
        this.reloadTimer = null;
        this.isShooting = false;
        
        // 🚀 সাউন্ড সেটআপ
        this.jumpSoundKey = this.heroPrefix === 'hero' ? 'hero1JumpSound' : 'hero2JumpSound';
        this.runSoundKey = this.heroPrefix === 'hero' ? 'hero1RunSound' : 'hero2RunSound';
        this.runSound = scene.sound.add(this.runSoundKey, { volume: 0.2, loop: true });

        // 🚀 Muzzle Flash
        this.muzzleFlash = scene.add.image(0, 0, 'SMGShootEffect').setDepth(4).setVisible(false).setScale(0.8);

        // 🚀 ইনপুট হ্যান্ডলার
        if (this.controlType === 'keyboard') {
            this.inputHandler = new KeyboardInput(scene);
        } else {
            this.inputHandler = new GamepadInput(scene);
        }
        
        const labelText = this.controlType === 'keyboard' ? 'P1' : 'P2';
        const labelColor = this.controlType === 'keyboard' ? '#ff0000' : '#44aaff'; 
        
        this.playerLabel = scene.add.text(this.x, this.y - 50, labelText, {
            fontSize: '18px', fill: labelColor, fontStyle: 'bold', stroke: '#060606', strokeThickness: 3
        }).setOrigin(0.5).setDepth(30);

        // 🚀 রিভাইভ সিস্টেমের UI
        this.needsRevive = false;
        this.reviveProgress = 0;

        this.helpText = scene.add.text(this.x, this.y - 50, 'HELP ME!', { 
            fontSize: '18px', fill: '#ff0000', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 3 
        }).setOrigin(0.5).setVisible(false).setDepth(20);

        this.reviveBarBg = scene.add.rectangle(this.x, this.y - 70, 60, 10, 0x000000).setOrigin(0.5).setVisible(false).setDepth(20);
        this.reviveBarFill = scene.add.rectangle(this.x - 28, this.y - 70, 0, 6, 0x00ff00).setOrigin(0, 0.5).setVisible(false).setDepth(21);
    }

    update(time, delta) 
    {
        if (!this.body) return;

        // 🚀 UI আপডেট
        if (this.helpText.visible) this.helpText.setPosition(this.x, this.y - 50);
        if (this.reviveBarBg.visible) {
            this.reviveBarBg.setPosition(this.x, this.y - 70);
            this.reviveBarFill.setPosition(this.x - 28, this.y - 70);
            this.reviveBarFill.width = 56 * (this.reviveProgress / 3000); 
        }

        if (this.playerLabel) {
            this.playerLabel.setPosition(this.x, this.y - (this.displayHeight / 2) - 15);
        }

        // 🚀 মারা গেলে বা নকডাউন হলে কিছু করতে পারবে না
        if (this.isDead || this.isKnockedDown) return;

        // ==========================================
        // ⚡ DASH CONTROL LOCK
        // ==========================================
        // যদি ড্যাশ অন থাকে, তবে সাধারণ কন্ট্রোল অফ থাকবে এবং শুধু ড্যামেজ ইফেক্ট চলবে
        if (this.isSpecialDashing) {
            this.handleDashCollision();
            return; 
        }

        // ==========================================
        // 🚀 HITBOX STABILIZER
        // ==========================================
        const hitBoxWidth = 150;  
        const hitBoxHeight = 400; 
        const offsetX = this.frame.halfWidth - (hitBoxWidth / 2);
        const offsetY = this.frame.halfHeight - (hitBoxHeight / 2) + 50; 
        this.body.setOffset(offsetX, offsetY);

        if (!this.inputHandler) return; 

        const moveSpeed = 320;
        const climbSpeed = 200; 

        const inputs = this.inputHandler.getInputs();
        let isGoingLeft = inputs.left;
        let isGoingRight = inputs.right;
        let isGoingUp = inputs.up;
        let isGoingDown = inputs.down;
        let wantJump = inputs.jump;
        let wantAttack = inputs.attack;
        let wantThrow = inputs.throw;
        let wantShoot = inputs.shoot;
        const isOnGround = this.body.blocked.down || this.body.touching.down;

        let canClimbUp = true;
        if (this.onLadder && this.currentLadder) {
            const ladderTop = this.currentLadder.body.top || (this.currentLadder.y - this.currentLadder.height / 2);
            if (this.body.bottom <= ladderTop + 20) {
                canClimbUp = false;
            }
        }

        // ==========================================
        // 🚀 স্পেশাল এবিলিটি (Dash) ট্রিগার লজিক
        // ==========================================
        let isSpecialJustPressed = Phaser.Input.Keyboard.JustDown(this.specialKey);
        
        if (this.controlType === 'gamepad' && this.inputHandler && this.inputHandler.pad) {
            const pad = this.inputHandler.pad;
            const isPadSpecialPressed = pad.X || (pad.buttons[2] && pad.buttons[2].pressed); 
            
            if (isPadSpecialPressed && !this.prevGamepadSpecial) {
                isSpecialJustPressed = true;
            }
            this.prevGamepadSpecial = isPadSpecialPressed;
        }

        if (isSpecialJustPressed && this.canUseSpecial) {
            this.executeSpecialAbility();
        }

        // ==========================================
        // 🚀 আইটেম সুইচ (Inventory Cycle) লজিক
        // ==========================================
        let isSwitchJustPressed = Phaser.Input.Keyboard.JustDown(this.switchKey);

        if (this.controlType === 'gamepad' && this.inputHandler && this.inputHandler.pad) {
            const pad = this.inputHandler.pad;
            const isPadSwitchPressed = pad.L1; 
            
            if (isPadSwitchPressed && !this.prevGamepadSwitch) {
                isSwitchJustPressed = true;
            }
            this.prevGamepadSwitch = isPadSwitchPressed; 
        }

        if (isSwitchJustPressed) {
            this.currentThrowableIndex = (this.currentThrowableIndex + 1) % this.throwables.length;
            const selectedItem = this.throwables[this.currentThrowableIndex];
            
            this.showFloat(selectedItem.toUpperCase() + ' SELECTED', '#ffff00');
            this.scene.sound.play('SMGShootSound', { volume: 0.2 }); 
        }

        // ==========================================
        // 🚀 ১. আইটেম ছোঁড়ার লজিক (Grenade, Molotov, Landmine)
        // ==========================================
        const currentItem = this.throwables[this.currentThrowableIndex];
        
        if (wantThrow && !this.isAttacking && !this.isClimbing && !this.isThrowing) {
            if (this.inventory[currentItem] > 0) {
                this.isThrowing = true;
                this.inventory[currentItem]--; 
                this.grenades = this.inventory.grenade; // UI সিঙ্ক
                this.anims.play(this.heroPrefix + 'Throw', true); 

                this.scene.time.delayedCall(150, () => {
                    let direction = this.flipX ? 'left' : 'right';
                    if (isGoingUp) direction = this.flipX ? 'upLeft' : 'upRight';

                    let offsetX = this.flipX ? -40 : 40; 
                    let offsetY = 0;
                    
                    if (isGoingUp) {
                        offsetX = this.flipX ? -20 : 20; 
                        offsetY = -30; 
                    }
                    
                    let thrownItem;
                    if (currentItem === 'grenade') {
                        thrownItem = new Grenade(this.scene, this.x + offsetX, this.y + offsetY, direction);
                    } else if (currentItem === 'molotov') {
                        thrownItem = new Molotov(this.scene, this.x + offsetX, this.y + offsetY, direction);
                    } else if (currentItem === 'landmine') {
                        thrownItem = new Landmine(this.scene, this.x, this.y, this); // মাইন পায়ে পড়বে
                    }
                    
                    const groundCollider = () => {
                        if (thrownItem.hitGround) thrownItem.hitGround();
                    };

                    if (this.scene.ground) {
                        this.scene.physics.add.collider(thrownItem, this.scene.ground, groundCollider);
                    }
                    if (this.scene.platforms) {
                        this.scene.physics.add.collider(thrownItem, this.scene.platforms, groundCollider);
                    }
                });

                this.once(`animationcomplete-${this.heroPrefix}Throw`, () => {
                    this.isThrowing = false;
                });
            } else {
                if (!this.dryClickShown) {
                    this.dryClickShown = true;
                    this.showFloat('NO ' + currentItem.toUpperCase(), '#ff4444');
                    this.scene.time.delayedCall(1200, () => { this.dryClickShown = false; });
                }
            }
        }

        // ==========================================
        // 🚀 অটো-রিলোড লজিক
        // ==========================================
        if (!wantShoot && this.bullets < this.maxBullets && !this.isReloading && this.reserveAmmo > 0) {
            if (!this.reloadTimer) {
                this.reloadTimer = this.scene.time.delayedCall(2000, () => {
                    this.refillMagazine();
                    this.reloadTimer = null;
                });
            }
        }

        // ==========================================
        // 🚀 শ্যুটিং (Gun & Muzzle Flash) লজিক
        // ==========================================
        if (wantShoot && !this.isShooting && !this.isAttacking && !this.isClimbing && !this.isThrowing) {
            if (this.bullets <= 0) {
                if (this.reserveAmmo <= 0) {
                    if (!this.dryClickShown) {
                        this.dryClickShown = true;
                        this.showFloat('NO AMMO', '#ff4444');
                        this.scene.time.delayedCall(1200, () => { this.dryClickShown = false; });
                    }
                    return;
                }
                if (!this.isReloading) {
                    this.isReloading = true;
                    if (this.reloadTimer) this.reloadTimer.remove();
                    this.reloadTimer = this.scene.time.delayedCall(2000, () => {
                        this.refillMagazine();
                        this.isReloading = false;
                        this.reloadTimer = null;
                    });
                }
                return; 
            }

            if (this.isReloading) return;
            if (this.reloadTimer) {
                this.reloadTimer.remove();
                this.reloadTimer = null;
            }

            this.bullets--; 
            this.isShooting = true;
            this.anims.pause(); 
            
            let shootDir = this.flipX ? 'left' : 'right';
            let gunPose = this.heroPrefix + 'SMGSide'; 
            let offsetX = this.flipX ? -67 : 67; 
            let offsetY = -3; 
            let flashAngle = this.flipX ? 180 : 0; 

            if (isGoingUp) {
                shootDir = 'up';
                gunPose = this.heroPrefix + 'SMGUP'; 
                offsetX = this.flipX ? -10 : 10; 
                offsetY = -90; 
                flashAngle = -90;
            } 
            else if (isGoingDown) {
                shootDir = 'down';
                gunPose = this.heroPrefix + 'SMGDown';
                offsetX = this.flipX ? -5 : 5; 
                offsetY = 65; 
                flashAngle = 90;
            }
            this.setTexture(gunPose); 

            this.muzzleFlash.setPosition(this.x + offsetX, this.y + offsetY);
            this.muzzleFlash.setAngle(flashAngle);
            this.muzzleFlash.setScale(Phaser.Math.FloatBetween(0.6, 1.0));
            this.muzzleFlash.setAlpha(Phaser.Math.FloatBetween(0.4, 1.0)); 
            this.muzzleFlash.setVisible(true);

            const bullet = new Bullet(this.scene, this.x + offsetX, this.y + offsetY, shootDir);
            bullet.owner = this;
            this.scene.events.emit('bulletFired', bullet);
            
            this.scene.sound.play('SMGShootSound', { volume: 0.5 });
            
            if (this.scene.ground) {
                this.scene.physics.add.collider(bullet, this.scene.ground, () => bullet.hitWall());
            }

            // ড্যামেজ ফলঅফ (Distance-based Damage)
            if (this.scene.waveManager && this.scene.waveManager.enemyGroup) {
                this.scene.physics.add.overlap(bullet, this.scene.waveManager.enemyGroup, (b, enemy) => {
                    if (enemy.isDead) return; 
                    
                    b.hitWall(); 
                    
                    const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
                    let calculatedDamage = 25 - Math.floor(dist / 20);
                    calculatedDamage = Phaser.Math.Clamp(calculatedDamage, 5, 25);
                    
                    enemy.hitsTaken = (enemy.hitsTaken || 0) + 1;
                    enemy.lastDamageWasMelee = false;
                    enemy.lastAttacker = this;
                    enemy.takeDamage(calculatedDamage); 
                    playSfx(this.scene, 'hit');
                });
            }

            this.scene.time.delayedCall(25, () => {
                if (this.muzzleFlash) this.muzzleFlash.setVisible(false);
            });
            this.scene.time.delayedCall(50, () => {
                this.isShooting = false;
                if (this.muzzleFlash) this.muzzleFlash.setAlpha(1);
            });
        }

        // ==========================================
        // 🚀 ২. অ্যাটাক লজিক (Extended Range Melee)
        // ==========================================
        if (wantAttack && !this.isAttacking && !this.isClimbing && !this.isThrowing) {
            this.isAttacking = true;
            this.scene.sound.play('sword', { volume: 0.6 });
            this.anims.play(this.heroPrefix + 'Attack', true); 

            this.scene.time.delayedCall(200, () => {
                if (this.scene.waveManager && this.scene.waveManager.enemyGroup) {
                    const attackRange = 130; 
                    this.scene.waveManager.enemyGroup.getChildren().forEach(enemy => {
                        if (!enemy.isDead) {
                            const distX = Math.abs(this.x - enemy.x);
                            const distY = Math.abs(this.y - enemy.y);
                            const isFacingEnemy = this.flipX ? (enemy.x <= this.x) : (enemy.x >= this.x);
                            
                            if (distY < 100 && ((distX < attackRange && isFacingEnemy) || distX < 50)) {
                                enemy.hitsTaken = (enemy.hitsTaken || 0) + 1;
                                enemy.lastDamageWasMelee = true;
                                enemy.lastAttacker = this;
                                enemy.takeDamage(35); 
                            }
                        }
                    });
                }
            });

            this.once(`animationcomplete-${this.heroPrefix}Attack`, () => {
                this.isAttacking = false;
            });
        }

        // ==========================================
        // 🚀 ক্লাইম্বিং এবং মুভমেন্ট লজিক
        // ==========================================
        if (this.onLadder) {
            if (isGoingUp && canClimbUp) {
                this.isClimbing = true;
                if (this.currentLadder) this.x = this.currentLadder.x;
            } else if (isGoingDown) {
                this.isClimbing = true;
                if (this.currentLadder) this.x = this.currentLadder.x;
            }
            if (isOnGround && !isGoingUp && !isGoingDown) {
                this.isClimbing = false;
            }
            if (this.isClimbing && isGoingUp && !canClimbUp) {
                this.isClimbing = false;
            }
            if (wantJump) {
                this.isClimbing = false;
            }
        } else {
            this.isClimbing = false;
        }

        if (this.isClimbing) {
            this.body.setAllowGravity(false); 
            this.setVelocityX(0); 

            if (isGoingUp && canClimbUp) {
                this.setVelocityY(-climbSpeed); 
            } else if (isGoingDown) {
                this.setVelocityY(climbSpeed); 
            } else {
                this.setVelocityY(0); 
            }
        } else {
            this.body.setAllowGravity(true); 
            this.setDragX(isOnGround ? 900 : 0);

            if (isGoingLeft) {
                this.setFlipX(true);
            } else if (isGoingRight) {
                this.setFlipX(false);
            }

            if (this.isShooting || this.isAttacking || this.isThrowing) {
                if (isOnGround) this.setVelocityX(0); 
            }
            else if (isGoingLeft) {
                this.setVelocityX(-moveSpeed);
            } else if (isGoingRight) {
                this.setVelocityX(moveSpeed);
            } else {
                if (isOnGround) {
                    this.setVelocityX(0);
                }
            }

            if (wantJump && isOnGround && !this.isShooting && !this.isAttacking && !this.isThrowing) {
                this.setVelocityY(-460);
                this.scene.sound.play(this.jumpSoundKey, { volume: 0.6 });
            }
        }

        // ==========================================
        // 🚀 ৩. অ্যানিমেশন কন্ট্রোল
        // ==========================================
        if (this.isAttacking || this.isThrowing || this.isShooting) {
            // Nothing here
        }
        else if (this.isClimbing) {
            this.anims.play(this.heroPrefix + 'Climb', true); 
            if (!isGoingUp && !isGoingDown) {
                this.anims.pause(); 
            } else {
                this.anims.resume(); 
            }
        }
        else {
            this.anims.resume(); 
            if (!isOnGround) {
                this.anims.play(this.heroPrefix + 'Jump', true);
            } 
            else if (isGoingLeft || isGoingRight) {
                this.anims.play(this.heroPrefix + 'Run', true);
            } 
            else {
                this.anims.play(this.heroPrefix + 'Idle', true);
            }
        }

        // ==========================================
        // 🚀 রান সাউন্ড
        // ==========================================
        const isRunning = isOnGround && (isGoingLeft || isGoingRight) && !this.isClimbing && !this.isShooting && !this.isThrowing;
        
        if (isRunning) {
            if (!this.runSound.isPlaying) this.runSound.play();
        } else {
            if (this.runSound.isPlaying) this.runSound.stop();
        }
    }

    // ==========================================
    // ⚡ THE ULTIMATE DASH ABILITY
    // ==========================================
    executeSpecialAbility() {
        this.isSpecialDashing = true;
        this.canUseSpecial = false;
        
        // দৌড়ানোর অ্যানিমেশন প্লে করা
        this.anims.play(this.heroPrefix + 'Run', true);
        this.scene.sound.play('SMGShootSound', { volume: 0.5 }); 
        
        // গ্রাভিটি অফ করে দিলাম যেন ড্যাশের সময় গর্তে না পড়ে যায়
        this.body.setAllowGravity(false);
        this.body.setVelocity(0, 0);

        const mapWidth = this.scene.cameras.main.width;
        
        // ড্যাশের স্পিড এবং টার্গেট (৩ বার এপার-ওপার হবে)
        const dashSpeed = 250; 
        const pass1 = this.flipX ? 50 : mapWidth - 50;
        const pass2 = this.flipX ? mapWidth - 50 : 50;
        const pass3 = pass1; 

        // ৩টি চেইন টুইন (Tweens) দিয়ে সুপার-ফাস্ট মুভমেন্ট
        this.scene.tweens.add({
            targets: this,
            x: pass1,
            duration: dashSpeed,
            onComplete: () => {
                this.setFlipX(!this.flipX); 
                
                this.scene.tweens.add({
                    targets: this,
                    x: pass2,
                    duration: dashSpeed,
                    onComplete: () => {
                        this.setFlipX(!this.flipX); 
                        
                        this.scene.tweens.add({
                            targets: this,
                            x: pass3,
                            duration: dashSpeed,
                            onComplete: () => {
                                // 🛑 ড্যাশ শেষ! সবকিছু নরমাল করে দাও
                                this.isSpecialDashing = false;
                                this.body.setAllowGravity(true);
                                this.anims.play(this.heroPrefix + 'Idle', true);
                                
                                // ১০ সেকেন্ডের কুলডাউন
                                this.showFloat('ABILITY ON COOLDOWN', '#ff0000');
                                this.scene.time.delayedCall(10000, () => {
                                    if (this.active) { 
                                        this.canUseSpecial = true;
                                        this.showFloat('ABILITY READY!', '#00ffff');
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    handleDashCollision() {
        // ১. ড্যাশের সময় এনিমিদের সাথে টাচ লাগলে হেভি ড্যামেজ খাবে
        if (this.scene.waveManager && this.scene.waveManager.enemyGroup) {
            this.scene.physics.overlap(this, this.scene.waveManager.enemyGroup, (hero, enemy) => {
                if (!enemy.isDead && !enemy.hasTakenDashDamage) {
                    enemy.takeDamage(100); 
                    if (enemy.applyBlast) enemy.applyBlast(this.x, 300); 
                    
                    enemy.hasTakenDashDamage = true;
                    this.scene.time.delayedCall(300, () => { 
                        if(enemy && enemy.active) enemy.hasTakenDashDamage = false; 
                    });
                }
            });
        }

        // ২. দৌড়ানোর সময় ঘোস্ট শ্যাডো ইফেক্ট
        if (this.scene.time.now % 40 < 20) {
            const ghost = this.scene.add.sprite(this.x, this.y, this.texture.key, this.frame.name)
                .setScale(this.scaleX) // 🚀 ফিক্স: হিরোর সাইজ অনুযায়ী শ্যাডো ছোট হবে
                .setFlipX(this.flipX)
                .setTint(0x00ffff) 
                .setAlpha(0.6)
                .setDepth(this.depth - 1);

            this.scene.tweens.add({
                targets: ghost,
                alpha: 0,
                duration: 300,
                onComplete: () => ghost.destroy()
            });
        }
    }

    // ==========================================
    // 🚀 হিরোর ড্যামেজ খাওয়া এবং মরে যাওয়ার লজিক
    // ==========================================
    takeDamage(amount) {
        if (this.isDead) return;
        
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
        
        this.scene.events.emit('playerHealthChanged', this);
        
        this.setTint(0xff0000);
        this.scene.time.delayedCall(150, () => {
            if (!this.isDead) this.clearTint();
        });

        if (this.hp <= 0) {
            this.die();
        }
    }

    // 🚀 বোরের ধাক্কা খেয়ে ছিটকে পড়ার লজিক
    takeKnockdown(attacker, amount) {
        if (this.isDead || this.isKnockedDown) return;

        this.takeDamage(amount);
        if (this.isDead) return;

        this.isKnockedDown = true;
        this.isAttacking = false;
        this.isShooting = false;
        this.isThrowing = false;
        this.isDefusing = false;

        const pushDir = this.x < attacker.x ? -1 : 1;
        this.setVelocity(pushDir * 350, -250);
        this.setFlipX(pushDir === 1);

        this.anims.play(this.heroPrefix + 'Death', true);

        this.once(`animationcomplete-${this.heroPrefix}Death`, () => {
            if (this.isDead) return;
            this.setVelocity(0, 0);

            // মাটিতে পড়ে থাকার সময়
            this.scene.time.delayedCall(500, () => {
                if (this.isDead) return;

                if (this.body) this.body.setAllowGravity(false);

                this.anims.playReverse(this.heroPrefix + 'Death', true);

                this.once(`animationcomplete-${this.heroPrefix}Death`, () => {
                    if (this.isDead) return;

                    // 🚀 ফিক্স: অ্যানিমেশন শেষ হওয়ার সাথে সাথে হিরোকে Y অক্ষে একটু ওপরে পুশ
                    this.y -= 8;

                    if (this.body) {
                        this.body.setAllowGravity(true);
                        this.setVelocity(0, 0);
                    }

                    this.isKnockedDown = false;
                    this.anims.play(this.heroPrefix + 'Idle', true);
                });
            });
        });
    }

    refillMagazine() {
        const needed = this.maxBullets - this.bullets;
        const taken = Math.min(needed, this.reserveAmmo);
        this.bullets += taken;
        this.reserveAmmo -= taken;
    }

    showFloat(text, color) {
        const t = this.scene.add.text(this.x, this.y - 70, text, {
            fontFamily: 'Impact, sans-serif',
            fontSize: '18px',
            fill: color,
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(40);

        this.scene.tweens.add({
            targets: t, y: t.y - 40, alpha: 0,
            duration: 800, onComplete: () => t.destroy()
        });
    }

    die() {
        if (this.isDead) return;
        
        this.isDead = true;
        this.setVelocity(0); 
        this.body.enable = false; 
        this.clearTint(); 
        
        this.anims.play(this.heroPrefix + 'Death', true);

        const isSolo = !this.scene.player2;

        if (isSolo) {
            this.scene.time.delayedCall(900, () => {
                this.scene.events.emit('soloDeath', this);
            });
            return;
        }

        this.once(`animationcomplete-${this.heroPrefix}Death`, () => {
            this.needsRevive = true;
            this.helpText.setVisible(true);
        });
    }

    getRevived() {
        this.needsRevive = false;
        this.helpText.setVisible(false);
        this.reviveBarBg.setVisible(false);
        this.reviveBarFill.setVisible(false);
        this.reviveProgress = 0;

        this.clearTint(); 

        this.anims.playReverse(this.heroPrefix + 'Death', true);

        this.once(`animationcomplete-${this.heroPrefix}Death`, () => {
            this.isDead = false;
            this.body.enable = true; 
            
            this.hp = Math.floor(this.maxHp / 3); 
            
            this.scene.events.emit('playerHealthChanged', this);
            
            this.anims.play(this.heroPrefix + 'Idle', true);
        });
    }
}